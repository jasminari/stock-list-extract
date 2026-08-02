/**
 * 수집된 종목에 "특징주" 뉴스 기사 링크 + AI 상승이유 요약을 달아주는 스크립트
 *
 * 동작:
 *   1. 해당 날짜의 stock_entries 조회 (수동 입력 종목은 skip)
 *   2. 네이버 뉴스 API로 「특징주 <종목명>」 검색 → 수집일 기사만 필터
 *   3. 기사 본문 추출 → OpenRouter LLM으로 { keyword, reason } 요약
 *   4. stock_annotations에 source_url / source_title / keyword / reason 저장
 *
 * 실행:
 *   node scripts/enrich-reasons.mjs                  # 오늘(수집 기준일) 대상
 *   node scripts/enrich-reasons.mjs --date 20260724  # 특정 날짜
 *   node scripts/enrich-reasons.mjs --dry            # DB 쓰기 없이 결과만 출력
 *   node scripts/enrich-reasons.mjs --force          # 자동 작성분 재생성 (수동 입력은 보호)
 *   node scripts/enrich-reasons.mjs --no-ai          # 기사 링크만 (AI 요약 생략)
 *
 * 필요 env: POSTGRES_URL, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET,
 *           OPENROUTER_API_KEY (AI 요약용), ENRICH_MODEL (선택, 기본 gemma-4-31b free)
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// .env.local 읽기
function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    // .env.local 없으면 환경변수에서 직접 읽음
  }
}

function log(msg) {
  const ts = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  console.log(`[${ts}] ${msg}`);
}

/**
 * 수집 기준 날짜 YYYYMMDD (KST).
 * - 오전 8시 이전이면 전일로 간주
 * - 결과가 토/일이면 직전 금요일로 롤백
 */
function getCollectionDateStr(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "0";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));

  const target = new Date(Date.UTC(year, month - 1, day));
  if (hour < 8) target.setUTCDate(target.getUTCDate() - 1);
  const weekday = target.getUTCDay();
  if (weekday === 6) target.setUTCDate(target.getUTCDate() - 1);
  else if (weekday === 0) target.setUTCDate(target.getUTCDate() - 2);

  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// === 네이버 뉴스 검색 ===

/** API 응답의 제목에서 <b> 태그, HTML 엔티티 제거 */
function cleanTitle(raw) {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .trim();
}

/** pubDate(RFC 1123) → KST 기준 YYYYMMDD */
function pubDateToKstStr(pubDate) {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

/**
 * 「특징주 <종목명>」 검색 → 수집일에 나온 기사 중 가장 적합한 1건 반환
 * @returns {{ title: string, link: string } | null}
 */
async function findFeatureArticle(stockName, dateStr) {
  const query = encodeURIComponent(`특징주 ${stockName}`);
  const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=30&sort=date`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`네이버 API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const items = (data.items || [])
    .map((it) => ({
      title: cleanTitle(it.title),
      link: it.link || it.originallink || "",
      originallink: it.originallink || "",
      dateStr: pubDateToKstStr(it.pubDate),
    }))
    .filter((it) => it.dateStr === dateStr && it.link);

  if (items.length === 0) return null;

  // 우선순위: 제목에 "특징주"+종목명 > 제목에 종목명 > 최신순 첫 기사
  const score = (it) => {
    let s = 0;
    if (it.title.includes(stockName)) s += 2;
    if (it.title.includes("특징주")) s += 1;
    // 네이버 뉴스 링크면 가산 (본문 추출 안정적 — Phase 2 대비)
    if (it.link.includes("n.news.naver.com")) s += 0.5;
    return s;
  };
  items.sort((a, b) => score(b) - score(a));

  const best = items[0];
  // 제목에 종목명이 아예 없으면 오매칭 가능성이 높아 버림
  if (!best.title.includes(stockName)) return null;

  return { title: best.title, link: best.link };
}

// === 기사 본문 추출 (lib/article.ts와 동일 로직) ===

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'");
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 여는 <div>부터 중첩 깊이를 세서 짝이 맞는 </div>까지 내부 HTML */
function extractDivBlock(html, openTagStart) {
  const openEnd = html.indexOf(">", openTagStart);
  if (openEnd === -1) return "";
  const re = /<\/?div\b/gi;
  re.lastIndex = openEnd + 1;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(openEnd + 1, m.index);
  }
  return html.slice(openEnd + 1);
}

