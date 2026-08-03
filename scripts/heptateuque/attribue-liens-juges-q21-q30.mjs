import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'

const OEUVRE='A0010O0023',REF_NIV1='Livre septième',PREMIER=2973,DERNIER=2995,NB_SEGMENTS=23
const WRITE=process.argv.includes('--write'),DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Juges Q. XXI-XXX'
const EMPREINTE_ATTENDUE='1c178296dc7c8ef57c63240c47a1978a2fce0ab088525d32f61cd4a105af7a7f',CHARTE_HASH='47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS=['Question XXI','Question XXII','Question XXIII','Question XXIV','Question XXV','Question XXVI','Question XXVII','Question XXVIII','Question XXIX','Question XXX']
const PREUVES=[
 ['scripts/heptateuque/img/p579.jpg','5b33f8431b55494a2b7cfb47cd674f158d54c1a9c0710890fccafc6fa718dbab','Page imprimée 571 : Questions XXI-XXVIII.'],
 ['scripts/heptateuque/img/p580.jpg','2aaf7052fc2322b0585d09af0c9e61256cf8454ab5162192caff07397d15abf5','Page imprimée 572 : fin de XXVIII, Questions XXIX-XXX et raccord avec XXXI.'],
]
const CORRECTIONS_TEXTE=[
 {n:2974,avant:'</i>;',apres:'</i> ;'},
 {n:2974,avant:'maudit [[817]]',apres:'maudit[[817]]'},
 {n:2981,avant:'</i>?',apres:'</i> ?'},
 {n:2984,avant:'révèle pas elle',apres:'révèle pas : elle'},
]
const CORRECTIONS_NOTES=new Map([[2974,['[[817]] 1Ro. XXI. 10,13.','[[817]] III Rois, XXI. 10, 13.']]])

const LIENS=[],SANS_CIBLE=[]
const add=(n,c,t,m)=>LIENS.push([n,c,t,m]),cite=(n,c,m)=>add(n,c,1,m),allusion=(n,c,m)=>add(n,c,2,m)
const com=(ns,c,m)=>{for(const n of ns)add(n,c,3,m)}
const nonBiblique=(n,g,m)=>SANS_CIBLE.push([n,4,`RÉFÉRENCE NON BIBLIQUE (${g}) : ${m}`])

// XXI — corpulence d’Églon, antiphrase grecque et leçon hébraïque.
cite(2973,'JDG.3.17','Citation explicite de la leçon grecque décrivant Églon comme extrêmement grêle, opposée à la leçon hébraïque très gras.')
cite(2973,'JDG.3.22','Citation explicite de la graisse d’Églon se refermant sur la blessure et la lame.')
com([2974],'JDG.3.17','La maigreur attribuée à Églon est expliquée comme une antiphrase signifiant son embonpoint.')
com([2974],'JDG.3.22','La graisse recouvrant la blessure motive l’interprétation antiphrastique de la leçon grecque.')
for(const c of ['1KI.21.10','1KI.21.13'])cite(2974,c,'La note renvoie explicitement à l’accusation contre Naboth, où bénir est employé par antiphrase pour maudire.')
cite(2975,'JDG.3.17','Citation explicite de la leçon hébraïque décrivant Églon comme d’un excessif embonpoint.')
nonBiblique(2975,'traditions textuelles','comparaison explicite de la leçon des Septante avec la Vulgate traduite sur l’hébreu pour la corpulence d’Églon.')

// XXII-XXIII — ordre de la sortie d’Aod et ouverture de la porte.
cite(2976,'JDG.3.23','Citation explicite de la sortie d’Aod et de la fermeture des portes de la chambre haute.')
com([2976],'JDG.3.23','Les propositions sont réordonnées : Aod ferme d’abord les portes, puis descend et traverse les gardes.')
cite(2977,'JDG.3.25','Référence explicite aux serviteurs ouvrant avec une clef la chambre où Églon gisait mort.')
com([2977,2978],'JDG.3.25','L’ouverture avec une clef est expliquée par une serrure ou des verrous permettant de fermer sans clef mais non d’ouvrir.')

// XXIV — quatre-vingts ans de repos et comparaison romaine.
cite(2979,'JDG.3.30','Référence explicite aux quatre-vingts ans de repos d’Israël après la victoire d’Aod.')
nonBiblique(2979,'histoire romaine','comparaison de la paix sous Aod avec la paix fameuse du règne de Numa Pompilius.')

