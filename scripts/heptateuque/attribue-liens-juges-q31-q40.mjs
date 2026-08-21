import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE='A0010O0023',REF_NIV1='Livre septième',PREMIER=2996,DERNIER=3035,NB_SEGMENTS=40
const WRITE=process.argv.includes('--write'),DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Juges Q. XXXI-XL'
const EMPREINTE_ATTENDUE='7244c604bbe6d6f707e3e57f3c311e125f816a4e697666e160f4ed2b982192be'
const CHARTE_HASH='47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS=['Question XXXI','Question XXXII','Question XXXIII','Question XXXIV','Question XXXV','Question XXXVI','Question XXXVII','Question XXXVIII','Question XXXIX','Question XL']
const PREUVES=[
 ['scripts/heptateuque/img/p580.jpg','2aaf7052fc2322b0585d09af0c9e61256cf8454ab5162192caff07397d15abf5','Page imprimée 572, Questions XXXI à XXXIII.'],
 ['scripts/heptateuque/img/p581.jpg','797c5292aec2dfd107f05c55b4680c4a5672f0a6e10f5422800ce6f05e793ae9','Page imprimée 573, Questions XXXIII à XXXVII.'],
 ['scripts/heptateuque/img/p582.jpg','636da193a87ee4ab4ea719c1c21768bd66f76e3aefb44d3a2dea890947e537be','Page imprimée 574, Questions XXXVII à XXXIX.'],
 ['scripts/heptateuque/img/p583.jpg','cf45dbdb7a9bfefa9fa19e771b9afe107dc1dab551d3cc87432ab746a8f65b6b','Page imprimée 575, Questions XL et XLI.'],
]
const CORRECTIONS_TEXTE=[{n:3003,liveAvant:'</i>? - Gédéon répond',candidatAvant:'</i>? – Gédéon répond',apres:'</i> ? — Gédéon répond'}]
const CORRECTIONS_TITRES=[{n:3010,avant:'Dieu tolérait qu’on lui offrit des sacrifices',apres:'Dieu tolérait qu’on lui offrît des sacrifices'}]
const CORRECTIONS_NOTES=new Map([
 [3026,['[[829]] Rom. II, 9, 30','[[829]] Rom. II, 9, 10']],
 [3030,['[[833]] 2Co. I, 28','[[833]] 1Co. I, 28']],
])

const LIENS=[],SANS_CIBLE=[]
const add=(n,c,t,m)=>LIENS.push([n,c,t,m])
const both=(n,c,m)=>{add(n,c,1,`${m} — citation, référence ou reprise explicite.`);add(n,c,3,`${m} — passage commenté dans le raisonnement.`)}
const explain=(n,ids,m)=>{for(const id of ids)add(n,id,3,`${m} (${id}).`)}
const allusion=(n,c,m)=>add(n,c,2,`${m} — allusion déterminée par la formulation et le mouvement du passage.`)

// XXXI — le prophète non nommé et l'ange sous le chêne.
for(const id of ['JDG.6.7','JDG.6.8','JDG.6.11'])both(2996,id,'Le cri d’Israël, le prophète envoyé sans être nommé et l’ange qui paraît ensuite sous le chêne forment la séquence examinée')
both(2997,'JDG.6.11','L’ange du Seigneur vient s’asseoir sous le chêne d’Éphra après le reproche prophétique')
explain(2997,['JDG.6.8'],'La succession du prophète puis de l’ange fonde leur identification prudente.')
for(const id of ['GEN.19.10','MAT.11.10'])both(2998,id,'Les notes illustrent respectivement des anges nommés hommes et un prophète désigné comme ange ou messager')
explain(2999,['JDG.6.8','JDG.6.11'],'La possibilité de nommer prophète un ange demeure une conjecture appliquée à cette succession narrative.')

