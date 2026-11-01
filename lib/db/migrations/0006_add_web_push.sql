ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS alert_direction varchar(10) NOT NULL DEFAULT 'range';
ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS alert_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  last_test_at timestamp
);
CREATE TABLE IF NOT EXISTS push_deliveries (
  id serial PRIMARY KEY,
  notification_id integer NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  subscription_id integer NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamp NOT NULL DEFAULT now(),
  delivered_at timestamp,
  last_error text,
  UNIQUE(notification_id, subscription_id)
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_deliveries_pending_idx ON push_deliveries(next_attempt_at) WHERE delivered_at IS NULL;

-- Server-only NextAuth access; do not expose device keys via the public Data API.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_deliveries ENABLE ROW LEVEL SECURITY;
