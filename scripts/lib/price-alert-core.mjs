export function kstDateKey(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replaceAll("-", "");
}

export function isKstMarketOpen(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(values.weekday);
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  return weekday && minutes >= 9 * 60 && minutes < 15 * 60 + 30;
}

export function normalizeFreshQuote(candle, expectedDate) {
  if (!candle || String(candle.date ?? candle.dt ?? "").replaceAll("-", "") !== expectedDate) return null;
  const raw = candle.close ?? candle.cur_prc;
  const close = Number(String(raw ?? "").replace(/^[+-]/, ""));
  return Number.isFinite(close) && close > 0 ? close : null;
}

export function alertMatches({ direction = "range", low, high }, price) {
  if (!Number.isFinite(price) || price <= 0) return false;
  const lower = low == null ? null : Number(low);
  const upper = high == null ? null : Number(high);
  if ((lower !== null && !Number.isFinite(lower)) || (upper !== null && !Number.isFinite(upper))) return false;
  if (direction === "above") return upper !== null && price >= upper;
  if (direction === "below") return lower !== null && price <= lower;
  if (direction !== "range" || lower === null || upper === null || lower > upper) return false;
  return price >= lower && price <= upper;
}

export function retryDelaySeconds(attempts) {
  return Math.min(60 * 60, 30 * 2 ** Math.max(0, attempts - 1));
}
