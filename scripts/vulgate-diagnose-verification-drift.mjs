import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const root = 'tmp/vulgate-preflight-2026-07-29';
const rowsPath = process.argv[2] ?? `${root}/TR0004-simulated-after.json`;
const rows = JSON.parse(readFileSync(rowsPath, 'utf8'));
const expected = new Map(readFileSync(`${root}/bundle/vulgate_unverified_residual_counts_2026-07-28.csv`, 'utf8').trim().split(/\r?\n/).slice(1).map(line => { const [book,total,noSacy,onlyUnverified,different] = line.split(','); return [book,{total:+total,no_sacy:+noSacy,only_unverified:+onlyUnverified,different:+different}]; }));
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const sacy=[];for(let start=0;;start+=1000){const{data,error}=await sb.from('versets_v2').select('livre,ch_orig,v_orig,v_orig_suffixe,canon_id,alignement_verifie').eq('trad_id','TR0001').order('id').range(start,start+999);if(error)throw error;sacy.push(...data);if(data.length<1000)break;}
const key=x=>`${x.livre}|${x.ch_orig}|${x.v_orig}|${x.v_orig_suffixe??''}`;
const byKey=new Map();for(const x of sacy){const k=key(x);if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(x)}
const residual=[];for(const row of rows.filter(x=>!x.alignement_verifie)){const candidates=byKey.get(key(row))??[];let reason;if(!candidates.length)reason='no_sacy';else if(!candidates.some(x=>x.alignement_verifie))reason='only_unverified';else if(!candidates.some(x=>x.alignement_verifie&&x.canon_id===row.canon_id))reason='different';else reason='unexpected';residual.push({...row,reason})}
const books=[...new Set([...expected.keys(),...residual.map(x=>x.livre)])].sort();
const drift=[];for(const book of books){const list=residual.filter(x=>x.livre===book);const actual={total:list.length,no_sacy:list.filter(x=>x.reason==='no_sacy').length,only_unverified:list.filter(x=>x.reason==='only_unverified').length,different:list.filter(x=>x.reason==='different').length};const exp=expected.get(book)??{total:0,no_sacy:0,only_unverified:0,different:0};if(JSON.stringify(actual)!==JSON.stringify(exp))drift.push({book,deltaTotal:actual.total-exp.total,expected:exp,actual,residualRows:list.map(x=>({id:x.id,ch:x.ch_orig,v:x.v_orig,suffix:x.v_orig_suffixe,canon:x.canon_id,reason:x.reason}))});}
const categoryCounts = {
  no_sacy: residual.filter(x=>x.reason==='no_sacy').length,
  only_unverified: residual.filter(x=>x.reason==='only_unverified').length,
  different: residual.filter(x=>x.reason==='different').length,
  unexpected: residual.filter(x=>x.reason==='unexpected').length,
};
const byBook = Object.fromEntries(books.map(book=>[book,residual.filter(x=>x.livre===book).length]).filter(([,count])=>count>0));
const report = {
  generated_at: new Date().toISOString(), trad_id: 'TR0004', residual_count: residual.length,
  category_counts: categoryCounts, by_book: byBook,
  manifest_adaptation: {
    bundle_expected: 252, corrected: 250,
    cause: ['WIS 17,9', 'WIS 19,20'],
    explanation: 'Ces deux références figurent dans split_refs et sont donc vérifiées par la requête normative du manifeste, malgré leur présence contradictoire dans le CSV résiduel.'
  },
  category_drift_against_bundle_csv: drift,
  rows: residual.map(x=>({id:x.id,livre:x.livre,ch_orig:x.ch_orig,v_orig:x.v_orig,v_orig_suffixe:x.v_orig_suffixe,canon_id:x.canon_id,reason:x.reason}))
};
const output = `${root}/TR0004-unverified-residual-${residual.length}.json`;
writeFileSync(output,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({residual:residual.length,categoryCounts,books:Object.keys(byBook).length,driftBooks:drift.map(x=>x.book),output},null,2));
