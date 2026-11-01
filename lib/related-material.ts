import {sql} from 'drizzle-orm';
import {getDb} from './db';
import type {RelatedMaterial} from './types';
export async function getRelatedMaterials(entryIds:number[]):Promise<Map<number,RelatedMaterial>>{
 if(!entryIds.length)return new Map();
 const rows=await getDb().execute(sql`select * from stock_related_materials where stock_entry_id in (${sql.join(entryIds.map(id=>sql`${id}`),sql`,`)})`);
 return new Map(rows.map(r=>[Number(r.stock_entry_id),{keyword:String(r.keyword),summary:String(r.summary),sourceUrl:String(r.source_url),sourceTitle:String(r.source_title),eventDate:String(r.event_date),articleDate:String(r.article_date)}]));
}
