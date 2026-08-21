// Lecture intégrale de l'Homélie XXI (A0014O0038, segments 2136-2239).
//   node scripts/chrysostome-antioche-hom21-lecture.mjs --dry|--write
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(x => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write'), OEUVRE = 'A0014O0038'
const V = [
  [2140,'HEB.3.7',1,'citation annoncée : aujourd’hui, si vous entendez sa voix'],[2140,'HEB.3.8',1,'suite de la citation : n’endurcissez point vos cœurs'],
  [2144,'JOB.1.1',1,'citation annoncée de Job, homme de Hus, juste, simple et ennemi du vice'],[2145,'ECC.12.13',1,'citation annoncée : craindre Dieu et observer ses commandements constitue tout l’homme'],
  [2147,'MAT.10.42',2,'reprise fondue du verre d’eau confié au Christ qui ne perd pas sa récompense'],[2151,'JHN.1.5',1,'citation de la lumière qui luit dans les ténèbres sans être éteinte'],
  [2155,'GAL.3.27',1,'citation : ceux qui ont reçu le baptême ont revêtu Jésus-Christ'],[2156,'JHN.6.57',1,'citation : celui qui mange la chair du Christ vivra par lui'],[2156,'JHN.6.56',1,'citation : celui qui mange sa chair demeure en lui et lui en cet homme'],[2156,'JHN.15.5',1,'citation : le Christ est la vigne et les fidèles les rameaux'],
  [2157,'JHN.15.15',1,'citation : je ne vous appellerai plus serviteurs, vous êtes mes amis'],[2157,'2CO.11.2',1,'citation paulinienne des fidèles accordés au Christ comme une vierge chaste'],[2157,'ROM.8.29',1,'citation du Christ aîné de plusieurs frères'],[2158,'1CO.12.27',2,'reprise fondue des fidèles comme corps du Christ et ses membres'],
  [2164,'MAT.22.11',2,'reprise de l’invité aux noces dépourvu de robe nuptiale'],[2164,'MAT.22.12',2,'application de la robe nuptiale à la préparation baptismale'],
  [2169,'HEB.10.29',2,'reprise du surcroît de culpabilité après avoir reçu la grâce et la sanctification'],[2170,'MAT.3.8',1,'citation de Jean : faites des fruits dignes de pénitence'],[2170,'MAT.3.9',1,'suite : ne dites pas qu’Abraham est votre père'],[2171,'ACT.2.38',1,'citation de la réponse de Pierre : pénitence et baptême au nom de Jésus-Christ'],
  [2195,'PRO.10.19',1,'citation fondue mais signalée : parler beaucoup rend difficile d’éviter le péché'],[2200,'LUK.21.2',2,'reprise narrative de la pauvre veuve donnant deux oboles'],[2200,'LUK.21.3',2,'reprise de la veuve surpassant la libéralité des riches'],[2200,'LUK.21.4',2,'application de l’offrande tirée de l’indigence'],
  [2212,'1TI.2.9',1,'citation annoncée contre frisure, or, pierreries et parure somptueuse'],[2212,'1TI.2.10',2,'contraste paulinien implicite avec la véritable parure des bonnes œuvres'],
  [2220,'1CO.6.20',2,'reprise fondue des chrétiens achetés à grand prix'],[2223,'1PE.1.18',2,'développement sur le prix du rachat supérieur à l’or et à l’argent'],[2223,'1PE.1.19',2,'reprise du rachat par le précieux sang du Christ'],
  [2227,'MAT.5.44',2,'reprise du commandement d’aimer même ses ennemis'],[2231,'MAT.5.28',2,'reprise distinctive de l’adultère commis dans le cœur par le regard'],[2236,'JAS.2.19',1,'citation fondue : les démons eux-mêmes croient et reconnaissent Dieu'],
]
const plage=(a,b,c,m)=>Array.from({length:b-a+1},(_,i)=>[a+i,c,3,m])
const C=[...plage(2164,2166,'MAT.22.11','application suivie de la robe nuptiale à la dignité et à la conservation de la grâce baptismale'),...plage(2169,2175,'MAT.3.8','commentaire suivi des fruits de pénitence nécessaires avant le baptême'),...plage(2212,2217,'1TI.2.9','application suivie du refus de la parure luxueuse et de la préférence pour les bonnes œuvres'),...plage(2220,2224,'1CO.6.20','commentaire du rachat des fidèles au prix du sang du Christ')]
const {data:segments,error:e1}=await sb.from('segments').select('id,segment_numero,segment_texte,notes').eq('id_oeuvre',OEUVRE).gte('segment_numero',2136).lte('segment_numero',2239).order('segment_numero'); if(e1)throw e1
if(segments.length!==104)throw new Error(`104 segments attendus, ${segments.length} trouvés`)
const parNumero=new Map(segments.map(s=>[s.segment_numero,s])), cibles=[...new Set([...V,...C].map(x=>x[1]))]
const {data:vv,error:e2}=await sb.from('versets_lecture').select('id_verset').in('id_verset',cibles);if(e2)throw e2
const ok=new Set(vv.map(x=>x.id_verset)), abs=cibles.filter(x=>!ok.has(x));if(abs.length)throw new Error(`Cibles absentes : ${abs.join(', ')}`)
const rows=[...V,...C].map(([n,canon_id,type,motif])=>({segment_id:parNumero.get(n)?.id,canon_id,livre:null,chapitre:null,type,fiabilite:'probable',motif,provenance:'lecture',arbitrage_requis:false}))
const cle=l=>`${l.segment_id}|${l.canon_id}|${l.type}|${l.motif}`;if(new Set(rows.map(cle)).size!==rows.length)throw new Error('Doublon interne')
const ids=segments.map(s=>s.id),{data:ex,error:e3}=await sb.from('liens_bibliques').select('segment_id,canon_id,type,motif').in('segment_id',ids);if(e3)throw e3
const deja=new Set(ex.map(cle)), ajout=rows.filter(x=>!deja.has(cle(x)))
const appels=segments.flatMap(s=>[...s.segment_texte.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map(m=>m[1])),defs=segments.flatMap(s=>[...(s.notes??'').matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map(m=>m[1]))
if(appels.length!==defs.length||appels.some(x=>!defs.includes(x))||defs.some(x=>!appels.includes(x)))throw new Error(`Bijection notes invalide : ${appels.length}/${defs.length}`)
const types=rows.reduce((a,x)=>({...a,[x.type]:(a[x.type]??0)+1}),{});console.log(`Homélie XXI : ${rows.length} liens · types ${JSON.stringify(types)} · ${ajout.length} à écrire · notes ${appels.length}/${defs.length}`)
if(!WRITE)process.exit(0)
for(let i=0;i<ajout.length;i+=200){const{error}=await sb.from('liens_bibliques').insert(ajout.slice(i,i+200));if(error)throw error}
const{error:e4}=await sb.from('segments').update({liens_revus_le:new Date().toISOString(),liens_revus_par:'Codex (IA) — lecture intégrale Homélie XXI'}).in('id',ids);if(e4)throw e4
console.log(`✓ ${ajout.length} liens écrits ; ${ids.length} segments marqués relus`)
