import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE='A0010O0023',REF_NIV1='Livre septième',PREMIER=2925,DERNIER=2972,NB_SEGMENTS=48
const WRITE=process.argv.includes('--write'),DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Juges Q. XI-XX'
const EMPREINTE_ATTENDUE='8617c80cb4e49795bd0890434f5d9a09ae4e019b5eaead452a8b97fb9d2a92ba'
const CHARTE_HASH='47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS=['Question XI','Question XII','Question XIII','Question XIV','Question XV','Question XVI','Question XVII','Question XVIII','Question XIX','Question XX']
const PREUVES=[
 ['scripts/heptateuque/img/p575.jpg','06b582fb4064b0e26fd1d2c14ffe9b3debfa6932e83b6313c05bcfb0e3a7b66d','Page imprimée 567, Questions XI et XII.'],
 ['scripts/heptateuque/img/p576.jpg','f2c2703b469e8444ebd38a39b9b9f1295480a2c172b252430857b9331cf6b060','Page imprimée 568, Questions XII à XVII.'],
 ['scripts/heptateuque/img/p577.jpg','137db04ac9106d4da52680b85fcb766aaf4de4947da1822e11b5bcbba632f7df','Page imprimée 569, Question XVII et Navé a.'],
 ['scripts/heptateuque/img/p578.jpg','05aceaaf8322d6e9c6ceb275609dba7a4158032544e60ff6b0ee675d5d3733b2','Page imprimée 570, Questions XVII à XX.'],
]
const CORRECTIONS_TEXTE=[
 {n:2951,liveAvant:'Jésus fils de Navéa laissées vivre',candidatAvant:'Jésus fils de Navéa laissées vivre',apres:'Jésus fils de Navé a laissées vivre'},
 {n:2969,liveAvant:'<i>Il les sauva</i>:',candidatAvant:'<i>Il les sauva</i>:',apres:'<i>Il les sauva</i> :'},
 {n:2971,liveAvant:'</i>? - On peut demander',candidatAvant:'</i>? – On peut demander',apres:'</i> ? – On peut demander'},
]
const CORRECTIONS_NOTES=new Map([
 [2925,['[[809]] Ib. XIX, 48. selon les Sept.','[[809]] Ib. XIX, 48, selon les Sept.']],
 [2958,['[[815]] 1Sa. VI, 5, 16','[[815]] I Rois, VI, 5, 16.']],
])

const LIENS=[],SANS_CIBLE=[]
const add=(n,c,t,m)=>LIENS.push([n,c,t,m])
const both=(n,c,m)=>{add(n,c,1,`${m} — citation, référence ou reprise explicite.`);add(n,c,3,`${m} — passage commenté dans le raisonnement.`)}
const explain=(n,ids,m)=>{for(const id of ids)add(n,id,3,`${m} (${id}).`)}
const nonBiblique=(n,g,m)=>SANS_CIBLE.push([n,4,`RÉFÉRENCE NON BIBLIQUE (${g}) : ${m}`])

// XI — reprise grecque de la situation de Dan.
both(2925,'JDG.1.34','Les Amorrhéens refoulent les fils de Dan dans la montagne et les empêchent de descendre dans la plaine')
nonBiblique(2925,'tradition textuelle','la note attribue le même fait à Josué XIX,48 selon les Septante, sans équivalent dans le verset local JOS.19.48')

// XII — ange au lieu des Pleurs et désobéissance d’Israël.
both(2926,'JDG.2.1','L’ange du Seigneur monte au lieu des Pleurs, nom expliqué comme postérieur à l’apparition')
for(const id of ['JDG.2.4','JDG.2.5'])both(2927,id,'Le peuple pleure après le reproche de l’ange et donne au lieu un nom tiré de ces pleurs')
explain(2927,['JDG.2.1','JDG.2.2','JDG.2.3'],'Les pleurs répondent à la menace due au refus de détruire les peuples vaincus.')
for(const n of [2928,2929,2930,2931])explain(n,['JDG.2.1','JDG.2.2','JDG.2.3'],'La désobéissance d’Israël est examinée comme mépris ou défiance, puis située après la mort de Josué.')
for(const id of ['JOS.13.1','JOS.13.2','JOS.13.3'])both(2932,id,'La note 810 désigne le pays restant à conquérir lorsque Josué était devenu vieux')
explain(2932,['JDG.2.1','JDG.2.2','JDG.2.3'],'Le récit de Juges est rapproché d’une anticipation placée dans le livre de Josué.')

