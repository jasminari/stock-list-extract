import test from 'node:test';
import assert from 'node:assert/strict';
import { shortlist, excerpt, verifyJudgement, parseJudgement, searchName, judgeRise } from '../scripts/lib/rise-judge.mjs';

const universe = [{ code: '000660', name: 'SK하이닉스' }, { code: '005930', name: '삼성전자' }, { code: '005935', name: '삼성전자우' }, { code: '042700', name: '한미반도체' }];
const hynix = universe[0];
const item = (title, description = '', link = title) => ({ title, description, link, dateStr: '20261124', publishedAt: '2026-11-24T06:00:00.000Z' });

test('shortlist keeps a feature article whose headline carries the price move', () => {
  const picked = shortlist([
    item('[특징주]SK하이닉스, 엔비디아 반등에 8.38% 상승…젠슨 황 복귀 효과'),
    item('SK하이닉스 주가, 11월 24일 장중 737,000원 8.38% 상승'),
    item('[뉴욕증시 개장전] 엔비디아 5%↓…나스닥 선물 2.5% 하락'),
  ], hynix, universe);
  assert.deepEqual(picked.map((p) => p.title), ['[특징주]SK하이닉스, 엔비디아 반등에 8.38% 상승…젠슨 황 복귀 효과']);
});

test('shortlist does not treat 지배구조 as a sports article and accepts co-movement headlines', () => {
  const picked = shortlist([
    item('SK하이닉스 지배구조 개편 기대에 강세'),
    item('삼성전자·SK하이닉스 나란히 6.7% 상승…젠슨 황 복귀에 반도체주 급반등'),
    item('프로배구 SK하이닉스 후원 경기 개막'),
  ], hynix, universe);
  assert.equal(picked.length, 2);
});

test('shortlist drops syndicated copies of the same headline', () => {
  const picked = shortlist([
    item('SK하이닉스, 엔비디아 반등에 급등', '', 'a'),
    item('SK하이닉스, 엔비디아 반등에 급등(종합)', '', 'b'),
  ], hynix, universe);
  assert.equal(picked.length, 1);
});

test('preferred shares search under the common share name', () => {
  assert.equal(searchName('삼성전자우', universe), '삼성전자');
  assert.equal(searchName('한미반도체', universe), '한미반도체');
  assert.equal(searchName('대우', universe), '대우');
  assert.equal(shortlist([item('삼성전자 7% 급등…젠슨 황 복귀 효과')], universe[2], universe).length, 1);
});

test('excerpt keeps the paragraphs that name the company and the one after', () => {
  const body = ['코스피가 6% 넘게 올랐다는 소식이다 정말로.', 'SK하이닉스는 전 거래일보다 8.38% 오른 채 마감했다.', '젠슨 황 최고경영자의 복귀 소식이 투자심리를 되살렸다는 분석이다.', '한편 환율은 소폭 내렸다고 시장은 전했다.'].join('\n');
  const text = excerpt(body, hynix, universe);
  assert.match(text, /8\.38% 오른/);
  assert.match(text, /젠슨 황/);
  assert.doesNotMatch(text, /환율/);
});

const articles = [{ title: '[특징주]SK하이닉스, 엔비디아 반등에 8.38% 상승', link: 'u', excerpt: 'SK하이닉스는 24일 엔비디아 주가 반등 소식에 힘입어 8.38% 오른 73만7000원에 거래를 마쳤다.' }];
const answer = (extra = {}) => ({ verdict: 'market', article: 1, evidence: 'SK하이닉스는 24일 엔비디아 주가 반등 소식에 힘입어 8.38% 오른 73만7000원에 거래를 마쳤다.', keyword: '해외 증시 · 엔비디아 반등', reason: '엔비디아 반등 소식에 반도체주가 함께 상승함', theme: '반도체', confidence: 'high', ...extra });

test('verifyJudgement accepts an answer grounded in the article', () => {
  const result = verifyJudgement(answer(), hynix, universe, articles);
  assert.equal(result.verdict, 'market');
  assert.equal(result.theme, '반도체');
  assert.equal(result.article.link, 'u');
});

test('verifyJudgement rejects evidence that is not in the article', () => {
  assert.equal(verifyJudgement(answer({ evidence: 'SK하이닉스는 대규모 공급계약 체결 소식에 급등했다.' }), hynix, universe, articles), null);
});

test('verifyJudgement rejects invented numbers, low confidence and unknown articles', () => {
  assert.equal(verifyJudgement(answer({ reason: '엔비디아가 12% 반등해 반도체주가 상승함' }), hynix, universe, articles), null);
  assert.equal(verifyJudgement(answer({ confidence: 'low' }), hynix, universe, articles), null);
  assert.equal(verifyJudgement(answer({ article: 3 }), hynix, universe, articles), null);
});

test('verifyJudgement rejects an article about another company', () => {
  assert.equal(verifyJudgement(answer(), universe[3], universe, articles), null);
});

test('verifyJudgement passes none through and parseJudgement finds the JSON in noise', () => {
  assert.deepEqual(verifyJudgement({ verdict: 'none' }, hynix, universe, articles), { verdict: 'none' });
  assert.equal(parseJudgement('생각: ...\n```json\n{"verdict":"none","article":0}\n```').verdict, 'none');
  assert.equal(parseJudgement('모르겠음'), null);
});

test('judgeRise marks an ungrounded model answer as rejected instead of saving it', async () => {
  const fetcher = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer({ evidence: '지어낸 문장으로 급등했다고 한다.' })) } }] }), { status: 200 });
  const result = await judgeRise(hynix, '20261124', universe, articles, fetcher);
  assert.equal(result.verdict, 'none');
  assert.equal(result.rejected, true);
  assert.equal((await judgeRise(hynix, '20261124', universe, [], fetcher)).verdict, 'none');
});

test('shortlist drops match reports and automated price lines', () => {
  const air = { code: '003490', name: '대한항공' };
  const picked = shortlist([
    item('대한항공, 5세트 듀스 혈투 끝 OK저축은행 꺾고 2연승·4위 도약'),
    item('대한항공 주가, 11월 24일 30,900원 1.98% 상승'),
    item('대한항공, 유가 하락 기대에 강세'),
  ], air, [air]);
  assert.deepEqual(picked.map((p) => p.title), ['대한항공, 유가 하락 기대에 강세']);
});
