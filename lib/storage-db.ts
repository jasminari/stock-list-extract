import { eq, and, desc, lte, gte, ne, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  users,
  searchResults,
  stockEntries,
  stockAnnotations,
  registeredConditions,
  extractionLogs,
  userSubscriptions,
  quizAttempts,
  feedbacks,
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
        listCount: s.list_count || "",
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
      listCount: stockEntries.listCount,
      open: stockEntries.open,
      high: stockEntries.high,
      low: stockEntries.low,
      keyword: stockAnnotations.keyword,
      reason: stockAnnotations.reason,
      sourceUrl: stockAnnotations.sourceUrl,
      sourceTitle: stockAnnotations.sourceTitle,
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
    listCount: r.listCount ?? "",
    open: r.open,
    high: r.high,
    low: r.low,
    keyword: r.keyword ?? "",
    reason: r.reason ?? "",
    sourceUrl: r.sourceUrl ?? "",
    sourceTitle: r.sourceTitle ?? "",
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
    // 수동 편집이므로 자동 작성 플래그 해제 (자동 갱신이 덮어쓰지 않도록)
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      autoFilled: false,
    };
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

// === 수집 로그 ===

export interface ExtractionLog {
  id: number;
  date: string;
  conditionSeq: string;
  conditionName: string;
  stockCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export async function saveExtractionLog(
  date: string,
  conditionSeq: string,
  conditionName: string,
  stockCount: number,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  const db = getDb();
  await db.insert(extractionLogs).values({
    date,
    conditionSeq,
    conditionName,
    stockCount,
    status,
    errorMessage: errorMessage ?? null,
  });
}

export async function listExtractionLogs(limit = 50): Promise<ExtractionLog[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(extractionLogs)
    .orderBy(desc(extractionLogs.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    conditionSeq: r.conditionSeq,
    conditionName: r.conditionName,
    stockCount: r.stockCount,
    status: r.status,
    errorMessage: r.errorMessage,
    createdAt: r.createdAt?.toISOString() ?? "",
  }));
}

// === 유저 구독 (조건검색식 선택) ===

export async function getUserSubscriptions(userId: number): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ conditionSeq: userSubscriptions.conditionSeq })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));
  return rows.map((r) => r.conditionSeq);
}

export async function subscribeCondition(
  userId: number,
  conditionSeq: string
): Promise<void> {
  const db = getDb();
  await db
    .insert(userSubscriptions)
    .values({ userId, conditionSeq })
    .onConflictDoNothing();
}

export async function unsubscribeCondition(
  userId: number,
  conditionSeq: string
): Promise<void> {
  const db = getDb();
  await db
    .delete(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.conditionSeq, conditionSeq)
      )
    );
}

// === 가입자 관리 (관리자 전용) ===

export interface UserSummary {
  id: number;
  username: string;
  displayName: string | null;
  role: string;
  provider: string;
  subscriptionCount: number;
  createdAt: string;
}

export async function listUsers(): Promise<UserSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      provider: users.provider,
      createdAt: users.createdAt,
      subscriptionCount: sql<number>`(
        select count(*)::int from ${userSubscriptions}
        where ${userSubscriptions.userId} = ${users.id}
      )`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.displayName,
    role: r.role,
    provider: r.provider,
    subscriptionCount: r.subscriptionCount,
    createdAt: r.createdAt?.toISOString() ?? "",
  }));
}

export async function updateUserRole(
  userId: number,
  role: "user" | "admin"
): Promise<void> {
  const db = getDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

/** 마지막 관리자가 스스로를 강등해 잠기는 것을 막기 위한 카운트 */
export async function countAdmins(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "admin"));
  return row?.count ?? 0;
}

// === 매일 퀴즈 ===

/**
 * 기준일 이하에서 종목이 실제로 들어있는 가장 최근 수집 날짜.
 * 주말·휴장일에도 직전 거래일 데이터로 문제를 낼 수 있게 한다.
 */
