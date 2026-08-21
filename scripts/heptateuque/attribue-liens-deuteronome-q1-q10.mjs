import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE='A0010O0023', REF_NIV1='Livre cinquième', PREMIER=2371, DERNIER=2427, NB_SEGMENTS=57
const WRITE=process.argv.includes('--write'), DETAIL=process.argv.includes('--detail')
const RELECTEUR='Codex (IA) - lecture intégrale Heptateuque, Deutéronome Q. I-X'
const EMPREINTE_ATTENDUE='d1a07111d46865d9eaa17aa0be5d72cb4079385d312e14dfe951bc86f9c4d327'
const QUESTIONS=['Question I','Question II','Question III','Question IV','Question V','Question VI','Question VII','Question VIII','Question IX','Question X']
const PREUVES=[
 ['scripts/heptateuque/img/p537.jpg','66f4db9b850a22ef15c92f2d346802971e6fce48d16d23d1aa93e2564e7d0e25'],
 ['scripts/heptateuque/img/p538.jpg','fe820de78ed2e963b7787effb3ee61b6cc71ccfe5852f1ce20b8a70c140adfef'],
 ['scripts/heptateuque/img/p539.jpg','09b02c191a91e4d8c183a8b4792603ef7d6325be4829811f7c45994c0432dc32'],
 ['scripts/heptateuque/img/p540.jpg','2e81cf7be6399fe56473a949af9289ea8581c662868e8644f20ce4f7d191f97d'],
 ['scripts/heptateuque/img/p541.jpg','a8a72580613ff0e52b4c525f725d6e0abe9b4725c1dfd2a9f93e26676d9f560c'],
]
const CORRECTIONS_NOTES=new Map([[2406,['[[627]] Exo. XXXIII, 2','[[627]] Exo. XXXIII, 11']],[2413,['36#Rem','36']]])
const CORRECTIONS_REF_NIV2_TEXTE=new Map([[2396,['Deutéronome 5, 32, 33','Deutéronome 4, 32-33']]])
const LIENS=[], SANS_CIBLE=[], SANS_LIEN=new Set()
const add=(ns,c,t,m)=>{for(const n of ns)LIENS.push([n,c,t,m])},cite=(n,c,m)=>add([n],c,1,m),com=(ns,c,m)=>add(ns,c,3,m),allusion=(ns,c,m)=>add(ns,c,4,m)
const nonBiblique=(n,g,m)=>SANS_CIBLE.push([n,4,`RÉFÉRENCE NON BIBLIQUE (${g}) : ${m}`])

// I — le concours humain sous le secours divin.
cite(2371,'DEU.1.29','Citation explicite de Moïse demandant au peuple de ne pas s’effrayer et de ne pas craindre ses ennemis.')
cite(2371,'DEU.1.30','Citation explicite du Seigneur marchant devant Israël et combattant lui-même pour lui.')
com([2371],'DEU.1.29','L’exhortation à ne pas craindre suppose que le peuple agisse lui-même avec le secours reçu.')
com([2371],'DEU.1.30','Le combat de Dieu pour son peuple est expliqué comme une aide qui requiert le concours humain.')

// II — endurcissement de Séhon.
cite(2372,'DEU.2.30','Citation explicite de l’endurcissement de l’esprit et du cœur de Séhon afin qu’il soit livré à Israël.')
com([2372,2373,2374,2375],'DEU.2.30','L’endurcissement de Séhon est expliqué par sa résistance, sa défaite et la justice insondable de Dieu.')
cite(2373,'EXO.10.1','Citation explicite de Dieu déclarant avoir endurci le cœur de Pharaon afin d’accomplir ses signes.')
cite(2373,'PSA.104.25','Citation explicite de Dieu changeant le cœur des nations afin qu’elles haïssent son peuple ; cible sémantique malgré le numéro moderne 105.')
cite(2375,'ROM.11.33','Citation explicite des jugements insondables et des voies incompréhensibles de Dieu.')
cite(2375,'ROM.9.14','Citation explicite de la négation de toute injustice en Dieu.')

