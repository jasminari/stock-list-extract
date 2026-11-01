import fs from 'node:fs';
import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({path:'.env.local',quiet:true});
const db=postgres(process.env.POSTGRES_URL,{prepare:false});
const report=JSON.parse(fs.readFileSync('output/rise-comparison-20261019/rise-comparison.json'));
const concise={
 '008970':{keyword:'납품 · 스페이스X 강관',reason:'스페이스X 발사시설용 강관 950톤 납품 소식이 당일 상한가 배경으로 보도됨.\n4월 공급분 포함 · 추가 물량 납품 진행 중'},
 '010580':{keyword:'기술확보 재부각 · 위성 배터리',reason:'14일 발표한 위성 배터리 기술과 19~20일 기관 IR 기대가 당일 강세 배경으로 보도됨.'},
 '033780':{keyword:'주주환원 기대 · 배당 인상',reason:'하반기 신규 주주환원 정책과 결산 배당금 인상 기대가 당일 강세 배경으로 보도됨.\n발표 예정 정책에 대한 기대 · 확정 결정 아님'}
};
try{
 const existing=await db`select se.*,sr.condition_name,sa.id ann_id,sa.keyword,sa.reason,sa.source_url,sa.source_title,sa.auto_filled,sa.user_id,sa.enriched_at,sa.updated_at from stock_entries se join search_results sr on sr.id=se.search_result_id left join stock_annotations sa on sa.stock_entry_id=se.id where sr.date='20261019' order by se.id`;
 const target=existing.filter(r=>report.rows.some(x=>x.code===r.code));
 const backup='output/rise-comparison-20261019/database-before-'+Date.now()+'.json';
 fs.writeFileSync(backup,JSON.stringify(existing,null,2));
 console.log(JSON.stringify({entries:target.length,uniqueCodes:new Set(target.map(r=>r.code)).size,manual:target.filter(r=>r.auto_filled===false&&(r.keyword||r.reason)).length,resultIds:[...new Set(target.map(r=>r.search_result_id))],backup}));
 if(process.argv.includes('--apply')){
  if(new Set(target.map(r=>r.code)).size!==54)throw Error('Expected 54 codes');
  let saved=0,skipped=0;
  await db.begin(async tx=>{
   for(const r of target){
    const result=report.rows.find(x=>x.code===r.code);const a=result.after;const s=a?concise[r.code]:{keyword:'미확인',reason:'미확인'};
    if(!s)throw Error('Missing verified summary');
    const rows=await tx`insert into stock_annotations(stock_entry_id,keyword,reason,source_url,source_title,auto_filled,enriched_at,updated_at) values(${r.id},${s.keyword},${s.reason},${a?.url||''},${a?.title||''},true,now(),now()) on conflict(stock_entry_id) do update set keyword=excluded.keyword,reason=excluded.reason,source_url=excluded.source_url,source_title=excluded.source_title,auto_filled=true,enriched_at=now(),updated_at=now() where stock_annotations.auto_filled=true or (coalesce(stock_annotations.keyword,'')='' and coalesce(stock_annotations.reason,'')='') returning id`;
    if(rows.length)saved++;else skipped++;
   }
  });console.log({saved,skipped});
 }
}finally{await db.end();}
