# Price alert push worker

The web app stores a notification when a watchlist price alert fires. A small worker on the fixed-IP Oracle VM checks quotes during the Korean market session and sends queued notifications through Web Push. The worker also drains queued deliveries outside market hours. Atomic alert claims and per-delivery transaction row locks prevent overlapping workers from processing the same alert or delivery concurrently. This also works through the existing transaction-mode connection pool.

## Required environment

Add these values to the VM environment file used by systemd (for example `/etc/stock-extract.env`) and to the web app deployment where appropriate:

```dotenv
POSTGRES_URL=postgresql://...
KIWOOM_APP_KEY=...
KIWOOM_SECRET_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
```

The private key and database URL must remain server-side. The browser subscription flow uses the public VAPID key. Apply database migration `0006_add_web_push.sql` before enabling the worker; it adds direction/version tracking, push subscriptions, and the durable delivery queue expected by the worker and API.

## Install on the Oracle VM

Copy the repository files to `/home/opc/stock-list-extract`, install production dependencies (`npm ci --omit=dev`), and install the units:

```sh
sudo cp scripts/systemd/stock-price-alerts.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now stock-price-alerts.timer
```

The service unit assumes the existing VM account is `opc`, Node is `/usr/local/bin/node`, and the checkout is `/home/opc/stock-list-extract`. Adjust those three unit values if the deployment uses different paths. Inspect one run with `sudo systemctl start stock-price-alerts.service` and `sudo journalctl -u stock-price-alerts.service -n 100 --no-pager`; timer status is available with `systemctl list-timers stock-price-alerts.timer`.

Run `node scripts/check-price-alerts.mjs --dry-run` to check matching alerts without claiming them, writing notifications, or sending queued pushes. It still reads PostgreSQL and may request Kiwoom quotes if run during the market window.

## Timing and delivery behavior

The timer invokes a one-shot service once per minute. Alert quote checks run Monday through Friday from 09:00 inclusive to 15:30 exclusive, Korea Standard Time. Only a positive, finite candle close dated today in KST is accepted; holidays, delayed candles, and stale quotes are skipped. Codes are fetched once per run in sequence with a short pause between requests.

This is a minute-level poll, not a real-time feed. A price that crosses a threshold and returns between two polls can be missed, and the daily candle close is the quote value supplied by the Kiwoom daily-chart endpoint. A matching alert is claimed once and disabled; changing or clearing the alert must advance its version so an in-flight worker cannot claim an outdated setting. Push delivery is retried with increasing delays, up to eight attempts. Expired subscriptions (HTTP 404/410) are removed. Exhausted deliveries remain for inspection and are not retried automatically.


## Web app and iPhone verification

Use the same VAPID key pair on the web deployment and worker. Generate it once with `npx web-push generate-vapid-keys` in a private terminal; save it in environment settings, not source control. `VAPID_SUBJECT` must be a real contact mailto URL or the application's HTTPS URL. Do not rotate the keys on each deploy.

Apply the SQL migration before deploying the new web build. The new tables enable RLS without public policies because NextAuth-authenticated server routes and the worker access them using the server database connection. Do not grant browser clients direct access.

On iPhone: open the installed home-screen app, sign in, open 관심종목 or 알림, tap 알림 켜기 and allow notifications, then tap 테스트 보내기. Test while the app is in the background and tap the notification to return to 관심종목. Add a stock, enter a positive integer target price, select 이상 or 이하 and save. A satisfied condition fires on the next valid market-hours check, even if it is already satisfied when saved. Re-save to rearm. Alert removal and watchlist removal stop future checks; already delivered notifications cannot be recalled.

Provider acceptance is not proof of iPhone display. Focus settings, connectivity and OS notification settings affect delivery. The queue is at-least-once: a process crash after provider acceptance but before DB commit can retry the notification; a stable notification tag reduces duplicate visible notifications.

Verification: `npm run test:push`, `npx tsc --noEmit`, `npm run build`. A real iPhone delivery and actual market-price check still require production environment settings, the migration, an enabled VM timer and user notification permission.

## Production release — 2026-11-01

- Web deployment: `dpl_4c24TgKuJQe4soXWcxSkUQsr7ZmT`, production domain `stock-list-extract-sukmins-projects-a913fa07.vercel.app`. Release source: `/tmp/stock-push-release-20261101`, based on the previous production source plus the price-range and push files in its release manifest.
- The Oracle worker is isolated in `/home/opc/stock-price-alerts` (not the extraction app directory). Install only its pinned `dotenv`, `postgres`, and `web-push` dependencies; its scripts retain the same relative paths. The deployed systemd unit uses this isolated working directory.
- VAPID settings are configured for Vercel Production and `/etc/stock-extract.env` with the same key pair. The existing VM environment was backed up before adding settings. Never print or commit these values.
- The watchlist direction/version fields and push tables are present; push tables have RLS enabled. The minute timer is enabled, and dry-run plus an actual worker invocation exited successfully.
- Local and Vercel production builds passed; push regression suite: 9 passed. Browser notification permission and real device delivery still require the signed-in user's confirmation through “테스트 보내기”.
- Rollback web to `dpl_3xX4AochzmV5Ut8fmNhphzdXWWNT` if needed; stop `stock-price-alerts.timer` when rolling back to the old alert implementation to avoid concurrent alert claims. Additive database fields may remain.
