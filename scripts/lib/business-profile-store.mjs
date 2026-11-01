export async function ensureBusinessProfileTable(db) {
 await db`CREATE TABLE IF NOT EXISTS stock_business_profiles (
 stock_code varchar(10) NOT NULL, receipt_no varchar(14) NOT NULL,
 filing_date varchar(8) NOT NULL, report_name text NOT NULL,
 keyword text NOT NULL, summary text NOT NULL, source_url text NOT NULL,
 evidence text NOT NULL, summary_origin text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(stock_code,receipt_no))`;
}
export async function saveBusinessProfile(db,code,evidence,summary,origin) {
 if(!evidence?.receiptNo || !/^\d{8}$/.test(evidence.filingDate) || !summary?.keyword?.trim() || !summary?.summary?.trim())throw Error('Invalid business profile');
 await db`INSERT INTO stock_business_profiles (stock_code,receipt_no,filing_date,report_name,keyword,summary,source_url,evidence,summary_origin)
 VALUES(${code},${evidence.receiptNo},${evidence.filingDate},${evidence.reportName},${summary.keyword},${summary.summary},${evidence.sourceUrl},${evidence.businessText},${origin})
 ON CONFLICT(stock_code,receipt_no) DO UPDATE SET keyword=excluded.keyword,summary=excluded.summary,evidence=excluded.evidence,summary_origin=excluded.summary_origin,updated_at=now()`;
}
