import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE='A0010O0023',REF_NIV1='Livre sixième',PREMIER=2690,DERNIER=2753,NB_SEGMENTS=64
const WRITE=process.argv.includes('--write'),DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Josué Q. I-X'
const EMPREINTE_ATTENDUE='f5ea4a7c564babba4deb477478a2083df5660c93fe8ab2a7a9b275229b719f9f'
const CHARTE_HASH='47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS=['Question I','Question II','Question III','Question IV','Question V','Question VI','Question VII','Question VIII','Question IX','Question X']
const PREUVES=[
 ['scripts/heptateuque/img/p559.jpg','0a116e7ac7bf406d22af4bb7e270b6a160c09086a64878d13bbc37145fbd3852','Page imprimée 551 : fin du Deutéronome, ouverture du Livre VI et Questions I-II.'],
 ['scripts/heptateuque/img/p560.jpg','ee0ec3818d0ca4e8b8241fa33078ee1dc307d895522c02456c367310208ce9c4','Page imprimée 552 : Questions II-V et passage du Jourdain.'],
 ['scripts/heptateuque/img/p561.jpg','bb7c3291367d9c698fcf5885a653e88f0febd3a148ea5374bef3912c7a96f4ed','Page imprimée 553 : Questions VI-VIII, circoncision et début d’Achar.'],
 ['scripts/heptateuque/img/p562.jpg','2c135b616b92529c439dd8cd075672eee96ebc49104a4b128ac72fc46d9c4852','Page imprimée 554 : suite de la Question VIII et début de la Question IX.'],
 ['scripts/heptateuque/img/p563.jpg','be4f0c18b64cc5e99a328e2c4f9ac03b521d1506aac1108ee7d1a89c8426b71b','Page imprimée 555 : fin de la Question IX, Question X et raccord avec XI.'],
]
const CORRECTIONS_TEXTE=new Map([
 [2697,['Moise[[745]]','Moïse[[745]]']],
 [2706,['traduire le grec,<i>','traduire le grec, <i>']],
 [2739,['supplice éternel</i>; alors','supplice éternel</i> ; alors']],
 [2747,['tout ce qui était à lui</i>; soit','tout ce qui était à lui</i> ; soit']],
])
const CORRECTIONS_NOTES=new Map([
 [2694,['[[744]] Ib','[[744]] Ib.']],
 [2753,['[[757]] Ib','[[757]] Ib.']],
])

const LIENS=[]
const add=(n,c,t,m)=>LIENS.push([n,c,t,m])
const cite=(n,c,m)=>add(n,c,1,m)
const allusion=(n,c,m)=>add(n,c,2,m)
const com=(ns,c,m)=>{for(const n of ns)add(n,c,3,m)}
const SANS_CIBLE=[]
const nonBiblique=(n,g,m)=>SANS_CIBLE.push([n,4,`RÉFÉRENCE NON BIBLIQUE (${g}) : ${m}`])

// I — châtiment temporel de Moïse et honneur des saints.
cite(2690,'JOS.1.5','Citation explicite de la promesse faite à Josué : Dieu sera avec lui comme il fut avec Moïse.')
for(const v of [48,49,50,51,52])cite(2690,`DEU.32.${v}`,'La note éditoriale renvoie explicitement à la dernière parole de Dieu à Moïse, à sa faute et à son exclusion de la terre promise.')
for(const v of [4,5])cite(2690,`DEU.34.${v}`,'La note éditoriale renvoie explicitement à la vue de la terre promise refusée à Moïse puis à sa mort comme serviteur du Seigneur.')
com([2690,2691],'JOS.1.5','L’éloge posthume de Moïse est concilié avec le châtiment temporel qu’il a subi.')
cite(2691,'2TI.2.21','Citation explicite des instruments honorables, sanctifiés et utiles dans la maison du maître.')
com([2691],'DEU.32.52','L’exclusion temporelle de Moïse est distinguée de son appartenance aux saints et aux promesses divines.')

