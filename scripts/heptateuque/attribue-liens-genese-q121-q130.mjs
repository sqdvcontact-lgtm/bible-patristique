import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Genèse Q. CXXI-CXXX'
const EMPREINTE_ATTENDUE = 'd812f50b5ab7157d2eed1cf46c14e4cd0b408b969d956da52a22ec708c1b58e3'
const QUESTIONS = ['Question CXXI','Question CXXII','Question CXXIII','Question CXXIV','Question CXXV','Question CXXVI','Question CXXVII','Question CXXVIII','Question CXXIX','Question CXXX']
const SANS_LIEN = new Set()
const NON_RESOLUS = []
const LIENS = []
const add = (numero, canon, type, motif) => LIENS.push([numero, canon, type, motif])
const addMany = (numero, canons, types, motif) => {
  for (const canon of canons) for (const type of types) add(numero, canon, type, `${motif} (${canon}).`)
}
const range = (livre, chapitre, debut, fin) => Array.from({ length: fin - debut + 1 }, (_, i) => `${livre}.${chapitre}.${debut + i}`)
const ROIS_EDOM = range('GEN', 36, 31, 39)
const MAT_GENEALOGIE = range('MAT', 1, 1, 17)
const LUC_ABRAHAM_JOSEPH = range('LUK', 3, 23, 34)
const JUDA_MARIAGES = [...range('GEN', 38, 1, 3), ...range('GEN', 38, 6, 11)]
const JUDA_THAMAR = [...range('GEN', 38, 14, 18), 'GEN.38.26']

addMany(376, ['GEN.36.31'], [1,3], 'Citation et commentaire de l’annonce des rois d’Edom avant la royauté d’Israël')
addMany(376, ['GEN.36.32'], [3], 'Le premier roi nommé ouvre la délimitation historique de la liste')
addMany(377, ROIS_EDOM, [3], 'La liste des rois est bornée par la vie de Moïse et non par l’avènement de Saül')
addMany(378, ['GEN.36.32','GEN.36.33'], [2,3], 'La succession de Béla et Jobab est reprise et confrontée aux générations issues d’Ésaü')
addMany(379, ROIS_EDOM, [3], 'Le nombre des successions royales est expliqué par une mortalité plus rapide')
addMany(380, MAT_GENEALOGIE, [1,3], 'La généalogie matthéenne entière participe au compte comparé des générations d’Abraham à Joseph')
addMany(380, LUC_ABRAHAM_JOSEPH, [1,3], 'La section lucanienne de Joseph à Abraham participe au compte comparé des générations')
addMany(381, MAT_GENEALOGIE, [3], 'Conclusion sur la différence de longueur entre les deux lignées généalogiques')
addMany(381, LUC_ABRAHAM_JOSEPH, [3], 'Conclusion sur la différence de longueur entre les deux lignées généalogiques')
addMany(382, ['GEN.36.32'], [3], 'Le Béla fils de Béor d’Édom est distingué de Balac et Balaam')
addMany(382, ['NUM.22.2','NUM.22.4','NUM.22.5','NUM.22.6'], [1,3], 'Le récit de Balac fils de Séphor appelant Balaam fils de Béor est intentionnellement rappelé')