export async function getLatestDataDate(
  onOrBefore: string
): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ date: searchResults.date })
    .from(searchResults)
    .innerJoin(stockEntries, eq(stockEntries.searchResultId, searchResults.id))
    .where(lte(searchResults.date, onOrBefore))
    .groupBy(searchResults.date)
    .orderBy(desc(searchResults.date))
    .limit(1);

  return row?.date ?? null;
}

/** 특정 날짜의 모든 조건검색 결과를 합친 종목 목록 (종목코드 기준 중복 제거) */
export async function getStocksByDate(
  date: string
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
      listCount: stockEntries.listCount,
      open: stockEntries.open,
      high: stockEntries.high,
      low: stockEntries.low,
      keyword: stockAnnotations.keyword,
      reason: stockAnnotations.reason,
      sourceUrl: stockAnnotations.sourceUrl,
      sourceTitle: stockAnnotations.sourceTitle,
    })
    .from(stockEntries)
    .innerJoin(
      searchResults,
      eq(stockEntries.searchResultId, searchResults.id)
    )
    .leftJoin(
      stockAnnotations,
      eq(stockAnnotations.stockEntryId, stockEntries.id)
    )
    .where(eq(searchResults.date, date));

  const byCode = new Map<string, StockEntryWithAnnotation>();
  for (const r of rows) {
    const entry: StockEntryWithAnnotation = {
      id: r.id,
      code: r.code,
      name: r.name,
      price: r.price,
      changeSign: r.changeSign,
      change: r.change,
      changeRate: r.changeRate,
      volume: r.volume,
      tradingAmount: r.tradingAmount ?? "",
      listCount: r.listCount ?? "",
      open: r.open,
      high: r.high,
      low: r.low,
      keyword: r.keyword ?? "",
      reason: r.reason ?? "",
      sourceUrl: r.sourceUrl ?? "",
      sourceTitle: r.sourceTitle ?? "",
    };
    // 같은 종목이 여러 조건식에 걸렸다면 상승이유가 채워진 행을 남긴다
    const prev = byCode.get(r.code);
    if (!prev || (!prev.reason && entry.reason)) byCode.set(r.code, entry);
  }

  return Array.from(byCode.values());
}

/**
 * 최근 구간에서 상승이유가 채워진 종목들 (퀴즈 복습 풀).
 * 하루치 수집분 중 이유가 붙는 종목은 5~20개뿐이라, 이유 기반 문제를 매일 4개씩
 * 뽑으려면 최근 며칠을 함께 봐야 한다. 같은 날 같은 종목은 한 번만 담는다.
 */
