import type { StockResult, ProcessedStock } from "./types";

export type { ProcessedStock };

/** "001295000" → 1295000 */
export function parsePrice(raw: string): number {
  return Number(raw.replace(/^[+-]/, "")) || 0;
}

/** "000006060" → 6.06 (키움 원본: 실제 등락률% × 1000, 즉 소수점 3자리 포함) */
export function parseChangeRate(raw: string): number {
  const n = Number(raw.replace(/^[+-]/, "")) || 0;
  return n / 1000;
}

/** 거래대금 천원 → 억원 (÷ 100,000) */
export function parseTradingAmountBil(raw: string): number {
  const n = Number(raw) || 0;
  return Math.round(n / 100000);
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
      };
    })
    .sort((a, b) => b.tradingAmountBil - a.tradingAmountBil)
    .map((s, i) => ({ ...s, index: i + 1 }));
}
