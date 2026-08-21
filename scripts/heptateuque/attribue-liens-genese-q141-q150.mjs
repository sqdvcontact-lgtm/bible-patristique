import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre premier'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Genèse Q. CXLI-CL'
const EMPREINTE_ATTENDUE = '461624a24b0f6a36fd7d9e89050a00b88dffd91e7e02f3728a62829bad0c317c'
const QUESTIONS = ['Question CXLI','Question CXLII','Question CXLIII','Question CXLIV','Question CXLV','Question CXLVI','Question CXLVII','Question CXLVIII','Question CXLIX','Question CL']
const SANS_LIEN = new Set()
const NON_RESOLUS = []
const LIENS = []
const add = (numero, canon, type, motif) => LIENS.push([numero, canon, type, motif])
const addMany = (numero, canons, types, motif) => {
  for (const canon of canons) for (const type of types) add(numero, canon, type, `${motif} (${canon}).`)
}
const range = (livre, chapitre, debut, fin) => Array.from({ length: fin - debut + 1 }, (_, i) => `${livre}.${chapitre}.${debut + i}`)

addMany(450, ['GEN.42.24'], [1,3], 'Citation et explication de Joseph revenu parler à ses frères sans que ses paroles soient rapportées')
addMany(451, ['GEN.42.38'], [1,3], 'Citation et question sur la descente douloureuse de Jacob au séjour des morts')

addMany(452, ['GEN.43.23'], [1,3], 'La citation de l’intendant sur le trésor et l’argent reçu est identifiée sémantiquement malgré le titre fautif Genèse 43,28')
addMany(453, ['GEN.43.23'], [3], 'L’argent rendu intact reçoit une interprétation spirituelle')
addMany(453, ['PSA.11.7'], [1], 'Citation explicite de la parole du Seigneur comparée à l’argent purifié sept fois')

addMany(454, ['GEN.43.34'], [1,3], 'Citation et analyse du verbe s’enivrer appliqué au repas de Joseph et de ses frères')
addMany(455, ['PSA.64.10'], [1,3], 'Citation du psaume où la terre est enivrée et interprétation de ce verbe comme rassasiement')
addMany(455, ['GEN.43.34'], [3], 'Le psaume éclaire le vocabulaire de Genèse 43,34')
addMany(456, ['GEN.43.34','PSA.64.10'], [3], 'La juste mesure de l’humidité et de la boisson conclut l’explication du terme enivrer')

addMany(457, ['GEN.44.15'], [1,3], 'Citation et ouverture de la question sur la prétendue science divinatoire de Joseph')
addMany(457, ['GEN.44.5'], [1], 'Référence intentionnelle aux paroles antérieures de l’intendant sur la coupe divinatoire')
for (const n of [458,459,460,461]) addMany(n, ['GEN.44.15'], [3], 'Le jeu prolongé de Joseph et la formule divinatoire sont examinés comme porteurs d’un sens caché')
addMany(461, ['GEN.44.15'], [1], 'Reprise explicite de la formule « un homme tel que moi devine ce qui est caché »')

addMany(462, range('GEN',44,1,34), [3], 'Le chapitre entier est commenté comme mise à l’épreuve volontaire précédant la joie de la reconnaissance')
addMany(462, range('GEN',45,1,4), [3], 'Le dénouement où Joseph se fait reconnaître éclaire la finalité de l’épreuve')

for (const n of [463,464,465]) addMany(n, range('GEN',44,19,29), [3], 'Le récit rétrospectif de Juda est confronté à la conversation antérieure et jugé comme oubli plutôt que mensonge')
addMany(463, ['GEN.42.9'], [1], 'Référence intentionnelle à l’accusation d’espionnage omise par Juda')
addMany(464, ['GEN.42.13'], [1], 'Référence intentionnelle aux renseignements spontanément donnés sur le père et le jeune frère')
addMany(464, ['GEN.42.15','GEN.42.20'], [1], 'Référence intentionnelle à l’ordre réel d’amener le plus jeune frère')

addMany(466, ['GEN.45.7'], [1,3], 'Citation et question sur le reste de la race de Jacob conservé en vie')
addMany(467, ['GEN.45.7'], [3], 'Le reste sauvé par Joseph reçoit une interprétation apostolique et prophétique')
addMany(467, ['ROM.11.5','ISA.10.22'], [1], 'Citations explicites du reste sauvé selon la grâce')
addMany(468, ['GEN.45.7'], [3], 'Joseph sauvant le reste d’Israël est interprété comme figure du Christ')
addMany(468, ['GEN.37.28'], [4], 'La livraison de Joseph aux Égyptiens forme le parallèle typologique explicite avec le Christ livré aux Gentils')
addMany(468, ['ROM.11.1','ROM.11.25','ROM.11.26'], [1], 'Citations pauliniennes de l’Israélite sauvé, de la plénitude des nations et du salut de tout Israël')
addMany(469, ['GEN.45.7','ROM.11.5','ROM.11.25','ROM.11.26'], [3], 'Les restes selon la chair et la plénitude d’Israël selon l’esprit sont articulés dans la même interprétation')
addMany(469, ['EXO.14.30'], [4], 'La délivrance entière d’Israël par Moïse est proposée comme figure du salut futur')

