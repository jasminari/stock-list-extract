import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  searchResults,
  stockEntries,
  stockAnnotations,
} from "./db/schema";
import type { StockResult } from "./types";

export async function saveSearchResult(
  date: string,
  conditionSeq: string,
  conditionName: string,
  stocks: StockResult[]
): Promise<number> {
  const db = getDb();

  const [result] = await db
    .insert(searchResults)
    .values({ date, conditionSeq, conditionName })
    .returning({ id: searchResults.id });

  if (stocks.length > 0) {
    await db.insert(stockEntries).values(
      stocks.map((s) => ({
        searchResultId: result.id,
        code: s.code,
        name: s.name,
        price: s.price,
        changeSign: s.change_sign,
        change: s.change,
        changeRate: s.change_rate,
        volume: s.volume,
        tradingAmount: s.trading_amount || "",
        open: s.open,
        high: s.high,
        low: s.low,
      }))
    );
  }

  return result.id;
}

import type { DbResultMeta, StockEntryWithAnnotation } from "./types";

export type { DbResultMeta };

export async function listSearchResults(): Promise<DbResultMeta[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: searchResults.id,
      date: searchResults.date,
      conditionName: searchResults.conditionName,
      createdAt: searchResults.createdAt,
      count: sql<number>`count(${stockEntries.id})`.as("count"),
    })
    .from(searchResults)
    .leftJoin(stockEntries, eq(stockEntries.searchResultId, searchResults.id))
    .groupBy(searchResults.id)
    .orderBy(desc(searchResults.createdAt));

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    conditionName: r.conditionName,
    count: Number(r.count),
    createdAt: r.createdAt?.toISOString() ?? "",
  }));
}

export type { StockEntryWithAnnotation };

export async function getSearchResultStocks(
  searchResultId: number
): Promise<StockEntryWithAnnotation[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: stockEntries.id,
      code: stockEntries.code,
      name: stockEntries.name,
      price: stockEntries.price,
      changeSign: stockEntries.changeSign,
      change: stockEntries.change,
      changeRate: stockEntries.changeRate,
      volume: stockEntries.volume,
      tradingAmount: stockEntries.tradingAmount,
      open: stockEntries.open,
      high: stockEntries.high,
      low: stockEntries.low,
      keyword: stockAnnotations.keyword,
      reason: stockAnnotations.reason,
    })
    .from(stockEntries)
    .leftJoin(
      stockAnnotations,
      eq(stockAnnotations.stockEntryId, stockEntries.id)
    )
    .where(eq(stockEntries.searchResultId, searchResultId));

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    price: r.price,
    changeSign: r.changeSign,
    change: r.change,
    changeRate: r.changeRate,
    volume: r.volume,
    tradingAmount: r.tradingAmount ?? "",
    open: r.open,
    high: r.high,
    low: r.low,
    keyword: r.keyword ?? "",
    reason: r.reason ?? "",
  }));
}

export async function updateAnnotation(
  stockEntryId: number,
  userId: number | null,
  keyword?: string,
  reason?: string
): Promise<void> {
  const db = getDb();

  const existing = await db
    .select()
    .from(stockAnnotations)
    .where(eq(stockAnnotations.stockEntryId, stockEntryId))
    .limit(1);

  if (existing.length > 0) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (keyword !== undefined) updates.keyword = keyword;
    if (reason !== undefined) updates.reason = reason;
    if (userId !== null) updates.userId = userId;

    await db
      .update(stockAnnotations)
      .set(updates)
      .where(eq(stockAnnotations.stockEntryId, stockEntryId));
  } else {
    await db.insert(stockAnnotations).values({
      stockEntryId,
      userId,
      keyword: keyword ?? "",
      reason: reason ?? "",
    });
  }
}
