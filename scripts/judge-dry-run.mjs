/**
 * AI 판정 시험 실행. DB에 아무것도 쓰지 않는다.
 *
 *   node scripts/judge-dry-run.mjs --date 20261124 --stocks stocks.json --cache cache.json --report out.json
 *
 * 무료 AI 모델은 하루 호출 수가 정해져 있다(크레딧을 넣지 않은 계정은 하루 50회). 종목당 1회를 쓴다.
 *
 * --stocks: [{code,name}] 목록 (enrich-reasons.mjs --report 결과의 rows를 그대로 써도 된다)
 * --cache : 네이버 검색 결과와 기사 본문을 저장해 두는 파일. 규칙을 고쳐 다시 돌릴 때 검색을 반복하지 않는다
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { collectCandidates, readCandidateBody } from './lib/news-search.mjs';
import { shortlist, excerpt, judgeRise, searchName } from './lib/rise-judge.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  for (const line of readFileSync(join(ROOT, '.env.local'), 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
} catch { /* 환경변수에서 직접 읽는다 */ }

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const dateStr = arg('--date');
const only = arg('--only')?.split(',');
const cachePath = arg('--cache');
// --no-ai: 검색과 본문 읽기까지만 하고 AI는 부르지 않는다 (후보가 잘 뽑히는지 볼 때)
const NO_AI = process.argv.includes('--no-ai');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const raw = JSON.parse(readFileSync(arg('--stocks'), 'utf-8'));
const seenCodes = new Set();
const stocks = (raw.rows || raw).filter((s) => s.code && !seenCodes.has(s.code) && seenCodes.add(s.code)).map((s) => ({ code: s.code, name: s.name }));
const cache = cachePath && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf-8')) : { items: {}, bodies: {} };
const save = () => cachePath && writeFileSync(cachePath, JSON.stringify(cache));

const rows = [];
for (const stock of stocks) {
  if (only && !only.includes(stock.name)) continue;
  const name = searchName(stock.name, stocks);
  if (!cache.items[name]) {
    cache.items[name] = await collectCandidates({ ...stock, name }, dateStr);
    save();
  }
  const picked = shortlist(cache.items[name], stock, stocks, 5);
  const articles = [];
  for (const item of picked) {
    if (!(item.link in cache.bodies)) {
      const fetched = await readCandidateBody(item);
      cache.bodies[item.link] = typeof fetched === 'string' ? fetched : fetched?.body || '';
      save();
    }
    const body = cache.bodies[item.link];
    if (body) articles.push({ ...item, excerpt: excerpt(body, stock, stocks) });
  }
  let result = { verdict: 'none' };
  for (let attempt = 0; attempt < 3 && !NO_AI; attempt++) {
    try {
      result = await judgeRise(stock, dateStr, stocks, articles);
      break;
    } catch (error) {
      result = { verdict: 'none', error: error.message };
      await sleep(8000 * (attempt + 1));
    }
  }
  if (!NO_AI) await sleep(1500);
  rows.push({
    code: stock.code, name: stock.name, candidates: picked.length, read: articles.length,
    verdict: result.verdict, rejected: !!result.rejected, error: result.error,
    keyword: result.keyword, reason: result.reason, theme: result.theme, confidence: result.confidence,
    evidence: result.evidence, title: result.article?.title, url: result.article?.link, raw: result.raw,
    shown: articles.map((a) => a.title),
  });
  const r = rows.at(-1);
  console.log(`${r.verdict.padEnd(7)} ${stock.name} ${r.rejected ? '(검증 탈락) ' : ''}${r.error ? '(오류 ' + r.error + ') ' : ''}${r.keyword ? '[' + r.keyword + '] ' + r.reason : ''}`);
}
if (arg('--report')) writeFileSync(arg('--report'), JSON.stringify({ date: dateStr, rows }, null, 2));
const count = (v) => rows.filter((r) => r.verdict === v).length;
console.log(`\n${rows.length}종목: 회사 고유 ${count('company')} / 시장 공통 ${count('market')} / 미확인 ${count('none')} (검증 탈락 ${rows.filter((r) => r.rejected).length}, 오류 ${rows.filter((r) => r.error).length})`);
