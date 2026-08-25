// === Kiwoom API 관련 타입 ===

export interface KiwoomToken {
  token: string;
  expires_dt: string;
}

export interface Condition {
  seq: string;
  name: string;
}

export interface StockResult {
  code: string;
  name: string;
  price: string;
  change_sign: string;
  change: string;
  change_rate: string;
  volume: string;
  trading_amount: string;
  /** 상장주식수(주). 키움 ka10099 listCount. 시가총액 계산용 */
  list_count: string;
  open: string;
  high: string;
  low: string;
}

// === 가공된 종목 데이터 ===

export interface ProcessedStock {
  index: number;
  entryId: number | null;
  name: string;
  code: string;
  keyword: string;
  tradingAmountBil: number;
  closingPrice: number;
  changeRate: number;
  /** 시가총액(억원). 상장주식수 미확보 시 null */
  marketCapBil: number | null;
  /** 거래대금 ÷ 시가총액 × 100 (%). 상장주식수 미확보 시 null */
  turnoverRate: number | null;
  reason: string;
  sourceUrl: string;
  sourceTitle: string;
}

// === 검색 결과 메타 ===

export interface ResultMeta {
  id?: number;
  fileName?: string;
  date: string;
  conditionName: string;
  count: number;
  createdAt: string;
}

// === 등록된 조건검색식 ===

export interface RegisteredCondition {
  id: number;
  seq: string;
  name: string;
  registeredAt: string;
}

// === DB 관련 타입 ===

export interface DbResultMeta {
  id: number;
  date: string;
  conditionName: string;
  count: number;
  createdAt: string;
}

export interface StockEntryWithAnnotation {
  id: number;
  code: string;
  name: string;
  price: string;
  changeSign: string;
  change: string;
  changeRate: string;
  volume: string;
  tradingAmount: string;
  listCount: string;
  open: string;
  high: string;
  low: string;
  keyword: string;
  reason: string;
  sourceUrl: string;
  sourceTitle: string;
}
