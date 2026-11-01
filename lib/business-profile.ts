import { sql } from "drizzle-orm";
import { getDb } from "./db";
import type { BusinessProfile } from "./types";

/** Business descriptions are separate from price catalysts and selected as of the list date. */
export async function getBusinessProfiles(codes: string[], date: string): Promise<Map<string, BusinessProfile>> {
  if (!codes.length) return new Map();
  const rows = await getDb().execute(sql`
    SELECT DISTINCT ON (stock_code) stock_code, keyword, summary, source_url, report_name, filing_date
    FROM stock_business_profiles
    WHERE stock_code IN (${sql.join(codes.map(code=>sql`${code}`),sql`,`)})
      AND filing_date <= ${date}
    ORDER BY stock_code, filing_date DESC, receipt_no DESC
  `);
  return new Map(rows.map(row=>[String(row.stock_code), {
    keyword: String(row.keyword), summary: String(row.summary), sourceUrl: String(row.source_url),
    reportName: String(row.report_name), filingDate: String(row.filing_date),
  }]));
}
