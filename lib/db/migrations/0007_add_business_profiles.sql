CREATE TABLE IF NOT EXISTS stock_business_profiles (
 stock_code varchar(10) NOT NULL,
 receipt_no varchar(14) NOT NULL,
 filing_date varchar(8) NOT NULL,
 report_name text NOT NULL,
 keyword text NOT NULL,
 summary text NOT NULL,
 source_url text NOT NULL,
 evidence text NOT NULL,
 summary_origin text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(stock_code,receipt_no)
);
