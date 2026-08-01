import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT='tmp/somme-liens-audit-2026-07-29';
const raw=JSON.parse(readFileSync(`${ROOT}/tp-q31-40-raw.json`,'utf8'));
const plan=JSON.parse(readFileSync(`${ROOT}/TP-Q31-40-DOSSIER-STRICT.json`,'utf8'));
const APPLY=process.argv.includes('--apply');
const questions=Array.from({length:10},(_,i)=>`Question ${i+31}`);
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((line)=>line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean)
  .map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const canon=(v)=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map((k)=>[k,canon(v[k])])):v;
const stable=(v)=>JSON.stringify(canon(v));
const hash=(v)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const lit=(v)=>v==null?'null':typeof v==='number'?String(v):typeof v==='boolean'?(v?'true':'false'):`'${String(v).replaceAll("'","''")}'`;
const must=async(q,label)=>{const{data,error}=await q;if(error)throw new Error(`${label}: ${error.message}`);return data;};
const snapshot=(label,segments,links)=>{mkdirSync(ROOT,{recursive:true});const stamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');
  const name=`TP-Q31-40-${label}-${stamp}.json`,payload=`${JSON.stringify({segments,links},null,2)}\n`;
  writeFileSync(`${ROOT}/${name}`,payload);writeFileSync(`${ROOT}/${name}.sha256`,`${createHash('sha256').update(payload).digest('hex')}  ${name}\n`);return`${ROOT}/${name}`;};
const fetchLive=async()=>{const segments=[];for(let from=0;;from+=100){const page=await must(sb.from('segments').select('*')
  .eq('id_oeuvre','A0013O0002').eq('ref_niv1','Tertia Pars').in('ref_niv2',questions).order('segment_numero').range(from,from+99),`segments ${from}`);
  segments.push(...page);if(page.length<100)break;}const links=[];for(let off=0;off<segments.length;off+=100){const ids=segments.slice(off,off+100).map((s)=>s.id);
  for(let from=0;;from+=100){const page=await must(sb.from('liens_bibliques').select('*').in('segment_id',ids).order('id').range(from,from+99),`liens ${off}/${from}`);
    links.push(...page);if(page.length<100)break;}}links.sort((a,b)=>a.id-b.id);return{segments,links};};

if(raw.segments.length!==645||raw.links.length!==307||hash(raw.segments)!=='2bd26a013f7206b73577eecfdd56e465bc69114eb4acfd72d5e7679c61305f0f'||
  hash(raw.links)!=='600500d66ec3289d56fcea24a072c2bb5005a68d4430e7c589e76696032ad82b')throw new Error('Baseline/hash inattendu');
if(plan.decisions.length!==307||plan.insertions.length!==71||plan.summary.liens_supprimes!==3||plan.summary.liens_finaux_proposes!==375)throw new Error('Dossier incomplet');
if(plan.controle_stratifie.length<30||plan.summary.controle_types_3_4*2<plan.controle_stratifie.length)throw new Error('Contrôle stratifié insuffisant');
const planned=[...plan.decisions.filter((d)=>d.final).map((d)=>({segment_id:d.segment_id,...d.final})),...plan.insertions];
const key=(x)=>`${x.segment_id}|${x.type}|${x.canon_id??''}|${x.verset_v2_id??''}|${x.livre??''}|${x.chapitre??''}`;
if(new Set(planned.map(key)).size!==planned.length)throw new Error('cible_unique violée');
for(const x of planned){const verse=x.canon_id&&x.verset_v2_id==null&&x.livre==null&&x.chapitre==null;
  const chapter=x.canon_id==null&&x.verset_v2_id==null&&x.livre&&Number.isInteger(x.chapitre)&&x.type===3;
  if(!verse&&!chapter)throw new Error(`Cible invalide ${key(x)}`);}
for(const d of plan.decisions.filter((x)=>x.final))if(!d.ancre_locale_exacte||!d.final.motif||!d.temoins_versets_lecture?.length||d.temoins_versets_lecture.some((w)=>!w.texte))throw new Error(`Preuve décision ${d.link_id}`);
for(const x of plan.insertions)if(!x.ancre_locale_exacte||!x.motif||!x.temoins_versets_lecture?.length||x.temoins_versets_lecture.some((w)=>!w.texte))throw new Error(`Preuve insertion ${x.id_proposition}`);

const live=await fetchLive(),before=snapshot('live-before',live.segments,live.links);
if(stable(live.segments)!==stable(raw.segments)||stable(live.links)!==stable(raw.links))throw new Error(`Préétat exact différent : ${before}`);
if(live.segments.some((s)=>s.liens_revus_le||s.liens_revus_par))throw new Error('Segment déjà marqué');
if(!APPLY){console.log(JSON.stringify({ready:true,applied:false,reason:'Garde active : --apply requis après validation humaine.',snapshot:before,
  pagination_segments:[100,100,100,100,100,100,45],pagination_liens_par_lot:[36,26,46,46,58,46,49],segments:645,liens_avant:307,
  suppressions:3,mises_a_jour:304,insertions:71,liens_apres_attendus:375,cible_unique:true,
  cibles_chapitre_t3:planned.filter((x)=>!x.canon_id).length,cibles_verset_precises:planned.filter((x)=>x.canon_id).length},null,2));process.exit(0);}

