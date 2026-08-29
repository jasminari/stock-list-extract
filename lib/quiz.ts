import type { ProcessedStock } from "./types";
import { formatDateKorean } from "./date";

// === 타입 ===

export type QuizQuestionType =
  | "top-amount"
  | "top-turnover"
  | "top-change"
  | "top-marketcap"
  | "change-rate"
  | "close-price"
  | "reason-match"
  | "keyword-match"
  | "concept";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  /** 문제 본문 */
  prompt: string;
  /** 문제 위에 붙는 라벨(날짜/카테고리) */
  tag: string;
  /** 인용문처럼 보여줄 보조 지문 (없을 수 있음) */
  passage?: string;
  choices: string[];
  answerIndex: number;
  /** 정답 공개 후 보여줄 해설 */
  explanation: string;
}

export const DAILY_QUIZ_SIZE = 5;

// === 결정적 난수 (같은 유저 + 같은 날짜 = 같은 문제) ===

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — 시드가 같으면 항상 같은 수열을 만든다 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

function shuffle<T>(arr: T[], rand: Rand): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sample<T>(arr: T[], n: number, rand: Rand): T[] {
  return shuffle(arr, rand).slice(0, n);
}

/** 정답을 보기 배열에 섞어 넣고 정답 위치를 함께 돌려준다 */
function placeChoices(
  correct: string,
  wrongs: string[],
  rand: Rand
): { choices: string[]; answerIndex: number } {
  const choices = shuffle([correct, ...wrongs], rand);
  return { choices, answerIndex: choices.indexOf(correct) };
}

// === 표시 형식 (표 화면과 동일하게 맞춘다) ===

const fmtAmount = (bil: number) => `${bil.toLocaleString()}억`;
const fmtPrice = (won: number) => `${won.toLocaleString()}원`;
const fmtRate = (rate: number) => `${rate.toFixed(2)}%`;
const fmtTurnover = (rate: number) =>
  `${rate.toFixed(rate < 1 ? 2 : 1)}%`;

// === 종목 데이터 기반 문제 ===

type Generator = (
  stocks: ProcessedStock[],
  rand: Rand,
  ctx: { tag: string; used: Set<string> }
) => QuizQuestion | null;

/** 값이 서로 충분히 벌어진 4종목을 고른다 (애매한 정답 방지) */
function pickDistinct(
  stocks: ProcessedStock[],
  value: (s: ProcessedStock) => number,
  rand: Rand,
  count = 4
): ProcessedStock[] | null {
  for (let attempt = 0; attempt < 16; attempt++) {
    const picked = sample(stocks, count, rand);
    if (picked.length < count) return null;
    const values = picked.map(value).sort((a, b) => b - a);
    // 1등이 2등보다 40% 이상 커야 눈대중으로도 정답이 분명하다
    if (values[0] > values[1] * 1.4) return picked;
  }
  return null;
}

const topAmountQ: Generator = (stocks, rand, ctx) => {
  const pool = stocks.slice(0, 25).filter((s) => s.tradingAmountBil > 0);
  if (pool.length < 4) return null;
  const picked = pickDistinct(pool, (s) => s.tradingAmountBil, rand);
  if (!picked) return null;

  const answer = picked.reduce((a, b) =>
    b.tradingAmountBil > a.tradingAmountBil ? b : a
  );
  ctx.used.add(answer.code);
  const { choices, answerIndex } = placeChoices(
    answer.name,
    picked.filter((s) => s.code !== answer.code).map((s) => s.name),
    rand
  );

  return {
    id: `top-amount:${answer.code}`,
    type: "top-amount",
    tag: ctx.tag,
    prompt: "이 날 거래대금이 가장 많았던 종목은?",
    choices,
    answerIndex,
    explanation:
      `${answer.name} ${fmtAmount(answer.tradingAmountBil)}. ` +
      `거래대금은 그날 그 종목에 실제로 오간 돈의 크기라서, ` +
      `시장의 관심이 어디에 몰렸는지를 가장 직접적으로 보여줍니다.`,
  };
};

