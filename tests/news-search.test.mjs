import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCandidates,readCandidateBody} from '../scripts/lib/news-search.mjs';
test('date collection excludes future and previous-day articles',async()=>{
  const saved=globalThis.fetch;const urls=[];
  globalThis.fetch=async url=>{urls.push(url);return new Response(JSON.stringify({items:[
    {title:'테스트 공급계약',description:'테스트는 계약을 체결했다.',link:'https://a.invalid/1',pubDate:'Mon, 19 Oct 2026 12:00:00 +0900'},
    {title:'미래',description:'',link:'https://a.invalid/2',pubDate:'Tue, 20 Oct 2026 12:00:00 +0900'},
    {title:'과거',description:'',link:'https://a.invalid/3',pubDate:'Sun, 18 Oct 2026 12:00:00 +0900'},
  ]}));};
  try{const rows=await collectCandidates({name:'테스트'},'20261019');assert.equal(rows.length,2);assert.ok(rows.every(x=>x.dateStr==='20261019'));assert.equal(rows.searchIncomplete,false);assert.equal(urls.length,2);}finally{globalThis.fetch=saved;}
});
test('fallback preserves the source URL supplying the body',async()=>{
  const saved=globalThis.fetch;
  const body='테스트 회사는 신규 공장 건설을 위한 공급계약을 체결했다고 밝혔다. 이번 계약의 납품은 다음 달부터 진행될 예정이다. '.repeat(3);
  globalThis.fetch=async url=>url.includes('portal')?new Response('',{status:503}):new Response(`<article id="dic_area">${body}</article>`);
  try{const result=await readCandidateBody({link:'https://portal.invalid/1',originallink:'https://publisher.invalid/1'});assert.equal(result.url,'https://publisher.invalid/1');assert.equal(result.body,body.trim());}finally{globalThis.fetch=saved;}
});