// II — initiative humaine de Josué et direction providentielle.
cite(2692,'JOS.1.11','Référence et paraphrase explicites de l’ordre de préparer des vivres pour franchir le Jourdain dans trois jours.')
cite(2692,'JOS.2.1','La note éditoriale renvoie explicitement à l’envoi des espions à Jéricho après le premier ordre de Josué.')
com([2692,2695,2698],'JOS.1.11','Le délai annoncé par Josué est interprété comme une prévision humaine susceptible d’être modifiée par la Providence.')
for(const [c,m] of [['JOS.2.1','arrivée des espions chez Rahab'],['JOS.2.4','espions cachés par Rahab'],['JOS.2.15','descente des espions par la fenêtre'],['JOS.2.16','conseil de se cacher trois jours dans la montagne']])allusion(2693,c,`La narration reprend précisément l’épisode de ${m}.`)
for(const [c,m] of [['JOS.2.22','séjour de trois jours des espions dans la montagne'],['JOS.2.23','retour des espions et récit fait à Josué'],['JOS.3.1','départ matinal de Josué et halte au Jourdain'],['JOS.3.2','ordre des officiers après trois jours'],['JOS.3.3','marche du peuple à la suite de l’arche']])allusion(2694,c,`La chronologie résumée reprend le ${m}.`)
com([2695],'JOS.2.1','Le retour plus ou moins rapide des espions explique le caractère humain du premier calendrier de Josué.')
com([2696,2698],'JOS.3.7','La glorification de Josué devant le peuple manifeste la correction providentielle de ses dispositions initiales.')
cite(2697,'JOS.3.7','Citation explicite de Dieu commençant à élever Josué devant Israël afin que le peuple sache qu’il est avec lui comme avec Moïse.')
com([2697],'JOS.3.7','La révélation au seuil du Jourdain confirme que l’accomplissement final procède de Dieu.')
for(let v=14;v<=26;v++)cite(2699,`EXO.18.${v}`,'La note éditoriale vise explicitement l’ensemble du conseil de Jéthro : surcharge judiciaire de Moïse, délégation approuvée et nouvelle organisation des juges.')

// III — arche, nuée et crue du Jourdain.
cite(2700,'JOS.3.3','Citation explicite de l’ordre de suivre l’arche de l’alliance portée par les prêtres lévites.')
cite(2700,'JOS.3.4','Citation explicite de la distance de deux mille coudées et de la connaissance du chemin à suivre.')
cite(2701,'JOS.3.4','Fin de la citation explicite : le peuple n’a jamais encore suivi ce chemin.')
com([2701],'JOS.3.3','La distance séparant le peuple de l’arche est expliquée par la nécessité de la rendre visible à toute la multitude.')
com([2701],'JOS.3.4','L’intervalle de deux mille coudées est interprété comme une règle pratique de visibilité et de conduite.')
cite(2702,'EXO.13.21','La note éditoriale renvoie explicitement à la colonne de nuée qui guidait et éclairait la marche d’Israël.')
com([2702,2703],'JOS.3.3','La marche derrière l’arche est comprise comme succédant à la conduite par la colonne de nuée.')
com([2702],'JOS.1.11','Le nouvel ordre de départ dans trois jours reprend la prévision humaine analysée à la Question précédente.')
nonBiblique(2702,'renvoi interne','renvoi explicite à la Question II de la présente œuvre sur le premier ordre de départ dans trois jours ; cible intertextuelle à constituer.')
cite(2703,'JOS.3.15','Citation explicite du Jourdain débordant pendant la saison de la moisson.')
com([2703,2704],'JOS.3.15','La crue du Jourdain au temps de la moisson est expliquée par le calendrier agricole et hydrologique local.')
nonBiblique(2704,'savants non identifiés','témoignage de savants sur la récolte printanière du froment et la crue saisonnière du Jourdain ; source à constituer.')

// IV — monument éternel.
cite(2705,'JOS.4.7','Citation explicite des pierres établies à jamais comme mémorial pour les enfants d’Israël.')
cite(2705,'MAT.24.35','Citation explicite du ciel et de la terre qui passeront.')
com([2705,2706],'JOS.4.7','Le caractère éternel du monument est interprété par ce qu’il signifie et par le sens temporel du grec « jusqu’au siècle ».')
com([2705],'MAT.24.35','La disparition annoncée du ciel et de la terre sert d’objection à une durée matérielle absolument éternelle des pierres.')

