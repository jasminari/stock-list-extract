import type { StockResult, ProcessedStock } from "./types";

export type { ProcessedStock };

/** "001295000" → 1295000 */
export function parsePrice(raw: string): number {
  return Number(raw.replace(/^[+-]/, "")) || 0;
}

/**
 * 키움 실시간 등락률(필드 12)은 소수점 없는 zero-padding 문자열로 온다.
 * 부호 자리를 포함한 고정폭이며, 폭이 곧 소수 자릿수를 결정한다.
 * 2026-07-17부터 포맷이 바뀌어 DB에 두 형태가 섞여 있으므로 폭으로 분기한다.
 *   ~2026-07-16: 9칸 / 소수 3자리 → "000006060" = 6.06,  "-00004980" = -4.98
 *   2026-07-17~: 8칸 / 소수 2자리 → "00001151"  = 11.51
 */
export function parseChangeRate(raw: string): number {
  const s = (raw ?? "").trim();
  if (!s) return 0;
  // REST 응답("+11.51")처럼 소수점이 있으면 그대로 사용
  if (s.includes(".")) return Number(s) || 0;
  const sign = s.startsWith("-") ? -1 : 1;
  const digits = s.replace(/^[+-]/, "");
  const n = Number(digits) || 0;
  // 폭 판정은 부호를 포함한 원본 길이 기준 (부호가 패딩 한 칸을 차지)
  return (sign * n) / (s.length >= 9 ? 1000 : 100);
}

/** 거래대금 백만원(키움 ka10032 trde_prica) → 억원 (÷ 100) */
export function parseTradingAmountBil(raw: string): number {
  const n = Number(raw) || 0;
  return Math.round(n / 100);
}

/** 거래대금이 없을 때 종가 × 거래량으로 근사 계산 (원 → 억원) */
function estimateTradingAmountBil(price: string, volume: string): number {
  const p = parsePrice(price);
  const v = Number(volume) || 0;
  return Math.round((p * v) / 100000000);
}

/** raw StockResult[] → 가공된 ProcessedStock[] (거래대금 내림차순) */
export function formatProcessedStocks(stocks: StockResult[]): ProcessedStock[] {
  return stocks
    .map((s) => {
      const hasTradingAmount = s.trading_amount && Number(s.trading_amount) > 0;
      return {
        index: 0,
        entryId: null,
        name: s.name,
        code: s.code,
        keyword: "",
        tradingAmountBil: hasTradingAmount
          ? parseTradingAmountBil(s.trading_amount)
          : estimateTradingAmountBil(s.price, s.volume),
        closingPrice: parsePrice(s.price),
        changeRate: parseChangeRate(s.change_rate),
        reason: "",
        sourceUrl: "",
        sourceTitle: "",
      };
    })
    .sort((a, b) => b.tradingAmountBil - a.tradingAmountBil)
    .map((s, i) => ({ ...s, index: i + 1 }));
}

/** DB StockEntryWithAnnotation[] → ProcessedStock[] (거래대금 내림차순) */
export function formatDbStocks(
  stocks: {
    id: number;
    name: string;
    code: string;
    price: string;
    changeRate: string;
    volume: string;
    tradingAmount: string;
    keyword: string;
    reason: string;
    sourceUrl?: string;
    sourceTitle?: string;
  }[]
): ProcessedStock[] {
  return stocks
    .map((s) => {
      const hasTradingAmount = s.tradingAmount && Number(s.tradingAmount) > 0;
      return {
        index: 0,
        entryId: s.id,
        name: s.name,
        code: s.code,
        keyword: s.keyword || "",
        tradingAmountBil: hasTradingAmount
          ? parseTradingAmountBil(s.tradingAmount)
          : estimateTradingAmountBil(s.price, s.volume),
        closingPrice: parsePrice(s.price),
        changeRate: parseChangeRate(s.changeRate),
        reason: s.reason || "",
        sourceUrl: s.sourceUrl || "",
        sourceTitle: s.sourceTitle || "",
      };
    })
    .sort((a, b) => b.tradingAmountBil - a.tradingAmountBil)
    .map((s, i) => ({ ...s, index: i + 1 }));
}
