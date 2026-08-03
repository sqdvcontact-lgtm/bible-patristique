import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023', PREMIER = 1780, DERNIER = 1844
const WRITE = process.argv.includes('--write'), DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. LI-LX'
const EMPREINTE_ATTENDUE = '2e1ef6bc6e98091a293328ec1fd6e60f10dc1d4f78a73418cb6da40ee1d9cf34'
const QUESTIONS = ['Question LI','Question LII','Question LIII','Question LIV','Question LV','Question LVI','Question LVII','Question LVIII','Question LIX','Question LX']
const LIENS = [], SANS_LIEN = new Set(), NON_RESOLUS = []
const CORRECTIONS_NOTES = new Map([[1817, ['[[466]] Luc. XVI, 23', '[[466]] Luc. XVI, 22']]])
const add=(ns,c,t,m)=>{for(const n of ns)LIENS.push([n,c,t,m])},cite=(n,c,m)=>add([n],c,1,m),com=(ns,c,m)=>add(ns,c,3,m),allusion=(ns,c,m)=>add(ns,c,2,m),nonBiblique=(n,m)=>NON_RESOLUS.push([n,4,`RÉFÉRENCE NON BIBLIQUE (${m})`])

// LI — sens large du « vase » de peau.
cite(1780,'LEV.13.49','Référence intentionnelle vérifiée à tout objet fait de peau atteint par une plaie verdâtre ou rougeâtre.')
com([1780,1781],'LEV.13.49','Le terme grec générique pour l’ustensile ou vase fait de peau est directement expliqué.')

// LII — contact d’un homme atteint de gonorrhée.
cite(1782,'LEV.15.11','Citation explicite vérifiée du contact avant lavage des mains et des ablutions imposées à la personne touchée.')
com([1782,1783],'LEV.15.11','La portée grammaticale de « n’a pas lavé ses mains » est résolue par rapport au malade qui touche autrui.')

// LIII-LIV — expiation du sanctuaire et lectures de τὸ ἅγιον.
cite(1784,'LEV.16.16','Citation explicite vérifiée de l’expiation du sanctuaire à cause des impuretés et péchés d’Israël.')
com([1784,1785,1786,1787,1788,1789],'LEV.16.16','La formule traduite « il priera pour les saints » est analysée à partir de l’expiation du sanctuaire et des souillures d’Israël.')
cite(1790,'PSA.102.3','Citation explicite vérifiée de Dieu qui se montre propice et pardonne toutes les iniquités.')
com([1790],'LEV.16.16','La propitiation demandée même pour les saints est rattachée au rite d’expiation du sanctuaire.')
com([1791,1792,1793,1794,1795,1796],'LEV.16.16','Les variantes grecques « le saint », « pour les saints » et « choses saintes » sont confrontées au sanctuaire et au tabernacle souillés.')
cite(1796,'LEV.16.16','Citation explicite vérifiée de la même expiation accomplie pour la tente de réunion au milieu des impuretés du peuple.')
cite(1797,'LEV.16.19','Référence éditoriale vérifiée à l’aspersion qui purifie et sanctifie l’autel des souillures d’Israël.')
cite(1798,'LEV.16.20','Citation explicite vérifiée de l’achèvement de l’expiation du sanctuaire, de la tente et de l’autel.')
com([1798,1799],'LEV.16.20','Le neutre grec est discuté entre l’achèvement des fonctions saintes et la prière adressée au Saint.')

// LV — deux boucs et expiation annuelle du sanctuaire.
com([1800],'LEV.16.7','Les deux boucs placés ensemble devant le Seigneur ouvrent la distinction discutée.')
com([1800],'LEV.16.8','Les sorts pour le Seigneur et pour Azazel fondent l’opposition des deux boucs.')
com([1800],'LEV.16.9','Le bouc immolé comme sacrifice pour le péché est le premier terme de la comparaison.')
com([1800],'LEV.16.10','Le bouc vivant envoyé au désert est le second terme de la comparaison.')
nonBiblique(1800,'attribution anonyme — quelques interprètes sur le sens des deux boucs')
cite(1801,'LEV.16.26','Référence intentionnelle vérifiée au lavage de celui qui a conduit le bouc pour Azazel dans le désert.')
com([1801],'LEV.16.21','Les iniquités confessées sur la tête du bouc expliquent l’opinion qu’Augustin refuse de déduire de la seule ablution.')
com([1801],'LEV.16.22','Le bouc emportant les iniquités dans une terre inhabitée est le rite discuté.')
cite(1802,'LEV.16.27','Référence intentionnelle vérifiée au taureau et au bouc pour le péché brûlés hors du camp.')
cite(1802,'LEV.16.28','Référence intentionnelle vérifiée à l’ablution identique imposée à celui qui brûle leurs chairs.')
com([1802],'LEV.16.15','Le sang du bouc immolé porté au-delà du voile participe à l’aspersion du sanctuaire évoquée.')
cite(1803,'LEV.16.29','Référence intentionnelle vérifiée au dixième jour du septième mois fixé pour le repos solennel et l’expiation.')
cite(1803,'LEV.16.32','Référence intentionnelle vérifiée au grand prêtre oint et installé pour succéder à son père.')
cite(1803,'LEV.16.33','Citation explicite vérifiée de l’expiation accomplie pour le sanctuaire de sainteté.')
com([1804,1805,1806,1807],'LEV.16.33','Le « Saint du Saint », le tabernacle, l’autel, les prêtres et le peuple sont expliqués comme objets de purification par la prière.')