// XXXII à XXXIV — grammaire et parole de l'ange comme parole divine.
both(3000,'JDG.6.12','La salutation à Gédéon « Seigneur avec toi, puissant dans la force » reçoit une explication grammaticale')
both(3001,'JDG.6.14','L’ange dit à Gédéon « N’est-ce point moi qui t’ai envoyé ? » en tenant la place de Dieu')
both(3001,'JDG.4.6','La note oppose la commission de Barac formulée explicitement comme ordre du Seigneur')
explain(3002,['JDG.6.14'],'La première personne de l’envoyeur divin est opposée à une formulation indirecte.')
both(3003,'JDG.6.15','La réponse de Gédéon sur ses mille hommes et la faiblesse de sa maison motive la question des chiliarques')
explain(3004,['JDG.6.15'],'La brève conclusion laisse ouverte l’interprétation du terme chiliarque.')

// XXXV — sacrifice préparé devant l'ange, feu miraculeux et reconnaissance.
for(const id of ['JDG.6.18','JDG.6.19','JDG.6.20'])both(3005,id,'Gédéon prépare son sacrifice et le place devant l’ange sans le lui offrir comme destinataire')
both(3006,'JDG.6.20','L’ange ordonne de déposer chairs et azymes sur la pierre et d’y répandre le jus')
both(3007,'JDG.6.21','Le feu jaillit de la pierre au contact de la verge de l’ange et consume l’offrande')
for(const id of ['JDG.6.21','JDG.6.22'])both(3008,id,'Le miracle du feu conduit Gédéon à reconnaître l’ange du Seigneur')
explain(3009,['JDG.6.18','JDG.6.22'],'Avant cette reconnaissance, Gédéon croyait recevoir l’assistance d’un saint homme.')

// XXXVI — lieux de sacrifice et typologie de l'eau et du feu.
both(3010,'DEU.12.13','La note rappelle l’interdiction d’offrir des sacrifices hors du lieu désigné par Dieu')
explain(3010,['JDG.6.20'],'Le sacrifice de Gédéon soulève la question de cette interdiction.')
for(const n of [3011,3012])explain(n,['JDG.6.18','JDG.6.20','JDG.6.21'],'L’approbation de l’ange est comprise comme ordre particulier de Dieu autorisant le sacrifice.')
both(3013,'GEN.22.2','Abraham reçoit l’ordre d’offrir son fils en dehors de la règle commune')
for(let v=30;v<=38;v++)both(3013,`1KI.18.${v}`,'La note renvoie au sacrifice d’Élie hors du tabernacle contre les prêtres des idoles')
for(let v=4;v<=15;v++)both(3014,`1KI.3.${v}`,'La note « Ib. III, 4-15 » vise sémantiquement III Rois, soit 1 Rois 3, où Salomon sacrifie à Gabaon et reçoit la révélation divine')
for(const n of [3015,3016])explain(n,['DEU.12.13','1KI.3.4'],'La tolérance des hauts lieux consacrés au Seigneur est distinguée de la règle et de l’idolâtrie.')
explain(3017,['JDG.6.20','JDG.6.21'],'La pierre d’où sort le feu du sacrifice reçoit une interprétation prophétique.')
for(const id of ['NUM.20.2','NUM.20.7','NUM.20.8','NUM.20.9','NUM.20.10','NUM.20.11'])both(3018,id,'La note imprimée Nom. XX,2 introduit l’épisode de l’eau jaillie de la pierre frappée par la verge, porté par la scène de Nombres 20')
both(3018,'JHN.7.37','L’invitation du Christ à venir boire ouvre la citation sur l’eau vive, interprétée comme don du Saint-Esprit')
for(const id of ['JHN.7.38','JHN.7.39'])both(3019,id,'La suite de la citation sur les fleuves d’eau vive et l’explication de l’Évangéliste identifient l’Esprit reçu par les croyants')
allusion(3019,'ACT.2.3','Le feu descendu sur les disciples réunis désigne les langues comme de feu de la Pentecôte')
for(const id of ['ACT.2.3','LUK.12.49'])both(3020,id,'Les langues comme de feu sur les disciples et le feu apporté sur terre sont cités explicitement')

