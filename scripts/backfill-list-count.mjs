/**
 * 기존 stock_entries 행에 상장주식수(list_count)를 소급 채우는 일회성 스크립트.
 *
 * 회전율(거래대금 ÷ 시가총액) 기능은 2026-08-25부터 수집분에만 상장주식수를 남기므로,
 * 그 이전 데이터는 화면에서 회전율이 "-"로 비어 있다. 과거 데이터를 보는 게
 * "시장 공부하기" 화면의 목적이라 근사치로라도 채워둔다.
 *
 * ⚠️ 한계: 키움 ka10099는 **현재 시점** 상장주식수만 준다. 과거 날짜 이후 증자·액면분할이
 * 있었던 종목은 그 시점 실제 시가총액과 어긋난다. 이미 값이 있는 행은 건드리지 않는다.
 *
 * 사용법:
 *   node scripts/backfill-list-count.mjs           # dry-run (변경 건수만 출력)
 *   node scripts/backfill-list-count.mjs --apply   # 실제 UPDATE
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

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

async function getListCountMap() {
  const tRes = await fetch("https://api.kiwoom.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8", "api-id": "au10001" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIWOOM_APP_KEY,
      secretkey: process.env.KIWOOM_SECRET_KEY,
    }),
  });
  const tData = await tRes.json();
  if (tData.return_code !== 0) throw new Error(`토큰 발급 실패: ${tData.return_msg}`);

  const map = new Map();
  for (const mrktTp of ["0", "10"]) {
    const res = await fetch("https://api.kiwoom.com/api/dostk/stkinfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "api-id": "ka10099",
        authorization: `Bearer ${tData.token}`,
      },
      body: JSON.stringify({ mrkt_tp: mrktTp }),
    });
    const data = await res.json();
    if (data.return_code !== 0) throw new Error(`상장주식수 조회 실패: ${data.return_msg}`);
    for (const row of data.list || []) {
      const code = String(row.code || "").replace(/^A/, "").split("_")[0];
      const listCount = Number(row.listCount);
      if (code && listCount > 0) map.set(code, String(listCount));
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return map;
}

async function main() {
  loadEnv();
  if (!process.env.POSTGRES_URL) throw new Error("POSTGRES_URL 없음");

  const map = await getListCountMap();
  console.log(`키움 상장주식수: ${map.size}종목`);

  const sql = postgres(process.env.POSTGRES_URL, { ssl: "require" });

  const targets = await sql`
    SELECT code, COUNT(*)::int AS rows
    FROM stock_entries
    WHERE list_count IS NULL OR list_count = ''
    GROUP BY code`;

  const hit = targets.filter((t) => map.has(t.code));
  const miss = targets.filter((t) => !map.has(t.code));
  const hitRows = hit.reduce((a, t) => a + t.rows, 0);
  const missRows = miss.reduce((a, t) => a + t.rows, 0);

  console.log(`대상: ${targets.length}종목 / ${hitRows + missRows}행`);
  console.log(`  매칭  ${hit.length}종목 / ${hitRows}행 → 갱신 예정`);
  console.log(`  미매칭 ${miss.length}종목 / ${missRows}행 → 건너뜀 (상장폐지 등)`);
  if (miss.length) {
    console.log(`  미매칭 코드: ${miss.map((m) => m.code).slice(0, 30).join(", ")}${miss.length > 30 ? " ..." : ""}`);
  }

  if (!APPLY) {
    console.log("\n[dry-run] --apply 를 붙이면 실제로 UPDATE 합니다.");
    await sql.end();
    return;
  }

  // 종목 단위로 묶어 UPDATE (행 7천여 건이라 200종목씩 나눠 처리)
  let updated = 0;
  for (let i = 0; i < hit.length; i += 200) {
    const chunk = hit.slice(i, i + 200);
    const res = await sql`
      UPDATE stock_entries se
      SET list_count = t.lc
      FROM unnest(
        ${chunk.map((c) => c.code)}::text[],
        ${chunk.map((c) => map.get(c.code))}::text[]
      ) AS t(code, lc)
      WHERE se.code = t.code AND (se.list_count IS NULL OR se.list_count = '')`;
    updated += res.count;
    console.log(`  ${Math.min(i + 200, hit.length)}/${hit.length}종목 처리, 누적 ${updated}행`);
  }

  console.log(`\n완료: ${updated}행 갱신`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
