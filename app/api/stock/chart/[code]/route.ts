import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, fetchDailyChart } from "@/lib/kiwoom";
import { isDbConfigured } from "@/lib/db";
import { getStockChartArticles } from "@/lib/storage-db";
import type { DailyCandle } from "@/lib/types";

/**
 * 배포 환경(Vercel)은 서버리스라 출발 IP가 매번 바뀌어 키움의 "지정단말기"
 * IP 등록을 통과하지 못한다. CHART_PROXY_URL이 설정돼 있으면 고정 IP를 가진
 * Oracle VM의 프록시(scripts/chart-proxy-server.mjs)를 대신 호출하고,
 * 없으면(로컬 개발 등록된 네트워크) 기존처럼 키움을 직접 호출한다.
 */
async function fetchCandles(code: string): Promise<DailyCandle[]> {
  const proxyUrl = process.env.CHART_PROXY_URL;
  if (proxyUrl) {
    const res = await fetch(`${proxyUrl.replace(/\/$/, "")}/chart/${code}`, {
      headers: { authorization: `Bearer ${process.env.CHART_PROXY_SECRET}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "차트 프록시 조회 실패");
    }
    return data.candles;
  }

  const { token } = await getAccessToken();
  return fetchDailyChart(token, code, 250);
}

/**
 * 종목 클릭 시 모달에 띄울 일봉.
 * 1년치를 미리 로드해두면 모달은 최근 3개월만 보여주고, 왼쪽으로 스크롤하면
 * 이미 로드된 과거 데이터를 추가 요청 없이 바로 보여줄 수 있다.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "code는 6자리 종목코드여야 합니다" },
      { status: 400 }
    );
  }

  try {
    const candles = await fetchCandles(code);

    // 상승이유 기사가 붙었던 날짜. 실패해도 차트 자체는 보여줘야 하므로 별도로 감싼다.
    let articleDates: string[] = [];
    let articles: Awaited<ReturnType<typeof getStockChartArticles>> = [];
    if (isDbConfigured()) {
      try {
        const rows = await getStockChartArticles(code);
        articles = rows.map((row) => ({ ...row,
          date: `${row.date.slice(0, 4)}-${row.date.slice(4, 6)}-${row.date.slice(6, 8)}`,
        }));
        articleDates = [...new Set(articles.map((row) => row.date))];
      } catch (e) {
        console.warn("기사 등장일 조회 실패:", e);
      }
    }

    return NextResponse.json({ code, candles, articleDates, articles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
