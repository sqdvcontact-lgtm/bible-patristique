import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre premier'
const NUMEROS = [1,2,3,4,5,6,7,...Array.from({length:14},(_,i)=>557+i)]
const EMPREINTE_ATTENDUE = 'ee899c47375134d49de0dfb193ec612459fc7ec19c88eb3d178c9db338c08df6'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, clôture Genèse'
const SANS_LIEN = new Set([1,2,3,4,5])
const NON_RESOLUS = [
  [7, 4, 'RÉFÉRENCE NON BIBLIQUE (Père de l’Église / renvoi interne) : renvoi aux trois autres ouvrages d’Augustin sur la Genèse, sans passage individualisé.'],
  [560, 4, 'RÉFÉRENCE NON BIBLIQUE (renvoi interne) : renvoi à la Question CLXI de la présente œuvre, sans cible intertextuelle disponible.'],
]
const LIENS = []
const add=(n,c,t,m)=>LIENS.push([n,c,t,m])
const addMany=(n,cs,ts,m)=>{for(const c of cs)for(const t of ts)add(n,c,t,`${m} (${c}).`)}

addMany(6,['GEN.1.1','GEN.3.24'],[1],'Les deux bornes scripturaires délimitent les questions sur la création et l’expulsion du paradis laissées de côté')

addMany(557,['GEN.50.10'],[1,3],'Citation et question sur l’arrivée à l’aire d’Atad au-delà du Jourdain')
addMany(558,['GEN.50.10'],[3],'La distance du détour est confrontée au lieu de sépulture')
addMany(558,['GEN.50.13'],[1],'Référence intentionnelle au tombeau patriarcal en Chanaan')
addMany(559,['GEN.50.10','GEN.50.13'],[3],'Le détour puis le retour vers la sépulture sont reconstruits géographiquement')
addMany(559,['EXO.13.18'],[4],'Le circuit funéraire est explicitement rapproché du détour d’Israël par le désert à la sortie d’Égypte')
addMany(560,['GEN.50.10','GEN.50.13'],[3],'Le circuit par le Jourdain jusqu’au tombeau d’Abraham poursuit l’explication de l’itinéraire')
addMany(561,['GEN.50.10'],[3],'Le passage au-delà du Jourdain reçoit une interprétation mystérieuse')
addMany(561,['JOS.3.17'],[4],'L’itinéraire funéraire est explicitement rapproché de la future traversée du Jourdain par Israël')

addMany(562,['GEN.50.10'],[1,3],'Citation et commentaire du deuil de sept jours célébré pour Jacob')
addMany(563,['GEN.50.10'],[3],'Le septénaire biblique est opposé aux neuf jours de coutume païenne')
addMany(563,['SIR.22.12'],[1],'Citation du deuil de sept jours pour le mort, corrigée sémantiquement depuis la note Siracide 22,13')
addMany(564,['GEN.50.10','GEN.50.3'],[1,3],'Les sept jours du deuil familial et les soixante-dix jours du deuil égyptien sont comparés')
addMany(564,['GEN.2.2'],[4],'Le repos du septième jour fonde le symbolisme funéraire du nombre sept')

