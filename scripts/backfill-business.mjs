import fs from 'node:fs';
import dotenv from 'dotenv';
import postgres from 'postgres';
import {enrichBusinessProfile} from './lib/enrich-business-profile.mjs';
dotenv.config({path:'.env.local',quiet:true});
const date=process.argv[2];if(!/^\d{8}$/.test(date||''))throw Error('Usage: node scripts/backfill-business.mjs YYYYMMDD [--apply]');
const apply=process.argv.includes('--apply');
const db=postgres(process.env.POSTGRES_URL,{prepare:false});const results=[];
try{
 const rows=await db`SELECT DISTINCT se.code,se.name FROM stock_entries se JOIN search_results sr ON sr.id=se.search_result_id LEFT JOIN stock_annotations sa ON sa.stock_entry_id=se.id WHERE sr.date=${date} AND (sa.reason IS NULL OR sa.reason IN ('','미확인')) AND NOT EXISTS(SELECT 1 FROM stock_business_profiles p WHERE p.stock_code=se.code AND p.filing_date<=${date})`;
 fs.mkdirSync(`output/business-repair-${date}`,{recursive:true});
 fs.writeFileSync(`output/business-repair-${date}/targets.json`,JSON.stringify(rows,null,2));
 for(const row of rows){try{const profile=await enrichBusinessProfile(db,row,date,{dry:!apply});results.push({...row,status:profile?'ok':'no-evidence',profile});console.log(row.name,profile?'ok':'no-evidence');}catch(e){results.push({...row,status:'error',error:e.message});console.log(row.name,e.message)}fs.writeFileSync(`output/business-repair-${date}/report.json`,JSON.stringify(results,null,2));}
}finally{await db.end()}