// XXXVII — les trois cents hommes, les nations et le choix des méprisés.
both(3021,'JDG.7.6','Le nombre de trois cents et la manière de boire avec la langue et la main sont cités puis comparés entre versions')
for(const n of [3022,3023,3024,3025])explain(n,['JDG.7.5','JDG.7.6'],'Les gestes des buveurs, la comparaison avec les chiens et la sélection des trois cents sont expliqués d’après les variantes grecque, latine et hébraïque.')
for(const id of ['ROM.2.9','ROM.2.10','1CO.1.24'])both(3026,id,'Les expressions « au Juif d’abord et au Grec » et « aux Juifs et aux Grecs » désignent Juifs et nations')
for(let v=14;v<=20;v++)both(3027,`GEN.14.${v}`,'La note renvoie aux trois cent dix-huit serviteurs d’Abraham, à la délivrance de son neveu et à la bénédiction de Melchisédech')
explain(3028,['GEN.14.14'],'L’excédent de dix-huit sur les trois cents serviteurs d’Abraham reçoit une interprétation chronologique et symbolique.')
for(const id of ['LUK.13.11','LUK.13.12','LUK.13.13'])both(3029,id,'La femme courbée depuis dix-huit ans et délivrée par le Sauveur illustre le symbolisme du nombre dix-huit')
both(3030,'1CO.1.28','Dieu choisit ce qui est méprisable et sans renom ; le fac-similé corrige l’OCR 2Co en I Cor')
for(const id of ['MAT.15.26','1SA.24.15'])both(3031,id,'Le chien exprime le mépris dans la parole de Jésus et dans l’abaissement de David devant Saül')

// XXXVIII à XL — variantes, pain d'orge et cri de guerre.
both(3032,'JDG.7.11','La descente de Gédéon avec son serviteur reçoit plusieurs leçons concernant les cinquante sentinelles')
explain(3033,['JDG.7.11'],'Les variantes sont expliquées par une garde du camp organisée en groupes de cinquante.')
both(3034,'JDG.7.13','Le songe du pain d’orge renversant les tentes de Madian assure Gédéon de la victoire')
allusion(3034,'1CO.1.28','Le pain méprisable qui confond les superbes reprend le choix divin de ce qui est tenu pour vil selon le monde')
both(3035,'JDG.7.20','Le cri « Le glaive du Seigneur, est à Gédéon » reçoit une explication grammaticale et théologique')

