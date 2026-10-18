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
  | "business-match";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  /** 문제 본문 */
  prompt: string;
  /** 문제 위에 붙는 라벨(날짜/카테고리) */
  tag: string;
  /** 인용문처럼 보여줄 보조 지문 (없을 수 있음) */
  passage?: string;
  /** 정답 공개 뒤 종목명을 복원한 원문 지문 */
  revealedPassage?: string;
  choices: string[];
  /** 정답 공개 뒤 종목명을 복원한 보기 (choices와 같은 순서) */
  revealedChoices?: string[];
  answerIndex: number;
  /** 정답 공개 후 보여줄 해설 */
  explanation: string;
  /** 보기가 긴 문장일 때 "정답은 ○○" 자리에 대신 쓸 짧은 이름 */
  answerLabel?: string;
  /** 문제를 풀 때 참고할 사업·시장 맥락 */
  learningContext?: string;
  /** 정답 공개 뒤 종목명을 복원한 학습 맥락 */
  revealedLearningContext?: string;
  /** 해당 종목과 직접 연결된 원문 기사 */
  article?: { title: string; url: string };
}

export const DAILY_QUIZ_SIZE = 5;

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

const fmtRate = (rate: number) => `${rate.toFixed(2)}%`;

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

/** javascript: 같은 값을 걸러내고 실제 웹 기사 주소만 허용한다. */
function safeArticleUrl(rawUrl: string): string | null {
  const value = (rawUrl ?? "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    // The article API checks the exact stored URL; do not normalize its spelling.
    return rawUrl;
  } catch {
    return null;
  }
}

/**
 * 자동 수집된 출처가 다른 회사 기사일 가능성을 줄이기 위해 기사 제목에
 * 해당 종목명이 명시된 경우만 원문 링크를 노출한다.
 */
function articleFor(
  stock: ProcessedStock,
  knownNames: Iterable<string>
): QuizQuestion["article"] {
  const title = (stock.sourceTitle ?? "").trim();
  const url = safeArticleUrl(stock.sourceUrl);
  if (
    !title ||
    !url ||
    !hasDistinctStockNameMention(title, stock.name, knownNames)
  ) {
    return undefined;
  }
  return { title, url };
}

const KOREAN_PARTICLES = [
  "에게서", "으로부터", "에게", "에서", "으로", "부터", "까지", "이랑",
  "처럼", "보다", "께서", "은", "는", "이", "가", "을", "를", "의", "에",
  "도", "와", "과", "로", "께", "만", "랑",
].sort((a, b) => b.length - a.length);

const isNameChar = (char: string | undefined) =>
  char !== undefined && /[0-9A-Za-z가-힣]/.test(char);

/** 이름 뒤에는 문장 경계 또는 완결된 조사만 허용해 SK가 SK온 안에서 잡히지 않게 한다. */
function nameEnd(text: string, end: number): number | null {
  if (end === text.length || !isNameChar(text[end])) return end;
  for (const particle of KOREAN_PARTICLES) {
    if (!text.startsWith(particle, end)) continue;
    const afterParticle = end + particle.length;
    if (afterParticle === text.length || !isNameChar(text[afterParticle])) {
      return end;
    }
  }
  return null;
}

function replaceBoundedName(
  text: string,
  name: string,
  replacement: string
): string {
  if (name.length < 2 || !text.includes(name)) return text;
  let out = "";
  let cursor = 0;
  while (cursor < text.length) {
    const at = text.indexOf(name, cursor);
    if (at < 0) return out + text.slice(cursor);
    const beforeOkay = at === 0 || !isNameChar(text[at - 1]);
    const afterOkay = nameEnd(text, at + name.length) !== null;
    if (beforeOkay && afterOkay) {
      out += text.slice(cursor, at) + replacement;
      cursor = at + name.length;
    } else {
      out += text.slice(cursor, at + 1);
      cursor = at + 1;
    }
  }
  return out;
}

/** 긴 종목명부터, 완전한 이름 토큰만 가린다. */
function maskNames(text: string, names: string[]): string {
  let out = text;
  const ordered = Array.from(new Set(names))
    .filter((name) => name.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const name of ordered) out = replaceBoundedName(out, name, "○○○");
  return out;
}

