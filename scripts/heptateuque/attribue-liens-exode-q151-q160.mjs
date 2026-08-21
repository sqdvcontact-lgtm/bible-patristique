import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE='A0010O0023', REF_NIV1='Livre deuxième', PREMIER=1170, DERNIER=1231, NB_SEGMENTS=62
const QUESTIONS=['Question CLI','Question CLII','Question CLIII','Question CLIV','Question CLV','Question CLVI','Question CLVII','Question CLVIII','Question CLIX','Question CLX']
const EMPREINTE_ATTENDUE='e866a108aaea6f2e5c4fc9ad093f7099ce6abc07707159a5489cc7517aa500fd'
const WRITE=process.argv.includes('--write'), DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Exode Q. CLI-CLX'
const LIENS=[]
const add=(n,c,t,m)=>LIENS.push([n,c,t,m])
const both=(n,c,m)=>{add(n,c,1,`${m} — citation ou référence intentionnelle.`);add(n,c,3,`${m} — passage commenté ou mobilisé dans le raisonnement.`)}
const explain=(ns,c,m)=>ns.forEach(n=>add(n,c,3,m))

// CLI — désir de voir et de connaître Dieu.
both(1170,'EXO.33.12','Moïse rappelle sa mission, la grâce reçue et la promesse d’être connu par Dieu')
both(1171,'EXO.33.13','Moïse demande que Dieu se montre afin de le connaître et reconnaisse Israël pour son peuple')
explain([1172,1173],'EXO.33.13','La demande de Moïse est interprétée comme désir d’une connaissance plus familière de Dieu au-delà des formes sensibles.')
both(1174,'EXO.33.13','La demande de voir Dieu et de reconnaître son peuple manifeste le double amour')
for(const c of ['MAT.22.37','MAT.22.39','MAT.22.40'])both(1174,c,'Les deux commandements de l’amour de Dieu et du prochain résument toute la Loi')

// CLII — connaître signifie approuver.
both(1175,'EXO.33.17','Dieu déclare connaître Moïse entre tous')
both(1175,'MAT.25.12','« Je ne vous connais pas » fournit le parallèle évangélique de la désapprobation')
explain([1176,1177],'EXO.33.17','La connaissance particulière de Moïse signifie qu’il est agréable à Dieu, non que Dieu ignore les autres.')

// CLIII — révélations non consignées.
for(const c of ['EXO.33.12','EXO.33.17'])both(1178,c,'Moïse rappelle avant sa consignation narrative la parole divine qui le connaît par son nom')
for(const c of ['EXO.33.12','EXO.33.17'])explain([1179],c,'La chronologie de la parole rappelée doit être vérifiée dans les parties antérieures de l’Écriture.')

// CLIV.1 — le passage de la gloire comme Pâque du Christ.
both(1180,'EXO.33.18','Moïse demande à voir la gloire de Dieu')
both(1180,'EXO.33.19','Dieu promet de faire passer sa gloire, de proclamer son nom et de faire miséricorde')
both(1181,'EXO.33.14','Dieu promet que sa face précédera Moïse et lui donnera le repos')
both(1181,'EXO.33.15','Moïse refuse de partir si Dieu ne vient pas lui-même avec le peuple')
both(1182,'EXO.33.17','Dieu accorde encore la demande de Moïse')
both(1182,'EXO.33.19','« Je passerai devant toi » reçoit un sens distinct d’une simple marche en avant')
add(1183,'EXO.33.19',3,'Le passage de la gloire est interprété comme la Pâque personnelle du Christ.')
both(1183,'JHN.13.1','L’heure de Jésus est celle de passer de ce monde à son Père')
add(1184,'JHN.13.1',3,'Le passage du Christ à son Père précède celui de tous les saints.')
for(const c of ['JHN.14.2','JHN.14.3'])both(1184,c,'Le Christ part préparer des demeures dans la maison du Père avant de recevoir les saints')
both(1184,'COL.1.18','Le Christ est le premier-né d’entre les morts')