// LVI — unité du lieu sacrificiel, Jéroboam, Élie et Abraham.
cite(1808,'LEV.17.3','Citation explicite vérifiée de l’abattage d’un bœuf, d’une brebis ou d’une chèvre dans ou hors du camp.')
cite(1808,'LEV.17.4','Citation explicite vérifiée de l’obligation d’apporter la victime à l’entrée de la tente de réunion.')
com([1808,1809],'LEV.17.5','Les victimes doivent être amenées au prêtre devant le Seigneur plutôt qu’immolées dans la campagne.')
com([1809],'LEV.17.7','La centralisation du sacrifice prévient les sacrifices idolâtriques auxquels le peuple était porté.')
com([1810],'LEV.17.4','L’interdiction d’offrir hors du tabernacle puis hors du temple sert de norme au jugement de Jéroboam.')
cite(1810,'1KI.12.25','Référence éditoriale résolue au début du récit de Jéroboam établissant son pouvoir hors de Jérusalem.')
cite(1810,'1KI.12.27','Référence éditoriale vérifiée à la crainte de Jéroboam de voir le peuple retourner à Jérusalem pour sacrifier.')
cite(1810,'1KI.12.28','Référence éditoriale vérifiée à la fabrication des deux veaux d’or pour détourner le peuple de Jérusalem.')
cite(1810,'1KI.12.29','Référence éditoriale vérifiée à l’installation des veaux à Béthel et à Dan.')
cite(1810,'1KI.12.30','Référence éditoriale vérifiée au péché causé par le culte rendu aux veaux.')
cite(1811,'1KI.18.36','Référence éditoriale vérifiée à Élie déclarant avoir agi sur la parole de Dieu lors du sacrifice du Carmel.')
cite(1811,'1KI.18.38','Référence éditoriale vérifiée au feu céleste consumant l’holocauste d’Élie.')
cite(1811,'1KI.18.39','Référence éditoriale vérifiée au peuple reconnaissant le vrai Dieu contre les faux prophètes.')
cite(1811,'GEN.22.3','Référence éditoriale vérifiée à Abraham partant offrir Isaac sur l’ordre reçu de Dieu.')
cite(1811,'GEN.22.9','Référence éditoriale vérifiée à Isaac lié et placé sur l’autel.')
cite(1811,'GEN.22.10','Référence éditoriale vérifiée au geste d’Abraham prêt à immoler son fils.')
com([1812],'1KI.18.36','Élie affirme avoir accompli le sacrifice exceptionnel sur la parole même de Dieu, auteur de la loi.')

