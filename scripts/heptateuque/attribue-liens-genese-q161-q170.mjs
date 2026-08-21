import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const OEUVRE='A0010O0023', WRITE=process.argv.includes('--write')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Genèse Q. CLXI-CLXX'
const EMPREINTE_ATTENDUE='cb72a6d43978139b8c8ff2532aee0916b5e93d298df78f6c1e9bb9bfeaf88393'
const QUESTIONS=['Question CLXI','Question CLXII','Question CLXIII','Question CLXIV','Question CLXV','Question CLXVI','Question CLXVII','Question CLXVIII','Question CLXIX','Question CLXX']
const SANS_LIEN=new Set(), NON_RESOLUS=[], LIENS=[]
const add=(n,c,t,m)=>LIENS.push([n,c,t,m]); const many=(n,cs,ts,m)=>{for(const c of cs)for(const t of ts)add(n,c,t,`${m} (${c}).`)}

many(513,['GEN.47.29'],[1,3],'Citation et commentaire du serment demandé par Jacob pour sa sépulture')
many(513,['GEN.24.2'],[1,3],'Le serment d’Abraham par la main sous la cuisse est intentionnellement comparé')
many(514,['PSA.24.10'],[1,3],'Citation vérifiée de toutes les voies du Seigneur comme miséricorde et vérité')
many(514,['GEN.47.29'],[3],'Miséricorde et vérité du serment de Joseph sont expliquées par le psaume')
many(515,['GEN.24.49','GEN.47.29'],[1,3],'Les deux formules miséricorde-justice et miséricorde-vérité sont citées et comparées')
for(const n of [516,517,520,521]) many(n,['GEN.47.29'],[3],'La demande de sépulture en Chanaan reçoit une interprétation prophétique')
many(517,['NUM.19.11','NUM.19.12','NUM.19.13'],[3],'La souillure légale par contact d’un mort fonde la figure du péché')
many(518,['SIR.34.30','SIR.34.31'],[1,3],'Citation du lavage après contact d’un mort et du jeûne suivi d’une rechute')
many(519,['PSA.31.1'],[1,3],'Citation vérifiée des iniquités remises et des péchés couverts')
many(519,['GEN.47.29'],[3],'La sépulture demandée par Jacob est interprétée comme figure de la rémission')
many(520,['LUK.3.23'],[3],'L’âge d’environ trente ans au baptême du Christ éclaire le symbolisme des trente milles')

for(const n of [522,526,527]) many(n,['GEN.47.31'],[1,3],'La leçon de la verge ou du chevet dans l’adoration de Jacob est citée puis expliquée')
for(const n of [523,524,525,528]) many(n,['GEN.47.31'],[3],'Examen philologique et interprétatif de l’adoration de Jacob, cible corrigée depuis 47,21')

many(529,['GEN.48.4'],[1,3],'Citation et interprétation spirituelle de la multitude de peuples promise à Jacob')
many(530,['GEN.48.5','GEN.48.6'],[1,3],'Citation intégrale du statut d’Éphraïm, Manassé et des enfants ultérieurs de Joseph')
for(const n of [531,532,533]) many(n,['GEN.48.5','GEN.48.6'],[3],'L’ordre grammatical et le partage tribal des fils de Joseph sont expliqués')

many(534,['GEN.48.7'],[1,3],'Référence au lieu et aux circonstances de la sépulture de Rachel')
many(535,['GEN.48.7','GEN.35.19','MAT.2.1'],[3],'La sépulture près de Bethléem est interprétée par la naissance future du Christ')

many(536,['GEN.48.14','GEN.48.19','GEN.25.23'],[1,3],'Le geste, la bénédiction du cadet et le parallèle avec Jacob et Ésaü sont cités et interprétés')
many(537,['GEN.48.14','GEN.48.19','GEN.25.23'],[3],'La préférence du cadet figure le peuple spirituel surpassant le peuple selon la chair')

many(538,['GEN.48.22','GEN.33.19'],[1,3],'Le don de Sichem par conquête est confronté à son achat antérieur')
many(539,['GEN.34.25'],[1,3],'La prise sanglante de Sichem par les fils de Jacob est intentionnellement rappelée')
many(539,['GEN.48.22'],[3],'La conquête des fils est examinée comme explication possible du don de Sichem')
many(540,['GEN.49.6'],[1,3],'Le blâme de Jacob contre la violence de ses fils est intentionnellement rappelé')
many(540,['GEN.48.22','GEN.34.25'],[3],'Le don de Sichem est confronté au déplaisir causé par la conquête')
many(541,['GEN.48.22'],[3],'Sichem donnée à Joseph reçoit une interprétation christologique et missionnaire')
many(541,['GEN.35.2','GEN.35.3','GEN.35.4'],[2,3],'L’abandon et l’enfouissement des dieux étrangers à Sichem sont repris et interprétés')

many(542,['GEN.49.33'],[1,3],'Citation et question sur Jacob réuni à son peuple, cible corrigée depuis 49,32')
many(543,['GEN.49.33'],[3],'La notion de peuple antérieur à Israël est examinée')
many(544,['HEB.12.22'],[1,3],'Citation de Sion, Jérusalem céleste et des milliers d’anges')
many(544,['GEN.49.33'],[3],'La cité céleste est proposée comme le peuple auquel Jacob est réuni')
many(545,['SIR.11.28'],[1,3],'Citation vérifiée de ne louer personne avant sa mort, malgré la note 11,30')
many(545,['GEN.49.33'],[3],'La réunion au peuple est située au terme d’une vie trouvée agréable à Dieu')

