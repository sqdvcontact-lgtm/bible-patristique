import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE='A0010O0023',REF_NIV1='Livre septième',PREMIER=2883,DERNIER=2924,NB_SEGMENTS=42
const WRITE=process.argv.includes('--write'),DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Juges Q. I-X'
const EMPREINTE_ATTENDUE='b96c006778af94cbaec0301e047c540e74faaeeb613eb82d93794942b77a237a'
const CHARTE_HASH='47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS=['Question I','Question II','Question III','Question IV','Question V','Question VI','Question VII','Question VIII','Question IX','Question X']
const PREUVES=[
 ['scripts/heptateuque/img/p573.jpg','148bc4e4dd2ee28f4ab87c3d71725fde4fd7088263f7453d4c443215a2b9fc70','Page imprimée 565 : ouverture du Livre VII et Questions I-III.'],
 ['scripts/heptateuque/img/p574.jpg','73c16e19e2ffa354f83af3d427fd88ce3d9622a94a01ee4a645228058f018e76','Page imprimée 566 : Questions III-VII.'],
 ['scripts/heptateuque/img/p575.jpg','06b582fb4064b0e26fd1d2c14ffe9b3debfa6932e83b6313c05bcfb0e3a7b66d','Page imprimée 567 : Questions VII-X et raccord avec XI.'],
]
const CORRECTIONS_TEXTE=new Map([
 [2893,['Josué [[802]]','Josué[[802]]']],
 [2899,['l’obtient [[803]]','l’obtient[[803]]']],
 [2907,['Dieu [[804]]','Dieu[[804]]']],
 [2915,['Josué [[807]]','Josué[[807]]']],
 [2920,['</i>?','</i> ?']],
])
const CORRECTIONS_NOTES=new Map()

const LIENS=[]
const add=(n,c,t,m)=>LIENS.push([n,c,t,m])
const cite=(n,c,m)=>add(n,c,1,m)
const allusion=(n,c,m)=>add(n,c,2,m)
const com=(ns,c,m)=>{for(const n of ns)add(n,c,3,m)}
const SANS_CIBLE=[]
const nonBiblique=(n,g,m)=>SANS_CIBLE.push([n,4,`RÉFÉRENCE NON BIBLIQUE (${g}) : ${m}`])

// I — raccord chronologique entre la fin de Josué et le début des Juges.
for(const c of ['JOS.24.29','JOS.24.31','JDG.2.10','JDG.2.11'])allusion(2883,c,'Le raccord narratif résume la mort de Josué, la génération qui lui survécut puis la chute d’Israël dans l’idolâtrie.')
com([2883,2884],'JDG.1.1','Le commencement détaillé du livre est situé après la mort de Josué, avant le récit récapitulatif de l’idolâtrie.')
com([2884],'JDG.2.11','L’idolâtrie sert de borne postérieure à la reprise chronologique expliquée par Augustin.')

// II — Juda désigne la tribu et s’associe à Siméon.
cite(2885,'JDG.1.1','Citation explicite de la consultation du Seigneur après la mort de Josué.')
cite(2885,'JDG.1.2','Citation explicite de la réponse divine ordonnant à Juda de marcher.')
com([2886,2887,2888],'JDG.1.2','Le nom de Juda est interprété collectivement comme celui de la tribu choisie pour ouvrir la guerre.')
allusion(2887,'JDG.3.9','Othoniel fils de Cénez est expressément rappelé comme premier juge suscité après Josué.')
cite(2889,'JDG.1.3','Citation explicite de Juda parlant à Siméon son frère.')
cite(2890,'JDG.1.3','Citation explicite de l’alliance militaire proposée par Juda à Siméon.')
com([2891],'JDG.1.3','Le verset est expliqué comme une entraide réciproque entre deux tribus.')

