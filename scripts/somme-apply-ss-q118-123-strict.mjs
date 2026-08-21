/** Application atomique de l'audit IIa-IIae Q118-123. Non execute sans --apply. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT='tmp/somme-liens-audit-2026-07-29';
const raw=JSON.parse(readFileSync(`${ROOT}/ss-q118-123-raw.json`,'utf8'));
const plan=JSON.parse(readFileSync(`${ROOT}/Q118-123-AUDIT-EXHAUSTIF.json`,'utf8'));
const APPLY=process.argv.includes('--apply');
const OEUVRE='A0013O0002', PARTIE='Secunda Secundae';
const QUESTIONS=Array.from({length:6},(_,index)=>`Question ${118+index}`);
const EXPECTED={segments:319,existing:100,updates:78,deletes:22,inserts:35,final:113};
const EXPECTED_TYPES=new Map([[1,80],[2,0],[3,33],[4,0]]);
const EXPECTED_SEGMENTS_HASH='6aedf14ae38e3c775254a5757935cff6ddf1915967b45a94f123f3564f3c14ca';
const EXPECTED_LINKS_HASH='6bfa5e5ad3c7b1a5c59fae267825b549c3768dbfdb8c67cc35b8bd8a9b34d0a4';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((line)=>line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match)=>[match[1],match[2].replace(/^["']|["']$/g,'')]));
if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Variables Supabase absentes.');
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const canonical=(value)=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map((key)=>[key,canonical(value[key])])):value;
const stable=(value)=>JSON.stringify(canonical(value));
const sha=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const md5=(value)=>createHash('md5').update(String(value??''),'utf8').digest('hex');
const lit=(value)=>value==null?'null':typeof value==='number'?String(value):typeof value==='boolean'?(value?'true':'false'):`'${String(value).replaceAll("'","''")}'`;
const must=async(query,label)=>{const{data,error}=await query;if(error)throw new Error(`${label}: ${error.message}`);return data;};
const snapshot=(label,segments,links)=>{mkdirSync(ROOT,{recursive:true});const stamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');const name=`Q118-123-${label}-${stamp}.json`;const payload=`${JSON.stringify({segments,links},null,2)}\n`;writeFileSync(`${ROOT}/${name}`,payload);writeFileSync(`${ROOT}/${name}.sha256`,`${createHash('sha256').update(payload).digest('hex')}  ${name}\n`);return `${ROOT}/${name}`;};
const fetchLive=async()=>{
  const segments=[];for(let from=0;;from+=100){const page=await must(sb.from('segments').select('*').eq('id_oeuvre',OEUVRE).eq('ref_niv1',PARTIE).in('ref_niv2',QUESTIONS).order('segment_numero').range(from,from+99),`segments page ${from/100+1}`);segments.push(...page);if(page.length<100)break;}
  const links=[];for(let offset=0;offset<segments.length;offset+=100){const ids=segments.slice(offset,offset+100).map((segment)=>segment.id);for(let from=0;;from+=100){const page=await must(sb.from('liens_bibliques').select('*').in('segment_id',ids).order('id').range(from,from+99),`liens lot ${offset/100+1} page ${from/100+1}`);links.push(...page);if(page.length<100)break;}}
  links.sort((a,b)=>a.id-b.id);return{segments,links};
};

if(raw.segments.length!==EXPECTED.segments||raw.links.length!==EXPECTED.existing||raw.segments[0]?.segment_numero!==18201||raw.segments.at(-1)?.segment_numero!==18519)throw new Error('Baseline brute inattendue.');
if(sha(raw.segments)!==EXPECTED_SEGMENTS_HASH||sha(raw.links)!==EXPECTED_LINKS_HASH)throw new Error('Hash du préétat audité inattendu.');
if(plan.decisions?.length!==EXPECTED.existing||plan.insertions?.length!==EXPECTED.inserts||plan.segments_audites?.length!==EXPECTED.segments)throw new Error('Dossier incomplet.');
const kept=plan.decisions.filter((decision)=>decision.final), deleted=plan.decisions.filter((decision)=>!decision.final);
if(kept.length!==EXPECTED.updates||deleted.length!==EXPECTED.deletes||plan.summary?.liens_finaux_proposes!==EXPECTED.final)throw new Error('Répartition du plan inattendue.');
if(plan.controle_stratifie?.length<24||plan.controle_stratifie.filter((item)=>item.type===3||item.type===4).length<12||plan.controle_stratifie.some((item)=>!item.verdict.startsWith('juste')))throw new Error('Contrôle stratifié insuffisant.');
for(const item of [...kept,...plan.insertions]){const final=item.final??item;if(!item.ancre_locale_exacte||!item.temoins_versets_lecture?.length||!final.canon_id)throw new Error(`Preuve incomplète ${item.link_id??item.id_proposition}`);if(item.temoins_versets_lecture.some((w)=>!['TR0001','TR0003','TR0004'].includes(w.edition)||!w.texte))throw new Error(`Témoin invalide ${item.link_id??item.id_proposition}`);if(final.verset_v2_id!==null||final.livre!==null||final.chapitre!==null)throw new Error(`Cible secondaire non vidée ${item.link_id??item.id_proposition}`);if(final.fiabilite!=='vérifié'||final.provenance!=='lecture'||final.arbitrage_requis!==false||!final.motif||final.motif.length<35)throw new Error(`Métadonnées finales invalides ${item.link_id??item.id_proposition}`);}
const finalItems=[...kept.map((decision)=>({segment_id:decision.segment_id,...decision.final})),...plan.insertions];
const finalKey=(item)=>`${item.segment_id}|${item.type}|c:${item.canon_id}`;
const finalKeys=finalItems.map(finalKey);if(new Set(finalKeys).size!==finalKeys.length)throw new Error('Doublon dans le plan final.');
for(const[type,count]of EXPECTED_TYPES)if(finalItems.filter((item)=>item.type===type).length!==count)throw new Error(`Répartition T${type} inattendue.`);
const auditIds=new Set(plan.segments_audites.map((item)=>item.id));if(auditIds.size!==EXPECTED.segments||raw.segments.some((segment)=>!auditIds.has(segment.id)))throw new Error('Couverture des segments incomplète.');
const decisionIds=new Set(plan.decisions.map((item)=>item.link_id));if(decisionIds.size!==EXPECTED.existing||raw.links.some((link)=>!decisionIds.has(link.id)))throw new Error('Couverture des liens incomplète.');

const live=await fetchLive();const before=snapshot('live-before',live.segments,live.links);
if(stable(live.segments)!==stable(raw.segments)||stable(live.links)!==stable(raw.links))throw new Error(`Préétat exact différent du corpus audité. Snapshot : ${before}`);
if(live.segments.some((segment)=>segment.liens_revus_le!==null||segment.liens_revus_par!==null))throw new Error('Au moins un segment est déjà marqué relu.');
if(!APPLY){console.log(JSON.stringify({ready:true,applied:false,reason:'Garde active : aucune écriture sans --apply explicite après validation humaine.',snapshot:before,pagination_segments:[100,100,100,19],pagination_liens_par_lot:[28,57,15,0],segments:EXPECTED.segments,liens_avant:EXPECTED.existing,mises_a_jour:EXPECTED.updates,suppressions:EXPECTED.deletes,insertions:EXPECTED.inserts,liens_apres_attendus:EXPECTED.final},null,2));process.exit(0);}

const oldById=new Map(raw.links.map((link)=>[link.id,link]));
const oldPredicate=(link)=>[`id=${lit(link.id)}`,`segment_id=${lit(link.segment_id)}`,`canon_id is not distinct from ${lit(link.canon_id)}`,`verset_v2_id is not distinct from ${lit(link.verset_v2_id)}`,`livre is not distinct from ${lit(link.livre)}`,`chapitre is not distinct from ${lit(link.chapitre)}`,`type=${lit(link.type)}`,`fiabilite=${lit(link.fiabilite)}`,`motif is not distinct from ${lit(link.motif)}`,`provenance=${lit(link.provenance)}`,`arbitrage_requis=${lit(link.arbitrage_requis)}`,`created_at is not distinct from ${lit(link.created_at)}::timestamptz`,`updated_at is not distinct from ${lit(link.updated_at)}::timestamptz`].join(' and ');
const statements=[];
for(const decision of plan.decisions){const old=oldById.get(decision.link_id);if(!old||stable(old)!==stable(decision.avant))throw new Error(`Préétat décision invalide ${decision.link_id}`);if(!decision.final){statements.push(`delete from liens_bibliques where ${oldPredicate(old)}; if not found then raise exception 'delete ${old.id}'; end if; n_del:=n_del+1;`);continue;}const final=decision.final;statements.push(`update liens_bibliques set canon_id=${lit(final.canon_id)},verset_v2_id=null,livre=null,chapitre=null,type=${lit(final.type)},fiabilite='vérifié',motif=${lit(final.motif)},provenance='lecture',arbitrage_requis=false where ${oldPredicate(old)}; if not found then raise exception 'update ${old.id}'; end if; n_up:=n_up+1;`);}
for(const item of plan.insertions)statements.push(`if exists(select 1 from liens_bibliques where segment_id=${lit(item.segment_id)} and type=${lit(item.type)} and canon_id=${lit(item.canon_id)} and verset_v2_id is null and livre is null and chapitre is null) then raise exception 'doublon ${item.id_proposition}'; end if; insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values(${lit(item.segment_id)},${lit(item.canon_id)},null,null,null,${lit(item.type)},'vérifié',${lit(item.motif)},'lecture',false); n_ins:=n_ins+1;`);
const ids=live.segments.map((segment)=>segment.id),idsSql=ids.join(',');
const segmentExpected=live.segments.map((segment)=>`(${lit(segment.id)},${lit(md5(segment.segment_texte))},${lit(segment.liens_revus_le)}::timestamptz,${lit(segment.liens_revus_par)})`).join(',');
const sql=`do $strict_q118_123$ declare n_up int:=0; n_del int:=0; n_ins int:=0; n_mark int:=0; n int; begin
perform 1 from segments where id=any(array[${idsSql}]::bigint[]) for update;
perform 1 from liens_bibliques where segment_id=any(array[${idsSql}]::bigint[]) for update;
with expected(id,text_md5,revus_le,revus_par) as (values ${segmentExpected}) select count(*) into n from expected e join segments s on s.id=e.id where md5(s.segment_texte)=e.text_md5 and s.liens_revus_le is not distinct from e.revus_le and s.liens_revus_par is not distinct from e.revus_par and s.id_oeuvre='${OEUVRE}' and s.ref_niv1='${PARTIE}' and s.ref_niv2=any(array[${QUESTIONS.map(lit).join(',')}]::text[]); if n<>${EXPECTED.segments} then raise exception 'préétat segments %/${EXPECTED.segments}',n; end if;
select count(*) into n from liens_bibliques where segment_id=any(array[${idsSql}]::bigint[]); if n<>${EXPECTED.existing} then raise exception 'préétat liens %/${EXPECTED.existing}',n; end if;
${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id=any(array[${idsSql}]::bigint[]) and liens_revus_le is null and liens_revus_par is null;get diagnostics n_mark=row_count;
if n_up<>${EXPECTED.updates} or n_del<>${EXPECTED.deletes} or n_ins<>${EXPECTED.inserts} or n_mark<>${EXPECTED.segments} then raise exception 'comptes mutation %,%,%,%',n_up,n_del,n_ins,n_mark; end if;
select count(*) into n from liens_bibliques where segment_id=any(array[${idsSql}]::bigint[]); if n<>${EXPECTED.final} then raise exception 'total final %',n; end if;
select count(*) into n from liens_bibliques where segment_id=any(array[${idsSql}]::bigint[]) and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis); if n<>0 then raise exception 'métadonnées finales %',n; end if;
select count(*) into n from liens_bibliques where segment_id=any(array[${idsSql}]::bigint[]) and(canon_id is null or verset_v2_id is not null or livre is not null or chapitre is not null);if n<>0 then raise exception 'cible_unique ou champs secondaires %',n;end if;
select count(*) into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id=any(array[${idsSql}]::bigint[]) group by 1,2,3,4,5,6 having count(*)>1)d;if n<>0 then raise exception 'doublons finaux %',n;end if;
select count(*) into n from liens_bibliques l left join versets_canon v on v.id=l.canon_id where l.segment_id=any(array[${idsSql}]::bigint[]) and v.id is null; if n<>0 then raise exception 'cibles mortes %',n; end if;
${[...EXPECTED_TYPES].map(([type,count])=>`select count(*) into n from liens_bibliques where segment_id=any(array[${idsSql}]::bigint[]) and type=${type}; if n<>${count} then raise exception 'type ${type} %/${count}',n; end if;`).join('\n')}
end $strict_q118_123$;`;
const{error}=await sb.rpc('exec_sql',{sql});if(error)throw new Error(`Transaction stricte annulée : ${error.message}. Sauvegarde : ${before}`);
const afterLive=await fetchLive(),after=snapshot('live-after',afterLive.segments,afterLive.links);
if(afterLive.segments.length!==EXPECTED.segments||afterLive.links.length!==EXPECTED.final)throw new Error('Comptes post-transaction inattendus.');
if(afterLive.segments.some((segment)=>!segment.liens_revus_le||segment.liens_revus_par!=='IA-lecture'))throw new Error('Marquage post-transaction incomplet.');
if(afterLive.links.some((link)=>link.fiabilite!=='vérifié'||link.provenance!=='lecture'||link.arbitrage_requis||!link.canon_id||link.verset_v2_id||link.livre||link.chapitre))throw new Error('État final invalide.');
if(stable(afterLive.links.map(finalKey).sort())!==stable([...finalKeys].sort()))throw new Error('Le jeu final ne correspond pas exactement au plan.');
console.log(JSON.stringify({applied:true,before,after,segments:EXPECTED.segments,liens:EXPECTED.final},null,2));