// CLIV.2-4 — proclamation du nom et miséricorde gratuite.
both(1185,'EXO.33.19','« Je nommerai le Seigneur en ta présence » est appliqué à Israël figuré par Moïse')
both(1186,'EXO.33.19','La forme active « je nommerai » annonce la publication universelle du nom du Christ')
explain([1187],'EXO.33.19','La grâce divine fait prononcer le nom du Seigneur parmi toutes les nations.')
both(1188,'EXO.33.19','La double formule de pitié et de miséricorde exclut tout mérite préalable')
add(1189,'EXO.33.19',3,'La miséricorde promise aux nations explique la proclamation du nom du Seigneur.')
for(const c of ['ROM.15.8','ROM.15.9'])both(1189,c,'Le Christ accomplit les promesses aux circoncis et les Gentils glorifient Dieu pour sa miséricorde')
both(1190,'EXO.33.19','La prédiction de la pitié divine interdit à l’homme de se glorifier dans ses mérites')
both(1190,'2CO.10.17','« Celui qui se glorifie, qu’il se glorifie dans le Seigneur »')
add(1191,'EXO.33.19',3,'La grâce de la vocation est antérieure aux bonnes œuvres.')
both(1191,'ROM.5.6','Le Christ est mort pour les impies avant tout mérite')
both(1192,'EXO.33.19','La seconde formule de miséricorde est comparée à la première selon plusieurs traductions')
explain([1193,1194,1195,1196],'EXO.33.19','La double formulation grecque de la miséricorde est examinée comme répétition emphatique ou annonce des deux peuples.')
add(1195,'GEN.41.32',1,'Le double songe de Pharaon est explicitement cité comme exemple de répétition confirmative.')
add(1195,'GEN.41.32',4,'La répétition du songe fournit un parallèle construit avec la double formule de miséricorde.')
for(const c of ['ROM.11.30','ROM.11.31'])both(1197,c,'Paul distribue la miséricorde entre les Gentils et Israël')
add(1197,'EXO.33.19',3,'Les deux membres de la formule sont appliqués aux Gentils et aux Hébreux.')
both(1198,'ROM.11.32','Dieu enferme tous les peuples dans l’incrédulité afin de faire miséricorde à tous')
add(1198,'EXO.33.19',3,'La miséricorde envers tous confirme la portée des deux formules mosaïques.')

// CLIV.5 — voir Dieu après la mort au monde.
both(1199,'EXO.33.18','La demande « Montrez-moi votre gloire » est rappelée')
both(1199,'EXO.33.13','La demande antérieure de connaître et voir Dieu est rappelée')
both(1199,'EXO.33.20','Nul homme ne peut voir le visage de Dieu et vivre')
add(1200,'EXO.33.20',3,'L’impossibilité de voir Dieu dans la chair mortelle est opposée à la vision dans l’autre vie.')

