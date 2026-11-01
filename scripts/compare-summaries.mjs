/** Read-only AI comparison using previously verified article bodies. No database access. */
import fs from 'node:fs';
import dotenv from 'dotenv';
import {summarize} from './enrich-reasons.mjs';
dotenv.config({path:'.env.local',quiet:true});
const dir='output/news-comparison-20261019';
const input=JSON.parse(fs.readFileSync(`${dir}/verified-comparison.json`));
const dest=`${dir}/ai-comparison.json`;
const prior=fs.existsSync(dest)?JSON.parse(fs.readFileSync(dest)).results:[];
const results=[];
for(const row of input.results){
  const old=prior.find(p=>p.code===row.code&&p.after?.url===row.after?.url&&p.summary);
  let summary=old?.summary||null,error=null;
  if(row.after&&!summary){
    try{summary=await summarize(row.name,row.after.title,row.after.body);if(!summary)error='Invalid or empty AI JSON';}
    catch(e){error=e.message;}
  }
  results.push({...row,summary,error});
  fs.writeFileSync(dest,JSON.stringify({date:input.date,generatedAt:new Date().toISOString(),model:process.env.ENRICH_MODEL||'nvidia/nemotron-3-super-120b-a12b:free',results},null,2));
  console.log(`${results.length}/54 ${row.name}: ${summary?.keyword||error||'기사 미확인'}`);
  if(error&&/429|402|401/.test(error)){console.log('API limit/auth failure; saved progress.');break;}
}
