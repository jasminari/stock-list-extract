/**
 * 지정한 날짜의 종목별 "당일·전일 거래대금"을 키움 일봉(ka10081)에서 받아 JSON으로 출력한다.
 *
 * 키움은 등록된 IP에서만 응답하므로 Oracle VM에서 실행한다:
 *   CODES_JSON='{"20261113":["005930","000660"]}' node scripts/fetch-prev-trading-value.mjs
 *
 * 출력: { "YYYYMMDD": { "종목코드": [당일 억원, 전일 억원] } }
 *
 * 현재는 "거래대금 전일 대비" 미리보기용 스냅샷(data/prev-trading-value.json)을 만드는 데만 쓴다.
 * 정식 기능이 되면 매일 자동 수집 단계에서 전일 거래대금을 함께 저장하도록 옮겨야 한다.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = process.env.STOCK_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !(key.trim() in process.env))
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // 환경변수에서 직접 읽는다
}

const input = JSON.parse(process.env.CODES_JSON || "{}");
const BASE = "https://api.kiwoom.com";
const json = { "Content-Type": "application/json;charset=UTF-8" };

const tokenData = await (
  await fetch(`${BASE}/oauth2/token`, {
    method: "POST",
    headers: { ...json, "api-id": "au10001" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIWOOM_APP_KEY,
      secretkey: process.env.KIWOOM_SECRET_KEY,
    }),
  })
).json();
if (tokenData.return_code !== 0) throw new Error(`토큰 발급 실패: ${tokenData.return_msg}`);

const num = (v) => Number(String(v || "0").replace(/^[+-]/, ""));
const out = {};
for (const [date, codes] of Object.entries(input)) {
  out[date] = {};
  for (const code of codes) {
    if (!/^\d{6}$/.test(code)) continue;
    try {
      const res = await fetch(`${BASE}/api/dostk/chart`, {
        method: "POST",
        headers: { ...json, "api-id": "ka10081", authorization: `Bearer ${tokenData.token}`, "cont-yn": "N", "next-key": "" },
        body: JSON.stringify({ stk_cd: code, base_dt: date, upd_stkpc_tp: "1" }),
      });
      const data = await res.json();
      const rows = (data.stk_dt_pole_chart_qry || []).filter((r) => /^\d{8}$/.test(r.dt) && r.dt <= date);
      // 거래대금 단위는 백만원 → 억원
      if (rows[0]?.dt === date && rows[1]) {
        out[date][code] = [Math.round(num(rows[0].trde_prica) / 100), Math.round(num(rows[1].trde_prica) / 100)];
      }
    } catch (err) {
      console.error(`${date} ${code} 실패: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}
console.log(JSON.stringify(out));