const topTurnoverQ: Generator = (stocks, rand, ctx) => {
  const pool = stocks.filter((s) => (s.turnoverRate ?? 0) > 0);
  if (pool.length < 4) return null;
  const picked = pickDistinct(pool, (s) => s.turnoverRate ?? 0, rand);
  if (!picked) return null;

  const answer = picked.reduce((a, b) =>
    (b.turnoverRate ?? 0) > (a.turnoverRate ?? 0) ? b : a
  );
  ctx.used.add(answer.code);
  const { choices, answerIndex } = placeChoices(
    answer.name,
    picked.filter((s) => s.code !== answer.code).map((s) => s.name),
    rand
  );

  return {
    id: `top-turnover:${answer.code}`,
    type: "top-turnover",
    tag: ctx.tag,
    prompt: "이 날 거래회전율이 가장 높았던 종목은?",
    passage: "회전율 = 거래대금 ÷ 시가총액 × 100",
    choices,
    answerIndex,
    explanation:
      `${answer.name} ${fmtTurnover(answer.turnoverRate ?? 0)}. ` +
      `회전율은 "발행된 주식 중 몇 %가 하루 만에 손바뀜했나"를 뜻합니다. ` +
      `거래대금과 달리 시총 규모가 달라도 비교할 수 있어서, 소형주의 과열을 잡아낼 때 씁니다.`,
  };
};

const topChangeQ: Generator = (stocks, rand, ctx) => {
  const pool = stocks.slice(0, 30);
  if (pool.length < 4) return null;
  const picked = sample(pool, 4, rand);
  const sorted = [...picked].sort((a, b) => b.changeRate - a.changeRate);
  // 1등과 2등 등락률이 2%p 이상 벌어져야 정답이 명확하다
  if (sorted[0].changeRate - sorted[1].changeRate < 2) return null;

  const answer = sorted[0];
  ctx.used.add(answer.code);
  const { choices, answerIndex } = placeChoices(
    answer.name,
    picked.filter((s) => s.code !== answer.code).map((s) => s.name),
    rand
  );

  return {
    id: `top-change:${answer.code}`,
    type: "top-change",
    tag: ctx.tag,
    prompt: "이 날 가장 많이 오른 종목은?",
    choices,
    answerIndex,
    explanation:
      `${answer.name} ${fmtRate(answer.changeRate)}. ` +
      `등락률이 높다고 거래대금까지 큰 것은 아닙니다. ` +
      `얇은 거래로 오른 급등은 되돌림도 그만큼 빠릅니다.`,
  };
};

const topMarketCapQ: Generator = (stocks, rand, ctx) => {
  const pool = stocks.filter((s) => (s.marketCapBil ?? 0) > 0);
  if (pool.length < 4) return null;
  const picked = pickDistinct(pool, (s) => s.marketCapBil ?? 0, rand);
  if (!picked) return null;

  const answer = picked.reduce((a, b) =>
    (b.marketCapBil ?? 0) > (a.marketCapBil ?? 0) ? b : a
  );
  ctx.used.add(answer.code);
  const { choices, answerIndex } = placeChoices(
    answer.name,
    picked.filter((s) => s.code !== answer.code).map((s) => s.name),
    rand
  );

  return {
    id: `top-marketcap:${answer.code}`,
    type: "top-marketcap",
    tag: ctx.tag,
    prompt: "다음 중 시가총액이 가장 큰 종목은?",
    choices,
    answerIndex,
    explanation:
      `${answer.name} ${fmtAmount(answer.marketCapBil ?? 0)}. ` +
      `시가총액 = 종가 × 상장주식수, 즉 회사 전체를 통째로 사는 데 필요한 돈입니다. ` +
      `주가가 비싸다고 큰 회사인 것은 아닙니다.`,
  };
};

const changeRateQ: Generator = (stocks, rand, ctx) => {
  const pool = stocks
    .slice(0, 20)
    .filter((s) => !ctx.used.has(s.code) && Math.abs(s.changeRate) >= 1);
  if (pool.length === 0) return null;

  const target = sample(pool, 1, rand)[0];
  ctx.used.add(target.code);
  const actual = target.changeRate;
  // 오답도 가격제한폭(±30%) 안이어야 소거법으로 풀리지 않는다
  const candidates = shuffle([3.5, -3.5, 6.5, -6.5, 11, -11, 17, -17], rand)
    .map((delta) => actual + delta)
    .filter((v) => v > -29.9 && v < 29.9)
    .map(fmtRate);
  const unique = Array.from(new Set(candidates)).filter(
    (w) => w !== fmtRate(actual)
  );
  if (unique.length < 3) return null;

  const { choices, answerIndex } = placeChoices(
    fmtRate(actual),
    unique.slice(0, 3),
    rand
  );

  return {
    id: `change-rate:${target.code}`,
    type: "change-rate",
    tag: ctx.tag,
    prompt: `${target.name}의 이 날 등락률은?`,
    choices,
    answerIndex,
    explanation:
      `${fmtRate(actual)}. 종가 ${fmtPrice(target.closingPrice)}, ` +
      `거래대금 ${fmtAmount(target.tradingAmountBil)}였습니다. ` +
      `등락률은 전일 종가 대비 오늘 종가가 몇 % 움직였는지를 나타냅니다.`,
  };
};

