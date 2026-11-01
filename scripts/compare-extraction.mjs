import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {extractBody,isUsableBody} from '../lib/article-core.mjs';
const source=execFileSync('git',['show','HEAD:scripts/enrich-reasons.mjs'],{encoding:'utf8'});
const start=source.indexOf('function decodeEntities('),end=source.indexOf('// === AI 요약');
if(start<0||end<0)throw Error('Baseline extractor not found');
const old=await import('data:text/javascript;base64,'+Buffer.from(source.slice(start,end)+'\nexport {extractBody};').toString('base64'));
const stocks=JSON.parse(fs.readFileSync('output/material-preview-20261019/original.json'));
const results=[];let i=0;
await Promise.all(Array.from({length:3},async()=>{while(i<stocks.length){const s=stocks[i++];if(!s.source_url)continue;try{
  const r=await fetch(s.source_url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(`HTTP ${r.status}`);
  const html=await r.text();const before=old.extractBody(html),after=extractBody(html);
  results.push({name:s.name,url:s.source_url,before:{length:before.length,usable:isUsableBody(before),sample:before.slice(0,160)},after:{length:after.length,usable:isUsableBody(after),sample:after.slice(0,160)}});
}catch(e){results.push({name:s.name,error:e.message})}}}));
fs.writeFileSync('output/news-comparison-20261019/extraction.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({total:results.length,errors:results.filter(x=>x.error).length,beforeUsable:results.filter(x=>x.before?.usable).length,afterUsable:results.filter(x=>x.after?.usable).length,improved:results.filter(x=>!x.before?.usable&&x.after?.usable).map(x=>x.name)}));
