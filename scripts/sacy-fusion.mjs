// Fusion + contrôle d'un livre de Sacy transcrit depuis le fac-similé. Générique.
//   node scripts/sacy-fusion.mjs <CODE_CANON> <prefixe_lots> [A B C ...]
//   ex : node scripts/sacy-fusion.mjs EXO exo_ A B C D E F G
// Écrit <prefixe>transcrit.json et signale les anomalies. Ne corrige rien en aveugle.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const [CODE, PREFIXE, ...LOTS] = process.argv.slice(2)
if (!CODE || !PREFIXE || !LOTS.length){ console.error('usage : <CODE> <prefixe> <lots…>'); process.exit(1) }

// ── collecte ──
// Les lots peuvent couvrir plusieurs livres : chaque verset porte alors un champ « livre ».
// On ne retient que ceux du livre demandé. Un lot sans champ « livre » est réputé mono-livre.
const frags = new Map(); const absents = []; let ecartes = 0
for (const L of LOTS){
  // Un livre peut s'étendre sur deux trains, donc sur deux préfixes de lots (Esdras est
  // à cheval sur « rois_ » et « esd_ »). Un lot peut donc s'écrire « prefixe:lot » pour
  // désigner un autre train ; sans préfixe explicite, celui de la ligne de commande.
  const f = D + (L.includes(':') ? L.replace(':', '') : `${PREFIXE}${L}`) + '.json'
  if (!existsSync(f)){ absents.push(L); continue }
  for (const p of JSON.parse(readFileSync(f,'utf8')).pages)
    for (const v of p.versets||[]){
      if (v.livre && v.livre !== CODE){ ecartes++; continue }
      const k = v.ch+'.'+v.v
      // Depuis la consigne « tout texte vu doit figurer dans un verset », les transcripteurs
      // marquent « [suite] » le second fragment d'un verset coupé entre deux pages. C'est une
      // bonne convention — mais le marqueur ne doit pas survivre au recollage.
      const texte = (v.texte||'').replace(/^\s*\[\s*suite\s*\]\s*/i, '').trim()
      ;(frags.get(k) ?? frags.set(k,[]).get(k)).push({page:p.pageImp, texte})
    }
}
if (absents.length) console.log('⚠ lots absents : '+absents.join(', '))
if (ecartes) console.log(`  ${ecartes} versets écartés (autre livre)`)

// Deux fragments d'un même verset sur UNE MÊME page ne sont pas une coupure de page :
// c'est que l'édition a imprimé deux fois le même numéro (erreur de numérotation).
// Les recoller en un seul verset les fusionnerait à tort — on le signale au lieu de deviner.
const doublons = []
const multiPages = new Map()          // clé → pages, pour le contrôle croisé plus bas
for (const [k, parts] of frags){
  const pages = parts.map(p=>p.page)
  if (new Set(pages).size !== pages.length) doublons.push(`${k} (page ${pages.join(', ')})`)
  if (new Set(pages).size > 1) multiPages.set(k, [...new Set(pages)])
}