const closePriceQ: Generator = (stocks, rand, ctx) => {
  const pool = stocks
    .slice(0, 20)
    .filter((s) => !ctx.used.has(s.code) && s.closingPrice > 1000);
  if (pool.length === 0) return null;

  const target = sample(pool, 1, rand)[0];
  ctx.used.add(target.code);
  const actual = target.closingPrice;
  const factors = shuffle([0.55, 0.72, 1.35, 1.8, 2.4], rand).slice(0, 3);
  const round = (n: number) => {
    const unit = n >= 100000 ? 1000 : n >= 10000 ? 100 : 10;
    return Math.round(n / unit) * unit;
  };
  const wrongs = Array.from(
    new Set(factors.map((f) => fmtPrice(round(actual * f))))
  ).filter((w) => w !== fmtPrice(actual));
  if (wrongs.length < 3) return null;

  const { choices, answerIndex } = placeChoices(
    fmtPrice(actual),
    wrongs.slice(0, 3),
    rand
  );

  return {
    id: `close-price:${target.code}`,
    type: "close-price",
    tag: ctx.tag,
    prompt: `${target.name}의 이 날 종가는?`,
    choices,
    answerIndex,
    explanation:
      `${fmtPrice(actual)} (${fmtRate(target.changeRate)}). ` +
      `주가 자체는 기업 규모와 무관합니다. 회사 크기를 보려면 시가총액을 봐야 합니다.`,
  };
};

/** 지문에서 종목명을 가려 정답이 새어나가지 않게 한다 */
function maskName(text: string, name: string): string {
  if (!name) return text;
  return text.split(name).join("○○○");
}

/** reason은 "상승 이유\n회사 소개" 구조라, 회사 소개 줄에 종목명이 남아 정답이 새어나간다 */
function riseReasonLine(reason: string): string {
  return reason.split("\n")[0].trim();
}

const reasonMatchQ: Generator = (stocks, rand, ctx) => {
  const withReason = stocks.filter(
    (s) => riseReasonLine(s.reason).length >= 15 && !ctx.used.has(s.code)
  );
  if (withReason.length === 0 || stocks.length < 4) return null;

  const target = sample(withReason, 1, rand)[0];
  ctx.used.add(target.code);
  const others = sample(
    stocks.filter((s) => s.code !== target.code),
    3,
    rand
  );
  if (others.length < 3) return null;

  const { choices, answerIndex } = placeChoices(
    target.name,
    others.map((s) => s.name),
    rand
  );

  const reason = maskName(riseReasonLine(target.reason), target.name);
  return {
    id: `reason-match:${target.code}`,
    type: "reason-match",
    tag: ctx.tag,
    prompt: "다음 설명에 해당하는 종목은?",
    passage: reason.length > 220 ? `${reason.slice(0, 220)}…` : reason,
    choices,
    answerIndex,
    explanation:
      `${target.name} (${fmtRate(target.changeRate)}, 거래대금 ${fmtAmount(
        target.tradingAmountBil
      )}). 상승 이유를 종목과 연결해 기억해두면, ` +
      `비슷한 재료가 나왔을 때 어떤 종목이 반응할지 예상할 수 있습니다.`,
  };
};

const keywordMatchQ: Generator = (stocks, rand, ctx) => {
  const withKeyword = stocks.filter(
    (s) => s.keyword.trim().length >= 2 && !ctx.used.has(s.code)
  );
  if (withKeyword.length === 0 || stocks.length < 4) return null;

  const target = sample(withKeyword, 1, rand)[0];
  ctx.used.add(target.code);
  const others = sample(
    stocks.filter((s) => s.code !== target.code),
    3,
    rand
  );
  if (others.length < 3) return null;

  const { choices, answerIndex } = placeChoices(
    target.name,
    others.map((s) => s.name),
    rand
  );

  return {
    id: `keyword-match:${target.code}`,
    type: "keyword-match",
    tag: ctx.tag,
    prompt: `"${target.keyword.trim()}" 키워드가 붙은 종목은?`,
    choices,
    answerIndex,
    explanation:
      `${target.name}. 같은 키워드가 여러 날 반복해서 붙는 종목은 ` +
      `일회성 재료가 아니라 흐름이 이어지고 있다는 신호일 수 있습니다.`,
  };
};

const DATA_GENERATORS: Generator[] = [
  topAmountQ,
  topTurnoverQ,
  topChangeQ,
  topMarketCapQ,
  changeRateQ,
  closePriceQ,
  reasonMatchQ,
  keywordMatchQ,
];