const oldById=new Map(raw.links.map((x)=>[x.id,x]));
const pred=(x)=>[`id=${lit(x.id)}`,`segment_id=${lit(x.segment_id)}`,`canon_id is not distinct from ${lit(x.canon_id)}`,
  `verset_v2_id is not distinct from ${lit(x.verset_v2_id)}`,`livre is not distinct from ${lit(x.livre)}`,`chapitre is not distinct from ${lit(x.chapitre)}`,
  `type=${lit(x.type)}`,`fiabilite=${lit(x.fiabilite)}`,`motif is not distinct from ${lit(x.motif)}`,`provenance=${lit(x.provenance)}`,
  `arbitrage_requis=${lit(x.arbitrage_requis)}`,`created_at=${lit(x.created_at)}`,`updated_at=${lit(x.updated_at)}`].join(' and ');
const targetPred=(x)=>[`segment_id=${lit(x.segment_id)}`,`type=${lit(x.type)}`,`canon_id is not distinct from ${lit(x.canon_id)}`,
  `verset_v2_id is not distinct from ${lit(x.verset_v2_id)}`,`livre is not distinct from ${lit(x.livre)}`,`chapitre is not distinct from ${lit(x.chapitre)}`].join(' and ');
const statements=[];
for(const d of plan.decisions){const old=oldById.get(d.link_id);if(!old||stable(old)!==stable(d.avant))throw new Error(`Préétat décision ${d.link_id}`);
  if(d.decision==='supprimer')statements.push(`delete from liens_bibliques where ${pred(old)};if not found then raise exception 'delete ${old.id}';end if;n_del:=n_del+1;`);
  else{const f=d.final;statements.push(`update liens_bibliques set canon_id=${lit(f.canon_id)},verset_v2_id=${lit(f.verset_v2_id)},livre=${lit(f.livre)},chapitre=${lit(f.chapitre)},type=${lit(f.type)},fiabilite='vérifié',motif=${lit(f.motif)},provenance='lecture',arbitrage_requis=false where ${pred(old)};if not found then raise exception 'update ${old.id}';end if;n_up:=n_up+1;`);}}
for(const x of plan.insertions)statements.push(`if exists(select 1 from liens_bibliques where ${targetPred(x)})then raise exception 'cible_unique ${x.id_proposition}';end if;insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)values(${lit(x.segment_id)},${lit(x.canon_id)},${lit(x.verset_v2_id)},${lit(x.livre)},${lit(x.chapitre)},${lit(x.type)},'vérifié',${lit(x.motif)},'lecture',false);n_ins:=n_ins+1;`);
const ids=live.segments.map((s)=>s.id).join(',');
const sql=`do $audit$ declare n_up int:=0;n_del int:=0;n_ins int:=0;n_mark int:=0;n int;begin ${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${ids})and liens_revus_le is null and liens_revus_par is null;get diagnostics n_mark=row_count;
if n_up<>304 or n_del<>3 or n_ins<>71 or n_mark<>645 then raise exception 'comptes %,%,%,%',n_up,n_del,n_ins,n_mark;end if;
select count(*)into n from liens_bibliques where segment_id in(${ids});if n<>375 then raise exception 'total %',n;end if;
select count(*)into n from liens_bibliques where segment_id in(${ids})and(fiabilite<>'vérifié'or provenance<>'lecture'or arbitrage_requis);if n<>0 then raise exception 'métadonnées %',n;end if;
select count(*)into n from liens_bibliques where segment_id in(${ids})and not((canon_id is not null and verset_v2_id is null and livre is null and chapitre is null)or(canon_id is null and verset_v2_id is null and livre is not null and chapitre is not null and type=3));if n<>0 then raise exception 'cibles %',n;end if;
select count(*)into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)from liens_bibliques where segment_id in(${ids})group by 1,2,3,4,5,6 having count(*)>1)d;if n<>0 then raise exception 'doublons %',n;end if;
select count(*)into n from liens_bibliques l left join versets_canon v on v.id=l.canon_id where l.segment_id in(${ids})and l.canon_id is not null and v.id is null;if n<>0 then raise exception 'cibles mortes %',n;end if;
end $audit$;`;
const{error}=await sb.rpc('exec_sql',{sql});if(error)throw new Error(`Transaction annulée : ${error.message}`);
const afterLive=await fetchLive(),after=snapshot('live-after',afterLive.segments,afterLive.links);
if(afterLive.segments.length!==645||afterLive.links.length!==375||afterLive.segments.some((s)=>!s.liens_revus_le||s.liens_revus_par!=='IA-lecture')||
  afterLive.links.some((l)=>l.fiabilite!=='vérifié'||l.provenance!=='lecture'||l.arbitrage_requis))throw new Error('Post-contrôle invalide');
console.log(JSON.stringify({applied:true,before,after,segments:645,liens:375},null,2));