// XIII à XVI — scandale des nations, récapitulation, prodiges et Astarté.
both(2933,'JDG.2.3','Dieu annonce qu’il ne chassera pas les peuples et que leurs dieux seront un piège pour Israël')
explain(2934,['JDG.2.3'],'Le scandale des dieux étrangers est interprété comme un péché permis dans la colère divine.')
for(const id of ['JDG.2.6','JDG.2.8','JOS.24.28','JOS.24.29'])both(2935,id,'Le renvoi du peuple et la mort de Josué montrent que le récit des Juges récapitule celui de Josué')
explain(2936,['JDG.2.6','JDG.2.8','JDG.2.10'],'La récapitulation sert d’abrégé avant la reprise de la succession des Juges.')
both(2937,'JDG.2.10','La génération nouvelle ne connaît ni le Seigneur ni les œuvres accomplies pour Israël')
for(const n of [2938,2939,2940,2941,2942])explain(n,['JDG.2.13'],'Baal et les Astarté sont expliqués par les noms divins, les idoles et les variantes de nombre grammatical.')
add(2938,'JDG.2.13',1,'La citation explicite dit qu’Israël servit Baal et les Astarté.')
nonBiblique(2938,'philologie punique','identification traditionnelle de Baal à Jupiter et d’Astarté à Junon, avec l’étymologie de Baalsamen')
nonBiblique(2941,'traditions textuelles','les exemplaires grecs des Septante portent le nom de Junon au pluriel, les versions latines au singulier')
nonBiblique(2942,'traduction biblique','une version faite sur le texte hébreu porte Astaroth et Baalim')

// XVII, 1 — vendus sans prix et rachetés par le sang.
for(const id of ['JDG.2.14','PSA.43.13','ISA.52.3'])both(2943,id,'Israël est vendu aux ennemis sans prix et promis à un rachat sans argent')
for(const n of [2944,2945])explain(n,['JDG.2.14','PSA.43.13','ISA.52.3'],'Le verbe vendre est expliqué malgré l’absence de prix pécuniaire.')
for(const id of ['ISA.52.3','1PE.1.18','1PE.1.19'])both(2946,id,'Le rachat sans argent est accompli par le sang précieux du Christ, agneau sans tache')
explain(2947,['ISA.52.3','1PE.1.18','1PE.1.19'],'L’argent désigne toute monnaie, opposée au prix véritable du sang du Christ.')

// XVII, 2 — nations laissées pour éprouver Israël.
for(const id of ['JDG.2.21','JDG.2.22','JDG.2.23'])both(2948,id,'Dieu laisse les nations que Josué n’a pas détruites afin d’éprouver l’obéissance d’Israël')
for(const n of [2949,2951,2952])explain(n,['JDG.2.21','JDG.2.22','JDG.2.23'],'Les nations demeurent pour mettre Israël à l’épreuve, non par une initiative autonome de Josué.')
for(const id of ['JDG.2.20','JDG.2.21'])both(2950,id,'La désobéissance à l’alliance motive la décision de ne plus faire disparaître les nations')
explain(2950,['JDG.2.22','JDG.2.23'],'L’épreuve aurait pu être utile à un peuple demeuré obéissant.')
explain(2953,['JDG.2.10','JDG.2.20','JDG.2.21','JDG.2.22','JDG.2.23'],'La génération postérieure à Josué transgresse et doit être éprouvée par les nations restantes.')

// XVII, 3 — apprentissage de la guerre.
both(2954,'JDG.2.23','Le Seigneur lui-même laisse les peuples et ne les livre pas à Josué')
for(const id of ['JDG.3.1','JDG.3.2'])both(2955,id,'Les nations laissées servent à éprouver Israël et à enseigner la guerre aux générations qui ne l’avaient pas connue')
for(const n of [2956,2957])explain(n,['JDG.3.1','JDG.3.2'],'L’apprentissage de la guerre est interprété comme exercice de piété et d’obéissance.')
both(2958,'JDG.3.3','Les cinq satrapies philistines sont comptées parmi les peuples laissés')
for(const id of ['1SA.6.5','1SA.6.16'])both(2958,id,'La note 815 illustre dans les Rois le nombre et le titre des cinq satrapes philistins')
both(2959,'JDG.3.3','Les Chananéens, Sidoniens et Hévéens du Liban sont énumérés parmi les peuples laissés')
both(2959,'JDG.3.4','Ces peuples servent à éprouver Israël')
both(2960,'JDG.3.4','L’épreuve doit manifester à Israël lui-même son obéissance aux commandements confiés par Moïse')
explain(2961,['JDG.3.4','JDG.2.20','JDG.2.21'],'Le constat de désobéissance rejoint le reproche de l’ange et la décision de laisser les nations.')

