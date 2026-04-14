/**
 * 매일 20:10 crontab으로 실행되는 자동 조건검색 추출 스크립트
 *
 * 등록 방법:
 *   crontab -e
 *   10 20 * * 1-5 cd /Users/jangssukmin/github/stock-list-extract && node scripts/auto-extract.mjs >> logs/auto-extract.log 2>&1
 *
 * 수동 실행:
 *   node scripts/auto-extract.mjs              # DB에 등록된 조건검색식만 실행
 *   node scripts/auto-extract.mjs --all        # 키움의 모든 조건식 실행
 *   node scripts/auto-extract.mjs --seq 0      # 특정 조건식 번호 지정
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import WebSocket from "ws";
import * as XLSX from "xlsx";
import postgres from "postgres";

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

// === DB 관련 ===

let sql = null;

function getDb() {
  if (!process.env.POSTGRES_URL) {
    return null;
  }
  if (!sql) {
    sql = postgres(process.env.POSTGRES_URL, { prepare: false });
  }
  return sql;
}

async function getRegisteredConditions() {
  const db = getDb();
  if (!db) return null;
  const rows = await db`SELECT seq, name FROM registered_conditions ORDER BY registered_at DESC`;
  return rows.map((r) => ({ seq: r.seq, name: r.name }));
}

async function saveToDb(dateStr, seq, conditionName, stocks) {
  const db = getDb();
  if (!db) return;

  const [result] = await db`
    INSERT INTO search_results (date, condition_seq, condition_name)
    VALUES (${dateStr}, ${seq}, ${conditionName})
    RETURNING id
  `;

  if (stocks.length > 0) {
    const entries = stocks.map((s) => ({
      search_result_id: result.id,
      code: s.종목코드,
      name: s.종목명,
      price: String(s.현재가),
      change_sign: "",
      change: s.전일대비,
      change_rate: s.등락율,
      volume: String(s.누적거래량),
      trading_amount: String(s.거래대금_천원),
      open: String(s.시가),
      high: String(s.고가),
      low: String(s.저가),
    }));

    await db`INSERT INTO stock_entries ${db(entries, "search_result_id", "code", "name", "price", "change_sign", "change", "change_rate", "volume", "trading_amount", "open", "high", "low")}`;
  }

  log(`[DB] ${conditionName}: ${stocks.length}종목 저장 완료 (id: ${result.id})`);
}

async function saveExtractionLog(dateStr, seq, conditionName, stockCount, status, errorMessage) {
  const db = getDb();
  if (!db) return;
  await db`
    INSERT INTO extraction_logs (date, condition_seq, condition_name, stock_count, status, error_message)
    VALUES (${dateStr}, ${seq}, ${conditionName}, ${stockCount}, ${status}, ${errorMessage || null})
  `;
}

// === 키움 API ===

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

// WebSocket 연결 + LOGIN 패킷 전송
function wsConnect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://api.kiwoom.com:10000/api/dostk/websocket");
    ws.once("error", reject);
    ws.once("open", () => {
      // LOGIN 패킷 전송 (raw token, "Bearer" 없이)
      ws.send(JSON.stringify({ trnm: "LOGIN", token }));
      ws.once("message", (data) => {
        try {
          const res = JSON.parse(data.toString());
          if (res.trnm === "LOGIN" && res.return_code === 0) {
            resolve(ws);
          } else {
            reject(new Error(`WebSocket 로그인 실패: ${res.return_msg || "알 수 없는 오류"}`));
          }
        } catch {
          reject(new Error("로그인 응답 파싱 실패"));
        }
      });
    });
  });
}

// 메시지 전송 후 응답 수신 (PING 자동 에코)
function sendRecv(ws, payload, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("타임아웃")), timeout);
    const onMessage = (data) => {
      try {
        const res = JSON.parse(data.toString());
        if (res.trnm === "PING") {
          ws.send(JSON.stringify(res));
          ws.once("message", onMessage);
          return;
        }
        clearTimeout(t);
        resolve(res);
      } catch {
        clearTimeout(t);
        reject(new Error("응답 파싱 실패"));
      }
    };
    ws.once("message", onMessage);
    ws.send(JSON.stringify(payload));
  });
}

async function getConditions(ws) {
  const res = await sendRecv(ws, { trnm: "CNSRLST" });
  if (res.return_code !== 0) throw new Error(`조건 목록 실패: ${res.return_msg}`);
  return (res.data || []).map(([seq, name]) => ({ seq, name }));
}

async function searchCondition(ws, seq) {
  const stocks = [];
  let contYn = "N", nextKey = "";

  // CNSRLST 먼저 호출 (서버 세션 초기화)
  await sendRecv(ws, { trnm: "CNSRLST" }, 10000);

  do {
    const res = await sendRecv(
      ws,
      { trnm: "CNSRREQ", seq, search_type: "0", stex_tp: "K", cont_yn: contYn, next_key: nextKey },
      30000
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
        거래대금_천원: Number(item["1043"] || "0"),
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

// === 파일 저장 ===

function saveExcel(fileName, sheetName, rows) {
  mkdirSync(DATA_DIR, { recursive: true });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
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

// === 메인 ===

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const runAll = args.includes("--all");
  const seqArg = args.includes("--seq") ? args[args.indexOf("--seq") + 1] : null;
  const dateArg = args.includes("--date") ? args[args.indexOf("--date") + 1] : null;

  const dateStr = dateArg || new Date()
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" })
    .replace(/\. /g, "").replace(".", "");

  log("자동 추출 시작");

  const token = await getToken();
  log("토큰 발급 완료");

  const ws = await wsConnect(token);
  log("WebSocket 로그인 완료");
  const allConditions = await getConditions(ws);
  log(`키움 조건검색식 ${allConditions.length}개 확인: ${allConditions.map((c) => c.name).join(", ")}`);

  // 실행할 조건식 결정
  let targets;
  if (runAll) {
    targets = allConditions;
    log("모드: --all (전체 조건검색식 실행)");
  } else if (seqArg) {
    targets = allConditions.filter((c) => c.seq === seqArg);
    log(`모드: --seq ${seqArg}`);
  } else {
    // 기본: DB에 등록된 조건검색식만
    const registered = await getRegisteredConditions();
    if (registered && registered.length > 0) {
      const registeredSeqs = new Set(registered.map((r) => r.seq));
      targets = allConditions.filter((c) => registeredSeqs.has(c.seq));
      log(`모드: DB 등록 조건검색식 (${targets.length}개)`);
    } else {
      // DB 미설정이거나 등록된 조건 없으면 전체 실행
      targets = allConditions;
      log("모드: DB 등록 조건 없음 → 전체 실행");
    }
  }

  if (targets.length === 0) {
    log("실행할 조건검색식이 없습니다.");
    ws.close();
    return;
  }

  for (const cond of targets) {
    try {
      log(`[${cond.name}] 조건검색 실행 중...`);
      const stocks = await searchCondition(ws, cond.seq);
      const fileName = `${dateStr}_${cond.name}`;

      // JSON 저장
      saveJson(fileName, {
        seq: cond.seq, conditionName: cond.name, date: dateStr,
        stocks: stocks.map((s) => ({
          code: s.종목코드, name: s.종목명,
          price: String(s.현재가), change_sign: "", change: s.전일대비,
          change_rate: s.등락율, volume: String(s.누적거래량),
          trading_amount: String(s.거래대금_천원),
          open: String(s.시가), high: String(s.고가), low: String(s.저가),
        })),
      });

      // Excel 저장
      const path = saveExcel(fileName, cond.name, stocks);
      log(`[${cond.name}] ${stocks.length}종목 → ${path}`);

      // DB 저장
      try {
        await saveToDb(dateStr, cond.seq, cond.name, stocks);
      } catch (dbErr) {
        log(`[${cond.name}] DB 저장 실패: ${dbErr.message}`);
      }

      // 수집 로그 기록 (성공)
      try {
        await saveExtractionLog(dateStr, cond.seq, cond.name, stocks.length, "success");
      } catch (logErr) {
        log(`[${cond.name}] 로그 기록 실패: ${logErr.message}`);
      }
    } catch (err) {
      log(`[${cond.name}] 오류: ${err.message}`);
      // 수집 로그 기록 (실패)
      try {
        await saveExtractionLog(dateStr, cond.seq, cond.name, 0, "error", err.message);
      } catch (logErr) {
        log(`[${cond.name}] 로그 기록 실패: ${logErr.message}`);
      }
    }
  }

  ws.close();
  if (sql) await sql.end();
  log("완료");
}

main().catch((err) => {
  log(`치명적 오류: ${err.message}`);
  if (sql) sql.end().then(() => process.exit(1));
  else process.exit(1);
});
