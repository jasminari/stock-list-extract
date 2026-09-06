import { fetchDailyChart } from "./kiwoom";
import {
  listActivePriceAlerts,
  deactivatePriceAlert,
  createNotification,
} from "./storage-db";

/**
 * 실시간 시세가 없어 장마감 배치(조건검색 수집 크론) 때 그날 종가로만 검사한다.
 * 범위에 들어오면 한 번만 알리고 비활성화 — 다시 받으려면 사용자가 범위를 재설정해야 한다.
 */
export async function checkPriceAlerts(token: string): Promise<void> {
  const alerts = await listActivePriceAlerts();
  if (alerts.length === 0) return;

  // 같은 종목을 여러 사용자가 볼 수 있으니 시세 조회는 종목당 한 번만 한다
  const codes = [...new Set(alerts.map((a) => a.code))];
  const latestClose = new Map<string, number>();

  for (const code of codes) {
    try {
      const candles = await fetchDailyChart(token, code, 1);
      const last = candles[candles.length - 1];
      if (last) latestClose.set(code, last.close);
    } catch (e) {
      console.error(`가격 알림 시세 조회 실패 [${code}]:`, e);
    }
  }

  for (const alert of alerts) {
    const close = latestClose.get(alert.code);
    if (close === undefined) continue;
    if (close < alert.alertLow || close > alert.alertHigh) continue;

    await createNotification(
      alert.userId,
      `${alert.name} 관심 가격대 도달`,
      `${alert.name}이(가) 설정하신 ${alert.alertLow.toLocaleString(
        "ko-KR"
      )}~${alert.alertHigh.toLocaleString("ko-KR")}원 범위에 들어왔습니다. (종가 ${close.toLocaleString(
        "ko-KR"
      )}원)`,
      "/dashboard/watchlist"
    );
    await deactivatePriceAlert(alert.id);
  }
}