// CLIV.6 — pierre, caverne, main et conversion d’Israël.
both(1201,'EXO.33.21','« Il y a un lieu près de moi » ouvre l’interprétation ecclésiale du lieu et de la pierre')
both(1202,'EXO.33.21','Moïse doit se tenir sur la pierre')
both(1202,'MAT.16.18','« Sur cette pierre je bâtirai mon Église » explique le lieu comme Église')
both(1203,'EXO.33.22','Le passage de la gloire est interprété comme Passion et Résurrection du Christ')
both(1204,'EXO.33.22','La caverne ou creux de la pierre signifie une position inébranlable')
for(const c of ['EXO.33.22','EXO.33.23'])both(1205,c,'La main couvre Moïse jusqu’au passage, puis il voit Dieu par derrière')
for(const c of ['EXO.33.22','EXO.33.23'])both(1206,c,'La caverne, la main et la vision postérieure sont reprises textuellement')
for(const c of ['EXO.33.21','EXO.33.22','EXO.33.23'])explain([1207],c,'L’ordre apparent entre station sur la pierre, protection et passage est discuté comme transposition.')
for(const c of ['EXO.33.21','EXO.33.22','EXO.33.23'])both(1208,c,'Les clauses sont réordonnées pour restituer leur ordre prophétique')
add(1209,'EXO.33.23',3,'Voir Dieu par derrière figure la foi d’Israël après le passage du Christ.')
both(1209,'ACT.2.41','Après la Pâque du Christ, des Israélites reçoivent la parole et croient')
add(1210,'EXO.33.22',3,'La main qui couvre jusqu’au passage figure l’aveuglement temporaire d’Israël.')
both(1210,'ACT.1.9','L’Ascension suit la Résurrection du Christ')
both(1210,'ACT.2.4','Le Saint-Esprit fait parler les Apôtres dans les langues des peuples')
both(1210,'ACT.2.37','Les auditeurs qui avaient crucifié le Christ sont touchés de componction')
both(1210,'ROM.11.25','Une partie d’Israël demeure aveuglée jusqu’à l’entrée des nations')
add(1211,'EXO.33.22',3,'La main appesantie jour et nuit est rapprochée de la main couvrant Israël.')
both(1211,'PSA.31.4','La main de Dieu s’appesantit jour et nuit sur le pécheur')
both(1212,'EXO.33.23','Voir Dieu par derrière signifie croire après son passage au Père')
add(1212,'JHN.13.1',3,'Le passage de ce monde au Père précise le sens christologique de la vision postérieure.')
both(1212,'ACT.2.37','Les auditeurs demandent avec componction ce qu’ils doivent faire')
both(1213,'ACT.2.38','Les Apôtres prescrivent pénitence et baptême pour la rémission des péchés')
for(const c of ['PSA.31.4','PSA.31.5'])add(1213,c,3,'Le psaume ordonne la main appesantie, la componction, l’aveu et le pardon comme dans les Actes.')
add(1214,'EXO.33.22',3,'La main qui couvre jusqu’au passage est lue comme empêchement temporaire à reconnaître le Christ.')
for(const c of ['PSA.31.4','PSA.31.5'])both(1214,c,'Le psaume enchaîne main appesantie, épine de componction et confession du péché')
both(1214,'1CO.2.8','S’ils avaient connu le Seigneur de gloire, ils ne l’auraient pas crucifié')
add(1215,'ACT.2.38',3,'La pénitence et le baptême conduisent au pardon annoncé par le psaume.')
both(1215,'PSA.31.5','L’aveu du péché devant le Seigneur reçoit le pardon de l’impiété')
for(const c of ['EXO.33.21','EXO.33.22','EXO.33.23'])explain([1216],c,'La pierre, la caverne, la main et la vision postérieure sont reconnues comme prophétie plutôt que récit matériel.')
both(1217,'EXO.34.1','Le discours suivant ordonne de tailler deux tables semblables aux premières')
add(1217,'EXO.33.23',3,'La transition vers les nouvelles tables clôt sans réalisation matérielle la prophétie précédente.')

// CLV-CLVII — purification, peuple et alliance.
both(1218,'EXO.34.7','Ne pas purifier le coupable signifie ne pas le déclarer innocent')
both(1219,'EXO.34.10','Dieu promet des merveilles devant « tout ton peuple » sans dire encore « mon peuple »')
explain([1220,1221],'EXO.34.10','« Ton peuple » et « le peuple au milieu duquel tu es » sont analysés comme désignation civique, non possessive.')
both(1222,'EXO.34.12','La forme grecque « prends garde qu’il ne fasse alliance » est interrogée')
add(1223,'EXO.34.12',3,'La locution est d’autant plus difficile que Moïse ne fera pas entrer Israël dans la terre.')

// CLVIII — jalousie divine et idolâtrie.
both(1224,'EXO.34.13','L’ordre de détruire autels et symboles idolâtriques introduit le commentaire')
both(1224,'EXO.34.14','Le Seigneur se nomme jaloux et veut être aimé uniquement')
explain([1225,1226,1227],'EXO.34.14','La jalousie divine est une métaphore conjugale sans trouble en Dieu et protège Israël de sa propre perte.')
for(const c of ['PSA.72.27','PSA.72.28'])both(1227,c,'Le psalmiste oppose la perte de ceux qui se prostituent loin de Dieu au bonheur de lui être uni')
both(1227,'EXO.34.15','L’alliance avec les habitants conduirait Israël à se prostituer avec leurs dieux')

// CLIX-CLX — mains pleines et sabbat.
both(1228,'EXO.34.20','Paraître devant Dieu sans avoir les mains vides signifie entrer au tabernacle avec une offrande')
add(1229,'EXO.34.20',3,'L’offrande matérielle est reconnue comme ombre d’un mystère spirituel.')
both(1230,'EXO.34.21','Le sabbat demeure obligatoire au temps des semailles et de la moisson')
add(1231,'EXO.34.21',3,'Même pendant les saisons les plus pressantes, tout travail cesse le jour du sabbat.')