many(546,['GEN.50.3'],[1,3],'Les quarante jours des funérailles de Jacob sont interprétés comme figure de pénitence')
many(546,['EXO.34.28','1KI.19.8','MAT.4.2'],[1,3],'Les jeûnes de quarante jours de Moïse, Élie et du Christ fondent le parallèle')
many(547,['JON.3.4'],[1,3],'Citation hébraïque vérifiée des quarante jours avant la destruction de Ninive')
many(547,['GEN.50.3'],[3],'Les quarante jours de Ninive éclairent le symbolisme pénitentiel des funérailles')
many(548,['ACT.1.3'],[1,3],'Référence intentionnelle aux quarante jours du Christ ressuscité avec les disciples')
many(548,['GEN.50.3'],[3],'La joie pascale empêche de réduire le nombre quarante à la pénitence')
many(549,['JON.3.4'],[1,3],'La variante septantiste des trois jours est confrontée aux quarante jours hébreux')
many(550,['JON.3.4'],[3],'Les trois jours de la Septante reçoivent une interprétation christologique')
many(550,['ROM.4.25'],[1,3],'Citation de la livraison pour les péchés et de la résurrection pour la justification')
many(551,['JHN.20.22'],[1,3],'Le don de l’Esprit après la résurrection est intentionnellement rappelé')
many(551,['ACT.1.9'],[1,3],'L’Ascension précède le second don de l’Esprit')
many(551,['ACT.2.2','ACT.2.3','ACT.2.4'],[1,3],'Le don de l’Esprit à la Pentecôte est cité selon toutes ses étapes effectives')
many(552,['JON.3.4','ACT.1.3','ACT.1.9'],[3],'Les trois et quarante jours sont rapportés à la résurrection et à l’Ascension')
many(552,['1CO.15.4'],[2,3],'Le troisième jour de la résurrection est repris dans l’interprétation prophétique')
many(553,['JON.3.4'],[3],'Les leçons hébraïque et septantiste sont maintenues ensemble sans déclarer l’une fautive')

many(554,['GEN.50.5'],[1,3],'Citation de Joseph rapportant le serment relatif au sépulcre préparé en Chanaan')
many(554,['GEN.47.29'],[3],'La parole rapportée à Pharaon est confrontée à la demande antérieure de Jacob')
for(const n of [555,556]) many(n,['GEN.50.5','GEN.47.29'],[3],'La vérité du récit est expliquée par l’accord du sens plutôt que par l’identité verbale')

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const {data:segments,error}=await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1','Livre premier').in('ref_niv2',QUESTIONS).order('segment_numero');if(error)throw error
if(segments.length!==44||segments[0]?.segment_numero!==513||segments.at(-1)?.segment_numero!==556)throw new Error('Préétat : lot inattendu')
if(segments.some((s,i)=>s.segment_numero!==513+i||s.ref_niv1!=='Livre premier'||!QUESTIONS.includes(s.ref_niv2)))throw new Error('Préétat structurel invalide')
if(new Set(segments.map(s=>s.ref_niv2)).size!==10||segments.some(s=>s.liens_revus_le||s.liens_revus_par))throw new Error('Questions incomplètes ou déjà relues')
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(empreinte!==EMPREINTE_ATTENDUE)throw new Error(`Préétat modifié ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s])), numeros=new Set([...LIENS,...NON_RESOLUS].map(([n])=>n));const nonClasses=segments.filter(s=>!numeros.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nonClasses.length)throw new Error(`Partition ${nonClasses.map(s=>s.segment_numero)}`)
if([...SANS_LIEN].some(n=>numeros.has(n)||!parNumero.has(n))||LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m))throw new Error('Manifeste invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw new Error('Doublon interne')
const cibles=[...new Set(LIENS.map(([,c])=>c))];const {data:temoins,error:e2}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(e2)throw e2
const pm=new Map(temoins.map(t=>[t.id_verset,t]));const abs=cibles.filter(c=>!pm.has(c));if(abs.length||cibles.some(c=>{const t=pm.get(c);return !t.TR0001&&!t.TR0003&&!t.TR0004}))throw new Error(`Cibles invalides ${abs}`)
const ids=segments.map(s=>s.id);const {count:existants,error:e3}=await sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids);if(e3)throw e3;if(existants)throw new Error(`${existants} liens existent`)
const types=LIENS.reduce((a,[,,t])=>({...a,[t]:(a[t]??0)+1}),{});console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Genèse CLXI-CLXX',bornes:[513,556],segments:44,liens:LIENS.length,sans_lien:[...SANS_LIEN],sans_cible_a_constituer:0,cibles_distinctes:cibles.length,types,empreinte},null,2));if(!WRITE)process.exit(0)
const q=v=>`'${String(v).replaceAll("'","''")}'`;const valeurs=LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${q(c)},${t},'vérifié',${q(m)},'lecture',false)`).join(',\n')
const sql=`do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id in (${ids})) then raise exception 'Liens présents'; end if; if exists(select 1 from segments where id in (${ids}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %',n; end if; update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${ids}); get diagnostics n=row_count; if n<>44 then raise exception 'Segments %',n; end if; end $p$;`;const{error:e4}=await sb.rpc('exec_sql',{sql});if(e4)throw e4
const[{count:la,error:a},{count:ra,error:b},{data:aud,error:c}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids)]);if(a||b||c)throw a||b||c;if(la!==LIENS.length||ra!==44||aud.some(l=>!l.canon_id||!l.motif||l.fiabilite!=='vérifié'||l.provenance!=='lecture'||l.arbitrage_requis))throw new Error('Postcontrôle invalide');const ka=aud.map(l=>`${l.segment_id}|${l.canon_id}|${l.type}`);if(new Set(ka).size!==ka.length)throw new Error('Doublon postétat');console.log(`✓ ${la} liens ; ${ra} segments relus`)