// III — prise de Dabir et double récit, par anticipation puis dans son ordre.
cite(2892,'JDG.1.12','Citation explicite de la promesse de Caleb au vainqueur de la Cité des lettres.')
cite(2893,'JOS.15.16','La note renvoie explicitement au récit parallèle de la promesse de Caleb.')
com([2893,2897,2898],'JDG.1.12','La promesse de Caleb est comparée à son récit antérieur dans Josué et replacée après la mort de Josué.')
com([2893,2897,2898],'JOS.15.16','Le double récit de la fille de Caleb donnée au vainqueur est expliqué par anticipation narrative.')
com([2894],'JDG.1.9','Le paragraphe introduit la suite des combats de Juda contre les Chananéens.')
cite(2895,'JDG.1.2','Reprise explicite de la parole divine : Juda marchera.')
cite(2895,'JDG.1.9','Citation explicite de la descente de Juda vers la montagne, le midi et la plaine.')
cite(2896,'JDG.1.10','Citation explicite du combat à Hébron et de la défaite des fils d’Énac.')
cite(2896,'JDG.1.11','Citation explicite de la marche de Juda contre Dabir, ancienne Cité des lettres.')
cite(2897,'JDG.1.12','Fin de la citation continue de la promesse de Caleb.')
com([2894,2895,2896,2897],'JOS.15.13','Le récit de Josué donne par anticipation Hébron à Caleb et introduit le même ensemble narratif.')
com([2896,2897],'JOS.15.15','Le parallèle de Josué rapporte la marche contre Dabir, anciennement Cariath-Sépher.')

// IV — concordance des récits concernant Axa et les sources d’eau.
cite(2899,'JOS.15.18','Citation explicite du départ d’Axa, de son conseil avec Othoniel et de sa demande à Caleb.')
cite(2899,'JOS.15.19','La note embrasse aussi la demande d’un champ et le don des sources supérieures et inférieures.')
cite(2900,'JDG.1.14','Citation explicite de l’avertissement donné par Othoniel à Axa pendant le voyage.')
cite(2900,'JOS.15.18','Citation explicite de la formulation parallèle « comme elle se mettait en chemin ».')
com([2901,2902],'JDG.1.14','Le conseil donné par le mari est concilié avec la formulation du livre de Josué.')
com([2901,2902],'JOS.15.18','Le conseil d’Axa avec son mari est analysé comme incluant l’avis qu’il lui donna.')
cite(2903,'JDG.1.15','Citation explicite du don des sources ou lieux élevés et bas.')
com([2903,2904,2905],'JOS.15.19','Les deux récits du don des sources supérieures et inférieures sont interprétés ensemble.')
com([2904,2905],'JDG.1.15','Le « rachat » des lieux élevés et bas est expliqué comme visant les cours d’eau nécessaires au champ.')

// V — résistance ennemie permise comme remède à l’orgueil.
cite(2906,'JDG.1.18','Citation explicite, selon le texte grec suivi par Augustin, des villes côtières non possédées par Juda.')
cite(2906,'JDG.1.19','Citation explicite de la montagne occupée et de l’obstacle des chars de fer dans la vallée.')
cite(2907,'JOS.21.43','Citation explicite du Seigneur donnant à Israël toute la terre promise.')
nonBiblique(2907,'renvoi interne','renvoi explicite à la Question XXI sur Josué de la présente œuvre ; cible intertextuelle à constituer.')
com([2907,2908],'JOS.21.43','Le don de toute la terre est concilié avec la persistance de territoires non occupés.')
com([2908,2909,2910,2911],'JDG.1.19','La résistance des habitants de la vallée et leurs chars de fer sont interprétés comme une épreuve providentielle contre l’orgueil.')
cite(2911,'2CO.12.7','Citation explicite de l’ange de Satan donné à Paul pour le souffleter et prévenir son orgueil.')

// VI — Hébron donnée à Caleb : récapitulation.
cite(2912,'JDG.1.20','Citation explicite d’Hébron donnée à Caleb et de l’expulsion des trois fils d’Énac.')
for(const c of ['JOS.15.13','JOS.15.14'])cite(2912,c,'La note renvoie explicitement au récit parallèle du don d’Hébron à Caleb et de l’expulsion des trois fils d’Énac.')
com([2913],'JDG.1.20','Le fait est reconnu comme une récapitulation insérée dans l’histoire de Juda.')
com([2913],'JOS.15.13','Le récit antérieur de Josué est comparé à la récapitulation du livre des Juges.')