// XVII, 4 — destruction progressive et bêtes sauvages.
for(const id of ['EXO.23.29','EXO.23.30'])both(2962,id,'La note 816 corrige l’attribution verbale au Deutéronome : le contenu local est la promesse d’Exode 23,29-30 de chasser les nations peu à peu')
for(const n of [2963,2964,2965])explain(n,['EXO.23.29','EXO.23.30'],'La destruction progressive évite le désert et les bêtes sauvages, interprétées comme passions nées d’une prospérité trop rapide.')

// XVIII à XX — Gothoniel, la paix et la parole d’Aod.
for(const n of [2966,2967,2968])both(n,'JDG.3.9','Le cri d’Israël, l’exaucement et la désignation de Gothoniel comme sauveur sont réordonnés pour expliquer l’interversion')
explain(2969,['JDG.3.9'],'La proposition « il les sauva » est replacée après le nom de Gothoniel pour clarifier la syntaxe.')
both(2970,'JDG.3.11','La terre demeure en repos pendant quarante ans sous Gothoniel')
nonBiblique(2970,'histoire romaine','comparaison de cette longue paix avec le règne de Numa Pompilius')
for(const id of ['JDG.3.19','JDG.3.20'])both(2971,id,'Aod annonce successivement une parole secrète puis une parole de Dieu afin de rester seul avec Églon')
explain(2972,['JDG.3.19','JDG.3.20'],'La parole est comprise comme l’action de tuer Églon, non comme un mensonge verbal.')
explain(2972,['JDG.3.15'],'Dieu ayant suscité Aod comme sauveur, son action contre Églon est rapportée à un ordre divin.')

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
for(const[n,[avant]]of CORRECTIONS_NOTES)if(!segments.find(s=>s.segment_numero===n)?.notes?.includes(avant))throw Error(`Précondition correction note invalide au segment ${n}`)
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS,...SANS_CIBLE].map(([n])=>n)),nonClasses=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nonClasses.length)throw Error(`Partition incomplète : ${nonClasses.map(s=>s.segment_numero)}`)
if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m.trim()))throw Error('Manifeste biblique invalide')
if(SANS_CIBLE.some(([n,t,m])=>!parNumero.has(n)||t!==4||!m.startsWith('RÉFÉRENCE NON BIBLIQUE')))throw Error('Référence sans cible invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw Error('Doublon interne')
const cibles=[...new Set(LIENS.map(([,c])=>c))],{data:temoins,error:et}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(et)throw et
const temoinsParId=new Map(temoins.map(t=>[t.id_verset,t])),invalides=cibles.filter(c=>{const t=temoinsParId.get(c);return!t||(!t.TR0001&&!t.TR0003&&!t.TR0004)});if(invalides.length)throw Error(`Cibles invalides : ${invalides.join(', ')}`)
const ids=segments.map(s=>s.id),[{count:liensExistants,error:el},{count:relusGlobaux,error:er}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre',OEUVRE).not('liens_revus_le','is',null)]);if(el||er)throw el||er;if(liensExistants)throw Error(`${liensExistants} liens existent déjà dans le lot`)
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',sourceMapPath='scripts/heptateuque/segmentation-candidate/source-map.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8')),sourceMap=JSON.parse(readFileSync(sourceMapPath,'utf8'))
for(const c of CORRECTIONS_TEXTE){const candidat=candidats.find(x=>x.segment_numero===c.n);if(!candidat?.segment_texte.includes(c.candidatAvant))throw Error(`Candidat non synchronisable au segment ${c.n}`);candidat.segment_texte=candidat.segment_texte.replace(c.candidatAvant,c.apres);const sources=sourceMap.filter(x=>x.first_segment_numero<=c.n&&x.last_segment_numero>=c.n&&x.source_clean?.includes(c.candidatAvant));if(sources.length!==1)throw Error(`Source-map non synchronisable au segment ${c.n} : ${sources.length}`);sources[0].source_clean=sources[0].source_clean.replace(c.candidatAvant,c.apres)}
for(const[n,[avant,apres]]of CORRECTIONS_NOTES){const candidat=candidats.find(x=>x.segment_numero===n);if(!candidat?.notes?.includes(avant))throw Error(`Notes candidates non synchronisables au segment ${n}`);candidat.notes=candidat.notes.replace(avant,apres)}
const TOTAL=LIENS.length+SANS_CIBLE.length,types=LIENS.reduce((o,[,,t])=>{o[t]=(o[t]??0)+1;return o},{});for(const[,t]of SANS_CIBLE)types[t]=(types[t]??0)+1
const parQuestion=Object.fromEntries(QUESTIONS.map(q=>{const nums=new Set(segments.filter(s=>s.ref_niv2===q).map(s=>s.segment_numero));return[q,[...LIENS,...SANS_CIBLE].filter(([n])=>nums.has(n)).length]})),pct=n=>`${n} / 3262 = ${(100*n/3262).toFixed(2).replace('.',',')} %`
const sondageParQuestion=QUESTIONS.map(q=>{const nums=new Set(segments.filter(s=>s.ref_niv2===q).map(s=>s.segment_numero)),lot=[...LIENS,...SANS_CIBLE.map(([n,t,m])=>[n,null,t,m])].filter(([n])=>nums.has(n)),index=parseInt(createHash('sha256').update(`2026-08-02|${q}`).digest('hex').slice(0,8),16)%lot.length,[n,c,t]=lot[index];return{question:q,segment:n,cible:c??'sans cible',type:t}})
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Juges XI-XX',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,corrections_ocr_texte:CORRECTIONS_TEXTE.length,corrections_ocr_notes:CORRECTIONS_NOTES.size,sic_confirmes:0,liens_bibliques:LIENS.length,references_non_bibliques:SANS_CIBLE.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,liens_par_question:parQuestion,sondage_par_question:sondageParQuestion,empreinte,charte_hash:CHARTE_HASH,avancement_actuel:pct(relusGlobaux),avancement_potentiel_apres_ecriture:pct(relusGlobaux+NB_SEGMENTS)},null,2))
if(DETAIL)for(const[n,c,t,motif]of LIENS){const temoin=temoinsParId.get(c);console.log({n,c,t,motif,segment:parNumero.get(n).segment_texte,temoin:temoin.TR0003||temoin.TR0001||temoin.TR0004})}
if(!WRITE)process.exit(0)
const horodatage=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),sauvegardePath=`scripts/heptateuque/audit-reprise/sauvegarde-juges-q11-q20-${horodatage}.json`;mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(sauvegardePath,`${JSON.stringify({oeuvre:OEUVRE,bornes:[PREMIER,DERNIER],empreinte,segments,liens_existants:[]},null,2)}\n`,'utf8')
const quote=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=[...LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${quote(c)},${t},'vérifié',${quote(m)},'lecture',false)`),...SANS_CIBLE.map(([n,t,m])=>`(${parNumero.get(n).id},null,${t},'à constituer',${quote(m)},'lecture',true)`)].join(',\n'),idSql=ids.join(', ')
const correctionsTexteSql=CORRECTIONS_TEXTE.map(c=>`update segments set segment_texte=replace(segment_texte,${quote(c.liveAvant)},${quote(c.apres)}) where id=${parNumero.get(c.n).id} and segment_texte like ${quote(`%${c.liveAvant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction texte ${c.n}: %',n; end if;`).join('\n')
const correctionsNotesSql=[...CORRECTIONS_NOTES].map(([n,[a,b]])=>`update segments set notes=replace(notes,${quote(a)},${quote(b)}) where id=${parNumero.get(n).id} and notes like ${quote(`%${a}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction note ${n}: %',n; end if;`).join('\n')
const sql=`do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if; if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; ${correctionsTexteSql} ${correctionsNotesSql} insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens: %',n; end if; update segments set liens_revus_le=now(),liens_revus_par=${quote(RELECTEUR)} where id in (${idSql}); get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments: %',n; end if; end $p$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:liensApres,error:e1},{count:relusApres,error:e2},{data:audit,error:e3},{data:textes,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,segment_texte,notes').in('id',ids)]);if(e1||e2||e3||e4)throw e1||e2||e3||e4
const post=new Map(textes.map(s=>[s.segment_numero,s])),mauvaisTexte=CORRECTIONS_TEXTE.some(c=>post.get(c.n).segment_texte.includes(c.liveAvant)||!post.get(c.n).segment_texte.includes(c.apres)),mauvaisesNotes=[...CORRECTIONS_NOTES].some(([n,[a,b]])=>post.get(n).notes.includes(a)||!post.get(n).notes.includes(b))
if(liensApres!==TOTAL||relusApres!==NB_SEGMENTS||mauvaisTexte||mauvaisesNotes||audit.some(l=>!l.motif||l.provenance!=='lecture'||(l.canon_id?(l.fiabilite!=='vérifié'||l.arbitrage_requis):(l.fiabilite!=='à constituer'||!l.arbitrage_requis||l.type!==4))))throw Error('Postcontrôle invalide')
const apres=audit.map(l=>`${l.segment_id}|${l.canon_id??'sans-cible'}|${l.type}|${l.motif}`);if(new Set(apres).size!==apres.length)throw Error('Doublon postétat')
writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8');writeFileSync(sourceMapPath,`${JSON.stringify(sourceMap,null,2)}\n`,'utf8');console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
