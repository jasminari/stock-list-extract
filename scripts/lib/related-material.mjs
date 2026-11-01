import {mentionsCompany,materialType,rankCandidates} from './news-selection.mjs';
import {readCandidateBody} from './news-search.mjs';
import {isUsableBody} from '../../lib/article-core.mjs';
const THEMES=/(?:테마|관련주|업종|섹터|보안주).{0,80}(?:동반|전반|일제|상승|강세)|동반\s*(?:상승|강세)/;
const EVENT=/(?:매입|취득|소각|계약|수주|임상|허가|승인|특허|증자|합병|인수).{0,60}(?:결정|체결|발표|공시|승인|완료|예정)|(?:영업이익|매출).{0,70}(?:발표|집계|기록)|(?:공시|발표).{0,60}(?:매입|소각|계약|실적)/;
const TYPES=new Set(['무상증자','제3자배정 유증','유상증자','주식소각','인수합병','공급·납품','임상','인허가','기술개발','실적','주주환원','투자','연구·사업 계약']);
export function assessRelatedMaterial(item,stock,universe,dateStr){
 if(item.dateStr!==dateStr||!mentionsCompany(item.title,stock,universe))return null;
 if(THEMES.test(item.title+'\n'+item.body.slice(0,1000)))return null;
 const sentences=item.body.split(/\n+|(?<=[.!?。])\s+/).filter(Boolean);
 for(let i=0;i<sentences.length;i++){
  const sentence=sentences[i];
  const context=sentences.slice(Math.max(0,i-2),i).join(' ');
  const resolvedPronoun=/^(?:회사는|회사가|동사는|이 회사는)/.test(sentence)&&mentionsCompany(context,stock,universe)&&!universe.some(s=>s.name!==stock.name&&mentionsCompany(context,s,universe));
  if(!mentionsCompany(sentence,stock,universe)&&!resolvedPronoun)continue;
  const caveat=/^(?:하지만|다만|그러나)/.test(sentences[i+2]||'')?sentences[i+2]:'';
  const evidence=[sentence,sentences[i+1]||'',caveat].filter(Boolean).join(' ');
  const otherCompany=universe.some(s=>s.name!==stock.name&&mentionsCompany(evidence,s,universe));
  const jointContract=mentionsCompany(sentence,stock,universe)&&/(?:과|와)\s*.{0,90}(?:MOU|협약|공급|계약)/.test(sentence);
  if(otherCompany&&!jointContract)continue;
  const eventText=[sentence,sentences[i+1]||''].join(' ');
  const eventType=materialType(eventText)||(/(?:계약|협약).{0,20}(?:맺|체결)/.test(eventText)?'연구·사업 계약':null);
  if(!TYPES.has(eventType)||!EVENT.test(evidence)||/지난해|작년|가능성|루머|소문|미확정/.test(evidence))continue;
  // A dated, completed/decided company event; no generic outlook and no stale recycling.
  const match=evidence.match(/(?:(\d{4})년\s*)?(?:(\d{1,2})월\s*)?(\d{1,2})일/);
  let eventDate='';
  if(match){const y=match[1]||dateStr.slice(0,4),m=match[2]||dateStr.slice(4,6);eventDate=y+String(m).padStart(2,'0')+match[3].padStart(2,'0');}
  else if(/이날|오늘/.test(evidence))eventDate=dateStr;
  const asDate=s=>Date.parse(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00Z`);
  const age=(asDate(dateStr)-asDate(eventDate))/86400000;
  if(!eventDate||!Number.isFinite(age)||age<0||age>7)continue;
  return {type:eventType,eventDate,articleDate:dateStr,evidence:resolvedPronoun?`[회사: ${stock.name}] ${evidence}`:evidence};
 }
 return null;
}
export async function findRelatedMaterial(items,stock,universe,dateStr,fetchBody=readCandidateBody){
 // Include specific-event headlines even if the rise selector regards them as price digests.
 const candidates=items.filter(i=>mentionsCompany(i.title,stock,universe)&&!THEMES.test(i.title));
 const ranked=rankCandidates(candidates,stock,universe);
 const seen=new Set();const ordered=[...ranked,...candidates].filter(i=>!seen.has(i.link)&&seen.add(i.link));
 const inspected=[];
 for(const item of ordered.slice(0,16)){
  const fetched=await fetchBody(item);const body=typeof fetched==='string'?fetched:fetched?.body||'';
  if(!isUsableBody(body)){inspected.push({url:item.link,status:'body-unavailable'});continue;}
  const assessment=assessRelatedMaterial({...item,body},stock,universe,dateStr);
  if(assessment)return {article:{...item,body,link:fetched?.url||item.link,assessment},inspected};
  inspected.push({url:item.link,status:'related-event-unconfirmed'});
 }
 return {article:null,inspected};
}
