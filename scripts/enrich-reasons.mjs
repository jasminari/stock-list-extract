/**
 * 수집된 종목에 "특징주" 뉴스 기사 링크를 자동으로 달아주는 스크립트 (Phase 1)
 *
 * 동작:
 *   1. 해당 날짜의 stock_entries 조회 (수동 입력/이미 처리된 종목은 skip)
 *   2. 네이버 뉴스 API로 「특징주 <종목명>」 검색 (sort=date)
 *   3. pubDate가 수집일(KST)인 기사만 필터, 제목에 종목명 포함 우선
 *   4. stock_annotations에 source_url / source_title 저장 (auto_filled=true)
 *
 * 실행:
 *   node scripts/enrich-reasons.mjs                  # 오늘(수집 기준일) 대상
 *   node scripts/enrich-reasons.mjs --date 20260724  # 특정 날짜
 *   node scripts/enrich-reasons.mjs --dry            # DB 쓰기 없이 결과만 출력
 *   node scripts/enrich-reasons.mjs --force          # 자동 작성분 재검색 (수동 입력은 보호)
 *
 * 필요 env: POSTGRES_URL, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
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
           sa.id AS ann_id, sa.keyword, sa.reason, sa.source_url, sa.auto_filled
    FROM stock_entries se
    JOIN search_results sr ON se.search_result_id = sr.id
    LEFT JOIN stock_annotations sa ON sa.stock_entry_id = se.id
    WHERE sr.date = ${dateStr}
    ORDER BY se.id
  `;
}

async function saveArticle(db, entryId, annId, article) {
  if (annId) {
    await db`
      UPDATE stock_annotations
      SET source_url = ${article.link},
          source_title = ${article.title},
          auto_filled = true,
          enriched_at = now(),
          updated_at = now()
      WHERE id = ${annId}
    `;
  } else {
    await db`
      INSERT INTO stock_annotations
        (stock_entry_id, source_url, source_title, auto_filled, enriched_at)
      VALUES (${entryId}, ${article.link}, ${article.title}, true, now())
    `;
  }
}

// === main ===

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const DRY = args.includes("--dry");
  const FORCE = args.includes("--force");
  const dateArg = args.includes("--date") ? args[args.indexOf("--date") + 1] : null;
  const dateStr = dateArg || getCollectionDateStr();

  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    log("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 없어 종료합니다.");
    process.exit(1);
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

  // 같은 종목이 여러 조건검색식에 중복될 수 있으므로 종목명 단위로 뉴스 검색 캐시
  const articleCache = new Map(); // name → article|null
  let found = 0, notFound = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const manual =
      row.ann_id &&
      row.auto_filled === false &&
      ((row.keyword ?? "") !== "" || (row.reason ?? "") !== "");
    if (manual) {
      skipped++;
      continue; // 수동 입력 보호
    }
    if (row.source_url && !FORCE) {
      skipped++;
      continue; // 이미 링크 있음
    }

    try {
      let article;
      if (articleCache.has(row.name)) {
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
      log(`  ✓ ${row.name}: ${article.title}`);
      log(`      ${article.link}`);

      if (!DRY) {
        await saveArticle(db, row.entry_id, row.ann_id, article);
      }
    } catch (e) {
      failed++;
      log(`  ! ${row.name}: 오류 - ${e.message}`);
    }
  }

  log(
    `완료: 링크 저장 ${found}건 / 기사 없음 ${notFound}건 / 건너뜀 ${skipped}건 / 오류 ${failed}건` +
      (DRY ? " (dry-run, DB 미반영)" : "")
  );

  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