const NON_RESOLUS=[
  [1171,4,'RÉFÉRENCE NON BIBLIQUE (interprètes latins non identifiés) : traductions divergentes du grec γνωστῶ en Exode 33,13 ; cible de corpus à constituer.'],
  [1192,4,'RÉFÉRENCE NON BIBLIQUE (interprètes non identifiés) : variante latine de la seconde formule de miséricorde en Exode 33,19 ; cible de corpus à constituer.'],
  [1204,4,'RÉFÉRENCE NON BIBLIQUE (traducteurs non identifiés) : traduction de ὀπήν par échauguette plutôt que creux ou caverne ; cible de corpus à constituer.'],
]
const SANS_LIEN=new Set()

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const{data:bruts,error:e0}=await sb.from('segments').select('id,segment_numero,segment_texte,texte_original,notes,nature,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).gte('segment_numero',PREMIER).lte('segment_numero',DERNIER).order('segment_numero');if(e0)throw e0
const segments=bruts.filter(s=>s.ref_niv1===REF_NIV1&&QUESTIONS.includes(s.ref_niv2))
if(segments.length!==NB_SEGMENTS||segments.some((s,i)=>s.segment_numero!==PREMIER+i))throw Error('Préétat : bornes ou continuité invalides')
if([...new Set(segments.map(s=>s.ref_niv2))].join('|')!==QUESTIONS.join('|'))throw Error('Préétat : questions incomplètes ou désordonnées')
if(segments.some(s=>s.liens_revus_le||s.liens_revus_par))throw Error('Préétat : segment déjà relu')
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.texte_original,s.notes,s.nature]))).digest('hex');if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS,...NON_RESOLUS].map(([n])=>n))
const nonClasses=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nonClasses.length)throw Error(`Segments non classés : ${nonClasses.map(s=>s.segment_numero)}`)
if([...SANS_LIEN].some(n=>classes.has(n)||!parNumero.has(n)))throw Error('Chevauchement ou SANS_LIEN invalide')
if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m.trim()))throw Error('Lien biblique invalide')
if(NON_RESOLUS.some(([n,t,m])=>!parNumero.has(n)||![1,2,3,4].includes(t)||!m.startsWith('RÉFÉRENCE NON BIBLIQUE')))throw Error('Référence non biblique invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw Error('Doublon interne segment/cible/type')
const cibles=[...new Set(LIENS.map(([,c])=>c))],{data:temoins,error:e1}=await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset',cibles);if(e1)throw e1
const parCible=new Map(temoins.map(v=>[v.id_verset,v])),absentes=cibles.filter(c=>!parCible.has(c)),illisibles=temoins.filter(v=>!v.TR0001||!v.TR0003||!v.TR0004).map(v=>v.id_verset);if(absentes.length||illisibles.length)throw Error(`Cibles invalides : absentes=${absentes}; témoins incomplets=${illisibles}`)
const ids=segments.map(s=>s.id),{count:existants,error:e2}=await sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids);if(e2)throw e2;if(existants)throw Error(`Préétat : ${existants} liens déjà présents`)
const TOTAL=LIENS.length+NON_RESOLUS.length,types=LIENS.reduce((a,[,,t])=>(a[t]=(a[t]??0)+1,a),{});for(const[,t]of NON_RESOLUS)types[t]=(types[t]??0)+1
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Exode CLI-CLX',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,liens_bibliques:LIENS.length,sans_cible_a_constituer:NON_RESOLUS.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,empreinte,avancement_actuel:'34,86 %'},null,2))
if(DETAIL){for(const[n,c,t,m]of LIENS)console.log({n,c,t,m,segment:parNumero.get(n).segment_texte,temoins:parCible.get(c)});for(const[n,t,m]of NON_RESOLUS)console.log({n,t,m,segment:parNumero.get(n).segment_texte,fiabilite:'à constituer'})}if(!WRITE)process.exit(0)
const q=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=[...LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),...NON_RESOLUS.map(([n,t,m])=>`(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`)].join(',\n    '),idSql=ids.join(', ')
const sql=`do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens %/${TOTAL}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments %/${NB_SEGMENTS}', n; end if;
end $passe$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{data:audit,error:e3},{count:relus,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null)]);if(e3||e4)throw(e3||e4)
if(audit.length!==TOTAL||relus!==NB_SEGMENTS||audit.some(x=>!x.motif||x.provenance!=='lecture'||(x.canon_id?(x.fiabilite!=='vérifié'||x.arbitrage_requis):(x.verset_v2_id||x.livre||x.chapitre||x.fiabilite!=='à constituer'||!x.arbitrage_requis||!x.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))))throw Error('Postcontrôle invalide')
console.log(`✓ ${audit.length} liens ; ${relus} segments relus`)