// VII — partage de Jérusalem entre Juda et Benjamin et survivance des Jébuséens.
cite(2914,'JDG.1.21','Citation explicite des Jébuséens demeurant avec Benjamin à Jérusalem.')
cite(2914,'JDG.1.8','Référence explicite à la prise et à l’incendie antérieurs de Jérusalem par Juda.')
cite(2915,'JOS.15.63','La note vise sémantiquement la survivance des Jébuséens à Jérusalem dans le lot de Juda, malgré sa numérotation ancienne fautive.')
cite(2915,'JOS.18.28','La note renvoie explicitement à Jébus, c’est-à-dire Jérusalem, dans l’héritage de Benjamin.')
for(const c of ['1KI.12.20','1KI.12.21'])allusion(2916,c,'La séparation sous Jéroboam est rappelée : Juda et Benjamin restent attachés à la maison de David et à Jérusalem.')
com([2917],'JDG.1.8','La prise et l’incendie de la ville par Juda sont distingués de l’extermination absolue de tous les Jébuséens.')
com([2917,2918,2919],'JDG.1.21','La présence ultérieure des Jébuséens avec Benjamin est expliquée par des survivants restés hors de la ville ou enfuis.')

// VIII — Bethsan/Scythopolis et tradition historique sur les Scythes.
cite(2920,'JDG.1.27','Citation explicite de Bethsan, présentée dans le texte grec comme ville des Scythes, non obtenue par Manassé.')
nonBiblique(2920,'tradition géographique non identifiée','identification de Bethsan à la Scythopolis contemporaine ; source à constituer.')
com([2921,2922],'JDG.1.27','L’histoire des expéditions lointaines des Scythes sert à expliquer la désignation de Bethsan comme ville des Scythes.')
nonBiblique(2921,'histoire profane','comparaison avec la fondation d’Alexandrie par Alexandre et hypothèse d’une fondation analogue de Scythopolis ; source à constituer.')
nonBiblique(2922,'histoire profane','récit de la domination des Scythes sur l’Asie et de leur marche contre un roi d’Égypte ; source à constituer.')