addMany(383, ['GEN.35.29','GEN.37.2'], [3], 'La mort d’Isaac est confrontée à l’âge de dix-sept ans donné ensuite à Joseph')
addMany(384, ['GEN.35.29','GEN.37.2'], [3], 'Le calcul provisoire suppose à tort que les deux événements sont successifs')
addMany(385, ['GEN.25.26','GEN.35.28','GEN.35.29','GEN.37.2'], [1,3], 'Les âges d’Isaac, Jacob et Joseph sont explicitement mobilisés dans le calcul')
addMany(386, ['GEN.41.46','GEN.41.53','GEN.45.6'], [1,3], 'L’âge de Joseph devant Pharaon, les sept années d’abondance et les deux années de famine composent le calcul')
addMany(387, ['GEN.47.9'], [1,3], 'Citation et commentaire de l’âge de cent trente ans déclaré par Jacob à Pharaon')
addMany(387, ['GEN.37.2','GEN.41.46','GEN.45.6'], [3], 'Les autres âges scripturaires sont confrontés à Genèse 47,9')
addMany(388, ['GEN.37.2','GEN.41.46','GEN.45.6','GEN.47.9'], [3], 'La contradiction arithmétique apparente est formulée à partir des quatre données')
addMany(389, ['GEN.37.2','GEN.37.28'], [1,3], 'L’âge de Joseph et sa vente en Égypte sont intentionnellement rappelés')
addMany(389, ['GEN.47.9'], [3], 'L’âge de Jacob en Égypte rend impossible la lecture strictement successive du récit')
addMany(390, ['GEN.35.28','GEN.35.29'], [1,3], 'La mort d’Isaac à cent quatre-vingts ans est explicitement rappelée')
addMany(390, ['GEN.36.31'], [3], 'La liste d’Édom intercalée après la mort d’Isaac explique l’illusion chronologique')
addMany(391, ['GEN.37.1','GEN.37.2'], [1,3], 'La citation du séjour de Jacob et de Joseph âgé de dix-sept ans est vérifiée malgré la note fautive')
addMany(392, ['GEN.37.5','GEN.37.8','GEN.37.11','GEN.37.28'], [1,3], 'Les songes, la haine fraternelle et la vente de Joseph sont intentionnellement résumés')
for (const n of [393,395]) addMany(n, ['GEN.37.2','GEN.41.46','GEN.45.6','GEN.47.9'], [3], 'Le calcul chronologique reprend les âges de Joseph et Jacob et la durée avant leur réunion')
addMany(394, ['GEN.35.29','GEN.37.2','GEN.41.46','GEN.45.6','GEN.47.9'], [3], 'La solution place la vente de Joseph douze ans avant la mort d’Isaac')
addMany(396, ['GEN.35.29','GEN.37.2'], [3], 'La récapitulation finale distingue l’ordre du récit de l’ordre réel des événements')

addMany(397, ['GEN.37.10'], [1,3], 'Citation et question sur le songe où père, mère et frères se prosternent devant Joseph')
addMany(398, ['GEN.37.10'], [3], 'L’accomplissement littéral du songe en Égypte est écarté')
addMany(399, ['GEN.37.10'], [3], 'Le songe de Joseph reçoit une interprétation christologique')
addMany(399, ['PHP.2.9','PHP.2.10'], [1,3], 'La citation paulinienne du nom exalté et de tout genou fléchi fonde cette interprétation')

addMany(400, ['GEN.37.28'], [1,3], 'La désignation des marchands comme Ismaélites et Madianites est examinée')
addMany(400, ['GEN.16.15','GEN.25.2'], [3], 'Les descendances d’Ismaël par Agar et de Madian par Céthura sont comparées')
addMany(401, ['GEN.25.6'], [1,3], 'La séparation commune des fils des concubines vers l’Orient explique leur rapprochement national')
addMany(401, ['GEN.37.28'], [3], 'Genèse 25,6 sert à expliquer la double désignation des vendeurs de Joseph')

addMany(402, ['GEN.37.35'], [1,3], 'Citation et commentaire des fils et filles venus consoler Jacob')
addMany(403, ['GEN.37.35'], [1,3], 'Citation et question sur la descente de Jacob aux enfers avec son fils')
addMany(404, ['GEN.37.35'], [3], 'Le sens du séjour des morts est discuté à partir des paroles de Jacob')

addMany(405, ['GEN.37.36'], [1,3], 'Citation et examen du titre de Pétéphrès, chef des cuisiniers ou de la milice')
addMany(405, ['2KI.25.8'], [3], 'Le titre analogue de l’officier de Nabuchodonosor éclaire le sens militaire du terme')

