import { fetchArticle, isUsableBody } from '../../lib/article-core.mjs';
import { selectMaterialArticle } from './news-selection.mjs';
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
let queue = Promise.resolve();
export function cleanTitle(s) { return s.replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&apos;|&#39;/g,"'").trim(); }
export function kstDate(s) { const d=new Date(s);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(d).replaceAll('-',''); }
export async function searchNews(query, start = 1) {
  // Serialize requests across concurrent stocks to avoid bursts.
  const task=queue.then(async()=>{
    for(let attempt=0;attempt<3;attempt++) {
      await sleep(1100);
      const res=await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=100&sort=date&start=${start}`,{
        headers:{'X-Naver-Client-Id':process.env.NAVER_CLIENT_ID,'X-Naver-Client-Secret':process.env.NAVER_CLIENT_SECRET},signal:AbortSignal.timeout(15000)});
      if((res.status===429 || res.status>=500)&&attempt<2){await sleep(2000*2**attempt);continue;}
      if(!res.ok)throw Error(`NAVER ${res.status}`);
      const data=await res.json();
      return (data.items||[]).map(x=>({title:cleanTitle(x.title),description:cleanTitle(x.description||''),link:x.link||x.originallink,originallink:x.originallink,dateStr:kstDate(x.pubDate),publishedAt:new Date(x.pubDate).toISOString()}));
    }
  });
  queue=task.catch(()=>{});return task;
}
export async function collectCandidates(stock,dateStr) {
  // Search event-neutral company name as well as feature news; same-day scope remains unchanged.
  const items=[]; let incomplete=false;
  for(const query of [stock.name,`특징주 ${stock.name}`]) {
    for(let start=1; start<=901; start+=100) {
      const page=await searchNews(query,start);items.push(...page);
      if(page.length<100 || page.some(x=>x.dateStr<dateStr))break;
      if(start===901)incomplete=true;
    }
  }
  const matched=items.filter(x=>x.dateStr===dateStr);
  matched.searchIncomplete=incomplete;return matched;
}
export async function readCandidateBody(item) {
  for(const url of [...new Set([item.link,item.originallink].filter(Boolean))]) {
    try { const result=await fetchArticle(url);if(isUsableBody(result.body))return {body:result.body,url}; }catch{}
  }
  return '';
}
export async function findMaterialArticle(stock,dateStr,universe,options={}) {
  const items=options.items || await collectCandidates(stock,dateStr);
  const result=await selectMaterialArticle(items,stock,universe,options.fetchBody||readCandidateBody,isUsableBody,12,{requireRise:true,dateStr});
  return {...result,items,searchIncomplete:!!items.searchIncomplete};
}
