/**
 * Oracle VM(고정 IP)에서 상시 실행되는 일봉 차트 프록시 서버.
 *
 * 배포된 웹앱(Vercel)은 서버리스라 출발 IP가 매번 바뀌어 키움 API의
 * "지정단말기" IP 등록 정책을 통과할 수 없다. 이 프록시가 고정 IP를 가진
 * VM에서 대신 키움을 호출해주고, 웹앱은 이 프록시만 호출한다.
 *
 * 등록 방법 (systemd service, timer 아님 — 상시 떠 있어야 함):
 *   /etc/systemd/system/chart-proxy.service 참고 (docs/deploy-oracle.md)
 *
 * 수동 실행:
 *   node scripts/chart-proxy-server.mjs
 */

import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// .env.local 읽기 (auto-extract.mjs와 동일한 방식)
function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    // .env.local 없으면 환경변수(systemd EnvironmentFile 등)에서 직접 읽음
  }
}

function log(msg) {
  const ts = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  console.log(`[${ts}] ${msg}`);
}

async function getToken() {
  const res = await fetch("https://api.kiwoom.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8", "api-id": "au10001" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIWOOM_APP_KEY,
      secretkey: process.env.KIWOOM_SECRET_KEY,
    }),
  });
  const data = await res.json();
  if (data.return_code !== 0) throw new Error(`토큰 발급 실패: ${data.return_msg}`);
  return data.token;
}

/** KST 기준 YYYYMMDD */
function kstDateKey() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

/** 주식일봉차트조회요청(ka10081) — lib/kiwoom.ts의 fetchDailyChart와 동일 로직 */
async function fetchDailyChart(token, code, days = 250) {
  const candles = [];
  let contYn = "N";
  let nextKey = "";
  const maxPages = 10;

  for (let page = 0; page < maxPages && candles.length < days; page++) {
    const res = await fetch("https://api.kiwoom.com/api/dostk/chart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "api-id": "ka10081",
        authorization: `Bearer ${token}`,
        "cont-yn": contYn,
        "next-key": nextKey,
      },
      body: JSON.stringify({ stk_cd: code, base_dt: kstDateKey(), upd_stkpc_tp: "1" }),
    });

    const data = await res.json();
    if (data.return_code !== 0) throw new Error(`일봉 조회 실패: ${data.return_msg}`);

    for (const row of data.stk_dt_pole_chart_qry || []) {
      const dt = String(row.dt || "");
      if (!/^\d{8}$/.test(dt)) continue;
      candles.push({
        date: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`,
        open: Number(String(row.open_pric || "0").replace(/^[+-]/, "")),
        high: Number(String(row.high_pric || "0").replace(/^[+-]/, "")),
        low: Number(String(row.low_pric || "0").replace(/^[+-]/, "")),
        close: Number(String(row.cur_prc || "0").replace(/^[+-]/, "")),
        volume: Number(String(row.trde_qty || "0").replace(/^[+-]/, "")),
        amount: Number(String(row.trde_prica || "0").replace(/^[+-]/, "")),
      });
    }

    contYn = res.headers.get("cont-yn") || "N";
    nextKey = res.headers.get("next-key") || "";
    if (contYn !== "Y") break;
    await new Promise((r) => setTimeout(r, 250));
  }

  candles.sort((a, b) => a.date.localeCompare(b.date));
  return candles.slice(-days);
}

function main() {
  loadEnv();

  const PORT = Number(process.env.CHART_PROXY_PORT || 8787);
  const SECRET = process.env.CHART_PROXY_SECRET;
  if (!SECRET) {
    log("CHART_PROXY_SECRET이 설정되지 않았습니다. 종료합니다.");
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "인증 실패" }));
      return;
    }

    const match = (req.url || "").match(/^\/chart\/(\d{6})$/);
    if (!match) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }

    const code = match[1];
    try {
      const token = await getToken();
      const candles = await fetchDailyChart(token, code, 250);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code, candles }));
      log(`GET /chart/${code} → ${candles.length}건`);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
      log(`GET /chart/${code} 실패: ${err.message}`);
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    log(`차트 프록시 서버 시작 (포트 ${PORT})`);
  });
}

main();