// III — Og, dernier des Rephaïm.
cite(2376,'DEU.3.11','Citation explicite d’Og resté seul de la race des Rephaïm ; la cible réelle diffère du titre imprimé Deutéronome 3,2.')
com([2376,2377],'DEU.3.11','La variante sur le dernier rejeton des géants et les dimensions de son lit de fer servent à établir la stature d’Og.')
nonBiblique(2376,'tradition textuelle','hébraïsants et manuscrits proposant deux lectures de la formule sur Og et les Rephaïm')

// IV — image et ressemblance.
cite(2378,'DEU.4.16','Citation explicite de l’interdiction de se faire une ressemblance sculptée ou une image quelconque.')
for(const n of [2378,2379,2380,2381,2382,2383,2384,2385,2386,2387])com([n],'DEU.4.16','La distinction entre ressemblance générale et image d’un modèle particulier est développée à partir de l’interdiction mosaïque.')
cite(2382,'GEN.1.27','Citation explicite de Dieu créant l’homme à son image, sans identité de substance entre créature et Créateur.')
com([2382,2383,2384],'GEN.1.27','La création de l’homme à l’image de Dieu est distinguée d’une génération dans la même substance.')
cite(2383,'GEN.1.26','Citation explicite de « Faisons l’homme à notre image et à notre ressemblance ».')
com([2383,2384],'GEN.1.26','L’absence ultérieure du mot ressemblance est confrontée à la formule initiale de la Genèse.')
nonBiblique(2383,'interprétation patristique','plusieurs interprètes attribuant à la ressemblance la réformation future de l’homme par la grâce du Christ')
cite(2385,'EXO.20.4','Référence explicite au Décalogue interdisant toute figure ou ressemblance des êtres créés.')
com([2385,2386],'EXO.20.4','La formulation générale du Décalogue confirme que toute image suppose une ressemblance.')
com([2387],'DEU.4.17','La seule notion de ressemblance appliquée aux animaux terrestres est opposée au portrait individuel humain.')
com([2387],'DEU.4.18','Les ressemblances des reptiles et poissons prolongent l’analyse du vocabulaire des représentations.')

// V — terre, eaux et totalité de l’univers.
cite(2388,'DEU.4.18','Citation explicite de la ressemblance des poissons vivant dans les eaux au-dessous de la terre.')
com([2388,2389,2390],'DEU.4.18','La formule « sous la terre » est interprétée selon l’étendue des eaux et l’élévation de la terre habitable.')
cite(2388,'GEN.1.1','Citation explicite de Dieu créant le ciel et la terre, formule qui peut désigner l’univers entier avec ses eaux.')
cite(2389,'PSA.120.2','Citation explicite du secours venant du Seigneur qui a fait le ciel et la terre ; cible sémantique malgré le numéro moderne 121.')

// VI-VII — astres, usage commun et interdiction des images.
cite(2391,'DEU.4.19','Citation explicite de l’interdiction d’adorer le soleil, la lune et les étoiles donnés à toutes les nations.')
com([2391,2392,2393],'DEU.4.19','Le partage des astres est expliqué comme usage commun réglant le temps, non comme ordre de leur rendre un culte.')
cite(2392,'GEN.1.14','Citation explicite des luminaires établis pour régler les époques, les jours et les années.')
cite(2394,'DEU.4.23','Citation explicite de l’alliance à ne pas oublier et de l’interdiction de fabriquer une ressemblance sculptée.')
com([2394,2395],'DEU.4.23','L’emploi général de ressemblance à l’exclusion d’image confirme la relation logique entre les deux termes.')

