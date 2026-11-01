import test from 'node:test';import assert from 'node:assert/strict';
import {assessRelatedMaterial} from '../scripts/lib/related-material.mjs';
import {validateRelatedSummary,extractRelatedSummary,groundedRelatedSummary} from '../scripts/lib/related-material-store.mjs';
const stock={code:'055550',name:'신한지주'},other={code:'086790',name:'하나금융지주'};
const check=(body,title='신한지주 자사주 매입 후 소각',dateStr='20261030')=>assessRelatedMaterial({title,body,dateStr},stock,[stock,other],'20261030');
const body='신한지주가 4500억원 규모의 자기주식을 장내 매입해 전량 소각한다. 27일 공시한 주요사항보고서와 주식소각결정에 따르면 취득 예정 주식은 보통주 526만3157주다.';
test('accepts recent concrete event without claiming it caused a rise',()=>{assert.equal(check(body)?.eventDate,'20261027');});
test('rejects theme co-movement and wrong company',()=>{assert.equal(check(body,'은행주 테마 동반 상승, 신한지주 자사주 소각'),null);assert.equal(check(body.replaceAll('신한지주','하나금융지주')),null);});
test('rejects stale, future, undated and mismatched publication dates',()=>{for(const b of [body.replace('27일','1일'),body.replace('27일','11월 2일'),body.replace('27일','최근')])assert.equal(check(b),null);assert.equal(check(body,undefined,'20261031'),null);});
test('does not turn neighboring company event into target material',()=>{assert.equal(check('신한지주는 금융업을 영위한다. 하나금융지주는 30일 자사주 소각을 결정했다.'),null);});
test('admits explicit joint contract party even with full company universe',()=>{const lg={name:'LG에너지솔루션'},posco={name:'포스코퓨처엠'};assert.ok(assessRelatedMaterial({title:'포스코퓨처엠, LG에너지솔루션과 공급 계약 체결',body:'포스코퓨처엠은 30일 LG에너지솔루션과 공급 계약을 체결했다고 발표했다.',dateStr:'20261030'},lg,[lg,posco],'20261030'));});
test('rejects placeholder, verbose and causal AI outputs; excerpt fallback preserves plans',()=>{for(const data of [{keyword:'재료 종류 · 핵심 내용',summary:'자사주를 매입한다.'},{keyword:'소각',summary:'주가 상승 배경이다.'},{keyword:'실적',summary:'a'.repeat(221)}])assert.equal(validateRelatedSummary(data),null);const s=extractRelatedSummary({assessment:{type:'주식소각',evidence:body}});assert.equal(s.keyword,'자사주 매입·소각');assert.match(s.summary,/예정/);});
test('preserves negative earnings context in evidence and fallback',()=>{const s={name:'HD현대중공업'};const a=assessRelatedMaterial({title:'HD현대중공업 3분기 실적',dateStr:'20261030',body:'HD현대중공업은 28일 매출 5조7536억원을 발표했다. 영업이익은 8992억원으로 증가했다. 하지만 시장 전망치 9792억원을 밑돌았다.'},s,[s],'20261030');assert.match(a.evidence,/밑돌/);assert.match(extractRelatedSummary({assessment:a}).summary,/밑돌/);});

test('model cannot invent amounts or turn a plan into completion',()=>{
 const evidence='신한지주는 4500억원 자사주 매입·소각을 결정했다.';
 assert.equal(groundedRelatedSummary({keyword:'자사주',summary:'5500억원 자사주를 매입한다.'},evidence),null);
 assert.equal(groundedRelatedSummary({keyword:'자사주',summary:'4500억원 자사주 매입을 완료했다.'},evidence),null);
 assert.ok(groundedRelatedSummary({keyword:'자사주',summary:'4500억원 자사주 매입·소각을 결정했다.'},evidence));
});

test('resolves bounded company pronoun for research contract but rejects crossed company context',()=>{
 const s={name:'루닛'}, other={name:'삼성전자'};
 const item={title:'루닛 의료 AI 성장성 주목',dateStr:'20261030',body:'루닛은 의료 AI를 개발한다. 임상 연구와 파트너십이 핵심이다. 회사는 26일 서밋 테라퓨틱스와 AI 바이오마커 연구 계약을 맺었다고 발표했다. 계약 조건에 따라 연구를 수행한다.'};
 const a=assessRelatedMaterial(item,s,[s,other],'20261030');assert.equal(a.eventDate,'20261026');assert.match(a.evidence,/회사: 루닛/);
 assert.equal(assessRelatedMaterial({...item,body:item.body.replace('임상 연구와 파트너십이 핵심이다.','삼성전자는 반도체를 만든다.')},s,[s,other],'20261030'),null);
});
