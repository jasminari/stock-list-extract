/** 현재 날짜를 YYYYMMDD 형식으로 반환 (Asia/Seoul 기준) */
export function getTodayStr(): string {
  return new Date()
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Seoul",
    })
    .replace(/\. /g, "")
    .replace(".", "");
}

/**
 * 수집 기준 날짜를 YYYYMMDD 형식으로 반환 (Asia/Seoul 기준).
 * - 오전 8시 이전에 수집 시 전일로 간주 (장 마감 후 새벽 수집은 전일 데이터)
 * - 결과가 토/일이면 직전 금요일로 롤백
 */
export function getCollectionDateStr(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));

  const target = new Date(Date.UTC(year, month - 1, day));
  if (hour < 8) {
    target.setUTCDate(target.getUTCDate() - 1);
  }
  const weekday = target.getUTCDay();
  if (weekday === 6) target.setUTCDate(target.getUTCDate() - 1);
  else if (weekday === 0) target.setUTCDate(target.getUTCDate() - 2);

  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** YYYYMMDD 문자열 → Date 객체 */
export function parseDate(s: string): Date {
  return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
}

/** Date 객체 → YYYYMMDD 문자열 */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** 해당 월의 모든 날짜 배열 반환 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

/** YYYYMMDD → "2024년 04월 09일" 형식 */
export function formatDateKorean(dateStr: string): string {
  if (!dateStr) return "";
  return `${dateStr.slice(0, 4)}년 ${dateStr.slice(4, 6)}월 ${dateStr.slice(6, 8)}일`;
}

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
export const MONTHS_KR = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"] as const;
