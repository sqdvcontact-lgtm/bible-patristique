import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'

const OEUVRE='A0010O0023',REF_NIV1='Livre septième',PREMIER=3228,DERNIER=3262,NB_SEGMENTS=35
const WRITE=process.argv.includes('--write'),DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Juges Q. L-LVI et colophon final'
const EMPREINTE_ATTENDUE='620d54e4bd816fd2244e075f2bce58f8346ed783ad1ffb242a60cbeea78e531b',CHARTE_HASH='47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS=['Question L','Question LI','Question LII','Question LIII','Question LIV','Question LV','Question LVI']
const PREUVES=[
 ['scripts/heptateuque/img/p594.jpg','b88285af65ab7a6f95e625d8d2d683f5ccd700c6b1c5bca95c4f76b6fa87fa1a','Page imprimée 586, fin de la Question XLIX.'],
 ['scripts/heptateuque/img/p595.jpg','963b4cde37b96ba7969c26374488db57cf22fbcdc089df98c284de37209e12db','Page imprimée 587, Questions L à LIII.'],
 ['scripts/heptateuque/img/p596.jpg','8a10415e71426b2aefbb756a60fa361fed747ad05ccdc14a11db753729c5c59f','Page imprimée 588, Questions LIII à LV.'],
 ['scripts/heptateuque/img/p597.jpg','10b93ff5203f24f30fb535313078ebe78085d624f772c968e708c682440c0eb2','Page imprimée 589, Questions LV-LVI et colophon.'],
]
const CORRECTIONS_TEXTE=[
 {n:3242,liveAvant:'</i> ? - Lorsque',candidatAvant:'</i> ? — Lorsque',apres:'</i> ? — Lorsque'},
 {n:3243,liveAvant:'paroles ? - Ils',candidatAvant:'paroles ? – Ils',apres:'paroles ? — Ils'},
 {n:3247,liveAvant:'– Cette dernière',candidatAvant:'– Cette dernière',apres:'— Cette dernière'},
 {n:3250,liveAvant:'ange ? - Quoi',candidatAvant:'ange ? — Quoi',apres:'ange ? — Quoi'},
]
const CORRECTIONS_NOTES=new Map([[3259,['[[900]] II Rois, II, 29.','[[900]] III Rois, II, 29.']]])

const LIENS=[];const add=(n,c,t,m)=>LIENS.push([n,c,t,m]);const both=(n,c,m)=>{add(n,c,1,`${m} — citation, référence ou reprise explicite.`);add(n,c,3,`${m} — passage commenté dans le raisonnement.`)};const explain=(n,ids,m)=>{for(const id of ids)add(n,id,3,`${m} (${id}).`)}

// L — abstinence prescrite à la mère de Samson.
both(3228,'JDG.13.4','L’ange interdit à la mère de Samson le vin, la bière et toute nourriture impure')
for(const id of ['DEU.14.3','DEU.14.7','DEU.14.8','DEU.14.10','DEU.14.12','DEU.14.13','DEU.14.14','DEU.14.15','DEU.14.16','DEU.14.17','DEU.14.18','DEU.14.19'])both(3228,id,'La note Deutéronome 14,3-19 renvoie aux versets qui interdisent effectivement les animaux impurs')
explain(3229,['JDG.13.1','JDG.13.4'],'Le relâchement alimentaire est expliqué par le mal et l’idolâtrie d’Israël au temps de Samson.')

// LI — questions rapportées par la mère de Samson.
both(3230,'JDG.13.6','La mère rapporte avoir interrogé l’homme de Dieu sur son origine et n’avoir pas appris son nom')
for(const n of [3231,3232,3233])explain(n,['JDG.13.6'],'La syntaxe du récit est ponctuée et expliquée pour concilier la question sur l’origine avec l’absence du nom.')

// LII — nazaréat de Samson et prescriptions mosaïques.
for(const id of ['JDG.13.5','JDG.13.7'])both(3234,id,'La mère rapporte le nazaréat jusqu’à la mort mais omet la délivrance d’Israël annoncée auparavant')
explain(3235,['JDG.13.5','JDG.13.7'],'Les différences entre l’annonce initiale et son récit sont attribuées au caractère sélectif de la narration.')
both(3236,'JDG.13.7','Le nazaréat de Samson est déclaré permanent, depuis le sein maternel jusqu’à sa mort')
for(const id of ['NUM.6.2','NUM.6.5','NUM.6.13','NUM.6.18','NUM.6.21'])both(3236,id,'La note Nombres 6,2-21 porte le contraste entre vœu temporaire, durée accomplie et fin du nazaréat')
for(const id of ['JDG.13.4','JDG.13.5','NUM.6.3','NUM.6.5'])both(3237,id,'L’abstinence de vin et l’interdiction du rasoir rapprochent Samson des nazaréens de la Loi')

