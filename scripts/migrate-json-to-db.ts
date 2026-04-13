import fs from "fs/promises";
import path from "path";
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import * as schema from "../lib/db/schema";

const { searchResults, stockEntries } = schema;

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL 환경변수가 필요합니다");
    process.exit(1);
  }

  const db = drizzle(sql, { schema });
  const dataDir = path.join(process.cwd(), "data");
  const files = (await fs.readdir(dataDir)).filter((f) => f.endsWith(".json"));

  console.log(`${files.length}개 JSON 파일 발견`);

  let totalInserted = 0;

  for (const file of files) {
    const raw = await fs.readFile(path.join(dataDir, file), "utf-8");
    const data = JSON.parse(raw) as {
      seq?: string;
      conditionName?: string;
      date?: string;
      stocks?: Array<{
        code: string;
        name: string;
        price: string;
        change_sign: string;
        change: string;
        change_rate: string;
        volume: string;
        trading_amount?: string;
        open: string;
        high: string;
        low: string;
      }>;
    };

    if (!data.stocks || !data.date) {
      console.log(`  건너뜀: ${file} (stocks 또는 date 없음)`);
      continue;
    }

    const [result] = await db
      .insert(searchResults)
      .values({
        date: data.date,
        conditionSeq: data.seq || "0",
        conditionName: data.conditionName || file.replace(".json", ""),
      })
      .returning({ id: searchResults.id });

    if (data.stocks.length > 0) {
      await db.insert(stockEntries).values(
        data.stocks.map((s) => ({
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

    totalInserted += data.stocks.length;
    console.log(`  ${file}: ${data.stocks.length}종목 → search_results #${result.id}`);
  }

  console.log(`\n완료: 총 ${totalInserted}종목 삽입`);
  process.exit(0);
}

main().catch((e) => {
  console.error("마이그레이션 실패:", e);
  process.exit(1);
});
