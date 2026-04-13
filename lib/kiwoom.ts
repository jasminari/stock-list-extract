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
        results.push({
          code: (item["9001"] || "").replace(/^A/, ""),
          name: item["302"] || "",
          price: item["10"] || "",
          change_sign: item["25"] || "",
          change: item["11"] || "",
          change_rate: item["12"] || "",
          volume: item["13"] || "",
          trading_amount: item["1043"] || "",
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