// VIII — d’une extrémité du ciel à l’autre.
cite(2396,'DEU.4.32','Citation explicite de l’ordre d’interroger les jours anciens depuis la création de l’homme et d’une extrémité du ciel à l’autre.')
for(const n of [2396,2397,2398,2399,2400])com([n],'DEU.4.32','L’étendue du ciel est interprétée comme l’univers entier, hommes et anges interrogés sur un prodige sans précédent.')
com([2398,2399,2400],'DEU.4.33','La voix du Dieu vivant entendue du milieu du feu sans entraîner la mort précise le prodige évoqué.')
cite(2398,'MAT.24.31','Citation explicite des élus rassemblés depuis une extrémité du ciel jusqu’à l’autre.')
cite(2399,'DEU.4.32','Reprise explicite de la question : s’est-il jamais fait un aussi grand prodige ?')
cite(2399,'DEU.4.33','Citation explicite du peuple entendant la voix du Dieu vivant au milieu des flammes sans mourir.')
cite(2400,'MAT.24.31','Reprise explicite de la formule évangélique sur le rassemblement final des élus aux extrémités du ciel.')

// IX — alliance à Horeb et sens de la vision face à face.
cite(2401,'DEU.5.2','Citation explicite de l’alliance conclue par le Seigneur avec Israël à Horeb.')
cite(2401,'DEU.5.3','Citation explicite de l’alliance conclue non avec les pères, mais avec ceux qui vivent aujourd’hui.')
cite(2401,'DEU.5.4','Citation explicite du Seigneur parlant face à face sur la montagne, du milieu du feu.')
for(const n of [2401,2402,2403,2404])for(const v of [2,3,4])com([n],`DEU.5.${v}`,'L’identité de la génération avec laquelle l’alliance fut conclue et qui entendit Dieu à Horeb est examinée.')
com([2402,2403,2404],'NUM.1.3','Le dénombrement des hommes aptes à la guerre depuis vingt ans sert à identifier la génération condamnée.')
com([2402,2403,2404],'NUM.14.29','L’exclusion de la terre promise des recensés de vingt ans et plus distingue les survivants capables de se souvenir d’Horeb.')
com([2405,2406],'DEU.5.4','Parler face à face est expliqué comme évidence de la présence divine, non vision de la substance de Dieu.')
com([2405,2406],'DEU.4.12','La voix entendue au milieu du feu sans figure visible limite le sens de la formule face à face.')
com([2405],'DEU.4.15','L’absence de toute figure vue à Horeb est confrontée à la parole face à face.')
cite(2406,'EXO.33.11','Citation explicite du Seigneur parlant à Moïse face à face comme un homme à son ami ; note corrigée d’après le fac-similé.')
cite(2407,'EXO.24.18','Référence explicite à Moïse entrant dans la nuée sur la montagne auprès de Dieu.')
cite(2408,'EXO.33.13','Citation septantiste intentionnelle de Moïse demandant à Dieu de se montrer afin qu’il le voie certainement.')
cite(2409,'1CO.13.12','Citation explicite de la vision actuelle dans un miroir et en énigme, opposée à la vision future face à face.')
com([2409,2410,2411,2412],'1CO.13.12','La vision et la connaissance futures face à face sont expliquées comme parfaites selon la mesure humaine, non égales à celles de Dieu.')
cite(2410,'1CO.13.12','Reprise explicite de la connaissance actuelle imparfaite et de la connaissance future comme nous sommes connus.')
cite(2413,'MAT.5.48','Citation explicite de l’ordre d’être parfaits comme le Père céleste est parfait, sans égalité de nature avec lui.')
nonBiblique(2413,'Père de l’Église','renvois internes aux Lettres 92,6 et 147,36 d’Augustin sur l’erreur d’une égalité future avec le Père')