function extractBody(html) {
  const naver = html.match(
    /<article[^>]*id=["']dic_area["'][^>]*>([\s\S]*?)<\/article>/i
  );
  if (naver) {
    const text = stripTags(naver[1]);
    if (text.length > 100) return text;
  }

  const divPatterns = [
    /<div[^>]*id=["']dic_area["'][^>]*>/i,
    /<div[^>]*(?:id|class)=["'][^"']*(?:article[-_]?body|articleBody|news[-_]?body|article[-_]?txt|articl?e[-_]?view|view[-_]?contents?)[^"']*["'][^>]*>/i,
  ];
  for (const re of divPatterns) {
    const m = html.match(re);
    if (m && m.index !== undefined) {
      const text = stripTags(extractDivBlock(html, m.index));
      if (text.length > 100) return text;
    }
  }

  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article) {
    const text = stripTags(article[1]);
    if (text.length > 100) return text;
  }

  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length > 30);
  const joined = paragraphs.join("\n\n");
  if (joined.length > 200) return joined;

  const og = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
  );
  return og ? decodeEntities(og[1]).trim() : "";
}

/** 기사 본문 가져오기 (실패 시 빈 문자열) */
async function fetchArticleBody(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    return extractBody(await res.text());
  } catch {
    return "";
  }
}

// === AI 요약 (OpenRouter) ===

const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

const SUMMARY_SYSTEM = `너는 주식 시장을 공부하는 사람의 노트를 정리하는 어시스턴트다.
특징주 뉴스 기사를 읽고, 해당 종목이 왜 올랐는지 정리한다.

반드시 아래 JSON 형식으로만 답한다. 다른 텍스트를 붙이지 않는다.
{"keyword": "테마 키워드", "reason": "상승이유 정리"}

규칙:
- keyword: 상승을 이끈 테마/재료를 2~6단어로 (예: "체코 원전 계약", "지역화폐", "애플 유리기판")
- reason: 1~3문장. 첫 문장은 기사에 근거한 상승 이유, 그 뒤에 기사에 회사 소개가 있으면 어떤 사업을 하는 회사인지 덧붙임
- 문장은 개조식으로 끝냄 (~함, ~됨, ~급등, ~상승 등). 존댓말 금지
- 기사에 없는 내용은 절대 지어내지 않음

예시 출력:
{"keyword": "체코 원전 계약", "reason": "26조원 규모 체코 원전 최종계약 체결 소식에 원자력발전 테마 상승 속 급등\\n관이음쇠 전문 제조업체로 석유화학·조선해양·발전플랜트용 배관재를 생산"}
{"keyword": "지역화폐", "reason": "이재명 정부 출범에 따른 정책 수혜 기대감 지속 등에 지역화폐 테마 상승 속 급등"}`;

/**
 * 기사 → { keyword, reason } 요약
 * @returns {{ keyword: string, reason: string } | null}
 */
async function summarize(stockName, articleTitle, articleBody) {
  const model = process.env.ENRICH_MODEL || DEFAULT_MODEL;
  const content = `종목명: ${stockName}
기사 제목: ${articleTitle}
기사 본문:
${(articleBody || "").slice(0, 4000) || "(본문 추출 실패 — 제목만 참고)"}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SUMMARY_SYSTEM },
        { role: "user", content },
      ],
      temperature: 0.3,
      max_tokens: 2000, // 추론(reasoning) 모델이 JSON 앞에 사고 과정을 붙이는 경우 대비
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  // 추론 텍스트/```json 펜스 등 잡음 속에서 {"keyword"...} 객체만 추출
  const jsonMatch = text.match(/\{\s*"keyword"[\s\S]*?\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.keyword && !parsed.reason) return null;
    return {
      keyword: String(parsed.keyword ?? "").trim(),
      reason: String(parsed.reason ?? "").trim(),
    };
  } catch {
    return null;
  }
}

// === DB ===

let sql = null;
function getDb() {
  if (!process.env.POSTGRES_URL) return null;
  if (!sql) sql = postgres(process.env.POSTGRES_URL, { prepare: false });
  return sql;
}

/** 해당 날짜의 종목 목록 + annotation 상태 조회 */
async function getStocksForDate(db, dateStr) {
  return db`
    SELECT se.id AS entry_id, se.name, se.code,
           sa.id AS ann_id, sa.keyword, sa.reason, sa.source_url, sa.source_title, sa.auto_filled
    FROM stock_entries se
    JOIN search_results sr ON se.search_result_id = sr.id
    LEFT JOIN stock_annotations sa ON sa.stock_entry_id = se.id
    WHERE sr.date = ${dateStr}
    ORDER BY se.id
  `;
}

