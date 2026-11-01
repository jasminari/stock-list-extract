/** Read-only crawl comparison. Reuses production selection, never writes service DB. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import dotenv from 'dotenv';
import {findMaterialArticle,readCandidateBody} from './lib/news-search.mjs';
import {assessCandidate} from './lib/news-selection.mjs';
dotenv.config({path:'.env.local',quiet:true});
const args=process.argv.slice(2);
const arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const date=arg('--date','20261019');
const baseline=arg('--baseline','output/material-preview-20261019/original.json');
const out=arg('--out',`output/news-comparison-${date}`);
fs.mkdirSync(out,{recursive:true});
const stocks=JSON.parse(fs.readFileSync(baseline));
const cacheFile=path.join(out,'crawl.json');
const manifestFile=path.join(out,'manifest.json');
const manifest={date,baselineHash:createHash('sha256').update(fs.readFileSync(baseline)).digest('hex'),cacheSchema:2};
if((args.includes('--replay')||args.includes('--reuse-search')) && (!fs.existsSync(manifestFile)||JSON.stringify(JSON.parse(fs.readFileSync(manifestFile)))!==JSON.stringify(manifest)))throw Error('Cache date/baseline/schema mismatch; run live first');
const cache=(args.includes('--replay')||args.includes('--reuse-search'))&&fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile)):{};
fs.writeFileSync(manifestFile,JSON.stringify(manifest));
let cursor=0;const results=[];
await Promise.all(Array.from({length:3},async()=>{while(cursor<stocks.length){
  const s=stocks[cursor++];
  try {
    const cached=cache[s.code];
    const bodies={};
    if(args.includes('--replay')&&!cached)throw Error('No replay cache');
    const options=args.includes('--replay') ? {items:Object.assign(cached.items,{searchIncomplete:cached.searchIncomplete}),fetchBody:async item=>cached.bodies[item.link]||''} : {...(args.includes('--reuse-search')&&cached?{items:Object.assign(cached.items,{searchIncomplete:cached.searchIncomplete})}:{}),fetchBody:async item=>{const body=await readCandidateBody(item);bodies[item.link]=body;return body;}};
    const r=await findMaterialArticle(s,date,stocks,options);
    const a=r.article;
    // Save all fetched bodies, not only selected, to make selection reproducible.
    cache[s.code]={items:r.items,searchIncomplete:r.searchIncomplete,bodies:args.includes('--replay')?cached.bodies:bodies};
    const before=s.source_url?assessCandidate({title:s.source_title||'',description:''},s,stocks):null;
    results.push({code:s.code,name:s.name,before:{keyword:s.keyword,reason:s.reason,title:s.source_title,url:s.source_url,titleAssessment:before},
      after:a?{title:a.title,url:a.link,category:a.assessment.type,rise:a.assessment.rise,evidence:a.assessment.evidence,body:a.body}:null,
      searchIncomplete:r.searchIncomplete,candidateCount:r.candidates,inspected:r.inspected,status:a?'selected':'unconfirmed'});
    console.log(`${results.length}/${stocks.length} ${s.name}: ${a?.assessment.type||'미확인'} | ${a?.title||''}`);
  }catch(e){results.push({code:s.code,name:s.name,status:'error',error:e.message});console.log(`${s.name}: ${e.message}`);}
  fs.writeFileSync(cacheFile,JSON.stringify(cache,null,2));
  fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({date,baseline,mode:args.includes('--replay')?'replay':args.includes('--reuse-search')?'cached-search-live-body':'live',results},null,2));
}}));
results.sort((a,b)=>a.code.localeCompare(b.code));
fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({date,baseline,mode:args.includes('--replay')?'replay':args.includes('--reuse-search')?'cached-search-live-body':'live',results},null,2));
const stats={date,total:stocks.length,beforeLinked:stocks.filter(s=>s.source_url).length,afterSelected:results.filter(x=>x.after).length,
 newlySelected:results.filter(x=>x.after&&!x.before?.url).length,previouslyLinkedNowUnconfirmed:results.filter(x=>!x.after&&x.before?.url).length,
 errors:results.filter(x=>x.status==='error').length};
fs.writeFileSync(path.join(out,'stats.json'),JSON.stringify(stats,null,2));console.log(JSON.stringify(stats));