// LVII — le sang appelé âme, figure du sacrifice du Christ.
cite(1813,'LEV.17.10','Citation explicite vérifiée de la sanction contre celui qui mange le sang.')
cite(1813,'LEV.17.11','Citation explicite vérifiée de l’âme de la chair dans le sang et de sa fonction expiatoire à l’autel.')
cite(1814,'LEV.17.11','Citation explicite vérifiée de l’âme de toute chair identifiée à son sang dans la version commentée.')
cite(1814,'LEV.17.12','Citation explicite vérifiée de l’interdiction faite à toute âme d’Israël de manger du sang.')
com([1815,1816],'LEV.17.11','La formule « âme de toute chair » est interprétée comme la vie corporelle soutenue par le sang, non comme l’âme immortelle.')
cite(1817,'LUK.16.22','Référence éditoriale corrigée d’après le fac-similé aux anges portant Lazare dans le sein d’Abraham.')
cite(1817,'LUK.23.43','Citation explicite vérifiée de la promesse faite au bon larron d’être au paradis avec le Christ.')
cite(1817,'LUK.16.23','Référence éditoriale vérifiée à l’âme du riche en proie aux tourments de l’enfer.')
cite(1818,'ACT.20.24','Citation explicite vérifiée de Paul ne tenant pas sa vie pour plus précieuse que lui-même afin d’achever sa course.')
com([1818,1819],'LEV.17.11','Le mot âme est pris pour la vie corporelle et temporelle dont le sang est le siège principal.')
cite(1820,'LEV.17.11','Citation explicite vérifiée du sang donné sur l’autel pour faire expiation pour les âmes.')
allusion([1821],'HEB.10.4','Attribution explicite à l’Épître aux Hébreux de l’impuissance du sang des anciennes victimes à enlever les péchés.')
cite(1822,'HEB.10.4','Citation explicite vérifiée de l’impossibilité que le sang des taureaux et des boucs enlève les péchés.')
com([1822],'LEV.17.11','Le sang animal faisant expiation est expliqué comme figure du Médiateur qui intercède pour l’âme.')
cite(1823,'GEN.41.26','Citation explicite vérifiée des sept vaches et des sept épis appelés sept années parce qu’ils les signifient.')
cite(1824,'1CO.10.4','Citation explicite vérifiée de la pierre appelée le Christ parce qu’elle en était la figure.')
com([1825,1826,1827],'LEV.17.11','Le sang reçoit symboliquement le nom d’âme comme contenant et soutien de la vie corporelle, sans être l’âme rationnelle.')
cite(1828,'EPH.5.27','Citation explicite vérifiée de l’Église glorieuse que le Christ se donne à lui-même.')
cite(1829,'1CO.11.22','Citation explicite vérifiée de l’Église de Dieu opposée aux maisons où l’on mange et boit.')
cite(1830,'SIR.34.27','Citation explicite vérifiée de celui qui prive le mercenaire de son salaire assimilé à celui qui répand le sang.')
cite(1831,'JHN.6.53','Citation sémantique vérifiée de la nécessité de manger la chair du Fils de l’homme et de boire son sang, malgré la note imprimée Jean 6,54.')
com([1831,1832],'LEV.17.10','L’interdiction légale de consommer le sang est confrontée au sang du sacrifice unique offert comme nourriture.')
com([1831,1832,1833],'LEV.17.11','Le sang répandu à l’autel comme figure du sacrifice véritable conclut l’explication du sang mis pour l’âme.')

