import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

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
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.stockEntryId)]
);