// V — alliance du témoignage et témoignage de la Loi.
cite(2707,'JOS.4.15','Citation explicite de l’introduction : le Seigneur parle à Josué après le passage du peuple.')
cite(2707,'JOS.4.16','Citation explicite de l’ordre adressé aux prêtres porteurs de l’arche du témoignage.')
com([2707],'JOS.4.16','La formule « arche de l’Alliance du témoignage » est analysée pour qualifier l’ancienne Alliance elle-même de témoignage.')
cite(2708,'ROM.3.21','Citation explicite de la justice de Dieu manifestée sans la Loi mais attestée par la Loi et les Prophètes.')
com([2708],'ROM.3.21','Le témoignage rendu par la Loi fonde l’interprétation de l’Ancien Testament comme gage du Nouveau.')
com([2708],'JOS.4.16','La qualification de l’arche sert de point de départ à la fonction testimoniale de l’ancienne Alliance.')

// VI — circoncision renouvelée du peuple, non de chaque individu.
cite(2709,'JOS.5.2','Citation explicite de l’ordre de fabriquer des couteaux de pierre et de circoncire Israël de nouveau.')
com([2709,2710,2716,2717,2718],'JOS.5.2','Le mot « de nouveau » est interprété comme renouvellement du commandement au peuple, non comme seconde circoncision des mêmes individus.')
cite(2711,'JOS.5.3','Citation explicite de Josué fabriquant des couteaux de pierre et circoncisant Israël à la Colline de la Circoncision.')
cite(2712,'JOS.5.4','Citation continue de l’explication scripturaire des personnes que Josué circoncit après la sortie d’Égypte.')
cite(2713,'JOS.5.5','Citation continue distinguant les sortants d’Égypte circoncis des enfants nés pendant la marche.')
cite(2713,'JOS.5.6','Citation continue des années au désert, de la mort des guerriers désobéissants et de la terre où coulent le lait et le miel.')
cite(2714,'JOS.5.7','Fin de la citation : les enfants substitués à leurs pères sont circoncis parce qu’ils étaient demeurés incirconcis pendant la route.')
com([2714,2715,2716],'JOS.5.7','La génération née au désert et non circoncise est distinguée des pères déjà circoncis, excluant toute répétition individuelle.')
com([2715],'JOS.5.5','L’incirconcision des enfants nés pendant le chemin est attribuée à la négligence de leurs pères.')

// VII — prince de l’armée du Seigneur.
cite(2719,'JOS.5.13','Paraphrase explicite de l’homme debout devant Josué, l’épée nue à la main.')
cite(2719,'JOS.5.14','Citation explicite de sa qualité de prince de l’armée du Seigneur et de la prosternation de Josué demandant ses ordres.')
com([2720],'JOS.5.14','La prosternation et le titre de Seigneur sont examinés pour déterminer si l’hommage vise l’ange ou Dieu qui l’envoie.')
cite(2721,'JOS.5.13','La formule textuelle situant Josué « à Jéricho » est confrontée au sens territorial « près de Jéricho ».')
com([2721],'JOS.5.13','La localisation est interprétée comme territoire de Jéricho puisque les murs de la ville ne sont pas encore tombés.')
nonBiblique(2721,'traduction biblique','version faite sur l’hébreu précisant que Josué était près de Jéricho ; témoin éditorial à constituer.')

// VIII — solidarité du peuple dans le châtiment d’Achar.
for(const [c,m] of [['JOS.7.1','Achar prenant une part de l’anathème'],['JOS.7.4','trois mille hommes fuyant devant Gaï'],['JOS.7.5','trente-six Israélites tués par les hommes de Gaï']])allusion(2722,c,`Le résumé narratif reprend précisément ${m}.`)
for(const [c,m] of [['JOS.7.6','Josué et les anciens prosternés devant le Seigneur'],['JOS.7.11','péché collectif d’Israël par le vol de l’anathème'],['JOS.7.12','retrait de l’assistance divine jusqu’à disparition de l’anathème'],['JOS.7.24','Achar conduit avec ses enfants, ses biens et ses troupeaux'],['JOS.7.25','lapidation et feu infligés à Achar et aux siens']])allusion(2723,c,`Le résumé narratif reprend ${m}.`)
cite(2724,'DEU.24.16','Citation explicite de l’interdiction de punir les parents pour les enfants ou les enfants pour les parents.')
com([2724,2725,2726,2727,2728,2729,2730,2731,2732,2733,2734],'DEU.24.16','La règle imposée aux juges humains est distinguée du jugement providentiel de Dieu et des peines de l’autre vie.')
com([2724,2725,2726,2727,2728,2729,2730,2731,2732,2733,2734],'JOS.7.25','La mort d’Achar et des siens sert de cas à l’analyse de la solidarité temporelle du peuple et de la responsabilité individuelle.')
com([2726,2728,2729,2732],'JOS.7.5','La mort des guerriers innocents lors de la défaite de Gaï est intégrée à l’analyse des châtiments temporels collectifs.')

