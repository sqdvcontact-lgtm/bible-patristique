// Application atomique du RÉAUDIT Q28-33 après quarantaine.
// Généré le 29 juillet 2026. Ne pas lancer sans relire
// tmp/somme-liens-audit-2026-07-29/Q28-33-REAUDIT-EXHAUSTIF.md.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE='A0013O0002',NIV1='Secunda Secundae',ROOT='tmp/somme-liens-audit-2026-07-29';
const QUESTIONS=Array.from({length:6},(_,i)=>`Question ${i+28}`),REVIEWER='IA-lecture';
const SNAPSHOT_PATH=`${ROOT}/ss-q28-33-quarantine-live.json`;
const AUDIT_PATH=`${ROOT}/Q28-33-REAUDIT-EXHAUSTIF.json`;
const EXPECTED={segments:338,before:204,beforeTargeted:202,deletions:67,corrections:4,after:137,afterTargeted:133,afterOpen:4,sample:20};
mkdirSync(ROOT,{recursive:true});
const snapshot=JSON.parse(readFileSync(SNAPSHOT_PATH,'utf8'));
const audit=JSON.parse(readFileSync(AUDIT_PATH,'utf8'));
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).replace(/^["']|["']$/g,'')]}));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
const q=v=>v==null?'null':typeof v==='number'?String(v):typeof v==='boolean'?(v?'true':'false'):`'${String(v).replaceAll("'","''")}'`;
const md5=v=>createHash('md5').update(String(v??''),'utf8').digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const stable=v=>JSON.stringify(canonical(v));
const quarantine=' — QUARANTAINE 2026-07-29 : contrôle aléatoire post-passe en échec ; cible à revérifier.';

async function fetchLive(){
 const{data:segments,error:se}=await sb.from('segments').select('*').eq('id_oeuvre',OEUVRE).eq('ref_niv1',NIV1).in('ref_niv2',QUESTIONS).order('segment_numero');if(se)throw se;
 const links=[];for(let i=0;i<segments.length;i+=180){const{data,error}=await sb.from('liens_bibliques').select('*').in('segment_id',segments.slice(i,i+180).map(s=>s.id)).order('id');if(error)throw error;links.push(...data)}
 return{segments,links:links.sort((a,b)=>a.id-b.id)};
}

// Dossier statique : aucun lien final ciblé ne peut manquer de témoin.
if(snapshot.segments.length!==EXPECTED.segments||snapshot.links.length!==EXPECTED.before||audit.decisions.length!==EXPECTED.before)throw new Error('Dossier Q28-33 incomplet.');
const removed=audit.decisions.filter(d=>d.decision==='supprimer');
const final=audit.decisions.filter(d=>d.decision!=='supprimer');
const targeted=final.filter(d=>d.cible_finale),open=final.filter(d=>!d.cible_finale);
const corrections=audit.decisions.filter(d=>d.decision==='corriger');
if(removed.length!==EXPECTED.deletions||corrections.length!==EXPECTED.corrections||final.length!==EXPECTED.after||targeted.length!==EXPECTED.afterTargeted||open.length!==EXPECTED.afterOpen)throw new Error('Nombres du réaudit inattendus.');
if(targeted.some(d=>!d.temoins?.TR0001&&!d.temoins?.TR0003&&!d.temoins?.TR0004))throw new Error('Une cible finale est dépourvue de témoin textuel.');
if(audit.controle_aleatoire.length<EXPECTED.sample||audit.controle_aleatoire.some(x=>!x.verdict.startsWith('juste')))throw new Error('Sondage final absent ou en échec.');
const finalKeys=targeted.map(d=>`${d.segment_id}|${d.type_final}|${d.cible_finale}`);if(new Set(finalKeys).size!==finalKeys.length)throw new Error('Doublon dans le dossier final.');

const live=await fetchLive();
const stamp=new Date().toISOString().replaceAll(':','-'),backupName=`Q28-33-reaudit-live-before-${stamp}.json`,backupPath=`${ROOT}/${backupName}`;
const payload=`${JSON.stringify({backed_up_at:new Date().toISOString(),segments:live.segments,links:live.links},null,2)}\n`;
writeFileSync(backupPath,payload);writeFileSync(`${backupPath}.sha256`,`${createHash('sha256').update(payload).digest('hex')}  ${backupName}\n`);

// Précondition exacte hors transaction : l'état vivant doit être le cliché de quarantaine.
if(stable(live.segments)!==stable(snapshot.segments)||stable(live.links)!==stable([...snapshot.links].sort((a,b)=>a.id-b.id)))throw new Error(`État vivant différent du cliché audité. Sauvegarde : ${backupPath}`);

const segmentIds=snapshot.segments.map(s=>Number(s.id)),segmentList=segmentIds.join(',');
const expectedSegments=snapshot.segments.map(s=>`(${q(s.id)},${q(s.segment_numero)},${q(md5(s.segment_texte))},${s.liens_revus_le==null?'null::timestamptz':`${q(s.liens_revus_le)}::timestamptz`},${q(s.liens_revus_par)})`).join(',\n');
const expectedLinks=snapshot.links.map(l=>`(${q(l.id)},${q(l.segment_id)},${q(l.canon_id)},${l.verset_v2_id==null?'null::uuid':`${q(l.verset_v2_id)}::uuid`},${q(l.livre)},${q(l.chapitre)},${q(l.type)},${q(l.fiabilite)},${q(md5(l.motif))},${q(l.provenance)},${q(l.arbitrage_requis)})`).join(',\n');
const targetedValues=targeted.map(d=>`(${q(d.lien_id)},${q(d.cible_finale)},${q(d.type_final)},${q(d.motif_final)})`).join(',\n');
const convertedOpen=corrections.filter(d=>!d.cible_finale);
if(convertedOpen.length!==2)throw new Error('Deux chapitres Décalogue devaient devenir sans cible.');
const openValues=convertedOpen.map(d=>`(${q(d.lien_id)},${q(d.type_final)},${q(`À CONSTITUER : ${d.reason}`)})`).join(',\n');
const sampleIds=audit.controle_aleatoire.map(x=>Number(x.lien_id)).join(',');

const sql=`do $reaudit$
declare n integer;
begin
 perform 1 from segments where id in (${segmentList}) order by id for update;get diagnostics n=row_count;
 if n<>${EXPECTED.segments} then raise exception 'Verrou segments %/${EXPECTED.segments}',n;end if;
 perform 1 from liens_bibliques where segment_id in (${segmentList}) order by id for update;get diagnostics n=row_count;
 if n<>${EXPECTED.before} then raise exception 'Verrou liens %/${EXPECTED.before}',n;end if;

 with e(id,numero,texte_md5,revu,reviseur)as(values ${expectedSegments})
 select count(*)into n from e join segments s on s.id=e.id and s.segment_numero=e.numero and md5(coalesce(s.segment_texte,''))=e.texte_md5 and s.liens_revus_le is not distinct from e.revu and s.liens_revus_par is not distinct from e.reviseur;
 if n<>${EXPECTED.segments} then raise exception 'Précondition atomique segments %/${EXPECTED.segments}',n;end if;
 with e(id,segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif_md5,provenance,arbitrage)as(values ${expectedLinks})
 select count(*)into n from e join liens_bibliques l on l.id=e.id and l.segment_id=e.segment_id and l.canon_id is not distinct from e.canon_id and l.verset_v2_id is not distinct from e.verset_v2_id and l.livre is not distinct from e.livre and l.chapitre is not distinct from e.chapitre and l.type=e.type and l.fiabilite=e.fiabilite and md5(coalesce(l.motif,''))=e.motif_md5 and l.provenance=e.provenance and l.arbitrage_requis=e.arbitrage;
 if n<>${EXPECTED.before} then raise exception 'Précondition atomique liens %/${EXPECTED.before}',n;end if;

 delete from liens_bibliques where id in (${removed.map(d=>d.lien_id).join(',')});get diagnostics n=row_count;
 if n<>${EXPECTED.deletions} then raise exception 'Suppressions %/${EXPECTED.deletions}',n;end if;

 with v(id,canon_id,type,motif)as(values ${targetedValues})
 update liens_bibliques l set canon_id=v.canon_id,verset_v2_id=null,livre=null,chapitre=null,type=v.type,fiabilite='vérifié',motif=v.motif,provenance='lecture',arbitrage_requis=false from v where l.id=v.id;
 get diagnostics n=row_count;if n<>${EXPECTED.afterTargeted} then raise exception 'Cibles validées %/${EXPECTED.afterTargeted}',n;end if;

 with v(id,type,motif)as(values ${openValues})
 update liens_bibliques l set canon_id=null,verset_v2_id=null,livre=null,chapitre=null,type=v.type,fiabilite='à constituer',motif=v.motif,provenance='lecture',arbitrage_requis=true from v where l.id=v.id;
 get diagnostics n=row_count;if n<>2 then raise exception 'Décalogues ouverts %/2',n;end if;

 update segments set liens_revus_le=now(),liens_revus_par=${q(REVIEWER)} where id in (${segmentList});get diagnostics n=row_count;
 if n<>${EXPECTED.segments} then raise exception 'Segments relus %/${EXPECTED.segments}',n;end if;

 select count(*)into n from liens_bibliques where segment_id in (${segmentList});if n<>${EXPECTED.after} then raise exception 'Total final %/${EXPECTED.after}',n;end if;
 select count(*)into n from liens_bibliques where segment_id in (${segmentList}) and canon_id is not null and fiabilite='vérifié' and provenance='lecture' and not arbitrage_requis;
 if n<>${EXPECTED.afterTargeted} then raise exception 'Ciblés finaux %/${EXPECTED.afterTargeted}',n;end if;
 select count(*)into n from liens_bibliques where segment_id in (${segmentList}) and canon_id is null and verset_v2_id is null and livre is null and chapitre is null and fiabilite='à constituer' and provenance='lecture' and arbitrage_requis;
 if n<>${EXPECTED.afterOpen} then raise exception 'Ouverts finaux %/${EXPECTED.afterOpen}',n;end if;
 select count(*)into n from liens_bibliques where id in (${sampleIds}) and canon_id is not null and fiabilite='vérifié';if n<>${EXPECTED.sample} then raise exception 'Sondage final présent %/${EXPECTED.sample}',n;end if;
 select count(*)into n from(select segment_id,type,coalesce('c:'||canon_id,'v:'||verset_v2_id::text,'h:'||livre||'.'||chapitre::text,'sans-cible')c from liens_bibliques where segment_id in (${segmentList}) group by segment_id,type,coalesce('c:'||canon_id,'v:'||verset_v2_id::text,'h:'||livre||'.'||chapitre::text,'sans-cible')having count(*)>1)d;
 if n<>0 then raise exception 'Doublons finaux %',n;end if;
end $reaudit$;`;

const{error}=await sb.rpc('exec_sql',{sql});if(error)throw error;
const after=await fetchLive();
if(after.segments.length!==EXPECTED.segments||after.links.length!==EXPECTED.after)throw new Error('Contrôle externe des nombres en échec.');
if(after.segments.some(s=>!s.liens_revus_le||s.liens_revus_par!==REVIEWER))throw new Error('Contrôle externe des marques en échec.');
const afterTargeted=after.links.filter(l=>l.canon_id),afterOpen=after.links.filter(l=>!l.canon_id&&!l.verset_v2_id&&!l.livre&&!l.chapitre);
if(afterTargeted.length!==EXPECTED.afterTargeted||afterTargeted.some(l=>l.fiabilite!=='vérifié'||l.provenance!=='lecture'||l.arbitrage_requis||String(l.motif).includes(quarantine)))throw new Error('Contrôle externe des cibles en échec.');
if(afterOpen.length!==EXPECTED.afterOpen||afterOpen.some(l=>l.fiabilite!=='à constituer'||!l.arbitrage_requis))throw new Error('Contrôle externe des arbitrages en échec.');
const afterName=`Q28-33-reaudit-live-after-${stamp}.json`,afterPayload=`${JSON.stringify({applied_at:new Date().toISOString(),segments:after.segments,links:after.links},null,2)}\n`;
writeFileSync(`${ROOT}/${afterName}`,afterPayload);writeFileSync(`${ROOT}/${afterName}.sha256`,`${createHash('sha256').update(afterPayload).digest('hex')}  ${afterName}\n`);
console.log(JSON.stringify({applied:true,backup:backupPath,after:`${ROOT}/${afterName}`,segments:EXPECTED.segments,targeted_verified:EXPECTED.afterTargeted,open_arbitrations:EXPECTED.afterOpen,sample:`${EXPECTED.sample}/${EXPECTED.sample}`,duplicates:0},null,2));