addMany(565,['GEN.50.22','GEN.50.23'],[1,3],'Citation et question sur l’âge de Joseph et les générations d’Éphraïm et de Machir vues par lui')
addMany(565,['GEN.46.27'],[1,3],'La liste des personnes entrées en Égypte est mobilisée selon la variante septantiste de soixante-quinze, malgré les trois témoins à soixante-dix')
for(const n of [566,567,568,569]) addMany(n,['GEN.50.23','GEN.46.27'],[3],'La durée de la vie de Joseph explique l’inclusion progressive des descendants dans le total de la famille entrée en Égypte')
addMany(569,['GEN.46.21'],[1],'Référence intentionnelle aux petits-fils de Benjamin compris dans le dénombrement')
addMany(570,['GEN.46.15'],[1,3],'Citation et parallèle des descendants de Lia dits nés en Mésopotamie')
addMany(570,['GEN.50.23','GEN.46.27'],[3],'La même synecdoque explique l’entrée de Jacob avec les descendants nés durant la vie de Joseph')

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const supabase=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const {data:segments,error:erreurSegments}=await supabase.from('segments').select('id,segment_numero,segment_texte,texte_original,notes,nature,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1',REF_NIV1).in('segment_numero',NUMEROS).order('segment_numero')
if(erreurSegments)throw erreurSegments
if(segments.length!==21||JSON.stringify(segments.map(s=>s.segment_numero))!==JSON.stringify(NUMEROS))throw new Error('Préétat : segments inattendus')
if(segments.slice(0,7).some(s=>s.ref_niv2!=='Introduction')||segments.slice(7).some(s=>!['Question CLXXI','Question CLXXII','Question CLXXIII'].includes(s.ref_niv2)))throw new Error('Préétat structurel invalide')
if(segments.some(s=>s.liens_revus_le||s.liens_revus_par))throw new Error('Préétat : segment déjà relu')
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.texte_original,s.notes,s.nature]))).digest('hex')
if(empreinte!==EMPREINTE_ATTENDUE)throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s]))
const numerosLies=new Set([...LIENS,...NON_RESOLUS].map(([n])=>n))
const nonClasses=segments.filter(s=>!numerosLies.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero))
if(nonClasses.length)throw new Error(`Partition incomplète : ${nonClasses.map(s=>s.segment_numero)}`)
if([...SANS_LIEN].some(n=>numerosLies.has(n)||!parNumero.has(n)))throw new Error('SANS_LIEN incohérent')
if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m))throw new Error('Manifeste biblique invalide')
if(NON_RESOLUS.some(([n,t,m])=>!parNumero.has(n)||![1,2,3,4].includes(t)||!m.startsWith('RÉFÉRENCE NON BIBLIQUE')))throw new Error('Manifeste sans cible invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw new Error('Doublon interne')
const cibles=[...new Set(LIENS.map(([,c])=>c))]
const {data:temoins,error:erreurTemoins}=await supabase.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles)
if(erreurTemoins)throw erreurTemoins
const presents=new Map(temoins.map(t=>[t.id_verset,t]));const absents=cibles.filter(c=>!presents.has(c));if(absents.length)throw new Error(`Cibles absentes : ${absents}`)
if(cibles.some(c=>{const t=presents.get(c);return !t.TR0001&&!t.TR0003&&!t.TR0004}))throw new Error('Cible sans témoin lisible')
const ids=segments.map(s=>s.id)
const {count:existants,error:erreurExistants}=await supabase.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids)
if(erreurExistants)throw erreurExistants
if(existants)throw new Error(`${existants} liens existent déjà`)
const TOTAL=LIENS.length+NON_RESOLUS.length
const types=LIENS.reduce((a,[,,t])=>({...a,[t]:(a[t]??0)+1}),{})
for(const [,t] of NON_RESOLUS) types[t]=(types[t]??0)+1
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Clôture Genèse',segments:21,liens_bibliques:LIENS.length,sans_cible_a_constituer:NON_RESOLUS.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,empreinte,avancement_actuel:'16,83 %'},null,2))
if(!WRITE)process.exit(0)
const q=v=>`'${String(v).replaceAll("'","''")}'`
const valeurs=[...LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${q(c)},${t},'vérifié',${q(m)},'lecture',false)`),...NON_RESOLUS.map(([n,t,m])=>`(${parNumero.get(n).id},null,${t},'à constituer',${q(m)},'lecture',true)`)].join(',\n    ')
const idSql=ids.join(',')
const sql=`do $p$ declare n integer; begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs};
  get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens %/${TOTAL}',n; end if;
  update segments set liens_revus_le=now(), liens_revus_par=${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n=row_count; if n<>21 then raise exception 'Segments %/21',n; end if;
end $p$;`
const {error:erreurEcriture}=await supabase.rpc('exec_sql',{sql});if(erreurEcriture)throw erreurEcriture
const [{data:audit,error:e1},{count:relus,error:e2}]=await Promise.all([supabase.from('liens_bibliques').select('segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),supabase.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null)])
if(e1||e2)throw e1||e2
if(audit.length!==TOTAL||relus!==21)throw new Error('Postétat quantitatif invalide')
if(audit.some(l=>{if(!l.motif||l.provenance!=='lecture')return true;if(l.canon_id)return l.fiabilite!=='vérifié'||l.arbitrage_requis;return l.verset_v2_id||l.livre||l.chapitre||l.fiabilite!=='à constituer'||!l.arbitrage_requis||!l.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')}))throw new Error('Postétat qualitatif invalide')
const apres=audit.map(l=>l.canon_id?`${l.segment_id}|${l.canon_id}|${l.type}`:`${l.segment_id}|sans-cible|${l.type}|${l.motif}`);if(new Set(apres).size!==apres.length)throw new Error('Doublon postétat')
console.log(`✓ ${audit.length} liens ; ${relus} segments relus`)