addMany(406, range('GEN',38,1,3), [1,3], 'Citation et ouverture de la question chronologique sur le mariage de Juda et ses premiers enfants')
addMany(407, JUDA_MARIAGES, [3], 'La croissance et le mariage des fils de Juda sont confrontés aux vingt-deux années disponibles')
addMany(408, [...range('GEN',38,6,11), ...range('GEN',38,14,18)], [2,3], 'La mort des fils, l’attente de Séla et la conduite de Thamar sont reprises puis commentées')
addMany(409, [...JUDA_MARIAGES, ...JUDA_THAMAR], [3], 'La reprise narrative est proposée pour résoudre l’impossibilité chronologique apparente')
addMany(410, ['GEN.37.2','GEN.41.46'], [1,3], 'Les âges de Joseph à sa vente et devant Pharaon bornent la chronologie de Juda')
addMany(411, ['GEN.37.2','GEN.41.46','GEN.41.53','GEN.45.6'], [3], 'Les treize années, l’abondance et la famine composent l’intervalle de vingt-deux ans')
addMany(412, [...JUDA_MARIAGES, ...JUDA_THAMAR], [3], 'Toutes les étapes familiales de Juda sont confrontées à l’intervalle calculé')
addMany(413, [...range('GEN',38,1,3), 'GEN.37.28'], [3], 'La solution suppose le mariage précoce de Juda antérieur à la vente de Joseph')

addMany(414, ['GEN.38.14'], [1,3], 'Citation et déduction sur les vêtements propres aux veuves au temps des Patriarches')
addMany(415, ['GEN.39.1'], [1,3], 'Citation et commentaire de la reprise du récit de Joseph conduit en Égypte')
addMany(415, ['GEN.37.36'], [3], 'Le premier récit de la vente à Pétéphrès est rapproché de la reprise de Genèse 39,1')

const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error: erreurSegments } = await supabase.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1','Livre premier').in('ref_niv2',QUESTIONS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length!==40 || segments[0]?.segment_numero!==376 || segments.at(-1)?.segment_numero!==415) throw new Error('Préétat : lot inattendu')
if (segments.some((s,i)=>s.segment_numero!==376+i || s.ref_niv1!=='Livre premier' || !QUESTIONS.includes(s.ref_niv2))) throw new Error('Préétat structurel invalide')
if (new Set(segments.map(s=>s.ref_niv2)).size!==10) throw new Error('Préétat : questions incomplètes')
if (segments.some(s=>s.liens_revus_le||s.liens_revus_par)) throw new Error('Préétat : segment déjà relu')
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex')
if (empreinte!==EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s]))
const numerosLies=new Set([...LIENS,...NON_RESOLUS].map(([n])=>n))
const nonClasses=segments.filter(s=>!numerosLies.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero))
if(nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map(s=>s.segment_numero)}`)
if([...SANS_LIEN].some(n=>numerosLies.has(n)||!parNumero.has(n))) throw new Error('SANS_LIEN incohérent')
if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m)) throw new Error('Manifeste invalide')
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
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Genèse CXXI-CXXX',bornes:[376,415],segments:40,liens:LIENS.length,sans_lien:[...SANS_LIEN],sans_cible_a_constituer:0,cibles_distinctes:cibles.length,types,empreinte},null,2))
if(!WRITE) process.exit(0)
const q=v=>`'${String(v).replaceAll("'","''")}'`
const valeurs=LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${q(c)},${t},'vérifié',${q(m)},'lecture',false)`).join(',\n')
const sql=`do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id in (${ids})) then raise exception 'Liens déjà présents'; end if; if exists(select 1 from segments where id in (${ids}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %',n; end if; update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${ids}); get diagnostics n=row_count; if n<>40 then raise exception 'Segments %',n; end if; end $p$;`
const { error: erreurEcriture }=await supabase.rpc('exec_sql',{sql}); if(erreurEcriture) throw erreurEcriture
const [{count:liensApres,error:e1},{count:relusApres,error:e2},{data:audit,error:e3}]=await Promise.all([supabase.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),supabase.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),supabase.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids)])
if(e1||e2||e3) throw e1||e2||e3
if(liensApres!==LIENS.length||relusApres!==40||audit.some(l=>!l.canon_id||!l.motif||l.fiabilite!=='vérifié'||l.provenance!=='lecture'||l.arbitrage_requis)) throw new Error('Postcontrôle invalide')
const apres=audit.map(l=>`${l.segment_id}|${l.canon_id}|${l.type}`); if(new Set(apres).size!==apres.length) throw new Error('Doublon postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