// LIII — repas, sacrifice et holocauste offerts devant l’ange.
for(const id of ['JDG.13.15','JDG.13.16'])both(3238,id,'Manué, ignorant l’identité de l’ange, veut retenir l’homme et lui préparer un chevreau')
for(const id of ['JDG.13.15','JDG.13.16'])both(3239,id,'L’ange refuse le repas et ordonne que l’holocauste soit offert au Seigneur')
for(const id of ['JDG.13.15','JDG.13.16'])both(3240,id,'La réponse de l’ange distingue le repas, le sacrifice et l’holocauste entièrement consumé')
for(const id of ['JDG.13.16','JDG.13.1'])both(3241,id,'L’holocauste doit être offert au Seigneur dans le contexte de l’infidélité et des quarante années philistines')

// LIV — l’ange, Dieu reconnu en lui, et la crainte de mourir.
for(const id of ['JDG.13.21','JDG.13.22','EXO.33.20'])both(3242,id,'Manué reconnaît l’ange, dit avoir vu Dieu et applique la parole selon laquelle nul ne voit la face divine sans mourir')
explain(3243,['JDG.13.20','JDG.13.21','JDG.13.22'],'La montée de l’ange dans la flamme motive la question : Dieu agissait-il dans l’ange ou l’ange était-il pris pour Dieu ?')
for(const id of ['JDG.13.19','JDG.13.20'])both(3244,id,'Le sacrifice sur la pierre et la montée de l’ange dans la flamme sont cités selon le récit')
for(const id of ['JDG.13.20','JDG.13.21','JDG.13.22'])both(3245,id,'La chute face contre terre, la disparition de l’ange et la parole « nous avons vu Dieu » achèvent la citation')
explain(3246,['JDG.13.21','JDG.13.22'],'L’opposition entre ange du Seigneur et Dieu vu structure l’interprétation.')
both(3247,'JDG.13.21','Manué sait explicitement qu’il a vu l’ange du Seigneur')
explain(3247,['JDG.13.22'],'Sa crainte de mourir exige donc une autre explication que la confusion de l’ange avec Dieu.')
both(3248,'EXO.33.20','La parole divine « ma face » est opposée à une face d’ange')
explain(3248,['JDG.13.21','JDG.13.22'],'Manué reconnaît Dieu agissant dans l’ange et redoute de mourir après cette vision.')
both(3249,'JDG.13.23','L’épouse répond que l’agrément du sacrifice et la révélation des secrets excluent une volonté de les tuer')
both(3250,'JDG.13.16','L’ange avait ordonné que l’holocauste fût offert non à lui, mais au Seigneur')
explain(3250,['JDG.13.20','JDG.13.23'],'La présence de l’ange dans la flamme manifeste l’agrément divin sans faire de l’ange le destinataire du sacrifice.')
both(3251,'ISA.9.5','Le contenu reconnu derrière la note imprimée Is. IX,6 est l’enfant nommé Conseiller, lu ici selon la tradition grecque comme Ange du grand conseil')
explain(3251,['JDG.13.20'],'L’ange dans la flamme figure le Christ prenant la forme de l’esclave et devenant lui-même victime.')

// LV — locution « la jambe sur la cuisse ».
both(3252,'JDG.15.8','La locution décrivant la grande défaite infligée par Samson est citée et interrogée')
both(3253,'JDG.15.15','La mâchoire d’âne avec laquelle Samson tue mille hommes fournit la comparaison explicite')
explain(3253,['JDG.15.8'],'L’hypothèse d’un tibia servant de bâton est rejetée pour expliquer la locution.')
both(3254,'JDG.15.8','La formulation « la jambe sur la cuisse » est citée comme locution inusitée')
explain(3255,['JDG.15.8'],'La jambe posée sur la cuisse est interprétée comme geste de stupeur après une défaite étonnante.')
both(3256,'JDG.15.8','La version faite sur l’hébreu explicite une grande plaie et la stupeur des vaincus')
explain(3257,['JDG.15.8'],'Tibia et jambe sont identifiés pour conclure l’explication lexicale.')

// LVI — locution de mise à mort et parallèle des Rois.
both(3258,'JDG.15.12','Samson demande aux hommes de Juda de jurer qu’ils ne le tueront pas avant de le livrer')
explain(3259,['JDG.15.12'],'Le sens meurtrier de « venir à ma rencontre » est établi par une locution parallèle.')
both(3259,'1KI.2.29','Le fac-similé imprime III Rois II,29 : Salomon ordonne à Banaïas d’aller frapper Joab')
for(const n of [3260,3261])explain(n,['JDG.15.12','1KI.2.29'],'Les locutions usuelles signifiant mettre à mort expliquent le tour employé par Samson et son parallèle dans les Rois.')