// XXV — Samgar, les six cents hommes et les variantes sur l’aiguillon.
cite(2980,'JDG.3.31','Citation explicite de Samgar fils d’Anath tuant six cents étrangers et sauvant Israël.')
com([2980],'JDG.3.31','Le salut d’Israël signifie que l’agression ennemie fut prévenue et repoussée par le nouveau juge.')
com([2981,2982,2983],'JDG.3.31','La mention grecque des jeunes bœufs est confrontée à la leçon hébraïque de l’aiguillon ou soc de charrue.')
nonBiblique(2983,'usage linguistique','affirmation d’un emploi égyptien du nom de veau pour des bœufs adultes, comparé à l’usage français de poussin.')
nonBiblique(2983,'traditions textuelles','comparaison explicite de la version des Septante « sans compter les jeunes bœufs » et de la version sur l’hébreu « avec un soc de charrue ».')

// XXVI — réponse de Barac et ministère de l’ange.
cite(2984,'JDG.4.8','Citation explicite de Barac refusant de partir si Débora ne vient pas avec lui, avec une expansion grecque sur l’ange.')
allusion(2984,'JDG.4.9','Débora ne révèle pas séparément le jour favorable mais accepte de marcher avec Barac.')
allusion(2984,'JDG.4.14','La question du jour où le Seigneur favorise Barac rejoint le jour annoncé par Débora où Sisara lui est livré.')
com([2984,2985],'JDG.4.8','La réponse de Barac est interprétée comme demande de l’assistance divine transmise par un ange.')
nonBiblique(2984,'tradition textuelle','expansion grecque de Juges 4,8 sur le jour où le Seigneur favorise son ange avec Barac, absente du témoin hébraïque local.')

// XXVII-XXVIII — déroute de Sisara et sens naturel d’entrer chez Jahel.
cite(2986,'JDG.4.15','Citation explicite du Seigneur épouvantant et mettant en déroute Sisara avec tous ses chars.')
com([2986],'JDG.4.15','La déroute de Sisara est interprétée comme une action divine sur les cœurs ordonnant l’issue de l’événement.')
cite(2987,'JDG.4.22','Citation explicite de Barac entrant chez Jahel pendant sa recherche de Sisara.')
com([2987,2988],'JDG.4.22','Entrer auprès de Jahel est pris ici au sens naturel d’entrer dans sa maison, sans connotation charnelle.')

// XXIX — inversion dans le cantique de Débora.
cite(2989,'JDG.5.7','Citation explicite de la défaillance des habitants jusqu’au surgissement de Débora, mère en Israël.')
cite(2989,'JDG.5.8','Citation explicite du choix de dieux nouveaux et de la prise ou guerre aux portes, avec expansion grecque du pain d’orge.')
com([2990,2991,2992],'JDG.5.7','L’ordre du cantique est rétabli pour faire précéder le surgissement de Débora par la défaillance d’Israël.')
com([2990,2991,2992],'JDG.5.8','L’inversion est résolue en plaçant le choix des dieux nouveaux avant le relèvement des villes des princes.')
nonBiblique(2989,'tradition textuelle','comparaison au pain d’orge dans la leçon grecque de Juges 5,8, absente du témoin hébraïque local.')

// XXX — portée limitée de la comparaison des faux dieux au pain d’orge.
com([2993,2994,2995],'JDG.5.8','La comparaison grecque des nouveaux dieux au pain d’orge est limitée à l’opinion dépravée des idolâtres, non à un pouvoir vivifiant réel.')

