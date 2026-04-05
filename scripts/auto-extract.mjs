/**
 * 매일 20:10 crontab으로 실행되는 자동 조건검색 추출 스크립트
 *
 * 등록 방법:
 *   crontab -e
 *   10 20 * * 1-5 cd /Users/jangssukmin/Documents/Github/Stock_List_Extract && node scripts/auto-extract.mjs >> logs/auto-extract.log 2>&1
 *
 * 수동 실행:
 *   node scripts/auto-extract.mjs
 *   node scripts/auto-extract.mjs --seq 0          # 특정 조건식 번호 지정
 *   node scripts/auto-extract.mjs --all             # 모든 조건식 실행
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import WebSocket from "ws";
import * as XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");

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

function wsConnect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://api.kiwoom.com:10000/api/dostk/websocket", {
      headers: { authorization: `Bearer ${token}` },
    });
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

function sendRecv(ws, body, apiId, token, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("타임아웃")), timeout);
    ws.once("message", (data) => {
      clearTimeout(t);
      resolve(JSON.parse(data.toString()));
    });
    ws.send(JSON.stringify({ header: { "api-id": apiId, authorization: `Bearer ${token}` }, body }));
  });
}

async function getConditions(ws, token) {
  const res = await sendRecv(ws, { trnm: "CNSRLST" }, "ka10171", token);
  if (res.return_code !== 0) throw new Error(`조건 목록 실패: ${res.return_msg}`);
  return (res.data || []).map(([seq, name]) => ({ seq, name }));
}

async function searchCondition(ws, token, seq) {
  const stocks = [];
  let contYn = "N", nextKey = "";
  do {
    const res = await sendRecv(
      ws,
      { trnm: "CNSRREQ", seq, search_type: "0", stex_tp: "K", cont_yn: contYn, next_key: nextKey },
      "ka10172",
      token
    );
    if (res.return_code !== 0) throw new Error(`조건검색 실패: ${res.return_msg}`);
    for (const item of res.data || []) {
      stocks.push({
        종목코드: (item["9001"] || "").replace(/^A/, ""),
        종목명: item["302"] || "",
        현재가: Number((item["10"] || "0").replace(/^[+-]/, "")),
        전일대비: item["11"] || "",
        등락율: item["12"] || "",
        누적거래량: Number(item["13"] || "0"),
        시가: Number((item["16"] || "0").replace(/^[+-]/, "")),
        고가: Number((item["17"] || "0").replace(/^[+-]/, "")),
        저가: Number((item["18"] || "0").replace(/^[+-]/, "")),
      });
    }
    contYn = res.cont_yn || "N";
    nextKey = res.next_key || "";
  } while (contYn === "Y");
  return stocks;
}

function saveExcel(fileName, sheetName, rows) {
  mkdirSync(DATA_DIR, { recursive: true });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const filePath = join(DATA_DIR, `${fileName}.xlsx`);
  XLSX.writeFile(wb, filePath);
  return filePath;
}

function saveJson(fileName, data) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, `${fileName}.json`), JSON.stringify(data, null, 2), "utf-8");
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const runAll = args.includes("--all");
  const seqArg = args.includes("--seq") ? args[args.indexOf("--seq") + 1] : null;

  const dateStr = new Date()
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" })
    .replace(/\. /g, "").replace(".", "");

  log("자동 추출 시작");

  const token = await getToken();
  log("토큰 발급 완료");

  const ws = await wsConnect(token);
  const conditions = await getConditions(ws, token);
  log(`조건검색식 ${conditions.length}개 확인: ${conditions.map((c) => c.name).join(", ")}`);

  // 실행할 조건식 결정: --all이면 전체, --seq이면 해당 번호, 기본은 첫 번째
  const targets = runAll
    ? conditions
    : seqArg
    ? conditions.filter((c) => c.seq === seqArg)
    : [conditions[0]];

  for (const cond of targets) {
    try {
      log(`[${cond.name}] 조건검색 실행 중...`);
      const stocks = await searchCondition(ws, token, cond.seq);
      const fileName = `${dateStr}_${cond.name}`;
      saveJson(fileName, { seq: cond.seq, conditionName: cond.name, date: dateStr, stocks: stocks.map(s => ({
        code: s.종목코드, name: s.종목명,
        price: String(s.현재가), change_sign: "", change: s.전일대비,
        change_rate: s.등락율, volume: String(s.누적거래량),
        open: String(s.시가), high: String(s.고가), low: String(s.저가),
      }))});
      const path = saveExcel(fileName, cond.name, stocks);
      log(`[${cond.name}] ${stocks.length}종목 → ${path}`);
    } catch (err) {
      log(`[${cond.name}] 오류: ${err.message}`);
    }
  }

  ws.close();
  log("완료");
}

main().catch((err) => {
  log(`치명적 오류: ${err.message}`);
  process.exit(1);
});
