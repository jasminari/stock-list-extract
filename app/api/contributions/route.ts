import { NextRequest, NextResponse } from "next/server";
import { and, eq, like, ne, or, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db";
import {
  searchResults,
  stockEntries,
  stockAnnotations,
} from "@/lib/db/schema";

/** 연도별 날짜당 상승이유(키워드/이유/기사링크) 등록 건수 — 잔디 그래프용 */
export async function GET(req: NextRequest) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ counts: {} });
    }

    const year = req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear());
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: "유효하지 않은 연도" }, { status: 400 });
    }

    const db = getDb();
    const rows = await db
      .select({
        date: searchResults.date,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(stockAnnotations)
      .innerJoin(stockEntries, eq(stockAnnotations.stockEntryId, stockEntries.id))
      .innerJoin(searchResults, eq(stockEntries.searchResultId, searchResults.id))
      .where(
        and(
          like(searchResults.date, `${year}%`),
          or(
            ne(stockAnnotations.reason, ""),
            ne(stockAnnotations.keyword, ""),
            ne(stockAnnotations.sourceUrl, "")
          )
        )
      )
      .groupBy(searchResults.date);

    // "YYYYMMDD" → "YYYY-MM-DD" 키의 카운트 맵
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const d = r.date;
      counts[`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`] = Number(r.count);
    }

    return NextResponse.json({ counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