const SANS_LIEN=new Set(),sha256=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
if(sha256('charte/CHARTE_IA.md')!==CHARTE_HASH)throw Error('Charte modifiée : relire avant toute exécution')
for(const[p,h]of PREUVES)if(sha256(p)!==h)throw Error(`Preuve fac-similé modifiée : ${p}`)
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const [{data:segments,error},{data:voisins,error:ev}]=await Promise.all([
 sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1',REF_NIV1).in('ref_niv2',QUESTIONS).order('segment_numero'),
 sb.from('segments').select('segment_numero,ref_niv1,ref_niv2').eq('id_oeuvre',OEUVRE).in('segment_numero',[PREMIER-1,DERNIER+1]).order('segment_numero'),
]);if(error||ev)throw error||ev
if(segments.length!==NB_SEGMENTS||segments.some((s,i)=>s.segment_numero!==PREMIER+i))throw Error('Préétat : bornes ou continuité invalides')
if([...new Set(segments.map(s=>s.ref_niv2))].join('|')!==QUESTIONS.join('|'))throw Error('Questions incomplètes ou désordonnées')
if(segments.some(s=>s.ref_niv1!==REF_NIV1||s.liens_revus_le||s.liens_revus_par))throw Error('Préétat structurel ou relecture invalide')
if(voisins.length!==2||voisins[0].segment_numero!==2972||voisins[0].ref_niv2!=='Question XX'||voisins[1].segment_numero!==2996||voisins[1].ref_niv2!=='Question XXXI')throw Error('Raccords du lot invalides')
for(const{n,avant}of CORRECTIONS_TEXTE)if(!segments.find(s=>s.segment_numero===n)?.segment_texte.includes(avant))throw Error(`Précondition texte invalide ${n}: ${avant}`)
for(const[n,[avant]]of CORRECTIONS_NOTES)if(!segments.find(s=>s.segment_numero===n)?.notes?.includes(avant))throw Error(`Précondition note invalide ${n}`)
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS,...SANS_CIBLE].map(([n])=>n)),nonClasses=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nonClasses.length)throw Error(`Partition incomplète : ${nonClasses.map(s=>s.segment_numero)}`)
if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m.trim()))throw Error('Manifeste biblique invalide')
if(SANS_CIBLE.some(([n,t,m])=>!parNumero.has(n)||t!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(m)))throw Error('Référence sans cible invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw Error('Doublon interne')
const cibles=[...new Set(LIENS.map(([,c])=>c))],{data:temoins,error:et}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(et)throw et
const temoinsParId=new Map(temoins.map(t=>[t.id_verset,t])),invalides=cibles.filter(c=>{const t=temoinsParId.get(c);return!t||(!t.TR0001&&!t.TR0003&&!t.TR0004)});if(invalides.length)throw Error(`Cibles invalides : ${invalides}`)
const ids=segments.map(s=>s.id),[{count:liensExistants,error:el},{count:relusGlobaux,error:er}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre',OEUVRE).not('liens_revus_le','is',null)]);if(el||er)throw el||er;if(liensExistants)throw Error(`${liensExistants} liens existent déjà`)
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',sourceMapPath='scripts/heptateuque/segmentation-candidate/source-map.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8')),sourceMap=JSON.parse(readFileSync(sourceMapPath,'utf8'))
for(const s of segments){const c=candidats.find(x=>x.segment_numero===s.segment_numero);if(!c||c.ref_niv1!==s.ref_niv1||c.ref_niv2!==s.ref_niv2)throw Error(`Candidat désynchronisé ${s.segment_numero}`)}
for(const{n,avant,apres}of CORRECTIONS_TEXTE){const candidat=candidats.find(x=>x.segment_numero===n);if(!candidat?.segment_texte.includes(avant))throw Error(`Candidat non synchronisable ${n}: ${avant}`);candidat.segment_texte=candidat.segment_texte.replace(avant,apres);const sources=sourceMap.filter(x=>x.first_segment_numero<=n&&x.last_segment_numero>=n&&x.source_clean?.includes(avant));if(sources.length!==1)throw Error(`Source-map non synchronisable ${n}: ${sources.length}`);sources[0].source_clean=sources[0].source_clean.replace(avant,apres)}
for(const[n,[avant,apres]]of CORRECTIONS_NOTES){const candidat=candidats.find(x=>x.segment_numero===n);if(!candidat?.notes?.includes(avant))throw Error(`Note candidate non synchronisable ${n}`);candidat.notes=candidat.notes.replace(avant,apres)}
const TOTAL=LIENS.length+SANS_CIBLE.length,types=LIENS.reduce((o,[,,t])=>(o[t]=(o[t]??0)+1,o),{});for(const[,t]of SANS_CIBLE)types[t]=(types[t]??0)+1
const parQuestion=Object.fromEntries(QUESTIONS.map(q=>{const nums=new Set(segments.filter(s=>s.ref_niv2===q).map(s=>s.segment_numero));return[q,[...LIENS,...SANS_CIBLE].filter(([n])=>nums.has(n)).length]})),pct=n=>`${n} / 3262 = ${(100*n/3262).toFixed(2).replace('.',',')} %`
const sondageParQuestion=QUESTIONS.map(q=>{const nums=new Set(segments.filter(s=>s.ref_niv2===q).map(s=>s.segment_numero)),lot=[...LIENS,...SANS_CIBLE.map(([n,t,m])=>[n,null,t,m])].filter(([n])=>nums.has(n)),index=parseInt(createHash('sha256').update(`2026-08-02|Juges XXI-XXX|${q}`).digest('hex').slice(0,8),16)%lot.length,[n,c,t]=lot[index];return{question:q,segment:n,cible:c??'sans cible',type:t}})
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Juges XXI-XXX',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,corrections_ocr_texte:CORRECTIONS_TEXTE.length,corrections_ocr_notes:CORRECTIONS_NOTES.size,sic_confirmes:0,liens_bibliques:LIENS.length,references_non_bibliques:SANS_CIBLE.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,liens_par_question:parQuestion,sondage_par_question:sondageParQuestion,empreinte,charte_hash:CHARTE_HASH,avancement_actuel:pct(relusGlobaux),avancement_potentiel_apres_ecriture:pct(relusGlobaux+NB_SEGMENTS)},null,2))
if(DETAIL)for(const[n,c,t,motif]of LIENS){const temoin=temoinsParId.get(c);console.log({n,c,t,motif,segment:parNumero.get(n).segment_texte,temoin:temoin.TR0003||temoin.TR0001||temoin.TR0004})}if(!WRITE)process.exit(0)

const horodatage=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),sauvegardePath=`scripts/heptateuque/audit-reprise/sauvegarde-juges-q21-q30-${horodatage}.json`;mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(sauvegardePath,`${JSON.stringify({oeuvre:OEUVRE,bornes:[PREMIER,DERNIER],empreinte,segments,liens_existants:[]},null,2)}\n`,'utf8')
const quote=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=[...LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${quote(c)},${t},'vérifié',${quote(m)},'lecture',false)`),...SANS_CIBLE.map(([n,t,m])=>`(${parNumero.get(n).id},null,${t},'à constituer',${quote(m)},'lecture',true)`) ].join(',\n'),idSql=ids.join(', ')
const correctionsTexteSql=CORRECTIONS_TEXTE.map(({n,avant,apres})=>`update segments set segment_texte=replace(segment_texte,${quote(avant)},${quote(apres)}) where id=${parNumero.get(n).id} and segment_texte like ${quote(`%${avant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction texte ${n}: %',n; end if;`).join('\n')
const correctionsNotesSql=[...CORRECTIONS_NOTES].map(([n,[a,b]])=>`update segments set notes=replace(notes,${quote(a)},${quote(b)}) where id=${parNumero.get(n).id} and notes like ${quote(`%${a}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction note ${n}: %',n; end if;`).join('\n')
const sql=`do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if; if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; ${correctionsTexteSql} ${correctionsNotesSql} insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens: %',n; end if; update segments set liens_revus_le=now(),liens_revus_par=${quote(RELECTEUR)} where id in (${idSql}); get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments: %',n; end if; end $p$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:liensApres,error:e1},{count:relusApres,error:e2},{data:audit,error:e3},{data:textes,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,segment_texte,notes').in('id',ids)]);if(e1||e2||e3||e4)throw e1||e2||e3||e4
const post=new Map(textes.map(s=>[s.segment_numero,s])),mauvaisTexte=CORRECTIONS_TEXTE.some(({n,avant,apres})=>post.get(n).segment_texte.includes(avant)||!post.get(n).segment_texte.includes(apres)),mauvaisesNotes=[...CORRECTIONS_NOTES].some(([n,[a,b]])=>post.get(n).notes.includes(a)||!post.get(n).notes.includes(b))
if(liensApres!==TOTAL||relusApres!==NB_SEGMENTS||mauvaisTexte||mauvaisesNotes||audit.some(l=>!l.motif||l.provenance!=='lecture'||(l.canon_id?(l.fiabilite!=='vérifié'||l.arbitrage_requis):(l.fiabilite!=='à constituer'||!l.arbitrage_requis||l.type!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(l.motif)))))throw Error('Postcontrôle invalide')
const apres=audit.map(l=>`${l.segment_id}|${l.canon_id??'sans-cible'}|${l.type}|${l.motif}`);if(new Set(apres).size!==apres.length)throw Error('Doublon postétat')
writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8');writeFileSync(sourceMapPath,`${JSON.stringify(sourceMap,null,2)}\n`,'utf8');console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
