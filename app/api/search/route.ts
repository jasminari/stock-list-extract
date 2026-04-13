import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, searchByCondition } from "@/lib/kiwoom";
import { saveResultAsExcel, saveResultAsJson } from "@/lib/storage";
import { isDbConfigured } from "@/lib/db";
import { saveSearchResult } from "@/lib/storage-db";

export async function POST(req: NextRequest) {
  try {
    const { seq, conditionName } = await req.json();
    if (!seq) {
      return NextResponse.json({ error: "seq 값이 필요합니다" }, { status: 400 });
    }

    const { token } = await getAccessToken();
    const stocks = await searchByCondition(token, seq);

    const dateStr = new Date()
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Seoul",
      })
      .replace(/\. /g, "")
      .replace(".", "");

    const fileName = `${dateStr}_${conditionName || seq}`;

    // 파일 기반 저장 (항상)
    await saveResultAsJson(fileName, { seq, conditionName, date: dateStr, stocks });
    const filePath = await saveResultAsExcel(fileName, conditionName || seq, stocks);

    // DB 저장 (설정된 경우)
    let searchResultId: number | null = null;
    if (isDbConfigured()) {
      try {
        searchResultId = await saveSearchResult(dateStr, seq, conditionName || seq, stocks);
      } catch (e) {
        console.error("DB 저장 실패 (파일 저장은 성공):", e);
      }
    }

    return NextResponse.json({
      count: stocks.length,
      fileName: `${fileName}.xlsx`,
      filePath,
      searchResultId,
      stocks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
