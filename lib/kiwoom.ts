import WebSocket from "ws";
import type { KiwoomToken, Condition, StockResult } from "./types";

export type { KiwoomToken, Condition, StockResult };

const HTTP_BASE = "https://api.kiwoom.com";
const WS_URL = "wss://api.kiwoom.com:10000/api/dostk/websocket";

// 접근토큰 발급
export async function getAccessToken(): Promise<KiwoomToken> {
  const res = await fetch(`${HTTP_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "api-id": "au10001",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIWOOM_APP_KEY,
      secretkey: process.env.KIWOOM_SECRET_KEY,
    }),
  });

  const data = await res.json();
  if (data.return_code !== 0) {
    throw new Error(`토큰 발급 실패: ${data.return_msg}`);
  }
  return { token: data.token, expires_dt: data.expires_dt };
}

/**
 * 거래대금상위요청(ka10032)으로 종목코드 → 거래대금(백만원) 맵을 만든다.
 *
 * 조건검색(CNSRREQ) 응답에는 거래대금 필드가 아예 없어서(9001/302/10/25/11/12/13/16/17/18이 전부)
 * 별도 TR로 채워야 한다. 한 페이지 100건이며 연속조회로 상위권을 훑는다.
 * 조건검색식이 "거래대금 상위 N" 계열이라 대상 종목은 대부분 이 범위 안에 들어온다.
 */
export async function fetchTradingValueMap(
  token: string,
  maxPages = 10
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let contYn = "N";
  let nextKey = "";

  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(`${HTTP_BASE}/api/dostk/rkinfo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "api-id": "ka10032",
        authorization: `Bearer ${token}`,
        "cont-yn": contYn,
        "next-key": nextKey,
      },
      body: JSON.stringify({
        mrkt_tp: "000", // 전체
        mang_stk_incls: "1", // 관리종목 포함
        stex_tp: "1", // KRX
      }),
    });

    const data = await res.json();
    if (data.return_code !== 0) {
      throw new Error(`거래대금 조회 실패: ${data.return_msg}`);
    }

    for (const row of data.trde_prica_upper || []) {
      // stk_cd는 거래소 접미사가 붙을 수 있다 (039490_NX, 039490_AL)
      const code = String(row.stk_cd || "").replace(/^A/, "").split("_")[0];
      if (code && row.trde_prica != null) {
        map.set(code, String(row.trde_prica).replace(/^[+-]/, ""));
      }
    }

    contYn = res.headers.get("cont-yn") || "N";
    nextKey = res.headers.get("next-key") || "";
    if (contYn !== "Y") break;
    await new Promise((r) => setTimeout(r, 250));
  }

  return map;
}

/** 상장주식수 응답은 시장 전체(약 4300종목, 1.2MB)라 왕복 5초쯤 걸린다 → 당일 캐시 */
let listCountCache: { date: string; map: Map<string, string> } | null = null;

