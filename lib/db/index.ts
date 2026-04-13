import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function isDbConfigured(): boolean {
  return !!process.env.POSTGRES_URL;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!isDbConfigured()) {
    throw new Error("POSTGRES_URL 환경변수가 설정되지 않았습니다");
  }
  if (!_db) {
    const client = postgres(process.env.POSTGRES_URL!, { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}
