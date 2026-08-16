import * as amplitude from "@amplitude/unified";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * GA4는 snake_case 이벤트명/파라미터명을 권장한다.
 * "Condition Search Completed" -> "condition_search_completed"
 * "stockCount" -> "stock_count"
 */
function toSnakeCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * 이벤트 전송 헬퍼. Amplitude와 GA4로 동시에 보낸다.
 * 클라이언트("use client") 컴포넌트에서만 사용해야 하며,
 * 서버 렌더링 중에는 아무 동작도 하지 않는다.
 */
export function track(
  eventName: string,
  eventProperties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  amplitude.track(eventName, eventProperties);

  // GA4는 측정 ID가 설정된 환경에서만 gtag가 존재한다
  if (typeof window.gtag === "function") {
    const gaParams = eventProperties
      ? Object.fromEntries(
          Object.entries(eventProperties).map(([key, value]) => [
            toSnakeCase(key),
            value,
          ])
        )
      : undefined;

    window.gtag("event", toSnakeCase(eventName), gaParams);
  }
}
