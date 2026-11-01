import {fetchBusinessEvidence} from './dart-business.mjs';
import {summarizeBusiness} from './business-summary.mjs';
import {saveBusinessProfile} from './business-profile-store.mjs';
/** Return cached source version or acquire a newly available as-of report. Never writes a news annotation. */
export async function enrichBusinessProfile(db,stock,date,{dry=false}={}) {
 const evidence=await fetchBusinessEvidence(stock.code,date);
 if(!evidence)return null;
 if(evidence.filingDate>date)throw Error('Future business filing rejected');
 const [cached]=await db`SELECT keyword,summary FROM stock_business_profiles WHERE stock_code=${stock.code} AND receipt_no=${evidence.receiptNo}`;
 if(cached)return cached;
 if(!process.env.OPENROUTER_API_KEY)return null;
 const summary=await summarizeBusiness(stock.name,evidence);
 if(summary&&!dry)await saveBusinessProfile(db,stock.code,evidence,summary,'openrouter:'+ (summary.model||process.env.ENRICH_MODEL||'nvidia/nemotron-3.5-lightning:free'));
 return summary;
}
