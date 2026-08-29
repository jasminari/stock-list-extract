import type { ProcessedStock } from "./types";
import { formatDateKorean } from "./date";

// === 타입 ===

export type QuizQuestionType =
  /** 이 종목이 왜 올랐나 — 상승 이유 고르기 */
  | "why-rose"
  /** 이 상승 이유의 주인공 종목 고르기 */
  | "reason-match"
  /** 이 종목의 상승을 이끈 재료(테마 키워드) 고르기 */
  | "stock-keyword"
  /** 이 재료로 오른 종목 고르기 */
  | "keyword-match"
  /** 같은 재료로 함께 오른 종목 고르기 */
  | "theme-peer"
  /** 사업 설명으로 종목 고르기 (재료가 왜 이 회사에 붙는지) */
  | "business-match"
  /** 시장 맥락 보조 문제 */
  | "top-amount"
  | "top-turnover"
  /** 개념 문제 */
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
  /** 보기가 긴 문장일 때 "정답은 ○○" 자리에 대신 쓸 짧은 이름 */
  answerLabel?: string;
}

export const DAILY_QUIZ_SIZE = 5;

/** 이유 기반 문제가 하루 5문제 중 차지하는 최소 목표치 */
const MAX_DATA_QUESTIONS = DAILY_QUIZ_SIZE - 1;
/** 거래대금·회전율 같은 지표 문제는 이유 문제가 모자랄 때만, 최대 1개 */
const MAX_MARKET_QUESTIONS = 1;
/** 이 정도는 올라야 "이 날 오른 이유"를 묻는 문제로 성립한다 (%) */
const MIN_RISE_RATE = 1;

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
const fmtRate = (rate: number) => `${rate.toFixed(2)}%`;
const fmtTurnover = (rate: number) => `${rate.toFixed(rate < 1 ? 2 : 1)}%`;

// === 상승 이유 텍스트 다루기 ===

/**
 * reason은 "상승 이유\n회사 소개" 두 줄 구조다.
 * 첫 줄만 쓰면 "왜 올랐나"에 집중되고, 회사 소개 줄에 남은 종목명 유출도 줄어든다.
 */
function riseReasonLine(reason: string): string {
  return (reason.split("\n")[0] ?? "").trim();
}

/** 회사 소개 줄 (없는 종목도 많다) */
function companyLine(reason: string): string {
  return (reason.split("\n")[1] ?? "").trim();
}

/**
 * 지문·보기에서 종목명을 모두 가린다.
 * 정답 종목만 가리면 오답 보기에 남은 다른 종목명이 "이건 내가 아니다"라는
 * 단서가 되어 소거법으로 풀려버린다. 그래서 풀 전체의 이름을 가린다.
 */
function maskNames(text: string, names: string[]): string {
  let out = text;
  for (const name of names) {
    if (name.length >= 2 && out.includes(name)) out = out.split(name).join("○○○");
  }
  // "네이버는 …"처럼 종목명(NAVER)과 다른 표기의 회사 별칭은 위 목록으로 못 거른다.
  // 문장 첫 단어가 은/는으로 끝나면 거의 회사 이름이므로 함께 가린다.
  out = out.replace(/^([^\s]{2,12})(은|는)\s/, "○○○$2 ");
  return out.replace(/(○○○\s*){2,}/g, "○○○");
}

/** 받침 유무에 따라 "SK과(와)" 같은 어색한 표기를 피한다 */
function withGwa(name: string): string {
  const last = name.trim().slice(-1);
  const code = last.charCodeAt(0);
  // 한글 음절이 아니면(영문·숫자로 끝나면) 판단이 어려우니 무난한 "와"를 쓴다
  if (code < 0xac00 || code > 0xd7a3) return `${name}와`;
  return `${name}${(code - 0xac00) % 28 === 0 ? "와" : "과"}`;
}