async function saveEnrichment(db, entryId, annId, article, summary) {
  const keyword = summary?.keyword ?? "";
  const reason = summary?.reason ?? "";
  if (annId) {
    if (summary) {
      await db`
        UPDATE stock_annotations
        SET source_url = ${article.link},
            source_title = ${article.title},
            keyword = ${keyword},
            reason = ${reason},
            auto_filled = true,
            enriched_at = now(),
            updated_at = now()
        WHERE id = ${annId}
      `;
    } else {
      await db`
        UPDATE stock_annotations
        SET source_url = ${article.link},
            source_title = ${article.title},
            auto_filled = true,
            enriched_at = now(),
            updated_at = now()
        WHERE id = ${annId}
      `;
    }
  } else {
    await db`
      INSERT INTO stock_annotations
        (stock_entry_id, source_url, source_title, keyword, reason, auto_filled, enriched_at)
      VALUES (${entryId}, ${article.link}, ${article.title}, ${keyword}, ${reason}, true, now())
    `;
  }
}

// === main ===

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const DRY = args.includes("--dry");
  const FORCE = args.includes("--force");
  const NO_AI = args.includes("--no-ai");
  const dateArg = args.includes("--date") ? args[args.indexOf("--date") + 1] : null;
  const dateStr = dateArg || getCollectionDateStr();

  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    log("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 없어 종료합니다.");
    process.exit(1);
  }

  const AI = !NO_AI && !!process.env.OPENROUTER_API_KEY;
  if (!AI && !NO_AI) {
    log("OPENROUTER_API_KEY 가 없어 AI 요약 없이 기사 링크만 수집합니다.");
  }

  const db = getDb();
  if (!db) {
    log("POSTGRES_URL 이 없어 종료합니다.");
    process.exit(1);
  }

  log(`상승이유 링크 수집 시작 (date=${dateStr}${DRY ? ", dry-run" : ""}${FORCE ? ", force" : ""})`);

  const rows = await getStocksForDate(db, dateStr);
  if (rows.length === 0) {
    log(`date=${dateStr} 수집 데이터가 없습니다.`);
    await db.end();
    return;
  }
  log(`대상 종목 엔트리: ${rows.length}건`);

  // 같은 종목이 여러 조건검색식에 중복될 수 있으므로 종목명 단위로 캐시
  const articleCache = new Map(); // name → article|null
  const summaryCache = new Map(); // name → summary|null
  let found = 0, summarized = 0, notFound = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const manual =
      row.ann_id &&
      row.auto_filled === false &&
      ((row.keyword ?? "") !== "" || (row.reason ?? "") !== "");
    if (manual) {
      skipped++;
      continue; // 수동 입력 보호
    }

    // 이미 링크+요약 모두 있으면 skip (--force 제외)
    const hasLink = !!row.source_url;
    const hasReason = (row.reason ?? "") !== "";
    if (hasLink && (hasReason || !AI) && !FORCE) {
      skipped++;
      continue;
    }

    try {
      // 1) 기사 확보: 저장된 링크 재사용 or 신규 검색
      let article;
      if (hasLink && !FORCE) {
        article = { title: row.source_title ?? "", link: row.source_url };
      } else if (articleCache.has(row.name)) {
        article = articleCache.get(row.name);
      } else {
        article = await findFeatureArticle(row.name, dateStr);
        articleCache.set(row.name, article);
        await sleep(200); // API throttle
      }

      if (!article) {
        notFound++;
        log(`  ✗ ${row.name}: 특징주 기사 없음`);
        continue;
      }
      found++;

      // 2) AI 요약 (종목명 단위 캐시)
      let summary = null;
      if (AI) {
        if (summaryCache.has(row.name)) {
          summary = summaryCache.get(row.name);
        } else {
          const body = await fetchArticleBody(article.link);
          summary = await summarize(row.name, article.title, body);
          summaryCache.set(row.name, summary);
          await sleep(500); // LLM throttle (무료 모델 rate limit 대비)
        }
      }

      if (summary) {
        summarized++;
        log(`  ✓ ${row.name} [${summary.keyword}]`);
        log(`      ${summary.reason.split("\n")[0]}`);
      } else {
        log(`  ✓ ${row.name}: ${article.title}${AI ? " (요약 실패, 링크만)" : ""}`);
      }

      if (!DRY) {
        await saveEnrichment(db, row.entry_id, row.ann_id, article, summary);
      }
    } catch (e) {
      failed++;
      log(`  ! ${row.name}: 오류 - ${e.message}`);
    }
  }

  log(
    `완료: 기사 ${found}건 / AI 요약 ${summarized}건 / 기사 없음 ${notFound}건 / 건너뜀 ${skipped}건 / 오류 ${failed}건` +
      (DRY ? " (dry-run, DB 미반영)" : "")
  );

  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
