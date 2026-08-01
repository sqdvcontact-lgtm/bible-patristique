/** Application atomique stricte du dossier exhaustif Q22-27. Généré sans exécution. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const ROOT='tmp/somme-liens-audit-2026-07-29',OEUVRE='A0013O0002',PARTIE='Secunda Secundae',QUESTIONS=Array.from({length:6},(_,i)=>`Question ${22+i}`);
const expected=JSON.parse(readFileSync(`${ROOT}/Q22-27-QUARANTAINE-LIVE.json`,'utf8'));
const dossier=JSON.parse(readFileSync(`${ROOT}/Q22-27-DOSSIER-EXHAUSTIF.json`,'utf8'));
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).replace(/^["']|["']$/g,'')]}));
if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Variables Supabase absentes');
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const stable=v=>JSON.stringify(canonical(v));
const lit=v=>v==null?'null':typeof v==='number'?String(v):typeof v==='boolean'?(v?'true':'false'):`'${String(v).replaceAll("'","''")}'`;
if(expected.segments.length!==550||expected.links.length!==148||dossier.decisions.length!==148||dossier.ajouts.length!==1)throw new Error('Dossier incomplet');
if(new Set(dossier.decisions.map(d=>d.lien_id)).size!==148||dossier.controle_aleatoire.length<15||dossier.controle_aleatoire.some(c=>c.resultat!=='juste'))throw new Error('Contrôle du dossier insuffisant');

// Sauvegarde live avant toute précondition et toute écriture.
const{data:segments,error:e1}=await sb.from('segments').select('*').eq('id_oeuvre',OEUVRE).eq('ref_niv1',PARTIE).in('ref_niv2',QUESTIONS).order('segment_numero');if(e1)throw e1;
const ids=segments.map(s=>s.id);
const{data:links,error:e2}=await sb.from('liens_bibliques').select('*').in('segment_id',ids).order('segment_id').order('type').order('id');if(e2)throw e2;
mkdirSync(ROOT,{recursive:true});const stamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),name=`Q22-27-strict-live-before-${stamp}.json`,payload=`${JSON.stringify({exported_at:new Date().toISOString(),segments,links},null,2)}\n`;
writeFileSync(`${ROOT}/${name}`,payload);writeFileSync(`${ROOT}/${name}.sha256`,`${createHash('sha256').update(payload).digest('hex')}  ${name}\n`);
if(stable([...segments].sort((a,b)=>a.id-b.id))!==stable([...expected.segments].sort((a,b)=>a.id-b.id)))throw new Error('Précondition exacte refusée : segments différents');
if(stable([...links].sort((a,b)=>a.id-b.id))!==stable([...expected.links].sort((a,b)=>a.id-b.id)))throw new Error('Précondition exacte refusée : liens différents');
if(segments.some(s=>s.liens_revus_le!==null||s.liens_revus_par!==null))throw new Error('Marques de lecture inattendues');

// Chaque preuve doit encore correspondre textuellement au témoin live choisi.
const targetIds=[...new Set([...dossier.decisions.map(d=>d.cible_finale),...dossier.ajouts.map(a=>a.cible)])];
const witnesses=[];for(let i=0;i<targetIds.length;i+=100){const{data,error}=await sb.from('versets_lecture').select('*').in('id_verset',targetIds.slice(i,i+100));if(error)throw error;witnesses.push(...data)}
const witById=new Map(witnesses.map(v=>[v.id_verset,v]));
for(const d of dossier.decisions){const w=witById.get(d.cible_finale);if(!w||w[d.temoin.edition]!==d.temoin.texte||!d.ancre_source.trim())throw new Error(`Témoin modifié ou preuve vide : lien ${d.lien_id}`)}
for(const a of dossier.ajouts){const w=witById.get(a.cible);if(!w||w[a.temoin.edition]!==a.temoin.texte||!a.ancre_source.trim())throw new Error(`Témoin d'ajout modifié : ${a.cible}`)}

const oldById=new Map(expected.links.map(l=>[l.id,l]));
const predicate=l=>[`id=${lit(l.id)}`,`segment_id=${lit(l.segment_id)}`,`canon_id is not distinct from ${lit(l.canon_id)}`,`verset_v2_id is not distinct from ${lit(l.verset_v2_id)}`,`livre is not distinct from ${lit(l.livre)}`,`chapitre is not distinct from ${lit(l.chapitre)}`,`type=${lit(l.type)}`,`fiabilite=${lit(l.fiabilite)}`,`motif is not distinct from ${lit(l.motif)}`,`provenance=${lit(l.provenance)}`,`arbitrage_requis=${lit(l.arbitrage_requis)}`].join(' and ');
const statements=[];
for(const d of dossier.decisions){const old=oldById.get(d.lien_id);if(!old||old.segment_id!==d.segment_id||old.canon_id!==d.cible_finale||old.type!==d.type_final)throw new Error(`Décision incompatible avec le live : ${d.lien_id}`);statements.push(`update liens_bibliques set fiabilite='vérifié',provenance='lecture',arbitrage_requis=false,motif=${lit(d.motif_final)} where ${predicate(old)}; if not found then raise exception 'Lien refusé ${d.lien_id}'; end if; n_update:=n_update+1;`)}
const a=dossier.ajouts[0];
statements.push(`insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values(${lit(a.segment_id)},${lit(a.cible)},null,null,null,${lit(a.type)},'vérifié',${lit(a.motif)},'lecture',false); n_insert:=n_insert+1;`);
const idSql=ids.map(lit).join(','),sql=`do $strict$ declare n_update integer:=0;n_insert integer:=0;n_mark integer:=0;n integer;begin
${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${idSql}) and id_oeuvre=${lit(OEUVRE)} and ref_niv1=${lit(PARTIE)} and ref_niv2 in(${QUESTIONS.map(lit).join(',')}) and liens_revus_le is null and liens_revus_par is null;get diagnostics n_mark=row_count;
if n_update<>148 or n_insert<>1 or n_mark<>550 then raise exception 'Comptes stricts update=%, insert=%, mark=%',n_update,n_insert,n_mark;end if;
select count(*) into n from liens_bibliques where segment_id in(${idSql});if n<>149 then raise exception 'Total final %',n;end if;
select count(*) into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id in(${idSql}) group by segment_id,type,canon_id,verset_v2_id,livre,chapitre having count(*)>1)d;if n<>0 then raise exception 'Doublons %',n;end if;
select count(*) into n from liens_bibliques where segment_id in(${idSql}) and(fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis or motif is null or btrim(motif)='');if n<>0 then raise exception 'Liens non conformes %',n;end if;
end $strict$;`;
const{error:e3}=await sb.rpc('exec_sql',{sql});if(e3)throw e3;

const{data:afterSegments,error:e4}=await sb.from('segments').select('id,liens_revus_le,liens_revus_par').in('id',ids);if(e4)throw e4;
const{data:afterLinks,error:e5}=await sb.from('liens_bibliques').select('*').in('segment_id',ids).order('id');if(e5)throw e5;
if(afterSegments.length!==550||afterSegments.some(s=>!s.liens_revus_le||s.liens_revus_par!=='IA-lecture'))throw new Error('Post-contrôle segments échoué');
if(afterLinks.length!==149||afterLinks.some(l=>l.fiabilite!=='vérifié'||l.provenance!=='lecture'||l.arbitrage_requis||!l.motif))throw new Error('Post-contrôle liens échoué');
const keys=new Set();for(const l of afterLinks){const k=stable([l.segment_id,l.type,l.canon_id,l.verset_v2_id,l.livre,l.chapitre]);if(keys.has(k))throw new Error(`Doublon ${k}`);keys.add(k)}
if(!afterLinks.some(l=>l.segment_id===a.segment_id&&l.canon_id===a.cible&&l.type===a.type))throw new Error('Ajout 2 Tm 3,2 absent');
console.log(JSON.stringify({applied:true,backup:`${ROOT}/${name}`,segments_marked:550,links_revalidated:148,links_added:1,final_links:149,duplicates:0},null,2));
