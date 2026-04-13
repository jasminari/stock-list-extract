import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  searchResults,
  stockEntries,
  stockAnnotations,
  registeredConditions,
} from "./db/schema";
import type { StockResult, RegisteredCondition } from "./types";

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

// === 등록된 조건검색식 CRUD ===

export async function listRegisteredConditions(): Promise<RegisteredCondition[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(registeredConditions)
    .orderBy(desc(registeredConditions.registeredAt));

  return rows.map((r) => ({
    id: r.id,
    seq: r.seq,
    name: r.name,
    registeredAt: r.registeredAt?.toISOString() ?? "",
  }));
}

export async function registerCondition(
  seq: string,
  name: string
): Promise<RegisteredCondition> {
  const db = getDb();

  // 중복 등록 방지
  const existing = await db
    .select()
    .from(registeredConditions)
    .where(eq(registeredConditions.seq, seq))
    .limit(1);

  if (existing.length > 0) {
    return {
      id: existing[0].id,
      seq: existing[0].seq,
      name: existing[0].name,
      registeredAt: existing[0].registeredAt?.toISOString() ?? "",
    };
  }

  const [result] = await db
    .insert(registeredConditions)
    .values({ seq, name })
    .returning();

  return {
    id: result.id,
    seq: result.seq,
    name: result.name,
    registeredAt: result.registeredAt?.toISOString() ?? "",
  };
}

export async function unregisterCondition(seq: string): Promise<void> {
  const db = getDb();
  await db
    .delete(registeredConditions)
    .where(eq(registeredConditions.seq, seq));
}