export async function getStocksWithReasonBetween(
  from: string,
  to: string
): Promise<(StockEntryWithAnnotation & { date: string })[]> {
  const db = getDb();

  const rows = await db
    .select({
      date: searchResults.date,
      id: stockEntries.id,
      code: stockEntries.code,
      name: stockEntries.name,
      price: stockEntries.price,
      changeSign: stockEntries.changeSign,
      change: stockEntries.change,
      changeRate: stockEntries.changeRate,
      volume: stockEntries.volume,
      tradingAmount: stockEntries.tradingAmount,
      listCount: stockEntries.listCount,
      open: stockEntries.open,
      high: stockEntries.high,
      low: stockEntries.low,
      keyword: stockAnnotations.keyword,
      reason: stockAnnotations.reason,
      sourceUrl: stockAnnotations.sourceUrl,
      sourceTitle: stockAnnotations.sourceTitle,
    })
    .from(stockEntries)
    .innerJoin(searchResults, eq(stockEntries.searchResultId, searchResults.id))
    .innerJoin(
      stockAnnotations,
      eq(stockAnnotations.stockEntryId, stockEntries.id)
    )
    .where(
      and(
        gte(searchResults.date, from),
        lte(searchResults.date, to),
        ne(stockAnnotations.reason, "")
      )
    )
    .orderBy(desc(searchResults.date));

  const byKey = new Map<string, StockEntryWithAnnotation & { date: string }>();
  for (const r of rows) {
    const key = `${r.date}:${r.code}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      date: r.date,
      id: r.id,
      code: r.code,
      name: r.name,
      price: r.price,
      changeSign: r.changeSign,
      change: r.change,
      changeRate: r.changeRate,
      volume: r.volume,
      tradingAmount: r.tradingAmount ?? "",
      listCount: r.listCount ?? "",
      open: r.open,
      high: r.high,
      low: r.low,
      keyword: r.keyword ?? "",
      reason: r.reason ?? "",
      sourceUrl: r.sourceUrl ?? "",
      sourceTitle: r.sourceTitle ?? "",
    });
  }

  return Array.from(byKey.values());
}

export interface QuizAttemptRecord {
  quizDate: string;
  dataDate: string;
  score: number;
  total: number;
  completedAt: string;
}

export async function getQuizAttempt(
  userId: number,
  quizDate: string
): Promise<QuizAttemptRecord | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizDate, quizDate))
    )
    .limit(1);

  if (!row) return null;
  return {
    quizDate: row.quizDate,
    dataDate: row.dataDate ?? "",
    score: row.score,
    total: row.total,
    completedAt: row.completedAt?.toISOString() ?? "",
  };
}

export async function listQuizAttempts(
  userId: number,
  limit = 60
): Promise<QuizAttemptRecord[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, userId))
    .orderBy(desc(quizAttempts.quizDate))
    .limit(limit);

  return rows.map((r) => ({
    quizDate: r.quizDate,
    dataDate: r.dataDate ?? "",
    score: r.score,
    total: r.total,
    completedAt: r.completedAt?.toISOString() ?? "",
  }));
}

/** 하루 한 번만 기록. 이미 푼 날이면 false를 돌려주고 기존 기록을 유지한다 */
export async function saveQuizAttempt(
  userId: number,
  quizDate: string,
  dataDate: string,
  score: number,
  total: number
): Promise<boolean> {
  const db = getDb();
  const inserted = await db
    .insert(quizAttempts)
    .values({ userId, quizDate, dataDate, score, total })
    .onConflictDoNothing({
      target: [quizAttempts.userId, quizAttempts.quizDate],
    })
    .returning({ id: quizAttempts.id });

  return inserted.length > 0;
}

// === 의견/만족도 ===

export interface FeedbackSummary {
  id: number;
  userId: number;
  username: string;
  displayName: string | null;
  rating: number | null;
  message: string;
  pagePath: string;
  status: string;
  createdAt: string;
}

export async function saveFeedback(input: {
  userId: number;
  rating: number | null;
  message: string;
  pagePath: string;
}): Promise<number> {
  const db = getDb();
  const [row] = await db
    .insert(feedbacks)
    .values({
      userId: input.userId,
      rating: input.rating,
      message: input.message,
      pagePath: input.pagePath,
    })
    .returning({ id: feedbacks.id });
  return row.id;
}

/** 최근 24시간 제출 건수 — 한 사람이 도배하는 것을 막는 용도 */
export async function countRecentFeedbacks(userId: number): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedbacks)
    .where(
      and(
        eq(feedbacks.userId, userId),
        sql`${feedbacks.createdAt} > now() - interval '1 day'`
      )
    );
  return row?.count ?? 0;
}

export async function listFeedbacks(): Promise<FeedbackSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: feedbacks.id,
      userId: feedbacks.userId,
      username: users.username,
      displayName: users.displayName,
      rating: feedbacks.rating,
      message: feedbacks.message,
      pagePath: feedbacks.pagePath,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .innerJoin(users, eq(users.id, feedbacks.userId))
    .orderBy(desc(feedbacks.createdAt));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    username: r.username,
    displayName: r.displayName,
    rating: r.rating,
    message: r.message ?? "",
    pagePath: r.pagePath ?? "",
    status: r.status,
    createdAt: r.createdAt?.toISOString() ?? "",
  }));
}

export async function updateFeedbackStatus(
  id: number,
  status: "new" | "done"
): Promise<void> {
  const db = getDb();
  await db.update(feedbacks).set({ status }).where(eq(feedbacks.id, id));
}
