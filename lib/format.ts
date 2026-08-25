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

/**
 * 거래대금(억원)을 확정한다. ka10032 상위권 밖 종목은 값이 비어 오므로
 * 종가 × 거래량 추정치로 폴백한다. 화면/엑셀이 같은 값을 쓰도록 여기로 모은다.
 */
export function resolveTradingAmountBil(
  tradingAmount: string,
  price: string,
  volume: string
): number {
  return tradingAmount && Number(tradingAmount) > 0
    ? parseTradingAmountBil(tradingAmount)
    : estimateTradingAmountBil(price, volume);
}

/**
 * 상장주식수(주) × 종가(원) → 시가총액(억원).
 * 상장주식수가 없으면(과거 데이터/미상장 종목) null.
 */
export function calcMarketCapBil(
  listCount: string,
  closingPrice: number
): number | null {
  const shares = Number(listCount) || 0;
  if (shares <= 0 || closingPrice <= 0) return null;
  return Math.round((shares * closingPrice) / 100000000);
}

/**
 * 거래회전율(%) = 거래대금 ÷ 시가총액 × 100.
 * "그날 발행 주식의 몇 %가 손바뀜했나"를 뜻하며 시총 규모와 무관하게 비교 가능하다.
 * 두 값 모두 억원 단위라 그대로 나눈다.
 */
export function calcTurnoverRate(
  tradingAmountBil: number,
  marketCapBil: number | null
): number | null {
  if (!marketCapBil || marketCapBil <= 0) return null;
  return (tradingAmountBil / marketCapBil) * 100;
}

/** raw StockResult[] → 가공된 ProcessedStock[] (거래대금 내림차순) */
export function formatProcessedStocks(stocks: StockResult[]): ProcessedStock[] {
  return stocks
    .map((s) => {
      const tradingAmountBil = resolveTradingAmountBil(
        s.trading_amount,
        s.price,
        s.volume
      );
      const closingPrice = parsePrice(s.price);
      const marketCapBil = calcMarketCapBil(s.list_count, closingPrice);
      return {
        index: 0,
        entryId: null,
        name: s.name,
        code: s.code,
        keyword: "",
        tradingAmountBil,
        closingPrice,
        changeRate: parseChangeRate(s.change_rate),
        marketCapBil,
        turnoverRate: calcTurnoverRate(tradingAmountBil, marketCapBil),
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
    listCount?: string;
    keyword: string;
    reason: string;
    sourceUrl?: string;
    sourceTitle?: string;
  }[]
): ProcessedStock[] {
  return stocks
    .map((s) => {
      const tradingAmountBil = resolveTradingAmountBil(
        s.tradingAmount,
        s.price,
        s.volume
      );
      const closingPrice = parsePrice(s.price);
      const marketCapBil = calcMarketCapBil(s.listCount ?? "", closingPrice);
      return {
        index: 0,
        entryId: s.id,
        name: s.name,
        code: s.code,
        keyword: s.keyword || "",
        tradingAmountBil,
        closingPrice,
        changeRate: parseChangeRate(s.changeRate),
        marketCapBil,
        turnoverRate: calcTurnoverRate(tradingAmountBil, marketCapBil),
        reason: s.reason || "",
        sourceUrl: s.sourceUrl || "",
        sourceTitle: s.sourceTitle || "",
      };
    })
    .sort((a, b) => b.tradingAmountBil - a.tradingAmountBil)
    .map((s, i) => ({ ...s, index: i + 1 }));
}