// IX — feu annoncé, lapidation accomplie et justice du châtiment.
cite(2735,'JOS.7.15','Référence explicite à la sentence de feu contre celui qui a pris de l’anathème et tout ce qui lui appartient.')
cite(2735,'JOS.7.25','Référence explicite à l’exécution d’Achar par lapidation, suivie du feu.')
for(const n of [2735,2736,2737,2738,2739,2740,2741,2743]){
 com([n],'JOS.7.15','La sentence de feu est interprétée comme prédiction ou figure d’expiation plutôt que comme modalité matérielle imposée à Josué.')
 com([n],'JOS.7.25','La lapidation effectivement ordonnée par Josué est conciliée avec la sentence divine formulée en termes de feu.')
}
cite(2737,'DEU.4.20','Citation explicite de la sortie d’Égypte comparée à une fournaise où l’on fond le fer.')
cite(2741,'NUM.31.23','Référence biblique explicite à la purification par le feu des objets qui supportent le feu ; cible sémantique malgré l’attribution du passage au Lévitique.')
com([2742],'JOS.7.15','La forme « il sera brûlé » est analysée comme une prédiction et non comme l’impératif « vous le livrerez aux flammes ».')
cite(2744,'JOS.7.15','Citation explicite de la sentence : « Il sera brûlé et tout ce qui lui appartient. »')
com([2744,2745,2746,2747],'JOS.7.15','La formule « tout ce qui lui appartient » est interprétée comme désignant les œuvres du coupable destinées au feu.')
cite(2745,'1CO.3.15','Référence explicite aux œuvres consumées par le feu tandis que leur auteur est sauvé.')
com([2746],'1CO.3.15','Le salut à travers le feu est écarté si le péché d’Achar est compris comme digne du feu éternel.')
for(const c of ['JOS.7.24','JOS.7.25','JOS.7.26'])com([2747],c,'Le monceau de pierres sur Achar, ses enfants, ses troupeaux et ses biens est interprété prophétiquement comme figure de ses œuvres.')
com([2748,2749,2750],'JOS.7.24','La présence des enfants et des biens d’Achar dans le châtiment visible est distinguée de toute damnation pour la faute d’autrui.')
com([2748,2749,2750],'JOS.7.25','La mort collective sert d’avertissement salutaire au peuple sans décider du sort éternel des victimes.')
com([2748,2749],'DEU.24.16','L’innocence des enfants à l’égard du péché du père est maintenue malgré leur mort temporelle.')
cite(2749,'WIS.4.11','Citation explicite du juste enlevé de peur que la malice ne change son esprit.')
cite(2749,'ROM.9.14','Référence explicite à l’absence de toute injustice en Dieu.')
com([2749],'JOS.7.5','Les guerriers morts sans participation à la faute d’Achar sont inclus dans le mystère du jugement providentiel.')

// X — légitimité de l’embuscade dans la guerre juste.
cite(2751,'JOS.8.2','Référence explicite à l’ordre divin de dresser une embuscade derrière Gaï.')
com([2751,2752,2753],'JOS.8.2','L’embuscade commandée par Dieu fonde la légitimité de la ruse militaire dans une guerre juste.')
cite(2753,'ROM.9.14','La note « Ib. » reprend explicitement Romains 9,14 : il n’y a pas d’injustice en Dieu.')

