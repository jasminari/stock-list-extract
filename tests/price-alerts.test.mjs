import test from "node:test";
import assert from "node:assert/strict";
import { alertMatches, isKstMarketOpen, kstDateKey, normalizeFreshQuote, retryDelaySeconds } from "../scripts/lib/price-alert-core.mjs";

test("range checks include both boundaries and reject invalid prices", () => {
  const alert = { direction: "range", low: 100, high: 200 };
  assert.equal(alertMatches(alert, 100), true);
  assert.equal(alertMatches(alert, 200), true);
  assert.equal(alertMatches(alert, 99.99), false);
  assert.equal(alertMatches(alert, Infinity), false);
  assert.equal(alertMatches({ direction: "range", low: 201, high: 200 }, 200), false);
});

test("one-sided checks use the intended inclusive threshold", () => {
  assert.equal(alertMatches({ direction: "above", high: 150 }, 150), true);
  assert.equal(alertMatches({ direction: "above", high: 150 }, 149.99), false);
  assert.equal(alertMatches({ direction: "below", low: 75 }, 75), true);
  assert.equal(alertMatches({ direction: "below", low: 75 }, 75.01), false);
  assert.equal(alertMatches({ direction: "above", high: null }, 150), false);
});

test("fresh quote accepts only today's valid positive finite close", () => {
  assert.equal(normalizeFreshQuote({ date: "2026-10-20", close: "00125" }, "20261020"), 125);
  assert.equal(normalizeFreshQuote({ dt: "20261019", cur_prc: "125" }, "20261020"), null);
  assert.equal(normalizeFreshQuote({ date: "20261020", close: "0" }, "20261020"), null);
  assert.equal(normalizeFreshQuote({ date: "20261020", close: "oops" }, "20261020"), null);
  assert.equal(normalizeFreshQuote(null, "20261020"), null);
});

test("KST date and weekday market window handle local-time boundaries", () => {
  assert.equal(kstDateKey(new Date("2026-10-19T15:30:00.000Z")), "20261020");
  assert.equal(isKstMarketOpen(new Date("2026-10-19T00:00:00.000Z")), true); // Mon 09:00 KST
  assert.equal(isKstMarketOpen(new Date("2026-10-19T06:30:00.000Z")), false); // Mon 15:30 KST
  assert.equal(isKstMarketOpen(new Date("2026-10-18T00:00:00.000Z")), false); // Sun 09:00 KST
  assert.equal(isKstMarketOpen(new Date("2026-10-23T06:29:00.000Z")), true); // Fri 15:29 KST
  assert.equal(isKstMarketOpen(new Date("2026-10-23T06:30:00.000Z")), false); // Fri 15:30 KST
  assert.equal(isKstMarketOpen(new Date("not a date")), false);
  assert.equal(kstDateKey(new Date("not a date")), null);
});

test("delivery retry delay grows exponentially and caps at one hour", () => {
  assert.equal(retryDelaySeconds(1), 30);
  assert.equal(retryDelaySeconds(3), 120);
  assert.equal(retryDelaySeconds(10), 3600);
});
