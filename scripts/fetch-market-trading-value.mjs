/**
 * 코스피·코스닥의 일별 총 거래대금을 키움 업종일봉(ka20006)에서 받아 JSON으로 출력한다.
 *
 * 키움은 등록된 IP에서만 응답하므로 Oracle VM에서 실행한다:
 *   node scripts/fetch-market-trading-value.mjs > market-trading-value.json
 *
 * 출력: { "YYYYMMDD": [코스피 억원, 코스닥 억원], ... }  (한 번에 최근 약 600거래일)
 * 장중에 실행하면 당일 값은 그 시각까지의 누적이므로, 장 마감(15:30 KST) 전에는 당일을 뺀다.
 *
 * 현재는 "시장 대비 비중" 미리보기용 스냅샷(data/market-trading-value.json)을 만드는 데만 쓴다.
 * 정식 기능이 되면 매일 자동 수집 단계에서 DB에 저장하도록 옮겨야 한다.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = process.env.STOCK_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // 환경변수에서 직접 읽는다
}

const BASE = "https://api.kiwoom.com";
const json = { "Content-Type": "application/json;charset=UTF-8" };

const tokenRes = await fetch(`${BASE}/oauth2/token`, {
  method: "POST",
  headers: { ...json, "api-id": "au10001" },
  body: JSON.stringify({
    grant_type: "client_credentials",
    appkey: process.env.KIWOOM_APP_KEY,
    secretkey: process.env.KIWOOM_SECRET_KEY,
  }),
});
const tokenData = await tokenRes.json();
if (tokenData.return_code !== 0) throw new Error(`토큰 발급 실패: ${tokenData.return_msg}`);

const kst = new Date(Date.now() + 9 * 3600 * 1000);
const today = kst.toISOString().slice(0, 10).replace(/-/g, "");
const marketClosed = kst.getUTCHours() * 60 + kst.getUTCMinutes() >= 15 * 60 + 40;

/** 업종코드 001 = 코스피 종합, 101 = 코스닥 종합. 거래대금 단위는 백만원 */
async function fetchIndexDaily(indsCd) {
  const res = await fetch(`${BASE}/api/dostk/chart`, {
    method: "POST",
    headers: { ...json, "api-id": "ka20006", authorization: `Bearer ${tokenData.token}`, "cont-yn": "N", "next-key": "" },
    body: JSON.stringify({ inds_cd: indsCd, base_dt: today }),
  });
  const data = await res.json();
  if (data.return_code !== 0) throw new Error(`업종일봉 조회 실패(${indsCd}): ${data.return_msg}`);
  const map = new Map();
  for (const row of data.inds_dt_pole_qry || []) {
    if (!/^\d{8}$/.test(row.dt)) continue;
    map.set(row.dt, Math.round(Number(row.trde_prica) / 100));
  }
  return map;
}

const kospi = await fetchIndexDaily("001");
await new Promise((r) => setTimeout(r, 400));
const kosdaq = await fetchIndexDaily("101");

const out = {};
for (const dt of [...kospi.keys()].sort()) {
  if (dt === today && !marketClosed) continue;
  if (kosdaq.has(dt)) out[dt] = [kospi.get(dt), kosdaq.get(dt)];
}
console.log(JSON.stringify(out));
