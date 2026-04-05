import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, searchByCondition } from "@/lib/kiwoom";
import { saveResultAsExcel, saveResultAsJson } from "@/lib/storage";

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
    await saveResultAsJson(fileName, { seq, conditionName, date: dateStr, stocks });
    const filePath = await saveResultAsExcel(fileName, conditionName || seq, stocks);

    return NextResponse.json({
      count: stocks.length,
      fileName: `${fileName}.xlsx`,
      filePath,
      stocks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
