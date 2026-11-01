import test from 'node:test';
import assert from 'node:assert/strict';
import {summaryFetch,DEFAULT_SUMMARY_MODEL} from '../scripts/lib/summary-api.mjs';
test('retired model falls back only to free models',async()=>{
 const seen=[];const response=await summaryFetch('https://example.test',{body:JSON.stringify({model:'retired:free',messages:[]})},async(_,o)=>{seen.push(JSON.parse(o.body).model);return {ok:seen.length===2,status:seen.length===2?200:404}});
 assert.equal(response.status,200);assert.deepEqual(seen,['retired:free',DEFAULT_SUMMARY_MODEL]);
});
test('authentication failures do not retry other models',async()=>{
 let calls=0;await summaryFetch('https://example.test',{body:'{}'},async()=>{calls++;return {ok:false,status:401}});assert.equal(calls,1);
});