// X — médiation de Moïse, ubiquité de Dieu et variations de formulation.
cite(2414,'DEU.5.5','Citation explicite de Moïse se tenant entre le Seigneur et le peuple pour lui annoncer les paroles divines.')
com([2414,2415,2416,2417,2418,2419,2420,2421,2422,2423],'DEU.5.5','La médiation de Moïse est expliquée sans localiser corporellement la substance divine et selon la syntaxe du récit du Décalogue.')
cite(2416,'JHN.4.21','Citation explicite de l’heure où le Père ne sera adoré ni sur la montagne ni à Jérusalem.')
cite(2416,'JHN.4.22','Citation explicite de l’opposition entre l’adoration ignorante et celle dont le salut vient des Juifs.')
cite(2417,'JHN.4.23','Citation explicite des vrais adorateurs adorant le Père en esprit et en vérité.')
cite(2417,'JHN.4.24','Citation explicite de Dieu esprit, qui doit être adoré en esprit et en vérité.')
com([2418,2421,2423],'EXO.20.18','Les flammes, le tremblement du peuple et son éloignement expliquent la demande d’un médiateur après le Décalogue.')
com([2418,2421,2423],'EXO.20.19','La demande adressée à Moïse de parler à la place de Dieu fonde son rôle d’intermédiaire pour les commandements suivants.')
cite(2419,'DEU.5.5','Reprise explicite de Moïse entre Dieu et le peuple tandis que celui-ci craint le feu et ne monte pas sur la montagne.')
cite(2419,'DEU.5.6','Citation explicite de « Je suis le Seigneur ton Dieu » dont le sujet grammatical est discuté.')
com([2420,2421,2422,2423],'DEU.5.6','Le participe « disant » est rattaché au Seigneur qui prononce le début du Décalogue, non à Moïse.')
cite(2423,'EXO.20.18','Référence explicite au peuple effrayé par les flammes et se tenant à distance.')
cite(2423,'EXO.20.19','Référence explicite à la demande que Moïse apporte désormais les paroles de Dieu.')
for(const n of [2424,2425])for(const v of [23,24,25,26,27])com([n],`DEU.5.${v}`,'Le discours du peuple après la voix et le feu est comparé au récit parallèle de l’Exode.')
cite(2425,'DEU.5.24','Citation explicite du peuple déclarant avoir vu la gloire de Dieu et entendu sa voix du milieu des flammes.')
cite(2425,'EXO.20.19','Référence explicite à la formulation parallèle de l’Exode où le peuple demande à Moïse de parler.')
com([2426,2427],'DEU.5.24','La variation des mots entre Deutéronome et Exode est défendue comme fidélité à une même pensée.')
com([2426,2427],'EXO.20.19','La formulation différente de l’Exode illustre que la vérité d’une pensée ne dépend pas d’une identité verbale absolue.')