function trimText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** 공백·조사·기호를 걷어낸 비교용 문자열 */
function normalize(text: string): string {
  return text.replace(/[\s.,·"'()[\]%~\-–—]/g, "");
}

/** 두 문장이 사실상 같은 내용인지 (bigram Jaccard) */
function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const n = normalize(s);
    const set = new Set<string>();
    for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * 기사 자동 요약이라 가끔 다른 회사 기사가 붙는다.
 * ("SK" 항목에 "SK하이닉스가 40조원 자사주 취득…" 같은 문장이 들어오는 식)
 * 이유 문장이 자기 이름이 아닌 다른 종목 이름으로 시작하면 출제에서 제외한다.
 */
function reasonLooksMismatched(stock: DatedStock, names: Set<string>): boolean {
  const head = riseReasonLine(stock.reason).split(/\s/)[0] ?? "";
  const subject = head.replace(/(은|는|이|가|의|을|를|에|도)$/, "");
  return subject !== stock.name && names.has(subject);
}

/** 같은 재료로 오른 종목끼리는 이유 문장도 거의 같아서 정답이 둘이 된다 */
function isConfusable(a: string, b: string): boolean {
  return similarity(a, b) > 0.42;
}

// === 종목 데이터 ===

/** 어느 날짜 데이터인지 함께 들고 다니는 종목 (여러 날을 섞어 출제하므로 필요) */
export interface DatedStock extends ProcessedStock {
  date: string;
}

interface Ctx {
  rand: Rand;
  /** 이유가 채워진 종목 풀 (최신일 우선 정렬) */
  pool: DatedStock[];
  /** 출제 후보 순서 — 최신일 종목이 앞에 온다 */
  targets: DatedStock[];
  /** 이미 출제에 쓴 종목 (같은 회사가 날짜만 바꿔 두 번 나오지 않게 종목코드로 관리) */
  used: Set<string>;
  /** 마스킹에 쓸 전체 종목명 */
  names: string[];
  /** 시장 맥락 문제용 — 최신일 전체 종목 */
  latest: ProcessedStock[];
  latestDate: string | null;
}

/** 문제 id에는 날짜까지 쓰고, 중복 출제 방지는 종목코드로 본다 */
const keyOf = (s: DatedStock) => `${s.date}:${s.code}`;

function tagOf(stock: DatedStock, ctx: Ctx): string {
  const label = formatDateKorean(stock.date);
  return stock.date === ctx.latestDate ? label : `${label} · 복습`;
}

/** 조건에 맞는 첫 출제 후보를 찾아 소비 표시까지 한다 */
function takeTarget(
  ctx: Ctx,
  ok: (s: DatedStock) => boolean
): DatedStock | null {
  for (const s of ctx.targets) {
    if (ctx.used.has(s.code)) continue;
    if (!ok(s)) continue;
    ctx.used.add(s.code);
    return s;
  }
  return null;
}

/** 정답 종목과 헷갈리지 않는 오답 종목을 고른다 */
function pickDistractors(
  ctx: Ctx,
  target: DatedStock,
  ok: (s: DatedStock) => boolean,
  count = 3
): DatedStock[] {
  const out: DatedStock[] = [];
  for (const s of shuffle(ctx.pool, ctx.rand)) {
    if (out.length >= count) break;
    if (s.code === target.code) continue;
    if (out.some((p) => p.code === s.code)) continue;
    if (!ok(s)) continue;
    out.push(s);
  }
  return out;
}

/** 정답 공개 후 해설 — 이유 전문과 재료를 다시 보여준다 */
function reasonExplanation(stock: DatedStock, lesson: string): string {
  const parts = [`${formatDateKorean(stock.date)} ${stock.name} ${fmtRate(stock.changeRate)}`];
  if (stock.keyword.trim()) parts.push(`재료: ${stock.keyword.trim()}`);
  const head = `${parts.join(" · ")}\n${riseReasonLine(stock.reason)}`;
  const company = companyLine(stock.reason);
  return [head, company, lesson].filter(Boolean).join("\n") + "";
}

// === 이유 기반 문제 (이 서비스의 본론) ===

type Generator = (ctx: Ctx) => QuizQuestion | null;

/** ① 종목 → 상승 이유. "왜 올랐는지"를 정면으로 묻는 대표 문제 */
const whyRoseQ: Generator = (ctx) => {
  const target = takeTarget(ctx, (s) => riseReasonLine(s.reason).length >= 20);
  if (!target) return null;

  const render = (text: string) => trimText(maskNames(text, ctx.names), 78);
  const answerText = riseReasonLine(target.reason);
  const answerLength = render(answerText).length;

  const wrongs = pickDistractors(ctx, target, (s) => {
    const line = riseReasonLine(s.reason);
    if (line.length < 20) return false;
    // 같은 재료로 오른 종목은 이유 문장까지 겹쳐 정답이 둘이 된다
    if (s.keyword.trim() && s.keyword.trim() === target.keyword.trim()) return false;
    return !isConfusable(line, answerText);
  }, 12);
  if (wrongs.length < 3) return null;

  // 유독 길거나 짧은 보기 하나는 내용을 안 읽어도 정답으로 찍힌다.
  // 후보를 넉넉히 모은 뒤 정답과 길이가 가장 비슷한 셋만 남긴다.
  const picked = wrongs
    .map((s) => render(riseReasonLine(s.reason)))
    .sort(
      (a, b) =>
        Math.abs(a.length - answerLength) - Math.abs(b.length - answerLength)
    )
    .slice(0, 3);

  const { choices, answerIndex } = placeChoices(
    render(answerText),
    picked,
    ctx.rand
  );

  return {
    id: `why-rose:${keyOf(target)}`,
    type: "why-rose",
    tag: tagOf(target, ctx),
    prompt: `${target.name}, 이 날 주가가 오른 이유는?`,
    choices,
    answerIndex,
    answerLabel: `${target.keyword.trim() || "상승 재료"}`,
    explanation: reasonExplanation(
      target,
      "주가가 움직인 이유를 종목과 붙여서 기억해두면, 같은 재료가 다시 나왔을 때 어떤 종목이 반응할지 먼저 떠올릴 수 있습니다."
    ),
  };
};

/** ② 상승 이유 → 종목. ①의 역방향이라 같은 지식을 다른 각도로 확인한다 */
const reasonMatchQ: Generator = (ctx) => {
  const target = takeTarget(ctx, (s) => riseReasonLine(s.reason).length >= 20);
  if (!target) return null;

  const answerText = riseReasonLine(target.reason);
  const wrongs = pickDistractors(ctx, target, (s) => {
    if (s.keyword.trim() && s.keyword.trim() === target.keyword.trim()) return false;
    return !isConfusable(riseReasonLine(s.reason), answerText);
  });
  if (wrongs.length < 3) return null;

  const { choices, answerIndex } = placeChoices(
    target.name,
    wrongs.map((s) => s.name),
    ctx.rand
  );

  return {
    id: `reason-match:${keyOf(target)}`,
    type: "reason-match",
    tag: tagOf(target, ctx),
    prompt: "다음 이유로 오른 종목은?",
    passage: trimText(maskNames(answerText, ctx.names), 220),
    choices,
    answerIndex,
    explanation: reasonExplanation(
      target,
      "재료 문장만 보고 종목이 떠오른다면, 그 재료가 어느 회사 실적으로 이어지는지까지 이해한 것입니다."
    ),
  };
};

/** ③ 종목 → 재료 키워드. 긴 이유를 한 단어로 압축하는 연습 */
const stockKeywordQ: Generator = (ctx) => {
  const target = takeTarget(
    ctx,
    (s) =>
      s.keyword.trim().length >= 2 &&
      !s.keyword.includes(s.name) &&
      riseReasonLine(s.reason).length >= 15
  );
  if (!target) return null;

  const answerKeyword = target.keyword.trim();
  const wrongs = pickDistractors(ctx, target, (s) => {
    const kw = s.keyword.trim();
    return kw.length >= 2 && kw !== answerKeyword && !isConfusable(kw, answerKeyword);
  });
  if (wrongs.length < 3) return null;

  const seen = new Set<string>();
  const wrongKeywords = wrongs
    .map((s) => s.keyword.trim())
    .filter((kw) => !seen.has(kw) && seen.add(kw));
  if (wrongKeywords.length < 3) return null;

  const { choices, answerIndex } = placeChoices(
    answerKeyword,
    wrongKeywords,
    ctx.rand
  );

  return {
    id: `stock-keyword:${keyOf(target)}`,
    type: "stock-keyword",
    tag: tagOf(target, ctx),
    prompt: `${target.name}의 상승을 이끈 재료는?`,
    choices,
    answerIndex,
    answerLabel: answerKeyword,
    explanation: reasonExplanation(
      target,
      "재료를 한 단어로 줄여두면 나중에 같은 테마가 돌아왔을 때 검색해서 찾아보기 쉽습니다."
    ),
  };
};

/** ④ 재료 키워드 → 종목 */
const keywordMatchQ: Generator = (ctx) => {
  // 키워드에 종목명이 들어 있으면 문제를 읽는 순간 답이 보인다 ("SK하이닉스 자사주 매입" → SK)
  const target = takeTarget(
    ctx,
    (s) => s.keyword.trim().length >= 2 && !s.keyword.includes(s.name)
  );
  if (!target) return null;

  const answerKeyword = target.keyword.trim();
  const wrongs = pickDistractors(
    ctx,
    target,
    (s) => s.keyword.trim() !== answerKeyword
  );
  if (wrongs.length < 3) return null;

  const { choices, answerIndex } = placeChoices(
    target.name,
    wrongs.map((s) => s.name),
    ctx.rand
  );

  return {
    id: `keyword-match:${keyOf(target)}`,
    type: "keyword-match",
    tag: tagOf(target, ctx),
    prompt: `이 날 "${answerKeyword}" 재료로 오른 종목은?`,
    choices,
    answerIndex,
    explanation: reasonExplanation(
      target,
      "같은 키워드가 여러 날 반복해서 붙는 종목은 일회성 재료가 아니라 흐름이 이어지고 있다는 신호일 수 있습니다."
    ),
  };
};

/** ⑤ 같은 재료로 함께 오른 짝 찾기 — 테마가 종목 하나로 끝나지 않는다는 감각 */
const themePeerQ: Generator = (ctx) => {
  const byKeyword = new Map<string, DatedStock[]>();
  for (const s of ctx.pool) {
    const kw = s.keyword.trim();
    if (kw.length < 2) continue;
    const list = byKeyword.get(`${s.date}:${kw}`) ?? [];
    list.push(s);
    byKeyword.set(`${s.date}:${kw}`, list);
  }

  const groups = shuffle(
    Array.from(byKeyword.values()).filter((g) => g.length >= 2),
    ctx.rand
  );

  for (const group of groups) {
    const [anchor, peer] = sample(group, 2, ctx.rand);
    if (!anchor || !peer) continue;
    if (ctx.used.has(peer.code) || ctx.used.has(anchor.code)) continue;

    const keyword = anchor.keyword.trim();
    if (keyword.includes(peer.name) || keyword.includes(anchor.name)) continue;
    // "SK증권과 같은 날 … 함께 오른 종목은?" → 정답이 SK면 질문에 답이 들어 있다
    if (anchor.name.includes(peer.name) || peer.name.includes(anchor.name)) continue;
    const wrongs = pickDistractors(
      ctx,
      peer,
      (s) => s.code !== anchor.code && s.keyword.trim() !== keyword
    );
    if (wrongs.length < 3) continue;

    ctx.used.add(peer.code);
    ctx.used.add(anchor.code);
    const { choices, answerIndex } = placeChoices(
      peer.name,
      wrongs.map((s) => s.name),
      ctx.rand
    );

    return {
      id: `theme-peer:${keyOf(peer)}`,
      type: "theme-peer",
      tag: tagOf(peer, ctx),
      prompt: `${withGwa(anchor.name)} 같은 날 "${keyword}" 재료로 함께 오른 종목은?`,
      choices,
      answerIndex,
      explanation:
        `${peer.name} ${fmtRate(peer.changeRate)}.\n` +
        `${riseReasonLine(peer.reason)}\n` +
        `하나의 재료는 보통 종목 하나로 끝나지 않고 같은 사업을 하는 회사들로 번집니다. ` +
        `테마가 뜨면 "이 재료로 같이 움직일 회사가 또 어디인가"를 찾아보는 습관이 도움이 됩니다.`,
    };
  }
  return null;
};

/** ⑥ 사업 설명 → 종목. 재료가 왜 하필 이 회사에 붙는지 이해하는 문제 */
const businessMatchQ: Generator = (ctx) => {
  const target = takeTarget(ctx, (s) => companyLine(s.reason).length >= 15);
  if (!target) return null;

  const answerText = companyLine(target.reason);
  const wrongs = pickDistractors(
    ctx,
    target,
    (s) => !isConfusable(companyLine(s.reason) || s.name, answerText)
  );
  if (wrongs.length < 3) return null;

  const { choices, answerIndex } = placeChoices(
    target.name,
    wrongs.map((s) => s.name),
    ctx.rand
  );

  return {
    id: `business-match:${keyOf(target)}`,
    type: "business-match",
    tag: tagOf(target, ctx),
    prompt: "다음 사업을 하는 회사는?",
    passage: trimText(maskNames(answerText, ctx.names), 200),
    choices,
    answerIndex,
    explanation: reasonExplanation(
      target,
      "재료가 어느 회사에 붙을지는 결국 그 회사가 무슨 사업을 하느냐로 정해집니다. 사업 내용을 알면 뉴스만 보고도 수혜 종목을 좁힐 수 있습니다."
    ),
  };
};

/** 대표 문제. 데이터가 되는 날이면 항상 첫 번째로 시도한다 */
const HEADLINE_GENERATOR: Generator = whyRoseQ;

/** 나머지는 매일 섞어서 3개까지 뽑는다 */
const REASON_GENERATORS: Generator[] = [
  reasonMatchQ,
  stockKeywordQ,
  keywordMatchQ,
  themePeerQ,
  businessMatchQ,
];

// === 시장 맥락 보조 문제 (이유 문제가 모자란 날에만) ===

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

const topAmountQ: Generator = (ctx) => {
  const pool = ctx.latest.slice(0, 25).filter((s) => s.tradingAmountBil > 0);
  if (pool.length < 4 || !ctx.latestDate) return null;
  const picked = pickDistinct(pool, (s) => s.tradingAmountBil, ctx.rand);
  if (!picked) return null;

  const answer = picked.reduce((a, b) =>
    b.tradingAmountBil > a.tradingAmountBil ? b : a
  );
  const { choices, answerIndex } = placeChoices(
    answer.name,
    picked.filter((s) => s.code !== answer.code).map((s) => s.name),
    ctx.rand
  );

  return {
    id: `top-amount:${ctx.latestDate}:${answer.code}`,
    type: "top-amount",
    tag: formatDateKorean(ctx.latestDate),
    prompt: "이 날 돈이 가장 많이 몰린(거래대금 1위) 종목은?",
    choices,
    answerIndex,
    explanation:
      `${answer.name} ${fmtAmount(answer.tradingAmountBil)}. ` +
      `거래대금은 그날 그 종목에 실제로 오간 돈의 크기입니다. ` +
      `돈이 몰린 종목부터 "왜 몰렸는지" 이유를 찾아보면 그날 시장의 관심사를 알 수 있습니다.`,
  };
};

const topTurnoverQ: Generator = (ctx) => {
  const pool = ctx.latest.filter((s) => (s.turnoverRate ?? 0) > 0);
  if (pool.length < 4 || !ctx.latestDate) return null;
  const picked = pickDistinct(pool, (s) => s.turnoverRate ?? 0, ctx.rand);
  if (!picked) return null;

  const answer = picked.reduce((a, b) =>
    (b.turnoverRate ?? 0) > (a.turnoverRate ?? 0) ? b : a
  );
  const { choices, answerIndex } = placeChoices(
    answer.name,
    picked.filter((s) => s.code !== answer.code).map((s) => s.name),
    ctx.rand
  );

  return {
    id: `top-turnover:${ctx.latestDate}:${answer.code}`,
    type: "top-turnover",
    tag: formatDateKorean(ctx.latestDate),
    prompt: "이 날 거래회전율이 가장 높았던 종목은?",
    passage: "회전율 = 거래대금 ÷ 시가총액 × 100",
    choices,
    answerIndex,
    explanation:
      `${answer.name} ${fmtTurnover(answer.turnoverRate ?? 0)}. ` +
      `회전율은 "발행된 주식 중 몇 %가 하루 만에 손바뀜했나"를 뜻합니다. ` +
      `시총이 작은 종목은 재료 하나에도 회전율이 크게 튑니다.`,
  };
};

const MARKET_GENERATORS: Generator[] = [topAmountQ, topTurnoverQ];

// === 개념 문제 (데이터가 없어도 항상 풀 수 있게) ===

interface ConceptSeed {
  id: string;
  /** 이유(재료·수급·테마 해석) 개념인지, 지표 개념인지 */
  topic: "이유" | "지표";
  prompt: string;
  passage?: string;
  correct: string;
  wrongs: string[];
  explanation: string;
}

const CONCEPT_BANK: ConceptSeed[] = [
  // --- 왜 올랐나를 읽는 개념 ---
  {
    id: "concept:teuk-jing-ju",
    topic: "이유",
    prompt: "'특징주' 기사는 보통 어떤 종목을 다룰까요?",
    correct: "그날 특별한 이유로 주가가 크게 움직인 종목",
    wrongs: [
      "시가총액 상위 100개 종목",
      "배당을 많이 주는 종목",
      "그날 거래가 정지된 종목",
    ],
    explanation:
      "특징주 기사는 '왜 움직였는지'를 짧게 정리해주기 때문에 상승 이유를 찾는 가장 빠른 출발점입니다. " +
      "다만 기사도 사후 해석이라, 이유가 여러 개면 어떤 게 진짜 재료인지는 며칠 지켜봐야 알 수 있습니다.",
  },
  {
    id: "concept:theme",
    topic: "이유",
    prompt: "'테마주'가 함께 오르내리는 이유는?",
    correct: "같은 재료(뉴스·정책)의 영향을 받는 회사끼리 묶이기 때문",
    wrongs: [
      "같은 증권사가 관리하는 종목이기 때문",
      "주가가 비슷한 가격대이기 때문",
      "상장한 시기가 같기 때문",
    ],
    explanation:
      "원전 계약 소식이 나오면 발전설비·배관·건설사가 함께 움직이는 식입니다. " +
      "그래서 재료 하나를 알면 종목 여러 개를 한 번에 이해할 수 있고, 반대로 테마가 식으면 같이 빠집니다.",
  },
  {
    id: "concept:sell-the-news",
    topic: "이유",
    prompt:
      "기다리던 호재가 '확정 발표'된 날, 오히려 주가가 빠지는 일이 흔한 이유는?",
    correct: "기대감으로 미리 올라 있어서 재료가 소멸했기 때문",
    wrongs: [
      "발표 당일은 거래가 제한되기 때문",
      "호재는 원래 주가와 관계없기 때문",
      "발표 직후에는 기관만 매매할 수 있기 때문",
    ],
    explanation:
      "주가는 '앞으로 벌 돈'을 미리 반영합니다. 발표로 불확실성이 사라지면 더 살 이유가 줄어들어 차익 실현이 나옵니다. " +
      "이걸 재료 소멸(뉴스에 팔아라)이라고 부릅니다. 상승 이유를 볼 때 '이미 알려진 이야기인가'를 같이 봐야 하는 이유입니다.",
  },
  {
    id: "concept:order-size",
    topic: "이유",
    prompt:
      "'500억 원 규모 공급계약 체결' 공시의 크기를 가늠하려면 무엇과 비교해야 할까요?",
    correct: "그 회사의 연간 매출액",
    wrongs: ["그날의 거래대금", "그 회사의 주가", "코스피 지수"],
    explanation:
      "연매출 300억 회사의 500억 수주는 회사를 바꾸는 사건이지만, 연매출 5조 회사의 500억은 반올림 오차에 가깝습니다. " +
      "그래서 공시에는 '최근 매출액 대비 비율'이 함께 적혀 있고, 그 숫자를 먼저 봐야 합니다.",
  },
  {
    id: "concept:policy",
    topic: "이유",
    prompt: "'정책 수혜주'는 어떤 종목을 말할까요?",
    correct: "정부 예산·제도 변화로 실적이 늘어날 것으로 기대되는 종목",
    wrongs: [
      "정부가 지분을 보유한 종목",
      "정부에 세금을 가장 많이 내는 종목",
      "공공기관만 거래할 수 있는 종목",
    ],
    explanation:
      "정책 재료는 발표 → 예산 배정 → 실제 발주까지 시차가 큽니다. " +
      "기대감만으로 오른 구간인지, 수주 공시로 숫자가 확인된 구간인지 구분해서 봐야 합니다.",
  },
  {
    id: "concept:supply-chain",
    topic: "이유",
    prompt:
      "대형 IT기업의 대규모 데이터센터 투자 소식에 변압기·전선 회사가 오르는 것을 뭐라고 설명할 수 있을까요?",
    correct: "전방 산업의 투자가 후방 부품·설비 업체 실적으로 이어지는 밸류체인 효과",
    wrongs: [
      "두 회사의 대주주가 같기 때문",
      "같은 업종으로 분류돼 지수가 함께 움직이기 때문",
      "우연의 일치일 뿐 관련이 없음",
    ],
    explanation:
      "데이터센터를 지으려면 전력 설비가 반드시 필요합니다. 이렇게 '누가 돈을 쓰면 누가 버는가'를 따라가면 " +
      "뉴스 하나에서 종목 여러 개를 찾아낼 수 있습니다. 다만 매출 비중이 작은 회사는 실제 효과가 미미할 수 있습니다.",
  },
  {
    id: "concept:target-price",
    topic: "이유",
    prompt: "증권사 '목표주가 상향' 리포트가 주가를 밀어올리는 이유는?",
    correct: "실적 전망치가 올라갔다는 신호로 받아들여지기 때문",
    wrongs: [
      "증권사가 그 가격에 주식을 사줘야 하기 때문",
      "목표주가에 도달할 때까지 매도가 금지되기 때문",
      "목표주가가 곧 다음 날 시초가가 되기 때문",
    ],
    explanation:
      "목표주가는 애널리스트의 추정치일 뿐 보증이 아닙니다. 중요한 건 숫자 자체보다 '왜 올렸는가'(수주·판가·물량)입니다. " +
      "리포트를 볼 때는 목표가보다 근거 문단을 먼저 읽는 편이 낫습니다.",
  },
  {
    id: "concept:earnings-surprise",
    topic: "이유",
    prompt: "'어닝 서프라이즈'는 무엇을 뜻할까요?",
    correct: "실적이 시장 예상치를 크게 웃돈 것",
    wrongs: [
      "실적을 예정보다 빨리 발표한 것",
      "사상 최대 매출을 낸 것",
      "적자에서 흑자로 돌아선 것",
    ],
    explanation:
      "핵심은 '절대 금액'이 아니라 '예상 대비'입니다. 사상 최대 실적을 내고도 기대에 못 미치면 주가는 빠집니다. " +
      "실적 발표로 오른 종목을 볼 때는 컨센서스(시장 예상치)와 비교했는지 확인해야 합니다.",
  },
  {
    id: "concept:rights-issue",
    topic: "이유",
    prompt: "일반적으로 주주에게 악재로 받아들여지는 쪽은?",
    correct: "유상증자 — 새 주식을 팔아 자금을 조달",
    wrongs: [
      "무상증자 — 기존 주주에게 주식을 나눠줌",
      "자사주 매입 — 회사가 자기 주식을 사들임",
      "현금배당 — 이익을 주주에게 나눠줌",
    ],
    explanation:
      "유상증자는 주식 수가 늘어 기존 주주 몫이 희석됩니다. 다만 조달한 돈을 확실한 증설·인수에 쓴다면 호재로 읽히기도 합니다. " +
      "공시를 볼 때 '얼마를, 누구에게, 어디에 쓰려고'를 확인하는 게 중요합니다.",
  },
  {
    id: "concept:buyback",
    topic: "이유",
    prompt: "회사가 '자사주 매입·소각'을 발표하면 주가에 왜 긍정적일까요?",
    correct: "유통 주식 수가 줄어 주당 가치가 올라가기 때문",
    wrongs: [
      "회사가 세금을 면제받기 때문",
      "배당을 의무적으로 늘려야 하기 때문",
      "주가가 법으로 보장되기 때문",
    ],
    explanation:
      "같은 이익을 더 적은 주식으로 나누니 주당 이익이 늘어납니다. 매입만 하고 소각하지 않으면 " +
      "나중에 다시 시장에 나올 수 있어서, 소각까지 하는지가 진짜 차이를 만듭니다.",
  },
  {
    id: "concept:supply-demand",
    topic: "이유",
    prompt:
      "'외국인·기관 동반 순매수'가 상승 이유로 자주 언급되는 까닭은?",
    correct: "자금 규모가 커서 매수세가 며칠 이어지는 경우가 많기 때문",
    wrongs: [
      "외국인과 기관은 손해 보는 매매를 하지 않기 때문",
      "이들이 사면 주가 상한이 풀리기 때문",
      "개인 투자자는 그 종목을 살 수 없기 때문",
    ],
    explanation:
      "수급은 '누가 사는가'일 뿐 '왜 사는가'는 아닙니다. 수급만 이유로 오른 날은 근거가 얕을 수 있으니, " +
      "그 뒤에 실적·수주 같은 재료가 있는지 한 번 더 찾아보는 게 좋습니다.",
  },
  {
    id: "concept:rumor",
    topic: "이유",
    prompt:
      "'~에 진출한다더라' 수준의 소문으로 급등한 종목을 볼 때 먼저 확인할 것은?",
    correct: "회사가 낸 공시로 사실이 확인되는지",
    wrongs: [
      "그날 거래량이 얼마나 늘었는지",
      "주가가 며칠째 오르고 있는지",
      "종목 게시판 글이 몇 개인지",
    ],
    explanation:
      "공시는 회사가 법적 책임을 지고 내는 정보입니다. 거래소가 소문을 확인해달라고 요구하는 '조회공시 요구'가 뜨면 " +
      "회사 답변으로 사실 여부가 드러납니다. 확인되지 않은 재료로 오른 급등은 되돌림도 빠릅니다.",
  },
  {
    id: "concept:same-theme-gap",
    topic: "이유",
    prompt:
      "같은 테마인데 A는 상한가, B는 2% 상승에 그쳤습니다. 가장 그럴듯한 설명은?",
    correct: "그 재료가 두 회사 매출에서 차지하는 비중이 다르기 때문",
    wrongs: [
      "A의 주가가 B보다 싸기 때문",
      "A가 코스닥, B가 코스피이기 때문",
      "A의 상장 기간이 더 길기 때문",
    ],
    explanation:
      "재료가 매출의 절반을 좌우하는 회사와, 여러 사업 중 하나일 뿐인 회사는 반응 크기가 다릅니다. " +
      "테마에 묶였다는 이유만으로 오른 종목은 재료가 식으면 먼저 빠지는 경우가 많습니다.",
  },
  {
    id: "concept:why-record",
    topic: "이유",
    prompt: "오른 종목의 '이유'를 매일 기록해두면 얻을 수 있는 것은?",
    correct: "어떤 재료에 돈이 며칠째 머무는지 흐름을 볼 수 있다",
    wrongs: [
      "다음 날 주가를 정확히 예측할 수 있다",
      "거래 수수료를 아낄 수 있다",
      "배당금을 더 많이 받을 수 있다",
    ],
    explanation:
      "하루치 이유는 소음이지만, 며칠을 이어 붙이면 자금이 머무는 테마와 빠지는 테마가 보입니다. " +
      "같은 재료가 다시 나왔을 때 '그때 이 종목이 반응했지'를 떠올릴 수 있는 것이 기록의 힘입니다.",
  },

  // --- 이유를 읽을 때 함께 쓰는 지표 개념 ---
  {
    id: "concept:trading-amount",
    topic: "지표",
    prompt: "거래대금이 뜻하는 것은?",
    correct: "그날 그 종목에 오간 돈의 총액",
    wrongs: [
      "그날 거래된 주식의 총 수량",
      "회사가 보유한 현금의 총액",
      "회사 전체 가치를 나타내는 금액",
    ],
    explanation:
      "거래대금 = 체결 가격 × 체결 수량의 합. 돈이 몰린 종목에는 대개 이유가 있으므로, " +
      "거래대금 상위 목록은 '오늘 무슨 일이 있었나'를 찾는 입구로 쓰기 좋습니다.",
  },
  {
    id: "concept:turnover",
    topic: "지표",
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
      "재료가 붙은 소형주에서 특히 크게 튀어서, 단기 과열을 가늠할 때 씁니다.",
  },
  {
    id: "concept:market-cap",
    topic: "지표",
    prompt: "시가총액을 구하는 식은?",
    correct: "주가 × 상장주식수",
    wrongs: ["주가 × 거래량", "거래대금 × 상장주식수", "주가 ÷ 상장주식수"],
    explanation:
      "시가총액은 회사를 통째로 사는 데 필요한 돈입니다. 같은 재료라도 시총이 작은 회사가 더 크게 반응하는 이유가 여기 있습니다.",
  },
  {
    id: "concept:change-rate",
    topic: "지표",
    prompt: "등락률은 무엇을 기준으로 계산할까요?",
    correct: "전일 종가",
    wrongs: ["당일 시가", "최근 5일 평균가", "상장 당시 공모가"],
    explanation:
      "등락률 = (당일 종가 − 전일 종가) ÷ 전일 종가 × 100. " +
      "갭 상승 후 밀린 날은 등락률이 플러스여도 장중 내내 하락이었을 수 있습니다.",
  },
  {
    id: "concept:limit-up",
    topic: "지표",
    prompt: "국내 증시에서 하루 주가가 오를 수 있는 최대 폭(상한가)은?",
    correct: "전일 종가 대비 +30%",
    wrongs: ["전일 종가 대비 +15%", "전일 종가 대비 +50%", "제한이 없다"],
    explanation:
      "코스피·코스닥 모두 ±30%가 일일 가격제한폭입니다(신규 상장 첫날 등 예외 있음). " +
      "등락률이 29%대라면 그날 재료가 그만큼 강하게 받아들여졌다는 뜻입니다.",
  },
];

function conceptQuestion(seed: ConceptSeed, rand: Rand): QuizQuestion {
  const { choices, answerIndex } = placeChoices(seed.correct, seed.wrongs, rand);
  return {
    id: seed.id,
    type: "concept",
    tag: seed.topic === "이유" ? "개념 · 왜 오르나" : "개념 · 지표",
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
  /** 최신 수집일의 전체 종목 (시장 맥락 문제용) */
  stocks: ProcessedStock[];
  /** 최근 며칠 중 상승이유가 채워진 종목 (이유 문제용) */
  reasonPool: DatedStock[];
  /** 출제에 쓰인 시장 데이터 날짜 (YYYYMMDD). 없으면 개념 문제만 */
  dataDate: string | null;
}

/**
 * "왜 올랐는지"가 이 서비스의 본론이라, 상승 이유 기반 문제를 먼저 채운다.
 * 거래대금·회전율 같은 지표 문제는 이유 문제가 모자란 날에만 최대 1개 들어가고,
 * 남는 자리는 개념 문제(이유 해석 우선)로 채운다.
 */
export function buildDailyQuiz({
  seedKey,
  stocks,
  reasonPool,
  dataDate,
}: BuildQuizInput): QuizQuestion[] {
  const rand = mulberry32(hashSeed(seedKey));
  const questions: QuizQuestion[] = [];

  // 수집된 이유 중에는 그날 거의 안 움직였거나 오히려 내린 종목의 기사 요약도 섞여 있다.
  // "왜 올랐는지"를 묻는 문제에 그런 종목이 정답으로 나오면 설명과 데이터가 어긋난다.
  const knownNames = new Set(reasonPool.map((s) => s.name));
  const usable = reasonPool.filter(
    (s) =>
      s.changeRate >= MIN_RISE_RATE &&
      riseReasonLine(s.reason).length >= 12 &&
      !reasonLooksMismatched(s, knownNames)
  );
  const names = Array.from(
    new Set([...usable.map((s) => s.name), ...stocks.map((s) => s.name)])
  ).sort((a, b) => b.length - a.length); // 긴 이름부터 가려야 부분 일치로 깨지지 않는다

  // 최신일 종목을 앞에 둬서 "오늘 배운 것"이 먼저 출제되고, 뒤쪽은 복습이 된다
  const latestFirst = usable.filter((s) => s.date === dataDate);
  const older = usable.filter((s) => s.date !== dataDate);
  const ctx: Ctx = {
    rand,
    pool: usable,
    targets: [...shuffle(latestFirst, rand), ...shuffle(older, rand)],
    used: new Set<string>(),
    names,
    latest: stocks,
    latestDate: dataDate,
  };

  if (usable.length >= 4) {
    for (const generate of [HEADLINE_GENERATOR, ...shuffle(REASON_GENERATORS, rand)]) {
      if (questions.length >= MAX_DATA_QUESTIONS) break;
      const q = generate(ctx);
      if (q && !questions.some((prev) => prev.id === q.id)) questions.push(q);
    }
  }

  if (dataDate && stocks.length >= 4) {
    let market = 0;
    for (const generate of shuffle(MARKET_GENERATORS, rand)) {
      if (questions.length >= MAX_DATA_QUESTIONS) break;
      if (market >= MAX_MARKET_QUESTIONS) break;
      const q = generate(ctx);
      if (q && !questions.some((prev) => prev.id === q.id)) {
        questions.push(q);
        market++;
      }
    }
  }

  // 개념 문제도 "왜 오르나" 쪽을 먼저 쓴다 (지표 개념은 최대 1개)
  const concepts = shuffle(CONCEPT_BANK, rand);
  let metricConcepts = 0;
  for (const pass of [1, 2]) {
    for (const seed of concepts) {
      if (questions.length >= DAILY_QUIZ_SIZE) break;
      if (questions.some((q) => q.id === seed.id)) continue;
      if (seed.topic === "지표") {
        // 1차에서는 이유 개념만, 2차에서 지표 개념을 최대 1개까지 허용
        if (pass === 1 || metricConcepts >= 1) continue;
        metricConcepts++;
      }
      questions.push(conceptQuestion(seed, rand));
    }
    if (questions.length >= DAILY_QUIZ_SIZE) break;
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

/** 퀴즈 출제에 쓸 복습 구간 시작일 (최신 데이터 날짜 기준 N일 전) */
export function reasonPoolStartDate(dataDate: string, days = 30): string {
  return shiftDate(dataDate, -days);
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
