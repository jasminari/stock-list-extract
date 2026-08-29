-- 매일 퀴즈 기록. 하루에 한 번만 남기므로 (user_id, quiz_date) 유니크로 재응시를 막고,
-- 연속 학습일(스트릭)은 이 테이블의 quiz_date 연속성으로 계산한다.
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "quiz_date" varchar(8) NOT NULL,
  "data_date" varchar(8) DEFAULT '',
  "score" integer NOT NULL,
  "total" integer NOT NULL,
  "completed_at" timestamp DEFAULT now(),
  CONSTRAINT "quiz_attempts_user_id_quiz_date_unique" UNIQUE("user_id","quiz_date")
);
