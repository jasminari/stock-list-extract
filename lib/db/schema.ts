import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  unique,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 50 }).unique().notNull(),
    // OAuth(카카오 등) 가입 유저는 비밀번호 없음
    passwordHash: varchar("password_hash", { length: 255 }),
    displayName: varchar("display_name", { length: 100 }),
    role: varchar("role", { length: 20 }).default("user").notNull(),
    provider: varchar("provider", { length: 20 }).default("credentials").notNull(),
    providerId: varchar("provider_id", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.provider, t.providerId)]
);

export const searchResults = pgTable("search_results", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 8 }).notNull(),
  conditionSeq: varchar("condition_seq", { length: 10 }).notNull(),
  conditionName: varchar("condition_name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockEntries = pgTable("stock_entries", {
  id: serial("id").primaryKey(),
  searchResultId: integer("search_result_id")
    .references(() => searchResults.id, { onDelete: "cascade" })
    .notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  price: varchar("price", { length: 20 }).notNull(),
  changeSign: varchar("change_sign", { length: 5 }).notNull(),
  change: varchar("change", { length: 20 }).notNull(),
  changeRate: varchar("change_rate", { length: 20 }).notNull(),
  volume: varchar("volume", { length: 20 }).notNull(),
  tradingAmount: varchar("trading_amount", { length: 20 }).default(""),
  // 수집 시점의 상장주식수(주). 증자/분할로 변하므로 시점값을 그대로 보존한다
  listCount: varchar("list_count", { length: 20 }).default(""),
  open: varchar("open", { length: 20 }).notNull(),
  high: varchar("high", { length: 20 }).notNull(),
  low: varchar("low", { length: 20 }).notNull(),
});

export const registeredConditions = pgTable("registered_conditions", {
  id: serial("id").primaryKey(),
  seq: varchar("seq", { length: 10 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  registeredAt: timestamp("registered_at").defaultNow(),
});

export const extractionLogs = pgTable("extraction_logs", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 8 }).notNull(),
  conditionSeq: varchar("condition_seq", { length: 10 }).notNull(),
  conditionName: varchar("condition_name", { length: 200 }).notNull(),
  stockCount: integer("stock_count").notNull().default(0),
  status: varchar("status", { length: 10 }).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    conditionSeq: varchar("condition_seq", { length: 10 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.userId, t.conditionSeq)]
);

export const stockAnnotations = pgTable(
  "stock_annotations",
  {
    id: serial("id").primaryKey(),
    stockEntryId: integer("stock_entry_id")
      .references(() => stockEntries.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id").references(() => users.id),
    keyword: text("keyword").default(""),
    reason: text("reason").default(""),
    sourceUrl: text("source_url").default(""),
    sourceTitle: text("source_title").default(""),
    autoFilled: boolean("auto_filled").default(false),
    enrichedAt: timestamp("enriched_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.stockEntryId)]
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    /** 퀴즈를 푼 날짜(KST, YYYYMMDD). 하루 한 번만 기록된다 */
    quizDate: varchar("quiz_date", { length: 8 }).notNull(),
    /** 출제에 쓰인 시장 데이터 날짜. 개념 문제만 나온 날은 빈 문자열 */
    dataDate: varchar("data_date", { length: 8 }).default(""),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    completedAt: timestamp("completed_at").defaultNow(),
  },
  (t) => [unique().on(t.userId, t.quizDate)]
);

/**
 * 사용자 의견/만족도. 로그인 유저만 남길 수 있고, 한 사람이 여러 번 보낼 수 있다.
 * rating 없이 글만, 글 없이 rating만 보내는 것도 허용한다(둘 다 비면 서버에서 막는다).
 */
export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  /** 만족도 1~5. 글만 남긴 경우 null */
  rating: integer("rating"),
  message: text("message").default(""),
  /** 의견을 남긴 화면 경로. 어느 기능에 대한 말인지 추적용 */
  pagePath: varchar("page_path", { length: 200 }).default(""),
  /** new | done — 관리자가 확인했는지 */
  status: varchar("status", { length: 10 }).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
