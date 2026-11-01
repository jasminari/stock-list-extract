import test from 'node:test';
import assert from 'node:assert/strict';
import { mentionsCompany, assessCandidate, rankCandidates, selectMaterialArticle } from '../scripts/lib/news-selection.mjs';
const eco={code:'086520',name:'에코프로'};
const universe=[eco,{name:'에코프로머티'},{name:'에코프로비엠'}];
test('rejects prefix collisions even when sibling is absent from universe',()=>{
  assert.equal(mentionsCompany('에코프로머티 공급계약',eco),false);
  assert.equal(mentionsCompany('에코프로비엠은 유상증자 청약',eco,universe),false);
  assert.equal(mentionsCompany('에코프로는 신규 설비 투자를 결정했다.',eco,universe),true);
  assert.equal(mentionsCompany('에코프로의 공급계약',eco,universe),true);
});
test('handles Korean particles and spaced English issuer names',()=>{
  assert.equal(mentionsCompany('LS ELECTRIC, 미국 수주',{name:'LS ELECTRIC'}),true);
  assert.equal(mentionsCompany('LS일렉트릭 수주',{name:'LS ELECTRIC'}),false);
  assert.equal(mentionsCompany('삼성전자우 공급계약',{name:'삼성전자'}),false);
});
test('sports and quote roundups are not catalysts',()=>{
  assert.equal(assessCandidate({title:'두산, 외야수 11명 방출'},{name:'두산'}).why,'sports');
  assert.equal(assessCandidate({title:'현대모비스 양궁 선수 전국체전 탈락'},{name:'현대모비스'}).eligible,false);
  assert.equal(assessCandidate({title:'에코프로 거래량 상위',description:'에코프로의 유상증자 기대'},eco).why,'market-roundup');
  assert.equal(assessCandidate({title:'에코프로 20% 급등 거래량 폭증'},eco).eligible,false);
});
test('does not borrow a catalyst from unrelated company in another sentence',()=>{
  assert.equal(assessCandidate({title:'증시 마감',description:'에코프로는 상승했다. 삼성전자는 공급계약을 체결했다.'},eco).eligible,false);
});
test('body-only mentions are held back when the headline does not identify the company',()=>{
  assert.equal(assessCandidate({title:'니켈 공급망 확대',description:'에코프로는 설비 투자 300억원을 결정했다.'},eco).eligible,false);
});
test('specific event outranks generic market theme and duplicates are removed',()=>{
  const items=[{title:'에코프로 수혜 기대감',link:'theme'},{title:'에코프로 공급계약 체결',link:'contract'},{title:'에코프로 공급계약 체결',link:'contract'}];
  assert.deepEqual(rankCandidates(items,eco).map(x=>x.link),['contract','theme']);
});
test('extraction failure falls back to other article, never headline-only summary',async()=>{
  const r=await selectMaterialArticle([{title:'에코프로 공급계약 300억원 체결',link:'broken'},{title:'에코프로 공급계약',link:'good'}],eco,universe,
    async x=>x.link==='broken'?'기자명 홍길동':'에코프로는 공급계약을 체결했다. 계약 상대방과 금액은 비공개다.',s=>s.length>20);
  assert.equal(r.article.link,'good'); assert.equal(r.inspected[0].status,'body-unavailable');
});
test('rejects title-body company mismatch',async()=>{
  const r=await selectMaterialArticle([{title:'에코프로 공급계약',link:'wrong'}],eco,universe,async()=> '에코프로머티는 공급계약을 체결했다.',()=>true);
  assert.equal(r.article,null);assert.equal(r.inspected[0].status,'body-unconfirmed');
});

test('rejects comparator company and historical price digest',()=>{
  assert.equal(assessCandidate({title:'에코프로비엠 유증 청약률 103.25%…삼성SDI 웃돌아'},{name:'삼성SDI'}).eligible,false);
  assert.equal(assessCandidate({title:'LS ELECTRIC 2.02% 올라…2분기 수주잔고 7조원'},{name:'LS ELECTRIC'}).eligible,false);
});
test('keeps current-year contract evidence and records the successfully fetched URL',async()=>{
  const r=await selectMaterialArticle([{title:'에코프로 공급계약 체결',link:'https://portal.invalid/1',originallink:'https://publisher.invalid/1'}],eco,universe,
    async()=>({body:'에코프로는 2026년 공급계약을 체결했다. 계약 금액은 100억원이다.',url:'https://publisher.invalid/1'}),()=>true);
  assert.equal(r.article.link,'https://publisher.invalid/1');
});
test('does not attribute supplier investment to customer mentioned in headline',()=>{
  assert.equal(assessCandidate({title:'DYP, 전용라인 증설…현대모비스 공급 속도',description:'현대모비스에 투자 설비를 공급한다.'},{name:'현대모비스'}).eligible,false);
});
test('recognizes amount-before-investment and distinguishes forecasts',()=>{
  const r=assessCandidate({title:'유한양행, 참케어에 10억원 투자'},{name:'유한양행'});
  assert.equal(r.type,'투자');assert.equal(r.eligible,true);
  assert.equal(assessCandidate({title:'삼양식품 3분기 실적 기대 부합'},{name:'삼양식품'}).type,'실적 전망');
});
test('sector theme can be supported across paragraphs without inventing a direct contract',async()=>{
  const r=await selectMaterialArticle([{title:'에코프로, ESS 수요 기대',link:'theme'}],eco,universe,async()=> '에코프로는 이날 장중 상승했다.\n미국 ESS 수요 증가 기대가 배터리 업종 전반에 반영됐다.',()=>true);
  assert.equal(r.article.assessment.type,'정책·테마');
});
test('rejects headline contract when body only supports a different event',async()=>{
  const r=await selectMaterialArticle([{title:'에코프로 공급계약 체결',link:'mismatch'}],eco,universe,async()=> '에코프로는 생산공장 설비 투자 500억원을 결정했다.',()=>true);
  assert.equal(r.article,null);assert.equal(r.inspected[0].status,'headline-body-mismatch');
});

test('distinguishes equity holder from issuer and rejects background subsidiary benefit',()=>{
  assert.equal(assessCandidate({title:'삼성생명, 삼성FN리츠 지분 43.70%로 확대',description:'삼성생명이 삼성FN리츠의 유상증자에 따라 지분을 확대했다.'},{name:'삼성생명'}).type,'지분확대');
  assert.equal(assessCandidate({title:'LG에너지솔루션 효과 얹는 LG화학, 매수 기회'},{name:'LG에너지솔루션'}).eligible,false);
});
