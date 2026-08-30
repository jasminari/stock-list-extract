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

// === DART 전자공시 (지분공시) ===

/** 공시 원문 유형. D001 대량보유상황보고서 / D002 임원ㆍ주요주주 소유상황보고서 */
export type OwnershipReportKind = "major" | "executive";

/** list.json 한 건 */
export interface DartFiling {
  rceptNo: string;
  corpCode: string;
  corpName: string;
  stockCode: string;
  /** Y 유가증권 / K 코스닥 / N 코넥스 / E 기타 */
  corpCls: string;
  reportNm: string;
  flrNm: string;
  rceptDt: string;
  detailType: string;
}

/**
 * 보고서 한 건을 (보고자 × 취득방법)으로 묶은 표 한 줄.
 * reference1의 "임원, 주요주주 특정증권 등 소유상황보고서" 표와 같은 단위다.
 */
export interface OwnershipRow {
  rceptNo: string;
  kind: OwnershipReportKind;
  /** 종목명 */
  corpName: string;
  stockCode: string;
  corpCls: string;
  /** 공시주체 — "비등기임원(상무)", "10%이상주주", "린드먼아시아 특별관계자" 등 */
  subject: string;
  /** 이름 — 실제 지분이 움직인 주체(보고자 또는 특별관계자) */
  holderName: string;
  /** 최초변동일 YYYYMMDD */
  firstDate: string;
  /** 최종변동일 YYYYMMDD */
  lastDate: string;
  /** 취득방법 — 장내매수 / 장내매도 / 시간외매매 등 */
  method: string;
  /** 증감(주). 매도는 음수 */
  delta: number;
  /** 변동후 보유수량(주) */
  after: number | null;
  /** 지분율(전) %. 산출 불가 시 null */
  ratioBefore: number | null;
  /** 지분율(후) %. 산출 불가 시 null */
  ratioAfter: number | null;
  /** 취득단가(원). 여러 건이면 총액 ÷ 증감수량의 가중평균 */
  unitPrice: number | null;
  /** 총액(원) = Σ |증감| × 단가 */
  amount: number | null;
}