// === 개념 문제 (데이터가 없어도 항상 풀 수 있게) ===

interface ConceptSeed {
  id: string;
  prompt: string;
  passage?: string;
  correct: string;
  wrongs: string[];
  explanation: string;
}

const CONCEPT_BANK: ConceptSeed[] = [
  {
    id: "concept:trading-amount",
    prompt: "거래대금이 뜻하는 것은?",
    correct: "그날 그 종목에 오간 돈의 총액",
    wrongs: [
      "그날 거래된 주식의 총 수량",
      "회사가 보유한 현금의 총액",
      "회사 전체 가치를 나타내는 금액",
    ],
    explanation:
      "거래대금 = 체결 가격 × 체결 수량의 합. 거래량(주식 수)과 달리 주가가 반영되어 있어, " +
      "가격대가 다른 종목끼리도 관심도를 비교할 수 있습니다.",
  },
  {
    id: "concept:market-cap",
    prompt: "시가총액을 구하는 식은?",
    correct: "주가 × 상장주식수",
    wrongs: ["주가 × 거래량", "거래대금 × 상장주식수", "주가 ÷ 상장주식수"],
    explanation:
      "시가총액은 회사를 통째로 사는 데 필요한 돈입니다. 주가가 100만 원이어도 주식 수가 적으면 작은 회사이고, " +
      "주가가 1,000원이어도 주식 수가 많으면 큰 회사일 수 있습니다.",
  },
  {
    id: "concept:turnover",
    prompt: "거래회전율이 높다는 것은 무슨 뜻일까요?",
    passage: "회전율 = 거래대금 ÷ 시가총액 × 100",
    correct: "발행된 주식 중 상당 비율이 하루 만에 손바뀜했다",
    wrongs: [
      "주가가 그만큼 많이 올랐다",
      "회사가 배당을 많이 준다",
      "외국인 지분율이 높다",
    ],
    explanation:
      "회전율 20%면 발행 주식의 5분의 1이 하루에 주인을 바꿨다는 뜻입니다. " +
      "단기 과열 신호로 자주 쓰이며, 시총 규모와 무관하게 비교할 수 있는 것이 장점입니다.",
  },
  {
    id: "concept:turnover-vs-amount",
    prompt:
      "거래대금은 작은데 회전율이 매우 높은 종목이 있습니다. 어떤 종목일 가능성이 클까요?",
    correct: "시가총액이 작은 소형주",
    wrongs: [
      "시가총액이 큰 대형주",
      "상장한 지 10년이 넘은 우량주",
      "배당수익률이 높은 종목",
    ],
    explanation:
      "회전율은 거래대금을 시가총액으로 나눈 값입니다. 분모(시총)가 작으면 적은 돈으로도 회전율이 크게 튑니다. " +
      "그래서 대형주는 거래대금 순위, 소형주는 회전율로 보는 것이 좋습니다.",
  },
  {
    id: "concept:change-rate",
    prompt: "등락률은 무엇을 기준으로 계산할까요?",
    correct: "전일 종가",
    wrongs: ["당일 시가", "최근 5일 평균가", "상장 당시 공모가"],
    explanation:
      "등락률 = (당일 종가 − 전일 종가) ÷ 전일 종가 × 100. " +
      "시가 대비가 아니라는 점이 중요합니다. 갭 상승 후 밀린 날은 등락률이 플러스여도 장중에는 내내 하락일 수 있습니다.",
  },
  {
    id: "concept:limit-up",
    prompt: "국내 증시에서 하루 주가가 오를 수 있는 최대 폭(상한가)은?",
    correct: "전일 종가 대비 +30%",
    wrongs: ["전일 종가 대비 +15%", "전일 종가 대비 +50%", "제한이 없다"],
    explanation:
      "코스피·코스닥 모두 ±30%가 일일 가격제한폭입니다. 다만 신규 상장 첫날, ETF 일부 등 예외가 있습니다. " +
      "등락률이 29%대라면 상한가에 근접했다는 뜻입니다.",
  },
  {
    id: "concept:net-buy",
    prompt: "'기관 순매수'는 어떤 상태를 말할까요?",
    correct: "기관이 판 금액보다 산 금액이 더 많은 상태",
    wrongs: [
      "기관이 보유한 주식을 전부 판 상태",
      "기관이 신규로 상장을 주관한 상태",
      "기관만 거래할 수 있도록 제한된 상태",
    ],
    explanation:
      "순매수 = 매수 − 매도. 수급 주체(기관·외국인·개인) 중 누가 사고 있는지는 상승의 지속성을 가늠하는 단서가 됩니다.",
  },
  {
    id: "concept:volume-vs-amount",
    prompt:
      "A종목은 100만 주, B종목은 10만 주가 거래됐습니다. 어느 쪽에 돈이 더 몰렸을까요?",
    correct: "주가를 알아야 판단할 수 있다",
    wrongs: [
      "무조건 A종목",
      "무조건 B종목",
      "거래량이 같아질 때까지 알 수 없다",
    ],
    explanation:
      "거래량은 주식 수일 뿐입니다. A가 1,000원이면 10억, B가 100,000원이면 100억이 오간 것입니다. " +
      "그래서 관심도 비교에는 거래량이 아니라 거래대금을 씁니다.",
  },
  {
    id: "concept:why-daily-check",
    prompt:
      "매일 거래대금 상위 종목을 기록해두면 얻을 수 있는 것은?",
    correct: "어떤 테마에 돈이 며칠째 머무는지 흐름을 볼 수 있다",
    wrongs: [
      "다음 날 주가를 정확히 예측할 수 있다",
      "거래 수수료를 아낄 수 있다",
      "배당금을 더 많이 받을 수 있다",
    ],
    explanation:
      "하루치 순위는 소음이지만, 며칠을 이어 붙이면 자금이 머무는 테마와 빠지는 테마가 보입니다. " +
      "상승 이유를 함께 적어두면 나중에 같은 재료가 나왔을 때 대응이 빨라집니다.",
  },
  {
    id: "concept:price-level",
    prompt: "주가가 높은 종목이 반드시 갖는 특징은?",
    correct: "없다 — 주가만으로는 아무것도 알 수 없다",
    wrongs: [
      "회사 규모가 크다",
      "실적이 좋다",
      "거래대금이 많다",
    ],
    explanation:
      "주가는 회사 가치를 주식 수로 나눈 값일 뿐이라, 액면분할 한 번이면 10분의 1이 됩니다. " +
      "규모는 시가총액으로, 관심도는 거래대금으로 봐야 합니다.",
  },
];

