#!/usr/bin/env node
import { config } from "dotenv";
import postgres from "postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { alertMatches, isKstMarketOpen, kstDateKey, normalizeFreshQuote, retryDelaySeconds } from "./lib/price-alert-core.mjs";
import { isPushConfigured, sendPush } from "../lib/web-push.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(ROOT, ".env.local"), override: false });
const DRY_RUN = process.argv.includes("--dry-run");
const MAX_ATTEMPTS = 8;
const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
const log = (message) => console.log(`[${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}] ${message}`);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function kiwoomToken() {
  const response = await fetch("https://api.kiwoom.com/oauth2/token", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: { "Content-Type": "application/json;charset=UTF-8", "api-id": "au10001" },
    body: JSON.stringify({ grant_type: "client_credentials", appkey: requiredEnv("KIWOOM_APP_KEY"), secretkey: requiredEnv("KIWOOM_SECRET_KEY") }),
  });
  if (!response.ok) throw new Error(`Kiwoom token request failed (${response.status})`);
  const data = await response.json();
  if (data.return_code !== 0 || !data.token) throw new Error(`Kiwoom token request failed: ${data.return_msg || "no token"}`);
  return data.token;
}

async function fetchTodayClose(token, code, today) {
  const response = await fetch("https://api.kiwoom.com/api/dostk/chart", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json;charset=UTF-8", "api-id": "ka10081",
      authorization: `Bearer ${token}`, "cont-yn": "N", "next-key": "",
    },
    body: JSON.stringify({ stk_cd: code, base_dt: today, upd_stkpc_tp: "1" }),
  });
  if (!response.ok) throw new Error(`Kiwoom quote request failed (${response.status})`);
  const data = await response.json();
  if (data.return_code !== 0) throw new Error(`Kiwoom quote request failed: ${data.return_msg || "unknown error"}`);
  const candles = data.stk_dt_pole_chart_qry || [];
  for (const candle of candles) {
    const close = normalizeFreshQuote(candle, today);
    if (close !== null) return close;
  }
  return null;
}

function alertMessage(alert, price) {
  const amount = (value) => Number(value).toLocaleString("ko-KR");
  const desc = alert.alert_direction === "above"
    ? `${amount(alert.alert_high)}원 이상`
    : alert.alert_direction === "below"
      ? `${amount(alert.alert_low)}원 이하`
      : `${amount(alert.alert_low)}~${amount(alert.alert_high)}원 범위`;
  return {
    title: `${alert.name} 관심 가격 도달`,
    body: `${alert.name}이(가) 설정하신 ${desc}에 도달했습니다. (현재가 ${amount(price)}원)`,
    link: "/dashboard/watchlist",
  };
}

async function processAlerts(conn) {
  if (!isKstMarketOpen()) return;
  const alerts = await conn`SELECT id, user_id, code, name, alert_low, alert_high, alert_direction, alert_version
    FROM watchlist_items WHERE alert_active = true ORDER BY code, id`;
  if (alerts.length === 0) return;
  const today = kstDateKey();
  const token = await kiwoomToken();
  const prices = new Map();
  for (const code of new Set(alerts.map((row) => row.code))) {
    try {
      prices.set(code, await fetchTodayClose(token, code, today));
    } catch (error) {
      log(`Quote lookup failed for ${code}: ${error.message}`);
      prices.set(code, null);
    }
    await wait(250);
  }

  for (const alert of alerts) {
    const price = prices.get(alert.code);
    if (price == null || !alertMatches({ direction: alert.alert_direction, low: alert.alert_low, high: alert.alert_high }, price)) continue;
    if (DRY_RUN) {
      log(`DRY RUN: alert ${alert.id} version ${alert.alert_version} matched at ${price}`);
      continue;
    }
    await conn.begin(async (tx) => {
      const claimed = await tx`UPDATE watchlist_items SET alert_active = false, alert_triggered_at = now()
        WHERE id = ${alert.id} AND alert_version = ${alert.alert_version} AND alert_active = true
        RETURNING user_id, name, alert_low, alert_high, alert_direction`;
      if (claimed.length === 0) return;
      const message = alertMessage({ ...alert, ...claimed[0] }, price);
      const [notification] = await tx`INSERT INTO notifications (user_id, title, body, link)
        VALUES (${claimed[0].user_id}, ${message.title}, ${message.body}, ${message.link}) RETURNING id`;
      await tx`INSERT INTO push_deliveries (notification_id, subscription_id)
        SELECT ${notification.id}, ps.id FROM push_subscriptions ps WHERE ps.user_id = ${claimed[0].user_id}
        ON CONFLICT (notification_id, subscription_id) DO NOTHING`;
    });
    log(`Claimed price alert ${alert.id} for ${alert.code}`);
  }
}