for(const[path,hash]of PREUVES)if(createHash('sha256').update(readFileSync(path)).digest('hex')!==hash)throw Error(`Fac-similé modifié : ${path}`)
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const{data:segments,error}=await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre',OEUVRE).eq('ref_niv1',REF_NIV1).in('ref_niv2',QUESTIONS).order('segment_numero');if(error)throw error
if(segments.length!==NB_SEGMENTS||segments.some((s,i)=>s.segment_numero!==PREMIER+i))throw Error('Préétat : bornes ou continuité invalides')
if([...new Set(segments.map(s=>s.ref_niv2))].join('|')!==QUESTIONS.join('|'))throw Error('Questions incomplètes ou désordonnées')
if(segments.some(s=>s.ref_niv1!==REF_NIV1||s.liens_revus_le||s.liens_revus_par))throw Error('Préétat structurel ou relecture invalide')
for(const[n,[a]]of CORRECTIONS_NOTES)if(!segments.find(s=>s.segment_numero===n)?.notes?.includes(a))throw Error(`Précondition note invalide ${n}`)
for(const[n,[a]]of CORRECTIONS_REF_NIV2_TEXTE)if(!segments.find(s=>s.segment_numero===n)?.ref_niv2_texte?.includes(a))throw Error(`Précondition titre invalide ${n}`)
const empreinte=createHash('sha256').update(JSON.stringify(segments.map(s=>[s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.notes]))).digest('hex');if(empreinte!==EMPREINTE_ATTENDUE)throw Error(`Préétat modifié : ${empreinte}`)
const pn=new Map(segments.map(s=>[s.segment_numero,s])),classes=new Set([...LIENS,...SANS_CIBLE].map(x=>x[0])),nc=segments.filter(s=>!classes.has(s.segment_numero)&&!SANS_LIEN.has(s.segment_numero));if(nc.length)throw Error(`Partition incomplète : ${nc.map(s=>s.segment_numero)}`)
if([...SANS_LIEN].some(n=>classes.has(n)||!pn.has(n)))throw Error('SANS_LIEN invalide')
if(LIENS.some(([n,c,t,m])=>!pn.has(n)||!c||![1,2,3,4].includes(t)||!m.trim()))throw Error('Manifeste biblique invalide')
if(SANS_CIBLE.some(([n,t,m])=>!pn.has(n)||t!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(m)))throw Error('Référence sans cible invalide')
const cles=LIENS.map(([n,c,t])=>`${n}|${c}|${t}`);if(new Set(cles).size!==cles.length)throw Error('Doublon interne')
const cibles=[...new Set(LIENS.map(x=>x[1]))],{data:temoins,error:et}=await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset',cibles);if(et)throw et
const tm=new Map(temoins.map(v=>[v.id_verset,v])),invalides=cibles.filter(c=>{const v=tm.get(c);return!v||(!v.TR0001&&!v.TR0003&&!v.TR0004)});if(invalides.length)throw Error(`Cibles invalides : ${invalides}`)
const ids=segments.map(s=>s.id),[{count:ex,error:ee},{count:relusGlobaux,error:er}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).eq('id_oeuvre',OEUVRE).not('liens_revus_le','is',null)]);if(ee||er)throw(ee||er);if(ex)throw Error(`${ex} liens existants`)
const candidatsPath='scripts/heptateuque/segmentation-candidate/segments-candidate.json',candidats=JSON.parse(readFileSync(candidatsPath,'utf8'))
for(const s of segments){const c=candidats.find(x=>x.segment_numero===s.segment_numero);if(!c||c.ref_niv1!==s.ref_niv1||c.ref_niv2!==s.ref_niv2)throw Error(`Candidat structurellement désynchronisé ${s.segment_numero}`)}
for(const[n,[a,b]]of CORRECTIONS_NOTES){const c=candidats.find(x=>x.segment_numero===n);if(!c?.notes?.includes(a))throw Error(`Candidat note non synchronisable ${n}`);c.notes=c.notes.replace(a,b)}
for(const[n,[a,b]]of CORRECTIONS_REF_NIV2_TEXTE){const c=candidats.find(x=>x.segment_numero===n);if(!c?.ref_niv2_texte?.includes(a))throw Error(`Candidat titre non synchronisable ${n}`);c.ref_niv2_texte=c.ref_niv2_texte.replace(a,b)}
const TOTAL=LIENS.length+SANS_CIBLE.length,types=LIENS.reduce((a,x)=>(a[x[2]]=(a[x[2]]??0)+1,a),{});for(const[,t]of SANS_CIBLE)types[t]=(types[t]??0)+1
const pct=n=>`${n} / 3262 = ${(100*n/3262).toFixed(2).replace('.',',')} %`
console.log(JSON.stringify({mode:WRITE?'écriture':'contrôle',lot:'Deutéronome I-X',bornes:[PREMIER,DERNIER],segments:NB_SEGMENTS,corrections_notes:CORRECTIONS_NOTES.size,corrections_titres:CORRECTIONS_REF_NIV2_TEXTE.size,liens_cibles:LIENS.length,references_non_bibliques:SANS_CIBLE.length,total_liens:TOTAL,sans_lien:[...SANS_LIEN],cibles_distinctes:cibles.length,types,empreinte,avancement_actuel:pct(relusGlobaux),avancement_potentiel_apres_ecriture:pct(relusGlobaux+NB_SEGMENTS)},null,2))
if(DETAIL)for(const[n,c,t,m]of LIENS){const v=tm.get(c);console.log({n,c,t,m,segment:pn.get(n).segment_texte,temoin:v.TR0003||v.TR0001||v.TR0004})}if(!WRITE)process.exit(0)

