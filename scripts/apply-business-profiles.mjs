import fs from 'node:fs';
import dotenv from 'dotenv';
import postgres from 'postgres';
import {ensureBusinessProfileTable,saveBusinessProfile} from './lib/business-profile-store.mjs';
dotenv.config({path:'.env.local',quiet:true});
const date=process.argv.find(x=>/^\d{8}$/.test(x))||'20261019';
const dir=`output/dart-business-${date}`;
const input=JSON.parse(fs.readFileSync(`${dir}/evidence.json`));
const summaries=JSON.parse(fs.readFileSync(`${dir}/summaries.json`));
const entries=Object.entries(summaries);
for(const [code,s] of entries){
 const e=input.evidence[code];
 if(!e||e.status!=='ok'||e.filingDate>date||!e.businessText.includes(s.support)||!s.support.trim())throw Error(`Ungrounded or future source: ${code}`);
 if(!s.keyword||!s.summary||s.summary.length>180)throw Error(`Invalid summary ${code}`);
}
const db=postgres(process.env.POSTGRES_URL,{prepare:false});
try{
 await ensureBusinessProfileTable(db);
 const before=await db`select * from stock_business_profiles`;
 fs.writeFileSync(`${dir}/profiles-before-${Date.now()}.json`,JSON.stringify(before,null,2));
 if(process.argv.includes('--apply'))await db.begin(async tx=>{for(const [code,s] of entries)await saveBusinessProfile(tx,code,input.evidence[code],s,'assistant-reviewed-dart-excerpt');});
 console.log({validated:entries.length,saved:process.argv.includes('--apply')?entries.length:0,date});
}finally{await db.end();}