const SANS_LIEN=new Set(),sha256=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
if(sha256('charte/CHARTE_IA.md')!==CHARTE_HASH)throw Error('Charte modifiée : relire avant toute exécution')
for(const[p,h]of PREUVES)if(sha256(p)!==h)throw Error(`Preuve fac-similé modifiée : ${p}`)
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const{data:segments,error}=await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1',REF_NIV1).in('ref_niv2',QUESTIONS).order('segment_numero');if(error)throw error
if(segments.length!==NB_SEGMENTS||segments.some((s,i)=>s.segment_numero!==PREMIER+i))throw Error('Préétat : bornes ou continuité invalides')
if([...new Set(segments.map(s=>s.ref_niv2))].join('|')!==QUESTIONS.join('|'))throw Error('Questions incomplètes ou désordonnées')
if(segments.some(s=>s.ref_niv1!==REF_NIV1||s.liens_revus_le||s.liens_revus_par))throw Error('Préétat structurel ou relecture invalide')
for(const c of CORRECTIONS_TEXTE)if(!segments.find(s=>s.segment_numero===c.n)?.segment_texte.includes(c.liveAvant))throw Error(`Précondition correction texte invalide au segment ${c.n}`)
for(const c of CORRECTIONS_TITRES)if(!segments.find(s=>s.segment_numero===c.n)?.ref_niv2_texte.includes(c.avant))throw Error(`Précondition correction titre invalide au segment ${c.n}`)
for(const[n,[avant]]of CORRECTIONS_NOTES)if(!segments.find(s=>s.segment_numero===n)?.notes?.includes(avant))throw Error(`Précondition correction note invalide au segment ${n}`)
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(EMPREINTE_ATTENDUE!=='A_COMPLETER'&&empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set(LIENS.map(([n])=>n)),nonClasses=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nonClasses.length)throw Error(`Partition incomplète : ${nonClasses.map(s=>s.segment_numero)}`)
if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m.trim()))throw Error('Manifeste biblique invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw Error('Doublon interne')
const cibles=[...new Set(LIENS.map(([,c])=>c))],{data:temoins,error:et}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(et)throw et
const temoinsParId=new Map(temoins.map(t=>[t.id_verset,t])),invalides=cibles.filter(c=>{const t=temoinsParId.get(c);return!t||(!t.TR0001&&!t.TR0003&&!t.TR0004)});if(invalides.length)throw Error(`Cibles invalides : ${invalides.join(', ')}`)
const ids=segments.map(s=>s.id),[{count:liensExistants,error:el},{count:relusGlobaux,error:er}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre',OEUVRE).not('liens_revus_le','is',null)]);if(el||er)throw el||er;if(liensExistants)throw Error(`${liensExistants} liens existent déjà dans le lot`)
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',sourceMapPath='scripts/heptateuque/segmentation-candidate/source-map.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8')),sourceMap=JSON.parse(readFileSync(sourceMapPath,'utf8'))
for(const c of CORRECTIONS_TEXTE){const candidat=candidats.find(x=>x.segment_numero===c.n);if(!candidat?.segment_texte.includes(c.candidatAvant))throw Error(`Candidat non synchronisable au segment ${c.n}`);candidat.segment_texte=candidat.segment_texte.replace(c.candidatAvant,c.apres);const sources=sourceMap.filter(x=>x.first_segment_numero<=c.n&&x.last_segment_numero>=c.n&&x.source_clean?.includes(c.candidatAvant));if(sources.length!==1)throw Error(`Source-map non synchronisable au segment ${c.n} : ${sources.length}`);sources[0].source_clean=sources[0].source_clean.replace(c.candidatAvant,c.apres)}
for(const c of CORRECTIONS_TITRES){const candidat=candidats.find(x=>x.segment_numero===c.n);if(!candidat?.ref_niv2_texte.includes(c.avant))throw Error(`Titre candidat non synchronisable au segment ${c.n}`);candidat.ref_niv2_texte=candidat.ref_niv2_texte.replace(c.avant,c.apres)}
for(const[n,[avant,apres]]of CORRECTIONS_NOTES){const candidat=candidats.find(x=>x.segment_numero===n);if(!candidat?.notes?.includes(avant))throw Error(`Notes candidates non synchronisables au segment ${n}`);candidat.notes=candidat.notes.replace(avant,apres)}
const TOTAL=LIENS.length,types=LIENS.reduce((o,[,,t])=>{o[t]=(o[t]??0)+1;return o},{}),pct=n=>`${n} / 3262 = ${(100*n/3262).toFixed(2).replace('.',',')} %`
const parQuestion=Object.fromEntries(QUESTIONS.map(q=>{const nums=new Set(segments.filter(s=>s.ref_niv2===q).map(s=>s.segment_numero));return[q,LIENS.filter(([n])=>nums.has(n)).length]}))
const sondageParQuestion=QUESTIONS.map(q=>{const nums=new Set(segments.filter(s=>s.ref_niv2===q).map(s=>s.segment_numero)),lot=LIENS.filter(([n])=>nums.has(n)),index=parseInt(createHash('sha256').update(`2026-08-02|${q}`).digest('hex').slice(0,8),16)%lot.length,[n,c,t]=lot[index];return{question:q,segment:n,cible:c,type:t}})
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Juges XXXI-XL',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,corrections_ocr_texte:CORRECTIONS_TEXTE.length,corrections_ocr_titres:CORRECTIONS_TITRES.length,corrections_ocr_notes:CORRECTIONS_NOTES.size,sic_confirmes:0,liens_bibliques:LIENS.length,references_non_bibliques:SANS_CIBLE.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,liens_par_question:parQuestion,sondage_par_question:sondageParQuestion,empreinte,charte_hash:CHARTE_HASH,avancement_actuel:pct(relusGlobaux),avancement_potentiel_apres_ecriture:pct(relusGlobaux+NB_SEGMENTS)},null,2))
if(DETAIL)for(const[n,c,t,motif]of LIENS){const temoin=temoinsParId.get(c);console.log({n,c,t,motif,segment:parNumero.get(n).segment_texte,temoin:temoin.TR0003||temoin.TR0001||temoin.TR0004})}
if(!WRITE)process.exit(0)
const horodatage=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),sauvegardePath=`scripts/heptateuque/audit-reprise/sauvegarde-juges-q31-q40-${horodatage}.json`;mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(sauvegardePath,`${JSON.stringify({oeuvre:OEUVRE,bornes:[PREMIER,DERNIER],empreinte,segments,liens_existants:[]},null,2)}\n`,'utf8')
const quote=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${quote(c)},${t},'vérifié',${quote(m)},'lecture',false)`).join(',\n'),idSql=ids.join(', ')
const correctionsTexteSql=CORRECTIONS_TEXTE.map(c=>`update segments set segment_texte=replace(segment_texte,${quote(c.liveAvant)},${quote(c.apres)}) where id=${parNumero.get(c.n).id} and segment_texte like ${quote(`%${c.liveAvant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction texte ${c.n}: %',n; end if;`).join('\n')
const correctionsTitresSql=CORRECTIONS_TITRES.map(c=>`update segments set ref_niv2_texte=replace(ref_niv2_texte,${quote(c.avant)},${quote(c.apres)}) where id=${parNumero.get(c.n).id} and ref_niv2_texte like ${quote(`%${c.avant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction titre ${c.n}: %',n; end if;`).join('\n')
const correctionsNotesSql=[...CORRECTIONS_NOTES].map(([n,[a,b]])=>`update segments set notes=replace(notes,${quote(a)},${quote(b)}) where id=${parNumero.get(n).id} and notes like ${quote(`%${a}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction note ${n}: %',n; end if;`).join('\n')
const sql=`do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if; if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; ${correctionsTexteSql} ${correctionsTitresSql} ${correctionsNotesSql} insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens: %',n; end if; update segments set liens_revus_le=now(),liens_revus_par=${quote(RELECTEUR)} where id in (${idSql}); get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments: %',n; end if; end $p$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:liensApres,error:e1},{count:relusApres,error:e2},{data:audit,error:e3},{data:textes,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,segment_texte,notes,ref_niv2_texte').in('id',ids)]);if(e1||e2||e3||e4)throw e1||e2||e3||e4
const post=new Map(textes.map(s=>[s.segment_numero,s])),mauvaisTexte=CORRECTIONS_TEXTE.some(c=>post.get(c.n).segment_texte.includes(c.liveAvant)||!post.get(c.n).segment_texte.includes(c.apres)),mauvaisTitres=CORRECTIONS_TITRES.some(c=>post.get(c.n).ref_niv2_texte.includes(c.avant)||!post.get(c.n).ref_niv2_texte.includes(c.apres)),mauvaisesNotes=[...CORRECTIONS_NOTES].some(([n,[a,b]])=>post.get(n).notes.includes(a)||!post.get(n).notes.includes(b))
if(liensApres!==TOTAL||relusApres!==NB_SEGMENTS||mauvaisTexte||mauvaisTitres||mauvaisesNotes||audit.some(l=>!l.motif||l.provenance!=='lecture'||l.fiabilite!=='vérifié'||l.arbitrage_requis))throw Error('Postcontrôle invalide')
const apres=audit.map(l=>`${l.segment_id}|${l.canon_id}|${l.type}|${l.motif}`);if(new Set(apres).size!==apres.length)throw Error('Doublon postétat')
writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8');writeFileSync(sourceMapPath,`${JSON.stringify(sourceMap,null,2)}\n`,'utf8');console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
