import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT='tmp/somme-liens-audit-2026-07-29';
const raw=JSON.parse(readFileSync(`${ROOT}/ss-q94-99-raw.json`,'utf8'));
const plan=JSON.parse(readFileSync(`${ROOT}/SS-Q94-99-DOSSIER-STRICT.json`,'utf8'));
const APPLY=process.argv.includes('--apply');
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map((x)=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const canonical=(v)=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map((k)=>[k,canonical(v[k])])):v;
const stable=(v)=>JSON.stringify(canonical(v));
const hash=(v)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const lit=(v)=>v==null?'null':typeof v==='number'?String(v):typeof v==='boolean'?(v?'true':'false'):`'${String(v).replaceAll("'","''")}'`;
const must=async(q,label)=>{const {data,error}=await q;if(error)throw new Error(`${label}: ${error.message}`);return data;};
const snapshot=(label,segments,links)=>{mkdirSync(ROOT,{recursive:true});const stamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');const name=`Q94-99-${label}-${stamp}.json`;const payload=`${JSON.stringify({segments,links},null,2)}\n`;writeFileSync(`${ROOT}/${name}`,payload);writeFileSync(`${ROOT}/${name}.sha256`,`${createHash('sha256').update(payload).digest('hex')}  ${name}\n`);return `${ROOT}/${name}`;};
const fetchLive=async()=>{
  const segments=[]; for(let from=0;;from+=100){const page=await must(sb.from('segments').select('*').eq('id_oeuvre','A0013O0002').eq('ref_niv1','Secunda Secundae').in('ref_niv2',['Question 94','Question 95','Question 96','Question 97','Question 98','Question 99']).order('segment_numero').range(from,from+99),`segments page ${from/100+1}`);segments.push(...page);if(page.length<100)break;}
  const links=[]; for(let offset=0;offset<segments.length;offset+=100){const ids=segments.slice(offset,offset+100).map((s)=>s.id);for(let from=0;;from+=100){const page=await must(sb.from('liens_bibliques').select('*').in('segment_id',ids).order('id').range(from,from+99),`liens lot ${offset}, page ${from/100+1}`);links.push(...page);if(page.length<100)break;}} links.sort((a,b)=>a.id-b.id);return {segments,links};
};

if(raw.segments.length!==287||raw.links.length!==77)throw new Error('Baseline brute inattendue');
if(hash(raw.segments)!=='3cb22022aa1cfd84400f2671e5bba0874985bb7eb38f7eace0af1c08c864266c')throw new Error('Hash segments baseline inattendu');
if(hash(raw.links)!=='bbac64abcc1bbf424e6cb7f80d49f01e4d8018b3387eab8541e31a68521844a5')throw new Error('Hash liens baseline inattendu');
if(plan.decisions.length!==77||plan.insertions.length!==60||plan.summary.liens_finaux_proposes!==136)throw new Error('Dossier incomplet');
if(plan.controle_stratifie.length<24||plan.controle_stratifie.filter((x)=>x.type===3||x.type===4).length*2<plan.controle_stratifie.length)throw new Error('Contrôle stratifié insuffisant');
for(const item of [...plan.decisions,...plan.insertions]){if(!item.ancre_locale_exacte||!item.temoins_versets_lecture?.length)throw new Error('Preuve locale absente');if(item.temoins_versets_lecture.some((w)=>!['TR0001','TR0003','TR0004'].includes(w.edition)||!w.texte))throw new Error('Témoin invalide');}
const live=await fetchLive(); const before=snapshot('live-before',live.segments,live.links);
if(stable(live.segments)!==stable(raw.segments)||stable(live.links)!==stable(raw.links))throw new Error(`Préétat exact différent du corpus audité. Snapshot : ${before}`);
if(live.segments.some((s)=>s.liens_revus_le||s.liens_revus_par))throw new Error('Au moins un segment est déjà marqué revu');
if(!APPLY){console.log(JSON.stringify({ready:true,applied:false,reason:'Garde active : relancer explicitement avec --apply après validation humaine.',snapshot:before,pagination_segments:[100,100,87],pagination_liens_par_lot:[23,39,15],segments:287,liens_avant:77,mises_a_jour:76,suppressions:1,insertions:60,liens_apres_attendus:136},null,2));process.exit(0);}

const oldById=new Map(raw.links.map((x)=>[x.id,x]));
const pred=(x)=>[`id=${lit(x.id)}`,`segment_id=${lit(x.segment_id)}`,`canon_id is not distinct from ${lit(x.canon_id)}`,`verset_v2_id is not distinct from ${lit(x.verset_v2_id)}`,`livre is not distinct from ${lit(x.livre)}`,`chapitre is not distinct from ${lit(x.chapitre)}`,`type=${lit(x.type)}`,`fiabilite=${lit(x.fiabilite)}`,`motif is not distinct from ${lit(x.motif)}`,`provenance=${lit(x.provenance)}`,`arbitrage_requis=${lit(x.arbitrage_requis)}`,`created_at=${lit(x.created_at)}`,`updated_at=${lit(x.updated_at)}`].join(' and ');
const targetPred=(x)=>[`segment_id=${lit(x.segment_id)}`,`type=${lit(x.type)}`,`canon_id is not distinct from ${lit(x.canon_id)}`,`verset_v2_id is not distinct from ${lit(x.verset_v2_id)}`,`livre is not distinct from ${lit(x.livre)}`,`chapitre is not distinct from ${lit(x.chapitre)}`].join(' and ');
const statements=[];
for(const d of plan.decisions){const old=oldById.get(d.link_id);if(!old||stable(old)!==stable(d.avant))throw new Error(`Préétat décision invalide ${d.link_id}`);if(d.decision==='supprimer'){statements.push(`delete from liens_bibliques where ${pred(old)}; if not found then raise exception 'delete ${old.id}'; end if; n_del:=n_del+1;`);continue;}const f=d.final;statements.push(`update liens_bibliques set canon_id=${lit(f.canon_id)},verset_v2_id=${lit(f.verset_v2_id)},livre=${lit(f.livre)},chapitre=${lit(f.chapitre)},type=${lit(f.type)},fiabilite='vérifié',motif=${lit(f.motif)},provenance='lecture',arbitrage_requis=false where ${pred(old)}; if not found then raise exception 'update ${old.id}'; end if; n_up:=n_up+1;`);}
for(const x of plan.insertions)statements.push(`if exists(select 1 from liens_bibliques where ${targetPred(x)}) then raise exception 'doublon ${x.id_proposition}'; end if; insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values(${lit(x.segment_id)},${lit(x.canon_id)},null,null,null,${lit(x.type)},'vérifié',${lit(x.motif)},'lecture',false); n_ins:=n_ins+1;`);
const ids=live.segments.map((s)=>s.id).join(',');
const sql=`do $audit$ declare n_up int:=0; n_del int:=0; n_ins int:=0; n_mark int:=0; n int; begin
${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${ids}) and liens_revus_le is null and liens_revus_par is null; get diagnostics n_mark=row_count;
if n_up<>76 or n_del<>1 or n_ins<>60 or n_mark<>287 then raise exception 'comptes mutation %,%,%,%',n_up,n_del,n_ins,n_mark; end if;
select count(*) into n from liens_bibliques where segment_id in(${ids}); if n<>136 then raise exception 'total final %',n; end if;
select count(*) into n from liens_bibliques where segment_id in(${ids}) and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis); if n<>0 then raise exception 'métadonnées finales %',n; end if;
select count(*) into n from (select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id in(${ids}) group by 1,2,3,4,5,6 having count(*)>1) d; if n<>0 then raise exception 'doublons %',n; end if;
select count(*) into n from liens_bibliques l left join versets_canon v on v.id=l.canon_id where l.segment_id in(${ids}) and l.canon_id is not null and v.id is null; if n<>0 then raise exception 'cibles mortes %',n; end if;
end $audit$;`;
const {error}=await sb.rpc('exec_sql',{sql});if(error)throw new Error(`Transaction annulée : ${error.message}`);
const afterLive=await fetchLive();const after=snapshot('live-after',afterLive.segments,afterLive.links);
if(afterLive.segments.length!==287||afterLive.links.length!==136)throw new Error('Contrôle post-transaction inattendu');
if(afterLive.segments.some((s)=>!s.liens_revus_le||s.liens_revus_par!=='IA-lecture'))throw new Error('Marquage incomplet');
if(afterLive.links.some((l)=>l.fiabilite!=='vérifié'||l.provenance!=='lecture'||l.arbitrage_requis))throw new Error('Métadonnées finales invalides');
console.log(JSON.stringify({applied:true,before,after,segments:287,liens:136},null,2));