// IX-X — « filles » d’une métropole et double récit de la sujétion des Chananéens.
cite(2923,'JDG.1.27','Citation explicite de Bethsan et de ses dépendances, appelées ses filles.')
cite(2924,'JDG.1.28','Citation explicite d’Israël soumettant le Chananéen au tribut sans l’exterminer.')
cite(2924,'JOS.17.13','La note vise sémantiquement le récit parallèle de la corvée imposée aux Chananéens sans expulsion complète ; la numérotation imprimée ancienne indique 17,18.')

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
if(voisins.length!==2||voisins[0].segment_numero!==2882||voisins[0].ref_niv1!=='Livre sixième'||voisins[1].segment_numero!==2925||voisins[1].ref_niv2!=='Question XI')throw Error('Raccords du lot invalides')
for(const[n,[a]]of CORRECTIONS_TEXTE)if(!segments.find(s=>s.segment_numero===n)?.segment_texte.includes(a))throw Error(`Précondition texte invalide ${n}`)
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex')
if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const pn=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS,...SANS_CIBLE].map(x=>x[0])),nc=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nc.length)throw Error(`Partition incomplète : ${nc.map(s=>s.segment_numero)}`)
if(LIENS.some(([n,c,t,m])=>!pn.has(n)||!c||![1,2,3,4].includes(t)||!m.trim()))throw Error('Manifeste biblique invalide')
if(SANS_CIBLE.some(([n,t,m])=>!pn.has(n)||t!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(m)))throw Error('Référence sans cible invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`),vus=new Set(),doublons=cles.filter(k=>vus.has(k)||!vus.add(k));if(doublons.length)throw Error(`Doublon interne : ${doublons}`)
const cibles=[...new Set(LIENS.map(x=>x[1]))],{data:temoins,error:et}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(et)throw et
const tm=new Map(temoins.map(v=>[v.id_verset,v])),invalides=cibles.filter(c=>{const v=tm.get(c);return!v||(!v.TR0001&&!v.TR0003&&!v.TR0004)});if(invalides.length)throw Error(`Cibles invalides : ${invalides}`)
const ids=segments.map(s=>s.id),[{count:ex,error:ee},{count:relusGlobaux,error:er}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre',OEUVRE).not('liens_revus_le','is',null)]);if(ee||er)throw(ee||er);if(ex)throw Error(`${ex} liens existants`)
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',sourceMapPath='scripts/heptateuque/segmentation-candidate/source-map.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8')),sourceMap=JSON.parse(readFileSync(sourceMapPath,'utf8'))
for(const s of segments){const c=candidats.find(x=>x.segment_numero===s.segment_numero);if(!c||c.ref_niv1!==s.ref_niv1||c.ref_niv2!==s.ref_niv2)throw Error(`Candidat désynchronisé ${s.segment_numero}`)}
for(const[n,[a,b]]of CORRECTIONS_TEXTE){const c=candidats.find(x=>x.segment_numero===n);if(!c?.segment_texte.includes(a))throw Error(`Candidat texte non synchronisable ${n}`);c.segment_texte=c.segment_texte.replace(a,b);const src=sourceMap.filter(x=>x.first_segment_numero<=n&&x.last_segment_numero>=n&&x.source_clean?.includes(a));if(src.length!==1)throw Error(`Source-map non synchronisable ${n}: ${src.length}`);src[0].source_clean=src[0].source_clean.replace(a,b)}
const TOTAL=LIENS.length+SANS_CIBLE.length,types=LIENS.reduce((a,x)=>(a[x[2]]=(a[x[2]]??0)+1,a),{});for(const[,t]of SANS_CIBLE)types[t]=(types[t]??0)+1
const pct=n=>`${n} / 3262 = ${(100*n/3262).toFixed(2).replace('.',',')} %`
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Juges I-X',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,corrections_texte:CORRECTIONS_TEXTE.size,corrections_notes:0,sic_confirmes:0,liens_cibles:LIENS.length,references_non_bibliques:SANS_CIBLE.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,empreinte,charte_hash:sha256('charte/CHARTE_IA.md'),avancement_actuel:pct(relusGlobaux),avancement_potentiel_apres_ecriture:pct(relusGlobaux+NB_SEGMENTS)},null,2))
if(DETAIL)for(const[n,c,t,m]of LIENS){const v=tm.get(c);console.log({n,c,t,m,segment:pn.get(n).segment_texte,temoin:v.TR0003||v.TR0001||v.TR0004})}if(!WRITE)process.exit(0)

const horodatage=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),sauvegardePath=`scripts/heptateuque/audit-reprise/sauvegarde-juges-q1-q10-${horodatage}.json`;mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(sauvegardePath,`${JSON.stringify({oeuvre:OEUVRE,bornes:[PREMIER,DERNIER],empreinte,segments,liens_existants:[]},null,2)}\n`,'utf8')
const q=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=[...LIENS.map(([n,c,t,m])=>`(${pn.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),...SANS_CIBLE.map(([n,t,m])=>`(${pn.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`) ].join(',\n    '),idSql=ids.join(', ')
const textesSql=[...CORRECTIONS_TEXTE].map(([n,[a,b]])=>`update segments set segment_texte=replace(segment_texte,${q(a)},${q(b)}) where id=${pn.get(n).id} and segment_texte like ${q(`%${a}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction texte ${n}: %/1',n; end if;`).join('\n  ')
const sql=`do $p$ declare n integer; begin
 if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
 if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
 ${textesSql}
 insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens insérés: %',n; end if;
 update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql}); get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments relus: %',n; end if;
end $p$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:la,error:e1},{count:ra,error:e2},{data:audit,error:e3},{data:apres,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,segment_texte').in('id',ids)]);if(e1||e2||e3||e4)throw(e1||e2||e3||e4)
const am=new Map(apres.map(s=>[s.segment_numero,s])),ci=[...CORRECTIONS_TEXTE].some(([n,[a,b]])=>(!b.includes(a)&&am.get(n).segment_texte.includes(a))||!am.get(n).segment_texte.includes(b))
if(la!==TOTAL||ra!==NB_SEGMENTS||ci||audit.some(l=>!l.motif||l.provenance!=='lecture'||(l.canon_id?(l.fiabilite!=='vérifié'||l.arbitrage_requis):(l.fiabilite!=='à constituer'||!l.arbitrage_requis||l.type!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(l.motif)))))throw Error('Postcontrôle invalide')
const ca=audit.map(l=>`${l.segment_id}|${l.canon_id??'sans-cible'}|${l.type}|${l.motif}`);if(new Set(ca).size!==ca.length)throw Error('Doublon postétat')
writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8');writeFileSync(sourceMapPath,`${JSON.stringify(sourceMap,null,2)}\n`,'utf8');console.log(`✓ ${la} liens ; ${ra} segments relus ; sauvegarde ${sauvegardePath}`)
