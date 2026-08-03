import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. I-X'
const EMPREINTE_ATTENDUE = '70f19a3b89f2b171407a4e7def63d1dc638936902e07f2b5daf48ed920d90d4f'
const QUESTIONS = ['Question I','Question II','Question III','Question IV','Question V','Question VI','Question VII','Question VIII','Question IX','Question X']
const SANS_LIEN = new Set()
const NON_RESOLUS = [
  [577, 4, 'RÉFÉRENCE NON BIBLIQUE (Père de l’Église) : renvoi d’Augustin à son traité Contre Fauste, livre 22, chapitre 60 et suivants ; cible de corpus à constituer.'],
]
// [segment_numero, canon_id, type, motif]
const LIENS = [
  [571,'EXO.1.19',1,'Citation intentionnelle vérifiée du mensonge des sages-femmes à Pharaon.'],[571,'EXO.1.19',3,'Question morale sur le mensonge des sages-femmes.'],[571,'EXO.1.20',1,'Référence intentionnelle vérifiée au bien accordé par Dieu aux sages-femmes.'],[571,'EXO.1.20',3,'La récompense divine pose la question de ce qui fut approuvé.'],
  [572,'EXO.1.19',3,'Le mensonge d’Exode 1,19 est distingué de l’acte de miséricorde.'],[572,'EXO.1.20',3,'Le bienfait divin est attribué à la miséricorde plutôt qu’au mensonge.'],
  [573,'REV.14.5',1,'Citation explicite vérifiée de l’absence de mensonge dans la bouche des saints.'],[573,'REV.14.5',3,'Apocalypse 14,5 interdit de prendre le mensonge des sages-femmes pour modèle.'],[573,'EXO.1.19',3,'Le mensonge des sages-femmes est confronté à la perfection des saints.'],
  [574,'EXO.1.19',3,'Le mensonge est replacé dans une conduite terrestre imparfaite.'],
  [575,'PHP.3.20',1,'Référence éditoriale vérifiée à la cité céleste des saints.'],[575,'PHP.3.20',3,'La vie céleste de Philippiens 3,20 commande une parole véridique.'],[575,'EXO.1.19',3,'L’exemple des sages-femmes n’est pas érigé en norme.'],
  [576,'EXO.2.12',1,'Référence intentionnelle vérifiée au meurtre de l’Égyptien par Moïse.'],[576,'EXO.2.12',3,'Question morale sur le droit et la faute de Moïse.'],
  [577,'EXO.2.12',3,'Le meurtre est jugé difficilement excusable sans autorité légitime.'],
  [578,'ACT.7.25',1,'Référence éditoriale corrigée et vérifiée : Moïse pensait que ses frères comprendraient sa mission.'],[578,'ACT.7.25',3,'Actes 7,25 suggère une autorisation divine déjà reçue.'],[578,'EXO.2.12',3,'Le silence de l’Exode est éclairé par le témoignage d’Étienne.'],
  [579,'EXO.3.4',1,'Citation explicite vérifiée de l’appel du Seigneur depuis le buisson.'],[579,'EXO.3.4',3,'Question christologique sur le Seigneur qui parle dans le buisson.'],[579,'ISA.9.5',1,'Citation explicite vérifiée d’Isaïe 9,5 selon la Septante : l’Ange du grand conseil.'],[579,'ISA.9.5',3,'Le titre septantant appuie l’identification possible au Christ.'],
  [580,'EXO.3.2',1,'Citation explicite vérifiée de l’ange du Seigneur apparu dans la flamme.'],[580,'EXO.3.2',3,'L’apparition angélique est confrontée à l’appel divin d’Exode 3,4.'],[580,'EXO.3.4',3,'Le Seigneur parlant est distingué ou identifié à l’ange apparu.'],
  [581,'EXO.3.8',1,'Citation explicite vérifiée de la terre bonne où coulent le lait et le miel.'],[581,'EXO.3.8',3,'Question sur le sens propre ou spirituel de la promesse.'],[582,'EXO.3.8',3,'La formule est interprétée comme éloge de la fécondité du pays.'],
  [583,'EXO.3.9',1,'Citation explicite vérifiée du cri d’Israël parvenu à Dieu.'],[583,'EXO.3.9',3,'Le cri d’Israël est distingué d’un cri d’iniquité.'],[583,'GEN.18.20',1,'Référence éditoriale vérifiée au cri de Sodome.'],[583,'GEN.18.20',3,'Genèse 18,20 fournit le contre-exemple d’une iniquité criante.'],
  [584,'EXO.3.22',1,'Citation intentionnelle vérifiée de l’ordre de prendre les biens égyptiens et de dépouiller l’Égypte.'],[584,'EXO.3.22',3,'Le commandement est défendu comme juste en raison de son auteur divin.'],[585,'EXO.3.22',3,'La justice du commandement relève de Dieu et l’obéissance du serviteur.'],
  [586,'EXO.4.10',1,'Citation explicite vérifiée de la difficulté de parole de Moïse demeurée depuis l’appel divin.'],[586,'EXO.4.10',3,'Moïse est interprété comme confiant que Dieu pouvait délier sa langue.'],[587,'EXO.4.10',3,'La parole divine est comprise comme capable de produire immédiatement l’éloquence.'],
  [588,'EXO.4.11',1,'Citation explicite vérifiée de Dieu faisant le muet, le sourd, le voyant et l’aveugle.'],[588,'EXO.4.11',3,'Question théologique sur la souveraineté divine envers les infirmités.'],
  [589,'JHN.9.39',1,'Citation explicite vérifiée du Christ venu faire voir les aveugles et aveugler ceux qui voient.'],[589,'JHN.9.39',3,'Jean 9,39 confirme la souveraineté affirmée dans l’Exode.'],[589,'EXO.4.11',3,'La parole évangélique éclaire Exode 4,11 sans accuser Dieu d’injustice.'],[590,'EXO.4.11',3,'La justice divine est affirmée comme règle d’interprétation du verset.'],
  [591,'EXO.4.12',1,'Citation explicite vérifiée de Dieu promettant d’être avec la bouche de Moïse et de l’instruire.'],[591,'EXO.4.12',3,'L’ouverture même de la bouche est attribuée à la grâce.'],
  [592,'EXO.4.12',3,'La double promesse d’assistance et d’enseignement est opposée à une initiative autonome.'],[592,'PSA.80.11',1,'Citation explicite vérifiée du Psaume 80,11 selon la numérotation grecque.'],[592,'PSA.80.11',3,'Le psaume distingue la volonté d’ouvrir la bouche et le don qui la remplit.'],
  [593,'PSA.80.11',3,'Le commencement de la volonté et l’œuvre de la grâce sont distingués dans le psaume.'],[593,'EXO.4.12',1,'Reprise explicite vérifiée de la promesse d’assistance et d’enseignement.'],[593,'EXO.4.12',3,'Exode 4,12 attribue aussi à Dieu le commencement de l’ouverture.'],
  [594,'EXO.4.14',1,'Citation explicite vérifiée de la colère du Seigneur contre Moïse.'],[594,'EXO.4.14',3,'La colère divine est interprétée sans trouble passionnel.'],
  [595,'EXO.4.14',3,'L’aide d’Aaron est examinée comme éventuelle conséquence de la défiance de Moïse.'],[595,'EXO.4.15',3,'L’assistance accordée aux deux frères est confrontée à la mission que Moïse aurait pu remplir seul.'],[595,'EXO.4.16',3,'La parole d’Aaron pour Moïse précise la répartition des fonctions.'],
  [596,'EXO.4.14',1,'Citation explicite vérifiée d’Aaron le Lévite capable de parler.'],[596,'EXO.4.14',3,'La faveur faite à Aaron n’est pas comprise comme vengeance divine.'],
  [597,'EXO.4.14',3,'La présence d’un frère éloquent aggrave plutôt l’excuse de Moïse.'],[597,'EXO.4.16',3,'La médiation d’Aaron devait être attendue de la providence divine.'],
  [598,'EXO.4.12',1,'Référence explicite vérifiée à la première promesse faite à la bouche de Moïse.'],[598,'EXO.4.15',1,'Citation explicite vérifiée de l’assistance promise aux bouches de Moïse et d’Aaron.'],[598,'EXO.4.15',3,'La seconde promesse confirme la première après la colère.'],[598,'EXO.4.16',1,'Citation explicite vérifiée d’Aaron parlant pour Moïse.'],[598,'EXO.4.16',3,'La fonction orale d’Aaron supplée la voix grêle de Moïse.'],
  [599,'EXO.4.15',1,'Citation explicite vérifiée de l’ordre de mettre les paroles de Dieu dans la bouche d’Aaron.'],[599,'EXO.4.15',3,'Moïse reçoit la charge de transmettre à Aaron les paroles à exprimer.'],
  [600,'EXO.4.16',1,'Citation explicite vérifiée d’Aaron comme bouche de Moïse devant le peuple.'],[600,'EXO.4.16',3,'La formule établit la primauté de Moïse et la seconde place d’Aaron.'],
]

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const {data:segmentsBruts,error:e0}=await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).gte('segment_numero',571).lte('segment_numero',600).order('segment_numero');if(e0)throw e0
// Filtre structurel exact appliqué après la sélection bornée : PostgREST ne
// normalise pas de façon fiable le « è » de « deuxième » selon le client.
const segments=segmentsBruts.filter(s=>s.ref_niv1==='Livre deuxième'&&QUESTIONS.includes(s.ref_niv2))
if(segments.length!==30||segments[0]?.segment_numero!==571||segments.at(-1)?.segment_numero!==600||segments.some((s,i)=>s.segment_numero!==571+i))throw Error('Préétat structurel invalide')
if(segments.some(s=>s.ref_niv1!=='Livre deuxième'||!QUESTIONS.includes(s.ref_niv2))||[...new Set(segments.map(s=>s.ref_niv2))].join('|')!==QUESTIONS.join('|'))throw Error('Fuite structurelle ou questions incomplètes')
if(segments.some(s=>s.liens_revus_le||s.liens_revus_par))throw Error('Segment déjà relu')
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Empreinte modifiée ${empreinte}`)
const pn=new Map(segments.map(s=>[s.segment_numero,s])),num=new Set([...LIENS,...NON_RESOLUS].map(x=>x[0]));const nc=segments.filter(s=>!num.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nc.length)throw Error(`Non classés ${nc.map(x=>x.segment_numero)}`)
if([...SANS_LIEN].some(n=>num.has(n)||!pn.has(n))||LIENS.some(([n,c,t,m])=>!pn.has(n)||!c||![1,2,3,4].includes(t)||!m.trim())||NON_RESOLUS.some(([n,t,m])=>!pn.has(n)||![1,2,3,4].includes(t)||!m.startsWith('RÉFÉRENCE NON BIBLIQUE')))throw Error('Manifeste invalide')
const keys=LIENS.map(x=>`${x[0]}|${x[1]}|${x[2]}`);if(new Set(keys).size!==keys.length)throw Error('Doublon interne')
const cibles=[...new Set(LIENS.map(x=>x[1]))],{data:vv,error:e1}=await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset',cibles);if(e1)throw e1;const vm=new Map(vv.map(v=>[v.id_verset,v]));const abs=cibles.filter(c=>!vm.has(c));if(abs.length)throw Error(`Cibles absentes ${abs}`)
const ids=segments.map(s=>s.id),{count:ex,error:e2}=await sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids);if(e2)throw e2;if(ex)throw Error(`${ex} liens existants`)
const total=LIENS.length+NON_RESOLUS.length,types=[...LIENS,...NON_RESOLUS].reduce((a,x)=>{const t=x.length===4?x[2]:x[1];a[t]=(a[t]||0)+1;return a},{});console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Exode I-X',bornes:[571,600],segments:30,liens:total,sans_cible_a_constituer:NON_RESOLUS.length,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,empreinte,avancement_actuel:'16,83 %'},null,2))
if(DETAIL){for(const[n,c,t,m]of LIENS)console.log({n,c,t,m,segment:pn.get(n).segment_texte,temoin:vm.get(c).TR0003||vm.get(c).TR0001||vm.get(c).TR0004});for(const[n,t,m]of NON_RESOLUS)console.log({n,t,m,fiabilite:'à constituer'})}if(!WRITE)process.exit(0)
const q=v=>`'${String(v).replaceAll("'","''")}'`
const valeurs=[...LIENS.map(([n,c,t,m])=>`(${pn.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),...NON_RESOLUS.map(([n,t,m])=>`(${pn.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`)].join(',\n    ')
const idSql=ids.join(', ')
const sql=`do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> 30 then raise exception 'Segments %/30', n; end if;
end $passe$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:la,error:ea},{count:ra,error:eb},{data:aud,error:ec}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids)]);if(ea||eb||ec)throw(ea||eb||ec);if(la!==total||ra!==30||aud.some(x=>!x.motif||x.provenance!=='lecture'||(x.canon_id?(x.fiabilite!=='vérifié'||x.arbitrage_requis):(x.verset_v2_id||x.livre||x.chapitre||x.fiabilite!=='à constituer'||!x.arbitrage_requis||!x.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))))throw Error('Postcontrôle invalide');console.log(`✓ ${la} liens, ${ra} segments`)