/** KST 기준 YYYYMMDD */
function kstDateKey(): string {
  return new Date(Date.now() + 9 * 3600 * 1000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
}

/**
 * 종목정보 리스트(ka10099)로 종목코드 → 상장주식수(주) 맵을 만든다.
 *
 * 시가총액 = 상장주식수 × 종가 이므로, 종목당 1회 호출이 필요한
 * 주식기본정보요청(ka10001, mac 필드) 대신 이쪽을 쓴다.
 * 시장당 전 종목이 한 응답에 담겨 오므로(연속조회 없음) 총 2회 호출로 끝난다.
 * mrkt_tp: 0=거래소(ETF/ETN/리츠 포함), 10=코스닥
 *
 * 조건검색을 여러 개 돌리면 그때마다 재조회하게 되므로 날짜 단위로 캐시한다.
 * 상장주식수는 증자/분할이 반영되는 날 하루 한 번만 바뀌어 당일 캐시로 충분하다.
 */
export async function fetchListCountMap(
  token: string
): Promise<Map<string, string>> {
  const today = kstDateKey();
  if (listCountCache?.date === today) return listCountCache.map;

  const map = new Map<string, string>();

  for (const mrktTp of ["0", "10"]) {
    const res = await fetch(`${HTTP_BASE}/api/dostk/stkinfo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "api-id": "ka10099",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mrkt_tp: mrktTp }),
    });

    const data = await res.json();
    if (data.return_code !== 0) {
      throw new Error(`종목정보 리스트 조회 실패: ${data.return_msg}`);
    }

    for (const row of data.list || []) {
      const code = String(row.code || "").replace(/^A/, "").split("_")[0];
      // listCount는 zero-padding 문자열 ("0000000027931470")
      const listCount = Number(row.listCount);
      if (code && listCount > 0) {
        map.set(code, String(listCount));
      }
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  listCountCache = { date: today, map };
  return map;
}

// WebSocket 연결 + 로그인 (LOGIN 패킷 전송 후 응답 확인)
function connectWebSocket(token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    ws.once("error", reject);
    ws.once("open", () => {
      // 1단계: 로그인 패킷 전송 (raw token, "Bearer" 없이)
      ws.send(JSON.stringify({ trnm: "LOGIN", token }));

      // 2단계: 로그인 응답 대기
      ws.once("message", (data) => {
        try {
          const res = JSON.parse(data.toString());
          if (res.trnm === "LOGIN") {
            if (res.return_code !== 0) {
              reject(new Error(`WebSocket 로그인 실패: ${res.return_msg}`));
            } else {
              resolve(ws);
            }
          } else {
            reject(new Error(`예상치 못한 초기 응답: ${JSON.stringify(res)}`));
          }
        } catch {
          reject(new Error("로그인 응답 파싱 실패"));
        }
      });
    });
  });
}

// WebSocket으로 메시지 전송 후 응답 수신 (PING은 자동으로 에코)
function sendAndReceive(
  ws: WebSocket,
  payload: object,
  timeoutMs = 10000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("WebSocket 응답 타임아웃"));
    }, timeoutMs);

    const onMessage = (data: WebSocket.RawData) => {
      try {
        const res = JSON.parse(data.toString()) as { trnm?: string };
        // PING은 그대로 에코하고 다음 메시지 대기
        if (res.trnm === "PING") {
          ws.send(JSON.stringify(res));
          ws.once("message", onMessage);
          return;
        }
        clearTimeout(timer);
        resolve(res);
      } catch {
        clearTimeout(timer);
        reject(new Error("응답 파싱 실패"));
      }
    };

    ws.once("message", onMessage);
    ws.send(JSON.stringify(payload));
  });
}

// 조건검색 목록 조회
export async function getConditionList(token: string): Promise<Condition[]> {
  const ws = await connectWebSocket(token);
  try {
    const res = (await sendAndReceive(
      ws,
      { trnm: "CNSRLST" }
    )) as { return_code: number; return_msg: string; data: string[][] };

    if (res.return_code !== 0) {
      throw new Error(`조건검색 목록 조회 실패: ${res.return_msg}`);
    }
    return (res.data || []).map(([seq, name]) => ({ seq, name }));
  } finally {
    ws.close();
  }
}

// 조건검색 실행 (전체 페이지 수집)
export async function searchByCondition(
  token: string,
  seq: string
): Promise<StockResult[]> {
  const ws = await connectWebSocket(token);
  const results: StockResult[] = [];

  // 조건검색 응답에 거래대금이 없으므로 별도 TR로 보충 (실패해도 검색 자체는 진행)
  let tradingValues = new Map<string, string>();
  try {
    tradingValues = await fetchTradingValueMap(token);
  } catch (e) {
    console.warn("거래대금 조회 실패, 종가×거래량 추정치로 대체:", e);
  }

  // 시가총액 계산용 상장주식수 (실패해도 회전율만 빈칸이 되고 검색은 진행)
  let listCounts = new Map<string, string>();
  try {
    listCounts = await fetchListCountMap(token);
  } catch (e) {
    console.warn("상장주식수 조회 실패, 시가총액/회전율 생략:", e);
  }

  try {
    // CNSRLST 먼저 호출 (서버 세션 초기화 목적)
    await sendAndReceive(ws, { trnm: "CNSRLST" }, 10000);

    let contYn = "N";
    let nextKey = "";

    do {
      const payload: Record<string, string> = {
        trnm: "CNSRREQ",
        seq,
        search_type: "0",
        stex_tp: "K",
        cont_yn: contYn,
        next_key: nextKey,
      };

      const res = (await sendAndReceive(ws, payload, 30000)) as {
        return_code: number;
        return_msg: string;
        cont_yn: string;
        next_key: string;
        data: Record<string, string>[];
      };

      if (res.return_code !== 0) {
        throw new Error(`조건검색 실행 실패: ${res.return_msg}`);
      }

      for (const item of res.data || []) {
        const code = (item["9001"] || "").replace(/^A/, "");
        results.push({
          code,
          name: item["302"] || "",
          price: item["10"] || "",
          change_sign: item["25"] || "",
          change: item["11"] || "",
          change_rate: item["12"] || "",
          volume: item["13"] || "",
          // 단위: 백만원 (ka10032). 상위권 밖 종목은 빈 값 → 종가×거래량으로 추정
          trading_amount: tradingValues.get(code) || "",
          list_count: listCounts.get(code) || "",
          open: item["16"] || "",
          high: item["17"] || "",
          low: item["18"] || "",
        });
      }

      contYn = res.cont_yn || "N";
      nextKey = res.next_key || "";
    } while (contYn === "Y");

    return results;
  } finally {
    ws.close();
  }
}