// ── recollage + dédoublonnage de la réclame de bas de page ──
let reclames = 0, lettrines = 0
const nu = s => s.toLowerCase().replace(/[^a-zà-ÿ']/g,'')
function recoller(parts){
  parts.sort((a,b)=>a.page-b.page)
  let t = parts[0].texte
  for (let i=1;i<parts.length;i++){
    const suite = parts[i].texte
    const finA = t.split(/\s+/).pop() || '', debB = suite.split(/\s+/)[0] || ''
    if (nu(finA) && nu(finA) === nu(debB)){ t = t.slice(0, t.length-finA.length).trimEnd(); reclames++ }
    t = (t+' '+suite).replace(/\s+/g,' ').trim()
  }
  return t
}
function normLettrine(t){
  const a = t
  t = t.replace(/^([A-ZÀ-Ü])([A-ZÀ-Ü]+)(?=[a-zà-ÿ])/, (m,x,y)=>x+y.toLowerCase())
  t = t.replace(/^([A-ZÀ-Ü])([A-ZÀ-Ü]+)(\s+[a-zà-ÿ])/, (m,x,y,z)=>x+y.toLowerCase()+z)
  if (t!==a) lettrines++
  return t
}

const versets = [...frags].map(([k,parts])=>{
  const [ch,v] = k.split('.').map(Number)
  return { ch, v, texte: normLettrine(recoller(parts)) }
}).sort((a,b)=>a.ch-b.ch || a.v-b.v)

// ── césures de fin de ligne restées ouvertes (« par- tage », « con- cevrez ») ──
// Les traits d'union légitimes de 1730 (« mer-rouge », « de-peur », « païs-ci ») n'ont
// jamais d'espace après le trait : seul « - » suivi d'une espace est suspect. On ne recolle
// toutefois que si la soudure donne un mot attesté — sinon on signale sans rien décider.
const lexFr = new Set()
for (const r of await all(sb.from('versets_v2').select('texte').in('trad_id',['TR0002','TR0003']).order('id')))
  for (const w of (r.texte||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').match(/[a-z']{3,}/g)||[]) lexFr.add(w)
const nfd = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')

// Avant toute chose : « prenons- les », « dites- lui » ne sont pas des césures mais des
// traits d'union légitimes suivis d'une espace parasite. Les souder donnerait « prenonsles ».
// On se contente de retirer l'espace quand ce qui suit est un pronom clitique.
// Outre les pronoms, les seconds membres des composés à trait d'union courants
// (« vis-à-vis », « peut-être ») : eux non plus ne doivent jamais être soudés.
const CLITIQUES = 'le|la|les|lui|leur|moi|toi|soi|nous|vous|en|y|je|tu|il|elle|on|ils|elles|ce|ci|là|même|mêmes|à|être'
let traitsUnion = 0
for (const v of versets)
  // ⚠️ Pas de \b en fin de motif : en JavaScript, \b ne connaît que l'ASCII et considère
  // « à » comme un non-mot, si bien que « vis- à-vis » n'était jamais reconnu. On borne
  // donc par une négation explicite de lettre.
  v.texte = v.texte.replace(new RegExp(`([a-zà-ÿ])-\\s+(${CLITIQUES})(?![a-zà-ÿ])`, 'gi'),
    (m,a,b) => { traitsUnion++; return `${a}-${b}` })

let cesures = 0; const cesuresDouteuses = []
for (const v of versets){
  // Une seule lettre peut précéder le trait (« d’ê- tre ») : c'est le contrôle du lexique,
  // et non la longueur, qui empêche de souder à tort.
  v.texte = v.texte.replace(/([A-Za-zÀ-ÿ]+)-\s+([a-zà-ÿ]{2,})/g, (m,a,b)=>{
    if (lexFr.has(nfd(a+b))){ cesures++; return a+b }
    cesuresDouteuses.push(`${CODE} ${v.ch},${v.v} : « ${a}- ${b} »`)
    return m
  })
}
// Un même train de lots peut couvrir plusieurs livres : le fichier de sortie porte donc
// le code du livre, sans quoi la fusion suivante écraserait la précédente.
const SORTIE = `${PREFIXE}${CODE}_transcrit.json`
writeFileSync(D+SORTIE, JSON.stringify(versets,null,1))

// ── contrôle : couverture et continuité ──
const canon = await all(sb.from('versets_canon').select('ch_canon,v_canon').eq('livre',CODE).order('ordre'))
const MAXV = {}; for (const r of canon) MAXV[r.ch_canon] = Math.max(MAXV[r.ch_canon]||0, r.v_canon)
const present = new Set(versets.map(v=>v.ch+'.'+v.v))
const trous = [], sauts = []
for (const c of Object.keys(MAXV).map(Number).sort((a,b)=>a-b)){
  const miss=[]; for(let v=1;v<=MAXV[c];v++) if(!present.has(c+'.'+v)) miss.push(v)
  if (miss.length) trous.push(`  ch ${String(c).padStart(2)} : manque ${miss.join(',').slice(0,55)}`)
}
const parCh = new Map()
for (const v of versets) (parCh.get(v.ch) ?? parCh.set(v.ch,[]).get(v.ch)).push(v.v)
for (const [ch,vs] of [...parCh].sort((a,b)=>a[0]-b[0])){
  vs.sort((a,b)=>a-b)
  for (let i=1;i<vs.length;i++) if (vs[i]!==vs[i-1]+1) sauts.push(`  ch ${ch} : saut de ${vs[i-1]} à ${vs[i]}`)
}
const surnum = versets.filter(v=>!MAXV[v.ch] || v.v>MAXV[v.ch]).map(v=>v.ch+','+v.v)

// ── contrôle : mauvaises lectures, dans LES DEUX SENS (s↔f, u↔n, i↔l, c↔e) ──
const lex = lexFr                                  // déjà constitué pour les césures
// Formes authentiques de 1730 que le lexique moderne ne connaît pas : sans cette liste,
// elles remontent en « suspect » à chaque livre et noient les vraies erreurs de lecture.
const FORMES_1730 = new Set(['pies','defirent','deffirent','dormit','suc','elire','cedat','perie','grans',
  'taillant','tendez','voi',    // « les taillant en pieces », « me tendez-vous », « je voi »
  'sies','quarre','secondes','cacheta','frire',
  // « sies » (2 S 12, 31) et « siés » (1 R 7, 9) : graphie de l'édition pour « scie / scié ».
  // Deux occurrences indépendantes de la même forme — une double erreur de lecture serait
  // improbable. C'est le signe le plus sûr qu'on a affaire à une graphie et non à une coquille.
  ])
const suspects = []
for (const v of versets)
  for (const w of (v.texte.replace(/<\/?i>/g,'').match(/[A-Za-zÀ-ÿ]{3,}/g)||[])){
    const n = w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    if (lex.has(n) || FORMES_1730.has(n)) continue
    // permuter UNE occurrence à la fois : « sils » → « fils » (et non « filf »)
    let trouve = null
    // t↔r attrape « pat » → « par », mais transformerait « avoit » en « avoir » : on
    // l'écarte donc pour les désinences d'imparfait et d'infinitif propres à 1730.
    const desinence = /(oit|oient|ois|oir|oire)$/.test(n)
    const paires = desinence
      ? [['s','f'],['f','s'],['n','u'],['u','n'],['l','i'],['i','l'],['c','e'],['e','c']]
      : [['s','f'],['f','s'],['n','u'],['u','n'],['l','i'],['i','l'],['c','e'],['e','c'],['t','r'],['r','t']]
    for (const [a,b] of paires){
      for (let i=0; i<n.length && !trouve; i++){
        if (n[i] !== a) continue
        const alt = n.slice(0,i) + b + n.slice(i+1)
        if (lex.has(alt)) trouve = alt
      }
      if (trouve) break
    }
    if (trouve) suspects.push(`${CODE} ${v.ch},${v.v} : « ${w} » → « ${trouve} » ?`)
  }

console.log(`\n${CODE} — FUSION`)
console.log('  versets : '+versets.length+' / '+canon.length+'  ('+Math.round(100*versets.length/canon.length)+'%)')
console.log('  chapitres : '+parCh.size+' / '+Object.keys(MAXV).length)
console.log('  italiques : '+versets.filter(v=>/<i>/.test(v.texte)).length+' versets')
console.log('  réclames dédoublonnées : '+reclames+' · lettrines normalisées : '+lettrines+' · césures recollées : '+cesures+' · traits d’union rétablis : '+traitsUnion)
if (cesuresDouteuses.length){
  console.log('  césures NON recollées (soudure non attestée) : '+cesuresDouteuses.length)
  cesuresDouteuses.slice(0,8).forEach(c=>console.log('    '+c))
}
console.log('\nCHAPITRES INCOMPLETS : '+trous.length); trous.slice(0,12).forEach(t=>console.log(t))
console.log('SAUTS DE NUMÉROTATION : '+sauts.length); sauts.slice(0,10).forEach(t=>console.log(t))
if (surnum.length) console.log('HORS VULGATE : '+surnum.join(' '))

// Deux versets portant le même numéro sur des pages DIFFÉRENTES sont recollés comme s'il
// s'agissait d'une simple coupure de page — et le détecteur de doublons, qui ne regarde
// qu'à l'intérieur d'une page, ne les voit pas. Le seul indice est alors le SAUT de
// numérotation qu'ils laissent dans le chapitre. On croise donc les deux : un recollage
// multi-pages dans un chapitre qui saute un numéro est suspect.
// Cas rencontré : 2 Par. 20, où l'édition imprime « 12 » après le v.9 puis réimprime
// « 11 » et « 12 » à la page suivante. Le recollage avait soudé deux versets distincts.
const chSauts = new Set(sauts.map(s => +s.match(/ch (\d+)/)[1]))
const suspectsRecollage = [...multiPages].filter(([k]) => chSauts.has(+k.split('.')[0]))
if (suspectsRecollage.length){
  console.log('\n⚠ RECOLLAGE MULTI-PAGES DANS UN CHAPITRE QUI SAUTE UN NUMÉRO : ' + suspectsRecollage.length)
  console.log('   (vérifier sur l’image : s’agit-il d’une coupure de page, ou de deux versets au même numéro ?)')
  suspectsRecollage.forEach(([k, pages]) => console.log(`   ${k} — pages ${pages.join(', ')}`))
}
if (doublons.length){
  console.log('\n⚠ NUMÉROS EN DOUBLE SUR UNE MÊME PAGE : '+doublons.length+'  (erreur de numérotation de l’édition — à trancher sur l’image, NE PAS recoller à l’aveugle)')
  doublons.forEach(d=>console.log('  '+d))
}
console.log('\nLECTURES SUSPECTES : '+suspects.length+'  (à trancher sur l\'image)')
suspects.slice(0,25).forEach(s=>console.log('  '+s))
console.log('\nécrit : '+SORTIE)
writeFileSync(D+`${PREFIXE}${CODE}_suspects.json`, JSON.stringify(suspects,null,1))
