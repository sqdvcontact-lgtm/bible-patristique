import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT='tmp/somme-liens-audit-2026-07-29', PAGE=100;
mkdirSync(ROOT,{recursive:true});
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const must=async(q,l)=>{const{data,error,count}=await q;if(error)throw new Error(`${l}: ${error.message}`);return{data,count}};
const candidates=Array.from({length:50},(_,i)=>`Question ${81+i}`),segments=[],pagination=[];
for(const question of candidates)for(let from=0;;from+=PAGE){const{data}=await must(sb.from('segments').select('*').eq('id_oeuvre','A0013O0002').eq('ref_niv1','Prima Secundae').eq('ref_niv2',question).order('segment_numero').range(from,from+PAGE-1),`${question}:${from}`);segments.push(...data);pagination.push({objet:'segments',question,from,to:from+PAGE-1,lignes:data.length});if(data.length<PAGE)break}
segments.sort((a,b)=>a.segment_numero-b.segment_numero);const questions=candidates.filter(q=>segments.some(s=>s.ref_niv2===q)),links=[];
for(let off=0;off<segments.length;off+=PAGE){const ids=segments.slice(off,off+PAGE).map(s=>s.id);for(let from=0;;from+=PAGE){const{data}=await must(sb.from('liens_bibliques').select('*').in('segment_id',ids).order('id').range(from,from+PAGE-1),`links:${off}:${from}`);links.push(...data);pagination.push({objet:'liens',segment_offset:off,from,to:from+PAGE-1,lignes:data.length});if(data.length<PAGE)break}}
links.sort((a,b)=>a.id-b.id);const ids=[...new Set(links.map(l=>l.canon_id).filter(Boolean))],witnesses=[],cols='id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"';
for(let from=0;from<ids.length;from+=PAGE){const{data}=await must(sb.from('versets_lecture').select(cols).in('id_verset',ids.slice(from,from+PAGE)),`witness:${from}`);witnesses.push(...data)}
const{count:markedGlobal}=await must(sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre','A0013O0002').not('liens_revus_le','is',null),'global');
const raw={exported_at:new Date().toISOString(),candidate_questions:candidates,questions,pagination,segments,links,witnesses,marked_global_live:markedGlobal};writeFileSync(`${ROOT}/ps-q81-end-raw.json`,`${JSON.stringify(raw,null,2)}\n`);
console.log(JSON.stringify({questions,last_question:questions.at(-1),segments:segments.length,range:[segments[0]?.segment_numero,segments.at(-1)?.segment_numero],links:links.length,witnesses:witnesses.length,marked_local:segments.filter(s=>s.liens_revus_le||s.liens_revus_par).length,by_question:Object.fromEntries(candidates.map(q=>[q,segments.filter(s=>s.ref_niv2===q).length]))},null,2));
