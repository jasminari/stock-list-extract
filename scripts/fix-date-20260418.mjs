/**
 * 새벽 수집으로 날짜가 잘못 저장된 레코드 수정
 *   20260418 → 20260417 (search_results, extraction_logs)
 *
 * 실행:
 *   node scripts/fix-date-20260418.mjs --dry     # 변경 대상만 출력
 *   node scripts/fix-date-20260418.mjs           # 실제 업데이트
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

try {
  const raw = readFileSync(join(ROOT, ".env.local"), "utf-8");
  for (const line of raw.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {}

if (!process.env.POSTGRES_URL) {
  console.error("POSTGRES_URL 환경변수가 필요합니다.");
  process.exit(1);
}

const OLD_DATE = "20260418";
const NEW_DATE = "20260417";
const DRY = process.argv.includes("--dry");

const sql = postgres(process.env.POSTGRES_URL, { prepare: false });

try {
  const results = await sql`
    SELECT id, date, condition_name, created_at
    FROM search_results
    WHERE date = ${OLD_DATE}
    ORDER BY created_at
  `;
  const logs = await sql`
    SELECT id, date, condition_name, status, created_at
    FROM extraction_logs
    WHERE date = ${OLD_DATE}
    ORDER BY created_at
  `;

  console.log(`[대상] search_results: ${results.length}건`);
  for (const r of results) {
    console.log(`  - id=${r.id}, cond=${r.condition_name}, createdAt=${r.created_at?.toISOString?.() ?? r.created_at}`);
  }
  console.log(`[대상] extraction_logs: ${logs.length}건`);
  for (const r of logs) {
    console.log(`  - id=${r.id}, cond=${r.condition_name}, status=${r.status}, createdAt=${r.created_at?.toISOString?.() ?? r.created_at}`);
  }

  if (DRY) {
    console.log("\n--dry 모드: 변경 없음");
    await sql.end();
    process.exit(0);
  }

  const r1 = await sql`UPDATE search_results SET date = ${NEW_DATE} WHERE date = ${OLD_DATE}`;
  const r2 = await sql`UPDATE extraction_logs SET date = ${NEW_DATE} WHERE date = ${OLD_DATE}`;
  console.log(`\n[완료] search_results: ${r1.count}건, extraction_logs: ${r2.count}건 업데이트`);
} finally {
  await sql.end();
}