async function drainDeliveries(conn) {
  if (!isPushConfigured()) return;
  const pending = await conn`SELECT pd.id AS delivery_id
    FROM push_deliveries pd
    JOIN notifications n ON n.id = pd.notification_id
    JOIN push_subscriptions ps ON ps.id = pd.subscription_id AND ps.user_id = n.user_id
    WHERE pd.delivered_at IS NULL AND pd.next_attempt_at <= now()
      AND pd.attempts < ${MAX_ATTEMPTS}
    ORDER BY pd.next_attempt_at, pd.id LIMIT 100`;
  for (const row of pending) {
    await conn.begin(async (tx) => {
      // Lock and re-check current ownership before sending. An account reassignment
      // waits for this short delivery transaction and cannot leak an existing notification.
      const [delivery] = await tx`SELECT pd.id AS delivery_id, pd.attempts,
          n.id AS notification_id, n.user_id, n.title, n.body, n.link,
          ps.id AS subscription_id, ps.endpoint, ps.p256dh, ps.auth
        FROM push_deliveries pd
        JOIN notifications n ON n.id = pd.notification_id
        JOIN push_subscriptions ps ON ps.id = pd.subscription_id
        WHERE pd.id = ${row.delivery_id} AND pd.delivered_at IS NULL
          AND pd.next_attempt_at <= now() AND pd.attempts < ${MAX_ATTEMPTS}
          AND ps.user_id = n.user_id
        FOR UPDATE OF pd, n, ps`;
      if (!delivery) return;
      try {
        await sendPush({ endpoint: delivery.endpoint, keys: { p256dh: delivery.p256dh, auth: delivery.auth } }, {
          title: delivery.title,
          body: delivery.body,
          url: delivery.link,
          tag: `price-${delivery.notification_id}`,
        });
        await tx`UPDATE push_deliveries SET attempts = attempts + 1, delivered_at = now(), last_error = NULL WHERE id = ${delivery.delivery_id}`;
      } catch (error) {
        const status = Number(error.statusCode || error.status || 0);
        if (status === 404 || status === 410) {
          await tx`DELETE FROM push_subscriptions WHERE id = ${delivery.subscription_id}`;
          log(`Removed expired push subscription ${delivery.subscription_id}`);
          return;
        }
        const attempts = Number(delivery.attempts) + 1;
        const delay = retryDelaySeconds(attempts);
        const safeError = status ? `Push delivery failed (HTTP ${status})` : "Push delivery failed";
        await tx`UPDATE push_deliveries SET attempts = ${attempts}, next_attempt_at = now() + (${delay} * interval '1 second'), last_error = ${safeError}
          WHERE id = ${delivery.delivery_id}`;
        log(`Push delivery ${delivery.delivery_id} failed (attempt ${attempts}/${MAX_ATTEMPTS}, HTTP ${status || "unknown"})`);
      }
    });
  }
}

async function main() {
  if (DRY_RUN) log("Dry-run mode: alert state, notifications, and deliveries will not be written; pending pushes are not sent.");
  const connection = postgres(requiredEnv("POSTGRES_URL"), { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false });
  let conn;
  try {
    conn = await connection.reserve();
    // Conditional UPDATE and per-delivery row locks protect overlapping workers.
    // Session advisory locks are unsafe through a transaction-mode connection pool.
    try {
      await processAlerts(conn);
    } finally {
      if (!DRY_RUN) await drainDeliveries(conn);
    }
  } finally {
    if (conn) conn.release();
    await connection.end({ timeout: 5 });
  }
}

main().catch((error) => {
  log(`Worker failed (${error?.name || "Error"}). Check service diagnostics without exposing credentials.`);
  process.exitCode = 1;
});
