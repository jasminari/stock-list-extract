CREATE TABLE IF NOT EXISTS stock_related_materials (
 stock_entry_id integer PRIMARY KEY REFERENCES stock_entries(id) ON DELETE CASCADE,
 keyword text NOT NULL,
 summary text NOT NULL,
 source_url text NOT NULL,
 source_title text NOT NULL,
 event_date varchar(8) NOT NULL,
 article_date varchar(8) NOT NULL,
 evidence text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