// LVIII-LX — degrés de parenté interdits.
cite(1834,'LEV.18.7','Citation explicite vérifiée de l’interdiction de découvrir la nudité du père et de la mère.')
com([1834],'LEV.18.7','Le commerce avec la mère est expliqué comme déshonneur commun du père et de la mère.')
cite(1835,'LEV.18.8','Citation explicite vérifiée de l’interdiction de découvrir la nudité de la femme du père.')
com([1835],'LEV.18.8','Le commerce avec la belle-mère est expliqué comme déshonneur du père.')
cite(1836,'LEV.18.9','Citation explicite vérifiée de l’interdiction concernant la sœur de père ou de mère, née dans la maison ou dehors.')
com([1837,1838,1839],'LEV.18.9','La sœur née dans la maison ou dehors et l’alternative « de père ou de mère » sont analysées selon les degrés de parenté.')
com([1840],'LEV.18.10','La défense concernant la petite-fille du fils ou de la fille est rappelée comme proposition intercalaire.')
cite(1840,'LEV.18.11','Citation explicite vérifiée de l’interdiction concernant la fille de la femme du père née du père.')
com([1841,1842],'LEV.18.11','La seconde formulation est expliquée comme reprise plus formelle de l’interdiction relative à la sœur consanguine.')
cite(1843,'LEV.18.14','Citation explicite vérifiée de l’interdiction de s’approcher de la femme du frère du père.')
com([1843,1844],'LEV.18.14','La nudité de l’oncle est expliquée par l’union interdite avec sa femme, dont le déshonneur rejaillit sur lui.')

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const{data:bruts,error:e0}=await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).gte('segment_numero',PREMIER).lte('segment_numero',DERNIER).order('segment_numero');if(e0)throw e0
const segments=bruts.filter(s=>s.ref_niv1==='Livre troisième'&&QUESTIONS.includes(s.ref_niv2))
if(segments.length!==65||segments.some((s,i)=>s.segment_numero!==PREMIER+i)||[...new Set(segments.map(s=>s.ref_niv2))].join('|')!==QUESTIONS.join('|'))throw Error('Préétat structurel invalide')
if(segments.some(s=>s.liens_revus_le||s.liens_revus_par))throw Error('Déjà relu')
for(const[n,[avant]]of CORRECTIONS_NOTES){const s=segments.find(x=>x.segment_numero===n);if(!s?.notes?.includes(avant))throw Error(`Précondition note invalide ${n}`)}
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Empreinte ${empreinte}`)
const pn=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS,...NON_RESOLUS].map(x=>x[0])),nc=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nc.length)throw Error(`Non classés ${nc.map(x=>x.segment_numero)}`)
if(LIENS.some(([n,c,t,m])=>!pn.has(n)||!c||![1,2,3,4].includes(t)||!m.trim())||NON_RESOLUS.some(([n,t,m])=>!pn.has(n)||t!==4||!m.startsWith('RÉFÉRENCE NON BIBLIQUE')))throw Error('Manifeste invalide')
const keys=LIENS.map(x=>`${x[0]}|${x[1]}|${x[2]}`),vus=new Set(),doublons=keys.filter(k=>vus.has(k)||!vus.add(k));if(doublons.length)throw Error(`Doublons ${doublons}`)
const cibles=[...new Set(LIENS.map(x=>x[1]))],{data:vv,error:e1}=await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset',cibles);if(e1)throw e1;const vm=new Map(vv.map(v=>[v.id_verset,v])),abs=cibles.filter(c=>!vm.has(c));if(abs.length)throw Error(`Cibles absentes ${abs}`)
const ids=segments.map(s=>s.id),{count:ex,error:e2}=await sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids);if(e2)throw e2;if(ex)throw Error(`${ex} liens existants`)
const total=LIENS.length+NON_RESOLUS.length,types=LIENS.reduce((a,x)=>(a[x[2]]=(a[x[2]]||0)+1,a),{});if(NON_RESOLUS.length)types[4]=(types[4]||0)+NON_RESOLUS.length
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8'))
for(const[n,[avant,apres]]of CORRECTIONS_NOTES){const c=candidats.find(x=>x.segment_numero===n);if(!c?.notes?.includes(avant))throw Error(`Candidat note non synchronisable ${n}`);c.notes=c.notes.replace(avant,apres)}
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Lévitique LI-LX',bornes:[PREMIER,DERNIER],segments:65,corrections_notes:CORRECTIONS_NOTES.size,liens:total,sans_cible_a_constituer:NON_RESOLUS.length,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,empreinte,avancement_actuel:'52,12 %'},null,2))
if(DETAIL){for(const[n,c,t,m]of LIENS)console.log({n,c,t,m,segment:pn.get(n).segment_texte,temoin:vm.get(c).TR0003||vm.get(c).TR0001||vm.get(c).TR0004});for(const[n,t,m]of NON_RESOLUS)console.log({n,c:null,t,m,segment:pn.get(n).segment_texte})}if(!WRITE)process.exit(0)
const q=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=[...LIENS.map(([n,c,t,m])=>`(${pn.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),...NON_RESOLUS.map(([n,t,m])=>`(${pn.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`) ].join(',\n    '),idSql=ids.join(', ')
const correctionsSql=[...CORRECTIONS_NOTES].map(([n,[avant,apres]])=>{const id=pn.get(n).id;return`update segments set notes = replace(notes, ${q(avant)}, ${q(apres)}) where id = ${id} and notes like ${q(`%${avant}%`)};\n  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note segment ${n}: %/1', n; end if;`}).join('\n  ')
const sql=`do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  ${correctionsSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> 65 then raise exception 'Segments %/65', n; end if;
end $passe$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:la,error:ea},{count:ra,error:eb},{data:aud,error:ec},{data:apres,error:ed}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,notes').in('id',ids)]);if(ea||eb||ec||ed)throw(ea||eb||ec||ed)
const am=new Map(apres.map(s=>[s.segment_numero,s.notes])),ci=[...CORRECTIONS_NOTES].some(([n,[avant,apres]])=>am.get(n).includes(avant)||!am.get(n).includes(apres));if(la!==total||ra!==65||ci||aud.some(x=>!x.motif||x.provenance!=='lecture'||(x.canon_id?(x.fiabilite!=='vérifié'||x.arbitrage_requis):(x.fiabilite!=='à constituer'||!x.arbitrage_requis||x.type!==4||!x.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))))throw Error('Postcontrôle invalide')
writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8')
console.log(`✓ ${la} liens, ${ra} segments`)
