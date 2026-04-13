CREATE TABLE "registered_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"seq" varchar(10) NOT NULL,
	"name" varchar(200) NOT NULL,
	"registered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(8) NOT NULL,
	"condition_seq" varchar(10) NOT NULL,
	"condition_name" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_annotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_entry_id" integer NOT NULL,
	"user_id" integer,
	"keyword" text DEFAULT '',
	"reason" text DEFAULT '',
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "stock_annotations_stock_entry_id_unique" UNIQUE("stock_entry_id")
);
--> statement-breakpoint
CREATE TABLE "stock_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_result_id" integer NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"price" varchar(20) NOT NULL,
	"change_sign" varchar(5) NOT NULL,
	"change" varchar(20) NOT NULL,
	"change_rate" varchar(20) NOT NULL,
	"volume" varchar(20) NOT NULL,
	"trading_amount" varchar(20) DEFAULT '',
	"open" varchar(20) NOT NULL,
	"high" varchar(20) NOT NULL,
	"low" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "stock_annotations" ADD CONSTRAINT "stock_annotations_stock_entry_id_stock_entries_id_fk" FOREIGN KEY ("stock_entry_id") REFERENCES "public"."stock_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_annotations" ADD CONSTRAINT "stock_annotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_search_result_id_search_results_id_fk" FOREIGN KEY ("search_result_id") REFERENCES "public"."search_results"("id") ON DELETE cascade ON UPDATE no action;