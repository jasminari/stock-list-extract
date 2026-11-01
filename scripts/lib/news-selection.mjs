import { assessRiseEvidence, riseHint } from './rise-evidence.mjs';
/** Conservative company/entity and catalyst ranking. No LLM or network side effects. */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compact = (s) => s.replace(/\s+/g, '').toLowerCase();
const PARTICLE = '(?:(?:은|는|이|가|의|에|에서|에게|와|과|도|을|를|로|으로|측|사가)(?=$|[^\\p{L}\\p{N}]))?';
export function mentionsCompany(text, stock, universe = []) {
  let value = String(text || '');
  // Strip longer listed names before testing their prefix (에코프로 != 에코프로비엠).
  const name = compact(stock.name);
  for (const other of [...universe].sort((a,b)=>b.name.length-a.name.length)) {
    if (compact(other.name) !== name && compact(other.name).includes(name)) {
      value = value.replace(new RegExp([...other.name.replace(/\s/g,'')].map(escape).join('\\s*'), 'giu'), ' ');
    }
  }
  const pattern = [...stock.name.replace(/\s/g,'')].map(escape).join('\\s*');
  return new RegExp(`(?<![\\p{L}\\p{N}])${pattern}${PARTICLE}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(value);
}
const SPORTS = /야구|프로야구|KBO|타율|홈런|투수|외야수|내야수|선발승|포스트시즌|전국체전|양궁|득점|골키퍼|농구|배구|축구|선수단|방출|재계약 불가/;
const PRICE_DIGEST = /(?:[\d,]+(?:만\s*)?[\d,]*원|\d+(?:\.\d+)?%)[^…]{0,18}(?:…|\.\.\.)|(?:콘텐츠|뉴스)\s*다이제스트|재계\s*인사/;
const COMPARISON = /웃돌|앞질|넘어서|비교\s*사례|보다\s*(?:높|낮|많|적)/;
const HISTORICAL = /지난해|작년|당시|비교\s*사례|지난달/;
const CURRENT = /이날|이번|최근|재부각|전망|추정|목표|예상|\d{1,2}일.*(?:발표|밝혔|체결|결정)/;
const ROUNDUP = /거래(?:대금|량).*?(?:상위|순위)|회전율.*?(?:상위|순위)|상위\s*\d+\s*종목|\[상한가 종목\]|코스[피닥].*(?:상승|하락)\s*마감/;
const CATALYSTS = [
  ['사고·운영차질', /추락사|사망\s*사고|중대재해|공장\s*화재|생산\s*중단|가동\s*중단/],
  ['무상증자', /무상증자/], ['제3자배정 유증', /(?:제?3자|제삼자)\s*배정/],
  ['지분확대', /지분.*?(?:확대|증가)|주식\s*보유비율.*?증가/], ['유상증자', /유상증자|청약률/], ['주식소각', /(?:자사주|자기주식|주식)\s*소각/],
  ['인수합병', /(?:사업|사업부|지분|경영권|기업|회사|법인).*?(?:인수|양수)|최대주주\s*변경|합병\s*(?:결정|계약)/],
  ['공급·납품', /공급\s*계약|수주|납품|계약\s*체결/],
  ['임상', /임상\s*[123ⅠⅡⅢ]|임상.*?(?:결과|성공|실패|승인)/],
  ['인허가', /(?:FDA|식약처|EMA|품목|판매|신약).*?(?:승인|허가|신청)/],
  ['기술개발', /기술\s*(?:확보|개발|이전|수출)|(?:LED|발광다이오드|신약|신소재|제품|배터리)\)?\s*개발|신제품\s*(?:공개|출시)|특허\s*(?:취득|등록)/],
  ['실적', /호실적|실적.*?(?:전망|호조|개선|발표|기대|성장)|(?:매출|영업이익|영업익|순이익).*?(?:증가|감소|개선|급증|껑충|전망|추정|목표|억원|억\s*원)|흑자\s*전환|적자\s*전환|손실\s*축소/],
  ['주주환원', /자사주\s*(?:매입|취득)|자기주식\s*(?:매수|취득)|배당.*?(?:결정|확대|인상)|주주환원\s*(?:정책|기대)/],
  ['사업확대', /입점|유통망\s*확대/],
  ['투자', /(?:억|조)\s*원?\s*(?:규모의?\s*)?(?:전략적\s*)?투자|(?:전략적|설비|시설)\s*투자|투자.*?(?:결정|협약|억원|억\s*원)|공장\s*(?:증설|착공)|금융\s*지원|보증.*?(?:조원|억원|조\s*원|억\s*원)/],
];
const THEME = /정책|규제|수혜|기대(?:감)?|테마|수요\s*(?:증가|확대)|방어주|성수기/;
export function materialType(text) {
  const kind=CATALYSTS.find(([,re])=>re.test(text))?.[0] || (THEME.test(text) ? '정책·테마' : null);
  if(kind==='실적' && /전망|추정|예상|기대|목표/.test(text))return '실적 전망';
  if(kind==='공급·납품' && /수주.*?(?:전망|목표|타깃|기대)/.test(text) && !/계약.*체결|납품\s*(?:완료|진행)/.test(text))return '수주 전망';
  return kind;
}
export function assessCandidate(item, stock, universe = [], { withBody = false } = {}) {
  const title = item.title || '';
  if (SPORTS.test(title)) return { eligible:false, why:'sports' };
  const titleMatch = mentionsCompany(title, stock, universe);
  const companyPattern = [...stock.name.replace(/\s/g,'')].map(escape).join('\\s*');
  // A named subsidiary may merely explain its parent's benefit, not be the subject.
  if (new RegExp(`${companyPattern}\\s*(?:효과|덕|수혜).*?(?:얹|보|누리|입)`, 'iu').test(title)) return {eligible:false,why:'background-company'};
  if (/세미나|강연|사회공헌|봉사활동/.test(title)) return {eligible:false,why:'non-market-event'};
  const lead = title.replace(/^\[[^\]]*\]\s*/, '').split(/[,，]/)[0];
  if (/[,，]/.test(title) && lead.length < 25 && !mentionsCompany(lead,stock,universe) && !/증권|證|투자|운용|리포트|연구원|특징주/.test(lead)) return {eligible:false,why:'other-headline-subject'};
  // Precision-first: body-only mentions in unrelated headlines are background, not a match.
  if (!withBody && !titleMatch) return { eligible:false, why:'headline-company-unconfirmed' };
  if (title && !titleMatch) return { eligible:false, why:'headline-company-unconfirmed' };
  if (PRICE_DIGEST.test(title) && !(['실적','실적 전망'].includes(materialType(title)) && /특징주/.test(title)) && !riseHint(title) && !/공급\s*계약|계약\s*체결|납품\s*(?:완료|진행)|유상증자|무상증자|인수\s*결정/.test(title)) return { eligible:false, why:'price-digest' };
  if (COMPARISON.test(title) && !compact(title.replace(/^\[[^\]]*\]\s*/, '')).startsWith(compact(stock.name))) return { eligible:false, why:'comparison-headline' };
  const snippet = item.description || '';
  const body = withBody ? item.body || '' : '';
  const passages = `${snippet}\n${body}`.split(/\n+|(?<=[.!?。])\s+/).filter(p=>mentionsCompany(p,stock,universe) && !SPORTS.test(p) && !(HISTORICAL.test(p) && !CURRENT.test(p)) && !/비교\s*사례|지난해.*청약률/.test(p));
  if (!titleMatch && !passages.length) return { eligible:false, why:'different-company' };
  const local = [titleMatch ? title : '', ...passages].join('\n');
  if (withBody && !passages.some(p=>materialType(p))) return {eligible:false,why:'body-catalyst-unconfirmed'};
  const type = (titleMatch && materialType(title)) || passages.map(p=>materialType(p)).find(Boolean);
  if (!type) return { eligible:false, why:'no-catalyst' };
  // A price/ranking roundup is never evidence of an individual catalyst.
  if (ROUNDUP.test(title)) return { eligible:false, why:'market-roundup' };
  const directTitleMaterial = titleMatch && materialType(title) && materialType(title) !== '정책·테마';
  const specific = type !== '정책·테마';
  let score = (specific ? 10 : 2) + (titleMatch ? 4 : 0) + (directTitleMaterial ? 5 : 0);
  if (/\d[\d,.]*\s*(?:억|조|톤|%|GWh)/i.test(local)) score += 1;
  if (withBody && passages.some(p=>materialType(p))) score += 3;
  return { eligible:true, score, type, why: specific ? 'material' : 'theme', titleMatch, evidence:local.slice(0,3000) };
}
export function rankCandidates(items, stock, universe = [], options) {
  const seen = new Set();
  return items.flatMap(item=>{
    const link = item.link || item.url;
    if (!link || seen.has(link)) return [];
    seen.add(link);
    const assessment = assessCandidate(item, stock, universe, options);
    return assessment.eligible ? [{...item,link,assessment}] : [];
  }).sort((a,b)=>b.assessment.score-a.assessment.score || (b.publishedAt||'').localeCompare(a.publishedAt||'') || a.link.localeCompare(b.link));
}
/** Only select when actual body supports a company-local catalyst. Try alternatives on extraction failure. */
export async function selectMaterialArticle(items, stock, universe, fetchBody, usableBody, limit = 6, options = {}) {
  const ranked = rankCandidates(items, stock, universe);
  if(options.requireRise) ranked.sort((a,b)=>Number(riseHint(b.title+' '+b.description))-Number(riseHint(a.title+' '+a.description)) || b.assessment.score-a.assessment.score);
  const inspected = [];
  for (const item of ranked.slice(0,limit)) {
    let body = '';
    let resolvedUrl = item.link;
    try { const fetched = await fetchBody(item); body = typeof fetched === 'string' ? fetched : fetched?.body || ''; resolvedUrl = fetched?.url || item.link; } catch { /* try the next source */ }
    if (!usableBody(body)) { inspected.push({link:item.link,status:'body-unavailable'}); continue; }
    const bodyAssessment = assessCandidate({title:'',description:'',body}, stock, universe, {withBody:true});
    const themeSupported = materialType(item.title)==='정책·테마' && mentionsCompany(body,stock,universe) && THEME.test(body);
    if (!bodyAssessment.eligible && !themeSupported) { inspected.push({link:item.link,status:'body-unconfirmed'}); continue; }
    const headlineType = materialType(item.title);
    const baseType = headlineType === '실적 전망' ? '실적' : headlineType === '수주 전망' ? '공급·납품' : headlineType;
    const headlinePattern = CATALYSTS.find(([kind])=>kind===baseType)?.[1];
    if (headlinePattern && !headlinePattern.test(bodyAssessment.evidence || '')) {
      inspected.push({link:item.link,status:'headline-body-mismatch'}); continue;
    }
    const rise = options.requireRise ? assessRiseEvidence({...item,body},stock,universe,mentionsCompany,materialType,options.dateStr) : null;
    if(rise && !rise.confirmed){inspected.push({link:item.link,status:rise.why});continue;}
    const detailed = assessCandidate({...item,body}, stock, universe, {withBody:true});
    // Shared sector context may be in the next paragraph. Keep it labelled as theme,
    // never turn it into a company-specific contract or completed event.
    const assessment = detailed.eligible ? detailed : {...item.assessment,type:'정책·테마',why:'theme',evidence:[item.title,...body.split(/\n+/).filter(p=>mentionsCompany(p,stock,universe)||THEME.test(p))].join('\n').slice(0,3000)};
    // The category must be supported by body, not only a headline's claim.
    inspected.push({link:item.link,status:'accepted',score:assessment.score});
    item.body = body; item.link = resolvedUrl; item.assessment = {...assessment,type:assessment.type,rise};
  }
  const accepted = ranked.filter(x=>x.body).sort((a,b)=>b.assessment.score-a.assessment.score);
  return {article:accepted[0] || null, inspected, candidates:ranked.length};
}