function conceptQuestion(seed: ConceptSeed, rand: Rand): QuizQuestion {
  const { choices, answerIndex } = placeChoices(seed.correct, seed.wrongs, rand);
  return {
    id: seed.id,
    type: "concept",
    tag: "개념",
    prompt: seed.prompt,
    passage: seed.passage,
    choices,
    answerIndex,
    explanation: seed.explanation,
  };
}

// === 하루치 퀴즈 조립 ===

export interface BuildQuizInput {
  /** 같은 값이면 같은 문제가 나온다 (유저 + 날짜) */
  seedKey: string;
  stocks: ProcessedStock[];
  /** 출제에 쓰인 시장 데이터 날짜 (YYYYMMDD). 없으면 개념 문제만 */
  dataDate: string | null;
}

/**
 * 데이터 문제를 최대 4개까지 뽑고 나머지는 개념 문제로 채운다.
 * 개념 문제가 최소 1개는 들어가도록 해서, 수집 데이터가 없는 날에도 학습이 이어진다.
 */
export function buildDailyQuiz({
  seedKey,
  stocks,
  dataDate,
}: BuildQuizInput): QuizQuestion[] {
  const rand = mulberry32(hashSeed(seedKey));
  const questions: QuizQuestion[] = [];

  if (dataDate && stocks.length >= 4) {
    const ctx = { tag: formatDateKorean(dataDate), used: new Set<string>() };
    const maxDataQuestions = DAILY_QUIZ_SIZE - 1;
    for (const generate of shuffle(DATA_GENERATORS, rand)) {
      if (questions.length >= maxDataQuestions) break;
      const q = generate(stocks, rand, ctx);
      if (q && !questions.some((prev) => prev.id === q.id)) questions.push(q);
    }
  }

  for (const seed of shuffle(CONCEPT_BANK, rand)) {
    if (questions.length >= DAILY_QUIZ_SIZE) break;
    questions.push(conceptQuestion(seed, rand));
  }

  return questions.slice(0, DAILY_QUIZ_SIZE);
}

// === 연속 학습일(스트릭) ===

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(
    Date.UTC(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(4, 6)) - 1,
      Number(dateStr.slice(6, 8))
    )
  );
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * 오늘(또는 아직 안 풀었으면 어제)부터 하루도 빠짐없이 이어진 날 수.
 * 오늘 안 풀었어도 어제까지의 기록은 유지된다 (오늘 풀면 이어짐).
 */
export function calcStreak(
  completedDates: string[],
  today: string
): number {
  const done = new Set(completedDates);
  let cursor = done.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}