addMany(470, ['GEN.46.6','GEN.46.7'], [1,3], 'Citation et question sur les fils, filles et descendantes entrés en Égypte avec Jacob')
addMany(471, ['GEN.46.6','GEN.46.7'], [3], 'Le pluriel filles est expliqué par descendance ou par pluriel mis pour singulier')
addMany(471, ['GEN.30.21'], [1], 'Référence intentionnelle à Dina, seule fille explicitement née de Jacob')
addMany(472, ['GEN.46.7'], [3], 'Le nom de filles est alternativement étendu aux belles-filles de Jacob')

addMany(473, ['GEN.46.15'], [1,3], 'Citation intentionnelle et question sur les âmes enfantées par Lia ou sorties de Jacob')
addMany(474, ['GEN.46.15'], [3], 'Le mot âme est expliqué par synecdoque comme désignation de l’homme entier')

const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,segment_texte,texte_original,notes,nature,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre',OEUVRE).eq('ref_niv1',REF_NIV1).in('ref_niv2',QUESTIONS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length!==25 || segments[0]?.segment_numero!==450 || segments.at(-1)?.segment_numero!==474) throw new Error('Préétat : lot inattendu')
if (segments.some((s,i)=>s.segment_numero!==450+i || s.ref_niv1!==REF_NIV1 || !QUESTIONS.includes(s.ref_niv2))) throw new Error('Préétat structurel invalide')
if (new Set(segments.map(s=>s.ref_niv2)).size!==10) throw new Error('Préétat : questions incomplètes')
if (segments.some(s=>s.liens_revus_le||s.liens_revus_par)) throw new Error('Préétat : segment déjà relu')
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.texte_original,s.notes,s.nature]))).digest('hex')
if (empreinte!==EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s]))
const numerosLies=new Set([...LIENS,...NON_RESOLUS].map(([n])=>n))
const nonClasses=segments.filter(s=>!numerosLies.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero))
if(nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map(s=>s.segment_numero)}`)
if([...SANS_LIEN].some(n=>numerosLies.has(n)||!parNumero.has(n))) throw new Error('SANS_LIEN incohérent')
if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m)) throw new Error('Manifeste invalide')
if(NON_RESOLUS.length) throw new Error('Référence non résolue inattendue dans ce lot')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`); if(new Set(cles).size!==cles.length) throw new Error('Doublon interne')
const cibles=[...new Set(LIENS.map(([,c])=>c))]
const { data: temoins, error: erreurTemoins }=await supabase.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles)
if(erreurTemoins) throw erreurTemoins
const presents=new Map(temoins.map(t=>[t.id_verset,t])); const absents=cibles.filter(c=>!presents.has(c)); if(absents.length) throw new Error(`Cibles absentes : ${absents}`)
if(cibles.some(c=>{const t=presents.get(c);return !t.TR0001&&!t.TR0003&&!t.TR0004})) throw new Error('Cible sans témoin lisible')
const ids=segments.map(s=>s.id)
const { count: existants, error: erreurExistants }=await supabase.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids)
if(erreurExistants) throw erreurExistants
if(existants) throw new Error(`${existants} liens existent déjà`)
const types=LIENS.reduce((a,[,,t])=>({...a,[t]:(a[t]??0)+1}),{})
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Genèse CXLI-CL',bornes:[450,474],segments:25,liens:LIENS.length,sans_lien:[...SANS_LIEN],sans_cible_a_constituer:0,cibles_distinctes:cibles.length,types,empreinte,avancement_actuel:'13,55 %'},null,2))
if(!WRITE) process.exit(0)
const q=v=>`'${String(v).replaceAll("'","''")}'`
const valeurs=LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${q(c)},${t},'vérifié',${q(m)},'lecture',false)`).join(',\n')
const sql=`do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id in (${ids})) then raise exception 'Liens déjà présents'; end if; if exists(select 1 from segments where id in (${ids}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %',n; end if; update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${ids}); get diagnostics n=row_count; if n<>25 then raise exception 'Segments %',n; end if; end $p$;`
const { error: erreurEcriture }=await supabase.rpc('exec_sql',{sql}); if(erreurEcriture) throw erreurEcriture
const [{count:liensApres,error:e1},{count:relusApres,error:e2},{data:audit,error:e3}]=await Promise.all([
  supabase.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),
  supabase.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),
  supabase.from('liens_bibliques').select('segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),
])
if(e1||e2||e3) throw e1||e2||e3
if(liensApres!==LIENS.length||relusApres!==25||audit.some(l=>!l.canon_id||l.verset_v2_id||l.livre||l.chapitre||!l.motif||l.fiabilite!=='vérifié'||l.provenance!=='lecture'||l.arbitrage_requis)) throw new Error('Postcontrôle invalide')
const apres=audit.map(l=>`${l.segment_id}|${l.canon_id}|${l.type}`); if(new Set(apres).size!==apres.length) throw new Error('Doublon postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
