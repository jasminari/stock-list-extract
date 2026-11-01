/** A news outlet's explicit attribution, not proof of market causality. */
export const RISE = /신고가|역대\s*최고치|강세|급등|상한가|상승세|주가[^.!?\n]{0,30}상승|상승[^.!?\n]{0,20}(?:거래|마감)/;
const LINK = /(?:소식|기대감|기대|전망|발표|체결|수혜|재부각|확보|실적)[^.!?\n]{0,100}(?:에|로|속|따라|힘입|영향|반영|되며)[^.!?\n]{0,70}(?:강세|급등|상승세|상한가|주가[^.!?\n]{0,20}상승)|(?:강세|급등|상승세|상한가)[^.!?\n]{0,80}(?:배경|영향|때문|힘입|풀이)/;
const DENIAL = /단정.*(?:어렵|안|불가)|확인되지|확인되지 않|원인.*불명|이유.*없|무관|연결.*어렵/;
export function riseHint(text) { return RISE.test(text) && LINK.test(text); }
export function assessRiseEvidence(item,stock,universe,mentionsCompany,materialType,dateStr) {
  if(/(?:테마|관련주|업종|부품주|소재주|섹터).*?(?:동반|일제|강세|상승)|동반\s*(?:상승|강세)/.test(item.title||''))return {confirmed:false,why:'theme-only-excluded'};
  if(!dateStr || item.dateStr!==dateStr)return {confirmed:false,why:'publication-date-mismatch'};
  const sentences=(item.body||'').split(/\n+|(?<=[.!?。])\s+/);
  for(const sentence of sentences){
    if(!mentionsCompany(sentence,stock,universe)||!riseHint(sentence)||!materialType(sentence)||materialType(sentence)==='정책·테마'||DENIAL.test(sentence))continue;
    const statedDays=[...sentence.matchAll(/(?:^|\s)(\d{1,2})일/g)].map(m=>Number(m[1]));
    if(statedDays.length && !statedDays.includes(Number(dateStr.slice(-2))) && !/이날|오늘|재부각/.test(sentence))continue;
    // No inferred linkage from neighboring companies, or a prediction of a future rise.
    if(/(?:향후|내년|앞으로).*?(?:주가|상승|강세)|(?:상승|급등|강세).*?(?:할 전망|할 것으로|예상된다)|(?:어제|전일|지난주|지난달).*?(?:급등했|상승했|강세였)/.test(sentence))continue;
    const competing=universe.filter(s=>s.name!==stock.name&&mentionsCompany(sentence,s,universe));
    if(competing.length)continue;
    return {confirmed:true,why:'reported-rise-attribution',evidence:sentence.trim(),scope:'기사에서 제시한 당일 상승 배경'};
  }
  // A dated price paragraph may be explicitly explained by its immediately
  // following paragraph. The event itself need not have been announced today.
  const paragraphs=(item.body||'').split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  for(let i=0;i<paragraphs.length-1;i++){
    const anchor=paragraphs[i], explanation=paragraphs[i+1];
    const day=new RegExp(`(?:^|\\s)${Number(dateStr.slice(-2))}일`);
    if(!mentionsCompany(anchor,stock,universe)||!RISE.test(anchor)||!(day.test(anchor)||/이날|오늘|금일/.test(anchor)))continue;
    if(/어제|전일|지난주|향후|내년|예상된다|할 전망/.test(anchor))continue;
    if(!/^(?:이와 관련|이러한 (?:상승|강세)|이 같은 (?:상승|강세))/.test(explanation))continue;
    if(!/한몫|배경|힘입|영향|견인|기여/.test(explanation)||DENIAL.test(explanation))continue;
    if(/테마|관련주|업종|동반|일제히/.test(anchor+' '+explanation))continue;
    if(universe.some(s=>s.name!==stock.name&&mentionsCompany(anchor+' '+explanation,s,universe)))continue;
    const type=materialType(explanation);
    if((!type||type==='정책·테마')&&!/주주환원|(?:해외|글로벌|주력)\s*사업.*성장/.test(explanation))continue;
    return {confirmed:true,why:'reported-rise-attribution-context',evidence:anchor+'\n\n'+explanation,scope:'기사에서 제시한 당일 상승 배경 · 기존 재료 포함'};
  }
  return {confirmed:false,why:'same-day-rise-unconfirmed'};
}
