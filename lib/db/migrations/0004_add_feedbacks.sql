-- 사용자 의견/만족도 수집. 유저가 탈퇴하면 의견도 함께 지운다.
CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rating" integer,
  "message" text DEFAULT '',
  "page_path" varchar(200) DEFAULT '',
  "status" varchar(10) DEFAULT 'new' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 관리자 목록은 최신순 조회가 전부라 생성일 인덱스만 둔다
CREATE INDEX IF NOT EXISTS "feedbacks_created_at_idx" ON "feedbacks" ("created_at" DESC);