const horodatage=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),sauvegardePath=`scripts/heptateuque/audit-reprise/sauvegarde-deuteronome-q1-q10-${horodatage}.json`;mkdirSync('scripts/heptateuque/audit-reprise',{recursive:true});writeFileSync(sauvegardePath,`${JSON.stringify({oeuvre:OEUVRE,bornes:[PREMIER,DERNIER],empreinte,segments,liens_existants:[]},null,2)}\n`,'utf8')
const q=v=>`'${String(v).replaceAll("'","''")}'`,valeurs=[...LIENS.map(([n,c,t,m])=>`(${pn.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),...SANS_CIBLE.map(([n,t,m])=>`(${pn.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`) ].join(',\n    '),idSql=ids.join(', ')
const notesSql=[...CORRECTIONS_NOTES].map(([n,[a,b]])=>`update segments set notes = replace(notes, ${q(a)}, ${q(b)}) where id = ${pn.get(n).id} and notes like ${q(`%${a}%`)};\n  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note ${n}: %/1', n; end if;`).join('\n  ')
const titresSql=[...CORRECTIONS_REF_NIV2_TEXTE].map(([n,[a,b]])=>`update segments set ref_niv2_texte = replace(ref_niv2_texte, ${q(a)}, ${q(b)}) where id = ${pn.get(n).id} and ref_niv2_texte like ${q(`%${a}%`)};\n  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction titre ${n}: %/1', n; end if;`).join('\n  ')
const sql=`do $p$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  ${notesSql}
  ${titresSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens insérés : %', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments relus : %', n; end if;
end $p$;`
const{error:ew}=await sb.rpc('exec_sql',{sql});if(ew)throw ew
const[{count:la,error:e1},{count:ra,error:e2},{data:audit,error:e3},{data:apres,error:e4}]=await Promise.all([sb.from('liens_bibliques').select('id',{count:'exact',head:true}).in('segment_id',ids),sb.from('segments').select('id',{count:'exact',head:true}).in('id',ids).not('liens_revus_le','is',null),sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id',ids),sb.from('segments').select('segment_numero,notes,ref_niv2_texte').in('id',ids)]);if(e1||e2||e3||e4)throw(e1||e2||e3||e4)
const am=new Map(apres.map(s=>[s.segment_numero,s])),ci=[...CORRECTIONS_NOTES].some(([n,[a,b]])=>am.get(n).notes.includes(a)||!am.get(n).notes.includes(b))||[...CORRECTIONS_REF_NIV2_TEXTE].some(([n,[a,b]])=>am.get(n).ref_niv2_texte.includes(a)||!am.get(n).ref_niv2_texte.includes(b))
if(la!==TOTAL||ra!==NB_SEGMENTS||ci||audit.some(l=>!l.motif||l.provenance!=='lecture'||(l.canon_id?(l.fiabilite!=='vérifié'||l.arbitrage_requis):(l.fiabilite!=='à constituer'||!l.arbitrage_requis||l.type!==4||!/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(l.motif)))))throw Error('Postcontrôle invalide')
const ca=audit.map(l=>`${l.segment_id}|${l.canon_id??'sans-cible'}|${l.type}|${l.motif}`);if(new Set(ca).size!==ca.length)throw Error('Doublon postétat')
writeFileSync(candidatsPath,`${JSON.stringify(candidats,null,2)}\n`,'utf8');console.log(`✓ ${la} liens ; ${ra} segments relus ; sauvegarde ${sauvegardePath}`)
