-- 시가총액 대비 거래대금(거래회전율) 계산을 위한 상장주식수 보관.
-- 상장주식수는 증자/액면분할로 바뀌므로 수집 시점 값을 행에 그대로 남긴다.
-- 기존 행은 상장주식수 기록이 없어 빈 문자열로 남고, UI에서 "-"로 표시된다.
ALTER TABLE "stock_entries" ADD COLUMN IF NOT EXISTS "list_count" varchar(20) DEFAULT '';
