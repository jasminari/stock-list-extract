import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getSearchResultStocks } from "@/lib/storage-db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: "DB가 설정되지 않았습니다" },
        { status: 503 }
      );
    }

    const { id } = await params;
    const searchResultId = Number(id);
    if (isNaN(searchResultId)) {
      return NextResponse.json({ error: "유효하지 않은 ID" }, { status: 400 });
    }

    const stocks = await getSearchResultStocks(searchResultId);
    return NextResponse.json({ stocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
