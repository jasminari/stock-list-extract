import { getBusinessProfiles } from "@/lib/business-profile";
import { getDb } from "@/lib/db";
import { searchResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
    const [result] = await getDb().select({date:searchResults.date}).from(searchResults).where(eq(searchResults.id,searchResultId)).limit(1);
    if(result) {
      const profiles = await getBusinessProfiles(stocks.map(s=>s.code),result.date);
      for(const stock of stocks) stock.businessProfile = profiles.get(stock.code);
    }
    return NextResponse.json({ stocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
