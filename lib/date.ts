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