const SANS_LIEN=new Set()
const sha256=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
if(sha256('charte/CHARTE_IA.md')!==CHARTE_HASH)throw Error('Charte modifiée : relire avant toute exécution')
for(const[p,h]of PREUVES)if(sha256(p)!==h)throw Error(`Fac-similé modifié : ${p}`)
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const [{data:segments,error},{data:voisins,error:ev}]=await Promise.all([
 sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1',REF_NIV1).in('ref_niv2',QUESTIONS).order('segment_numero'),
 sb.from('segments').select('segment_numero,ref_niv1,ref_niv2').eq('id_oeuvre',OEUVRE).in('segment_numero',[PREMIER-1,DERNIER+1]).order('segment_numero'),
]);if(error||ev)throw(error||ev)
if(segments.length!==NB_SEGMENTS||segments.some((s,i)=>s.segment_numero!==PREMIER+i))throw Error('Préétat : bornes ou continuité invalides')
if([...new Set(segments.map(s=>s.ref_niv2))].join('|')!==QUESTIONS.join('|'))throw Error('Questions incomplètes ou désordonnées')
if(segments.some(s=>s.ref_niv1!==REF_NIV1||s.liens_revus_le||s.liens_revus_par))throw Error('Préétat structurel ou relecture invalide')
if(voisins.length!==2||voisins[0].segment_numero!==2689||voisins[0].ref_niv1!=='Livre cinquième'||voisins[1].segment_numero!==2754||voisins[1].ref_niv2!=='Question XI')throw Error('Raccords du lot invalides')
for(const[n,[a]]of CORRECTIONS_TEXTE)if(!segments.find(s=>s.segment_numero===n)?.segment_texte.includes(a))throw Error(`Précondition texte invalide ${n}: ${JSON.stringify(segments.find(s=>s.segment_numero===n)?.segment_texte)}`)
for(const[n,[a]]of CORRECTIONS_NOTES)if(!segments.find(s=>s.segment_numero===n)?.notes?.includes(a))throw Error(`Précondition note invalide ${n}: ${JSON.stringify(segments.find(s=>s.segment_numero===n)?.notes)}`)
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex')
if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const pn=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS,...SANS_CIBLE].map(x=>x[0])),nc=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nc.length)throw Error(`Partition incomplète : ${nc.map(s=>s.segment_numero)}`)
if([...SANS_LIEN].some(n=>classes.has(n)||!pn.has(n)))throw Error('SANS_LIEN invalide')
if(LIENS.some(([n,c,t,m])=>!pn.has(n)||!c||![1,2,3,4].includes(t)||!m.trim()))throw Error('Manifeste biblique invalide')
if(SANS_CIBLE.some(([n,t,m])=>!pn.has(n)||t!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(m)))throw Error('Référence sans cible invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`),vus=new Set(),doublons=cles.filter(k=>vus.has(k)||!vus.add(k));if(doublons.length)throw Error(`Doublon interne : ${doublons}`)
const cibles=[...new Set(LIENS.map(x=>x[1]))],{data:temoins,error:et}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(et)throw et
const tm=new Map(temoins.map(v=>[v.id_verset,v])),invalides=cibles.filter(c=>{const v=tm.get(c);return!v||(!v.TR0001&&!v.TR0003&&!v.TR0004)});if(invalides.length)throw Error(`Cibles invalides : ${invalides}`)
const ids=segments.map(s=>s.id),[{count:ex,error:ee},{count:relusGlobaux,error:er}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre',OEUVRE).not('liens_revus_le','is',null)]);if(ee||er)throw(ee||er);if(ex)throw Error(`${ex} liens existants`)
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',sourceMapPath='scripts/heptateuque/segmentation-candidate/source-map.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8')),sourceMap=JSON.parse(readFileSync(sourceMapPath,'utf8'))
for(const s of segments){const c=candidats.find(x=>x.segment_numero===s.segment_numero);if(!c||c.ref_niv1!==s.ref_niv1||c.ref_niv2!==s.ref_niv2)throw Error(`Candidat désynchronisé ${s.segment_numero}`)}
for(const[n,[a,b]]of CORRECTIONS_TEXTE){const c=candidats.find(x=>x.segment_numero===n);if(!c?.segment_texte.includes(a))throw Error(`Candidat texte non synchronisable ${n}`);c.segment_texte=c.segment_texte.replace(a,b);const src=sourceMap.filter(x=>x.first_segment_numero<=n&&x.last_segment_numero>=n&&x.source_clean?.includes(a));if(src.length!==1)throw Error(`Source-map non synchronisable ${n}: ${src.length}`);src[0].source_clean=src[0].source_clean.replace(a,b)}
for(const[n,[a,b]]of CORRECTIONS_NOTES){const c=candidats.find(x=>x.segment_numero===n);if(!c?.notes?.includes(a))throw Error(`Candidat note non synchronisable ${n}`);c.notes=c.notes.replace(a,b)}
const TOTAL=LIENS.length+SANS_CIBLE.length,types=LIENS.reduce((a,x)=>(a[x[2]]=(a[x[2]]??0)+1,a),{});for(const[,t]of SANS_CIBLE)types[t]=(types[t]??0)+1
const liensParQuestion=Object.fromEntries(QUESTIONS.map(q=>{const ns=new Set(segments.filter(s=>s.ref_niv2===q).map(s=>s.segment_numero));return[q,[...LIENS,...SANS_CIBLE].filter(([n])=>ns.has(n)).length]}))
const pct=n=>`${n} / 3262 = ${(100*n/3262).toFixed(2).replace('.',',')} %`
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Josué I-X',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,corrections_texte:CORRECTIONS_TEXTE.size,corrections_notes:CORRECTIONS_NOTES.size,sic_confirmes:0,liens_cibles:LIENS.length,references_non_bibliques:SANS_CIBLE.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,liens_par_question:liensParQuestion,empreinte,charte_hash:CHARTE_HASH,avancement_actuel:pct(relusGlobaux),avancement_potentiel_apres_ecriture:pct(relusGlobaux+NB_SEGMENTS)},null,2))
if(DETAIL)for(const[n,c,t,m]of LIENS){const v=tm.get(c);console.log({n,c,t,m,segment:pn.get(n).segment_texte,temoin:v.TR0003||v.TR0001||v.TR0004})}if(!WRITE)process.exit(0)

const horodatage=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),sauvegardePath=`scripts/heptateuque/audit-reprise/sauvegarde-josue-q1-q10-${horodatage}.json`;mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(sauvegardePath,`${JSON.stringify({oeuvre:OEUVRE,bornes:[PREMIER,DERNIER],empreinte,segments,liens_existants:[]},null,2)}\n`,'utf8')
const q=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=[...LIENS.map(([n,c,t,m])=>`(${pn.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),...SANS_CIBLE.map(([n,t,m])=>`(${pn.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`) ].join(',\n    '),idSql=ids.join(', ')
const textesSql=[...CORRECTIONS_TEXTE].map(([n,[a,b]])=>`update segments set segment_texte=replace(segment_texte,${q(a)},${q(b)}) where id=${pn.get(n).id} and segment_texte like ${q(`%${a}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction texte ${n}: %/1',n; end if;`).join('\n  ')
const notesSql=[...CORRECTIONS_NOTES].map(([num,[a,b]])=>`update segments set notes=replace(notes,${q(a)},${q(b)}) where id=${pn.get(num).id} and notes like ${q(`%${a}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction note ${num}: %/1',n; end if;`).join('\n  ')
const sql=`do $p$ declare n integer; begin
 if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
 if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
 ${textesSql}
 ${notesSql}
 insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens insérés: %',n; end if;
 update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql}); get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments relus: %',n; end if;
end $p$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:la,error:e1},{count:ra,error:e2},{data:audit,error:e3},{data:apres,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,segment_texte,notes').in('id',ids)]);if(e1||e2||e3||e4)throw(e1||e2||e3||e4)
const am=new Map(apres.map(s=>[s.segment_numero,s])),ci=[...CORRECTIONS_TEXTE].some(([n,[a,b]])=>(!b.includes(a)&&am.get(n).segment_texte.includes(a))||!am.get(n).segment_texte.includes(b))||[...CORRECTIONS_NOTES].some(([n,[a,b]])=>(!b.includes(a)&&am.get(n).notes.includes(a))||!am.get(n).notes.includes(b))
if(la!==TOTAL||ra!==NB_SEGMENTS||ci||audit.some(l=>!l.motif||l.provenance!=='lecture'||(l.canon_id?(l.fiabilite!=='vérifié'||l.arbitrage_requis):(l.fiabilite!=='à constituer'||!l.arbitrage_requis||l.type!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(l.motif)))))throw Error('Postcontrôle invalide')
const ca=audit.map(l=>`${l.segment_id}|${l.canon_id??'sans-cible'}|${l.type}|${l.motif}`);if(new Set(ca).size!==ca.length)throw Error('Doublon postétat')
writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8');writeFileSync(sourceMapPath,`${JSON.stringify(sourceMap,null,2)}\n`,'utf8');console.log(`✓ ${la} liens ; ${ra} segments relus ; sauvegarde ${sauvegardePath}`)
