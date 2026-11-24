-- 관심종목을 어느 날짜의 종목 목록에서 담았는지 (YYYYMMDD). 기존 행은 비워 두고 등록일로 대신 묶는다
ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS list_date varchar(8);