function hasBatchim(text: string): boolean {
  const code = text.trim().slice(-1).charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/** 종목 자신의 이름만 자연스러운 대명사로 바꾸고 관련 회사 이름은 그대로 둔다. */
function replaceOwnName(text: string, name: string): string {
  const replacement = "해당 기업";
  const particleMap: Record<string, [string, string]> = {
    은: ["은", "는"], 는: ["은", "는"],
    이: ["이", "가"], 가: ["이", "가"],
    을: ["을", "를"], 를: ["을", "를"],
    과: ["과", "와"], 와: ["과", "와"],
    으로: ["으로", "로"], 로: ["으로", "로"],
  };
  const replacementHasBatchim = hasBatchim(replacement);
  let replaced = replaceBoundedName(text, name, replacement);
  for (const [particle, forms] of Object.entries(particleMap)) {
    const natural = forms[replacementHasBatchim ? 0 : 1];
    replaced = replaced.split(`${replacement}${particle}`).join(`${replacement}${natural}`);
  }
  return replaced;
}

/** 받침 유무에 따라 "SK과(와)" 같은 어색한 표기를 피한다 */
function withGwa(name: string): string {
  const last = name.trim().slice(-1);
  const code = last.charCodeAt(0);
  // 한글 음절이 아니면(영문·숫자로 끝나면) 판단이 어려우니 무난한 "와"를 쓴다
  if (code < 0xac00 || code > 0xd7a3) return `${name}와`;
  return `${name}${(code - 0xac00) % 28 === 0 ? "와" : "과"}`;
}

/** 공백·조사·기호를 걷어낸 비교용 문자열 */
function normalize(text: string): string {
  return text.replace(/[\s.,·"'()[\]%~\-–—]/g, "");
}

/** 문자열 안에서 겹치는 경우를 포함해 이름이 등장한 구간을 모두 찾는다. */
function nameRanges(text: string, name: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (let from = 0; from <= text.length - name.length; from++) {
    if (text.startsWith(name, from)) ranges.push([from, from + name.length]);
  }
  return ranges;
}

/**
 * "두산"이 "두산에너빌리티" 안에서만 등장하는 경우처럼, 더 긴 종목명의
 * 일부로 잡힌 일치를 제외하고 대상 종목명이 별도로 적혔는지 확인한다.
 * "두산·두산에너빌리티"처럼 둘 다 명시된 제목은 두산도 정상 일치다.
 */
function hasDistinctStockNameMention(
  text: string,
  targetName: string,
  knownNames: Iterable<string>
): boolean {
  const normalizedText = normalize(text);
  const target = normalize(targetName);
  if (target.length < 2) return false;

  const coveredByLongerName: Array<[number, number]> = [];
  for (const knownName of knownNames) {
    const longerName = normalize(knownName);
    if (
      longerName.length <= target.length ||
      !longerName.includes(target)
    ) {
      continue;
    }
    coveredByLongerName.push(...nameRanges(normalizedText, longerName));
  }

  return nameRanges(normalizedText, target).some(
    ([start, end]) =>
      !coveredByLongerName.some(
        ([longerStart, longerEnd]) =>
          longerStart <= start && end <= longerEnd
      )
  );
}

/** 제목이 대상명이 아니라 그 이름을 포함하는 다른 긴 종목만 가리키는지 확인한다. */
function sourceTitlePointsToLongerStock(
  stock: ProcessedStock,
  knownNames: Iterable<string>
): boolean {
  const title = (stock.sourceTitle ?? "").trim();
  const target = normalize(stock.name);
  if (!title || target.length < 2) return false;

  const normalizedTitle = normalize(title);
  const names = Array.from(knownNames);
  const mentionsLongerStock = names.some((knownName) => {
    const longerName = normalize(knownName);
    return (
      longerName.length > target.length &&
      longerName.includes(target) &&
      normalizedTitle.includes(longerName)
    );
  });

  return (
    mentionsLongerStock &&
    !hasDistinctStockNameMention(title, stock.name, names)
  );
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
  if (sourceTitlePointsToLongerStock(stock, names)) return true;
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

  const render = (stock: DatedStock) =>
    replaceOwnName(riseReasonLine(stock.reason), stock.name);
  const answerText = riseReasonLine(target.reason);
  const answerLength = render(target).length;

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
    .map((stock) => ({
      display: render(stock),
      revealed: riseReasonLine(stock.reason),
    }))
    .sort(
      (a, b) =>
        Math.abs(a.display.length - answerLength) -
        Math.abs(b.display.length - answerLength)
    )
    .slice(0, 3);

  const placed = shuffle(
    [
      { display: render(target), revealed: answerText, correct: true },
      ...picked.map((choice) => ({ ...choice, correct: false })),
    ],
    ctx.rand
  );
  const choices = placed.map((choice) => choice.display);
  const revealedChoices = placed.map((choice) => choice.revealed);
  const answerIndex = placed.findIndex((choice) => choice.correct);

  return {
    id: `why-rose:${keyOf(target)}`,
    type: "why-rose",
    tag: tagOf(target, ctx),
    prompt: `${target.name}, 이 날 주가가 오른 이유는?`,
    choices,
    revealedChoices,
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
    passage: maskNames(answerText, ctx.names),
    revealedPassage: answerText,
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
    passage: maskNames(answerText, ctx.names),
    revealedPassage: answerText,
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

/** 나머지는 매일 섞어서 4개까지 뽑는다 */
const REASON_GENERATORS: Generator[] = [
  reasonMatchQ,
  stockKeywordQ,
  keywordMatchQ,
  themePeerQ,
  businessMatchQ,
];

function learningContextFor(
  question: QuizQuestion,
  stock: ProcessedStock
): string | undefined {
  const business = companyLine(stock.reason);
  const reason = riseReasonLine(stock.reason);

  // 사업 설명 자체가 지문인 문제에는 같은 문장을 되풀이하지 않고,
  // 그 사업이 당일 주목받은 배경을 보충한다.
  if (question.type === "business-match") {
    return reason ? `당일 시장 맥락: ${reason}` : undefined;
  }

  // 상승 이유나 키워드를 그대로 다시 쓰면 문제의 답을 먼저 보여줄 수 있으므로,
  // 나머지 종목 문제는 회사 설명이 있는 경우에만 맥락을 덧붙인다.
  return business ? `사업 맥락: ${business}` : undefined;
}

function asksForStockName(type: QuizQuestionType): boolean {
  return [
    "reason-match",
    "business-match",
    "keyword-match",
    "theme-peer",
  ].includes(type);
}

function enrichStockQuestions(
  questions: QuizQuestion[],
  stocksByKey: Map<string, ProcessedStock>,
  names: string[],
  sourceNames: Iterable<string>
): QuizQuestion[] {
  return questions.map((question) => {
    const match = question.id.match(/:(\d{8}):([^:]+)$/);
    if (!match) return question;
    const stock = stocksByKey.get(`${match[1]}:${match[2]}`);
    if (!stock) return question;

    const fullLearningContext = learningContextFor(question, stock);
    const shouldMaskContext = asksForStockName(question.type);
    const learningContext =
      fullLearningContext && shouldMaskContext
        ? maskNames(fullLearningContext, names)
        : fullLearningContext;
    const revealedLearningContext =
      fullLearningContext && shouldMaskContext
        ? fullLearningContext
        : undefined;
    const article = articleFor(stock, sourceNames);
    if (!learningContext && !article) return question;
    return {
      ...question,
      learningContext,
      revealedLearningContext,
      article,
    };
  });
}

// === 하루치 퀴즈 조립 ===

export interface BuildQuizInput {
  /** 같은 값이면 같은 문제가 나온다 (유저 + 날짜) */
  seedKey: string;
  /** 최신 수집일의 전체 종목 (시장 맥락 문제용) */
  stocks: ProcessedStock[];
  /** 최근 며칠 중 상승이유가 채워진 종목 (이유 문제용) */
  reasonPool: DatedStock[];
  /** 출제에 쓰인 시장 데이터 날짜 (YYYYMMDD). 없으면 날짜가 있는 이유 데이터만 사용 */
  dataDate: string | null;
}

/** 실제 시황 기반 6가지 유형으로 최대 5문제를 만든다. 부족한 데이터는 가상 문제로 채우지 않는다. */
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
    latestDate: dataDate,
  };

  if (usable.length >= 4) {
    for (const generate of [HEADLINE_GENERATOR, ...shuffle(REASON_GENERATORS, rand)]) {
      if (questions.length >= DAILY_QUIZ_SIZE) break;
      const q = generate(ctx);
      if (q && !questions.some((prev) => prev.id === q.id)) questions.push(q);
    }
  }

  const stocksByKey = new Map<string, ProcessedStock>();
  for (const stock of usable) stocksByKey.set(keyOf(stock), stock);
  if (dataDate) {
    for (const stock of stocks) {
      const key = `${dataDate}:${stock.code}`;
      if (!stocksByKey.has(key)) stocksByKey.set(key, stock);
    }
  }

  return enrichStockQuestions(
    questions.slice(0, DAILY_QUIZ_SIZE),
    stocksByKey,
    names,
    new Set([...knownNames, ...stocks.map((stock) => stock.name)])
  );
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
