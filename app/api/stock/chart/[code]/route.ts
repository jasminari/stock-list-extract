import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, fetchDailyChart } from "@/lib/kiwoom";
import { isDbConfigured } from "@/lib/db";
import { getStockAppearanceDates } from "@/lib/storage-db";

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
    const { token } = await getAccessToken();
    const candles = await fetchDailyChart(token, code, 250);

    // 시장 공부하기 리스트(과거 조건검색 결과)에 이 종목이 등장했던 날짜.
    // 실패해도 차트 자체는 보여줘야 하므로 별도로 감싼다.
    let appearances: string[] = [];
    if (isDbConfigured()) {
      try {
        const dates = await getStockAppearanceDates(code);
        appearances = dates.map(
          (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
        );
      } catch (e) {
        console.warn("출현일 조회 실패:", e);
      }
    }

    return NextResponse.json({ code, candles, appearances });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
