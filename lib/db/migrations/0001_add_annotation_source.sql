CREATE TABLE "extraction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(8) NOT NULL,
	"condition_seq" varchar(10) NOT NULL,
	"condition_name" varchar(200) NOT NULL,
	"stock_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(10) NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"condition_seq" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_subscriptions_user_id_condition_seq_unique" UNIQUE("user_id","condition_seq")
);
--> statement-breakpoint
ALTER TABLE "stock_annotations" ADD COLUMN "source_url" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "stock_annotations" ADD COLUMN "source_title" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "stock_annotations" ADD COLUMN "auto_filled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "stock_annotations" ADD COLUMN "enriched_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;