const SANS_LIEN=new Map([[3262,'COLOPHON ÉDITORIAL : attribution de la traduction à M. l’abbé Pognon, sans contenu biblique et sans ref_niv2.']])
const sha256=p=>createHash('sha256').update(readFileSync(p)).digest('hex');if(sha256('charte/CHARTE_IA.md')!==CHARTE_HASH)throw Error('Charte modifiée : relire avant toute exécution');for(const[p,h]of PREUVES)if(sha256(p)!==h)throw Error(`Preuve fac-similé modifiée : ${p}`)
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const{data:segments,error}=await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).gte('segment_numero',PREMIER).lte('segment_numero',DERNIER).order('segment_numero');if(error)throw error
if(segments.length!==NB_SEGMENTS||segments.some((s,i)=>s.segment_numero!==PREMIER+i))throw Error('Préétat : bornes ou continuité invalides');if([...new Set(segments.slice(0,-1).map(s=>s.ref_niv2))].join('|')!==QUESTIONS.join('|')||segments.at(-1).ref_niv2!==null)throw Error('Questions ou colophon final invalides');if(segments.some(s=>s.ref_niv1!==REF_NIV1||s.liens_revus_le||s.liens_revus_par))throw Error('Préétat structurel ou relecture invalide')
for(const c of CORRECTIONS_TEXTE)if(!segments.find(s=>s.segment_numero===c.n)?.segment_texte.includes(c.liveAvant))throw Error(`Précondition correction texte invalide au segment ${c.n}`);for(const[n,[a]]of CORRECTIONS_NOTES)if(!segments.find(s=>s.segment_numero===n)?.notes?.includes(a))throw Error(`Précondition correction note invalide au segment ${n}`)
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(EMPREINTE_ATTENDUE!=='A_COMPLETER'&&empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS.map(([n])=>n),...SANS_LIEN.keys()]),nonClasses=segments.filter(s=>!classes.has(s.segment_numero));if(nonClasses.length)throw Error(`Partition incomplète : ${nonClasses.map(s=>s.segment_numero)}`);if(LIENS.some(([n,c,t,m])=>!parNumero.has(n)||!c||![1,2,3,4].includes(t)||!m.trim())||LIENS.some(([n])=>SANS_LIEN.has(n)))throw Error('Manifeste invalide');const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw Error('Doublon interne')
const cibles=[...new Set(LIENS.map(([,c])=>c))],{data:temoins,error:et}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(et)throw et;const temoinsParId=new Map(temoins.map(t=>[t.id_verset,t])),invalides=cibles.filter(c=>{const t=temoinsParId.get(c);return!t||(!t.TR0001&&!t.TR0003&&!t.TR0004)});if(invalides.length)throw Error(`Cibles invalides : ${invalides.join(', ')}`)
const ids=segments.map(s=>s.id),[{count:liensExistants,error:el},{count:relusGlobaux,error:er}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre',OEUVRE).not('liens_revus_le','is',null)]);if(el||er)throw el||er;if(liensExistants)throw Error(`${liensExistants} liens existent déjà dans le lot`)
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',sourceMapPath='scripts/heptateuque/segmentation-candidate/source-map.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8')),sourceMap=JSON.parse(readFileSync(sourceMapPath,'utf8'))
for(const c of CORRECTIONS_TEXTE){const candidat=candidats.find(x=>x.segment_numero===c.n);if(!candidat?.segment_texte.includes(c.candidatAvant))throw Error(`Candidat non synchronisable au segment ${c.n}`);candidat.segment_texte=candidat.segment_texte.replace(c.candidatAvant,c.apres);const sources=sourceMap.filter(x=>x.first_segment_numero<=c.n&&x.last_segment_numero>=c.n&&x.source_clean?.includes(c.candidatAvant));if(sources.length!==1)throw Error(`Source-map non synchronisable au segment ${c.n} : ${sources.length}`);sources[0].source_clean=sources[0].source_clean.replace(c.candidatAvant,c.apres)}
for(const[n,[a,b]]of CORRECTIONS_NOTES){const candidat=candidats.find(x=>x.segment_numero===n);if(!candidat?.notes?.includes(a))throw Error(`Notes candidates non synchronisables au segment ${n}`);candidat.notes=candidat.notes.replace(a,b)}
const TOTAL=LIENS.length,types=LIENS.reduce((o,[,,t])=>{o[t]=(o[t]??0)+1;return o},{}),pct=n=>`${n} / 3262 = ${(100*n/3262).toFixed(2).replace('.',',')} %`;const groupes=[...QUESTIONS,'Colophon final'],parGroupe=Object.fromEntries(groupes.map(q=>{const nums=new Set(segments.filter(s=>q==='Colophon final'?s.ref_niv2===null:s.ref_niv2===q).map(s=>s.segment_numero));return[q,{liens:LIENS.filter(([n])=>nums.has(n)).length,sans_lien:[...SANS_LIEN].filter(([n])=>nums.has(n)).length}]}));const sondage=QUESTIONS.map(q=>{const nums=new Set(segments.filter(s=>s.ref_niv2===q).map(s=>s.segment_numero)),lot=LIENS.filter(([n])=>nums.has(n)),i=parseInt(createHash('sha256').update(`2026-08-02|${q}`).digest('hex').slice(0,8),16)%lot.length,[n,c,t]=lot[i];return{question:q,segment:n,cible:c,type:t}})
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Juges L-LVI et fin',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,corrections_ocr_texte:CORRECTIONS_TEXTE.length,corrections_ocr_notes:CORRECTIONS_NOTES.size,sic_confirmes:0,liens_bibliques:TOTAL,segments_sans_lien:[...SANS_LIEN].map(([segment,motif])=>({segment,motif})),cibles_distinctes:cibles.length,types,par_groupe:parGroupe,sondage,empreinte,charte_hash:CHARTE_HASH,avancement_actuel:pct(relusGlobaux),avancement_potentiel_apres_ecriture:pct(relusGlobaux+NB_SEGMENTS)},null,2));if(DETAIL)for(const[n,c,t,motif]of LIENS){const w=temoinsParId.get(c);console.log({n,c,t,motif,segment:parNumero.get(n).segment_texte,temoin:w.TR0003||w.TR0001||w.TR0004})};if(!WRITE)process.exit(0)
const horodatage=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),sauvegardePath=`scripts/heptateuque/audit-reprise/sauvegarde-juges-q50-q56-fin-${horodatage}.json`;mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(sauvegardePath,`${JSON.stringify({oeuvre:OEUVRE,bornes:[PREMIER,DERNIER],empreinte,segments,liens_existants:[]},null,2)}\n`,'utf8');const quote=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=LIENS.map(([n,c,t,m])=>`(${parNumero.get(n).id},${quote(c)},${t},'vérifié',${quote(m)},'lecture',false)`).join(',\n'),idSql=ids.join(', ')
const correctionsTexteSql=CORRECTIONS_TEXTE.map(c=>`update segments set segment_texte=replace(segment_texte,${quote(c.liveAvant)},${quote(c.apres)}) where id=${parNumero.get(c.n).id} and segment_texte like ${quote(`%${c.liveAvant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction texte ${c.n}: %',n; end if;`).join('\n'),correctionsNotesSql=[...CORRECTIONS_NOTES].map(([n,[a,b]])=>`update segments set notes=replace(notes,${quote(a)},${quote(b)}) where id=${parNumero.get(n).id} and notes like ${quote(`%${a}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction note ${n}: %',n; end if;`).join('\n')
const sql=`do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if; if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; ${correctionsTexteSql} ${correctionsNotesSql} insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens: %',n; end if; update segments set liens_revus_le=now(),liens_revus_par=${quote(RELECTEUR)} where id in (${idSql}); get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments: %',n; end if; end $p$;`;const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:liensApres,error:e1},{count:relusApres,error:e2},{data:audit,error:e3},{data:textes,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,segment_texte,notes').in('id',ids)]);if(e1||e2||e3||e4)throw e1||e2||e3||e4;const post=new Map(textes.map(s=>[s.segment_numero,s])),mauvaisTexte=CORRECTIONS_TEXTE.some(c=>post.get(c.n).segment_texte.includes(c.liveAvant)||!post.get(c.n).segment_texte.includes(c.apres)),mauvaisesNotes=[...CORRECTIONS_NOTES].some(([n,[a,b]])=>post.get(n).notes.includes(a)||!post.get(n).notes.includes(b));if(liensApres!==TOTAL||relusApres!==NB_SEGMENTS||mauvaisTexte||mauvaisesNotes||audit.some(l=>!l.motif||l.provenance!=='lecture'||l.fiabilite!=='vérifié'||l.arbitrage_requis)||audit.some(l=>l.segment_id===parNumero.get(3262).id))throw Error('Postcontrôle invalide');const apres=audit.map(l=>`${l.segment_id}|${l.canon_id}|${l.type}|${l.motif}`);if(new Set(apres).size!==apres.length)throw Error('Doublon postétat');writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8');writeFileSync(sourceMapPath,`${JSON.stringify(sourceMap,null,2)}\n`,'utf8');console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus dont le colophon sans lien ; sauvegarde ${sauvegardePath}`)
