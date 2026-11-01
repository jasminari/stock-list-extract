import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRiseEvidence} from '../scripts/lib/rise-evidence.mjs';
import {mentionsCompany,materialType,selectMaterialArticle} from '../scripts/lib/news-selection.mjs';
const stock={name:'에코프로'},universe=[stock,{name:'에코프로비엠'},{name:'삼성전자'}];
const check=(body,dateStr='20261019')=>assessRiseEvidence({body,dateStr},stock,universe,mentionsCompany,materialType,'20261019');
test('requires company-local material explicitly linked to a rise',()=>{
 assert.equal(check('에코프로는 공급계약 체결 소식에 강세다.').confirmed,true);
 assert.equal(check('에코프로는 공급계약을 체결했다. 주가는 상승했다.').confirmed,false);
 assert.equal(check('에코프로는 환경 저감 기술개발을 완료했다.').confirmed,false);
});
test('rejects future, historical, negative and cross-company attributions',()=>{
 for(const body of ['에코프로는 공급계약 소식에 내년 주가 상승이 예상된다.','에코프로는 공급계약 소식에 전일 급등했다.','에코프로는 계약 소식에 강세지만 상승 원인으로 단정하기 어렵다.','삼성전자 공급계약 소식에 에코프로가 강세다.'])assert.equal(check(body).confirmed,false,body);
 assert.equal(check('에코프로는 공급계약 소식에 강세다.','20261018').confirmed,false);
});
test('rise evidence beats a higher scoring merely related article',async()=>{
 const items=[{title:'에코프로 공급계약 300억원 체결',link:'related',dateStr:'20261019'},{title:'에코프로 공급계약 소식에 강세',link:'rise',dateStr:'20261019'}];
 const r=await selectMaterialArticle(items,stock,universe,async i=>i.link==='related'?'에코프로는 공급계약 300억원을 체결했다.':'에코프로는 공급계약 소식에 강세다.',()=>true,12,{requireRise:true,dateStr:'20261019'});
 assert.equal(r.article.link,'rise');assert.equal(r.article.assessment.rise.confirmed,true);
});
test('unconfirmed related news yields no article',async()=>{
 const r=await selectMaterialArticle([{title:'에코프로 기술개발',link:'a',dateStr:'20261019'}],stock,universe,async()=> '에코프로는 환경 저감 기술개발을 완료했다.',()=>true,12,{requireRise:true,dateStr:'20261019'});
 assert.equal(r.article,null);assert.ok(r.inspected.some(x=>x.status==='same-day-rise-unconfirmed'));
});
test('today publication cannot turn an explicitly older rise into today evidence',()=>{
 assert.equal(check('에코프로는 지난 14일 공급계약 소식에 강세를 보였다.').confirmed,false);
 assert.equal(check('에코프로는 14일 공급계약 소식이 오늘 재부각되며 강세다.').confirmed,true);
});
test('theme co-movement is excluded even with an explicit rise link',()=>{
 assert.equal(assessRiseEvidence({title:'에코프로 이차전지 관련주 동반 강세',body:'에코프로는 실적 기대감에 강세다.',dateStr:'20261019'},stock,universe,mentionsCompany,materialType,'20261019').confirmed,false);
 assert.equal(check('에코프로는 이차전지 테마 수혜 기대감에 강세다.').confirmed,false);
});

test('recovers earnings, technology export and LED development feature news', async()=>{
 const cases=[
 ['삼성SDI','[ET특징주]삼성SDI, 3분기 호실적에 상승세','삼성SDI가 3분기 호실적에 상승세다.'],
 ['한미약품','[특징주] 한미약품, 파브리병 신약 기술수출 소식에 강세','한미약품이 공동 개발한 파브리병 신약의 글로벌 기술수출 소식에 강세다.'],
 ['서울반도체',"[특징주] 서울반도체 탈희토류 LED 강세",'서울반도체가 발광다이오드(LED) 개발 소식에 힘입어 30일 급등세다.'],
 ['라온로보틱스',"[특징주] 라온로보틱스, 영업익 259% 껑충…주가 급등",'라온로보틱스가 3분기 실적 성장을 달성했다는 소식에 급등세다.']
 ];
 for(const [name,title,body] of cases){
 const s={name};const r=await selectMaterialArticle([{title,description:body,link:'source',dateStr:'20261030'}],s,[s],async()=>body,()=>true,12,{requireRise:true,dateStr:'20261030'});
 assert.equal(r.article?.link,'source',name);
 }
});
test('new catalyst vocabulary does not admit theme, unrelated body or mere earnings disclosure',async()=>{
 for(const [title,body] of [
 ['에코프로 관련주 동반상승, 호실적 기대','에코프로는 호실적 기대감에 강세다.'],
 ['[특징주] 에코프로 영업익 259% 껑충…급등','삼성전자는 호실적에 상승세다.'],
 ['에코프로 영업익 급증','에코프로는 영업익이 급증했다고 밝혔다. 주가는 올랐다.']
 ]){
 const r=await selectMaterialArticle([{title,link:'source',dateStr:'20261019'}],stock,universe,async()=>body,()=>true,12,{requireRise:true,dateStr:'20261019'});
 assert.equal(r.article,null,title);
 }
});

test('existing company fundamentals can explain a dated rise across adjacent paragraphs',()=>{
 const s={name:'KT&G'}, u=[s,{name:'삼성전자'}];
 const assess=body=>assessRiseEvidence({body,dateStr:'20261030'},s,u,mentionsCompany,materialType,'20261030');
 const anchor='KT&G는 금일 장중 신고가를 경신했다.';
 const explanation='이와 관련, 글로벌 사업의 성장세와 적극적인 주주환원이 한몫했다는 평가다.';
 assert.equal(assess(anchor+'\n\n'+explanation).confirmed,true);
 for(const body of [
 'KT&G는 지난달 신고가를 경신했다.\n\n'+explanation,
 anchor+'\n\n글로벌 사업의 성장세와 주주환원이 이어지고 있다.',
 anchor+'\n\n이와 관련, 배당주 테마 동반상승과 주주환원이 한몫했다.',
 anchor+'\n\n이와 관련, 삼성전자 호실적이 한몫했다.',
 anchor+'\n\n이와 관련, 주주환원이 배경인지는 확인되지 않았다.',
 anchor+'\n\n다른 소식이다.\n\n'+explanation,
 'KT&G는 금일 내년 신고가가 예상된다고 밝혔다.\n\n'+explanation
 ])assert.equal(assess(body).confirmed,false,body);
});
