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
// ── COQUILLES DE NUMÉROTATION DE L'IMPRIMEUR (§23.20) ────────────────────────────────────
// À ne PAS confondre avec une versification propre à l'édition, qui se mappe et ne se corrige
// jamais. Une coquille se reconnaît à trois signes réunis : le numéro imprimé rompt la suite,
// il fait DOUBLON avec un numéro déjà employé dans le chapitre, et le numéro manquant est
// exactement celui qu'exige la place du verset. Les trois se vérifient sur l'image ; le
// numéro correct n'est jamais deviné, il est arithmétiquement forcé.
// Le verset visé est désigné par le DÉBUT DE SON TEXTE, jamais par sa page : le numéro
// fautif coexiste presque toujours avec le vrai numéro sur la même page — c'est même ce qui
// révèle la coquille — et une clé de page les rattraperait tous les deux.
// Clé : « chapitre.numéro imprimé » → { debut, v }.
const COQUILLES = {
  '1MA': [
    // 1 M 7,26 imprimé « 29 » : la page 333 donne la suite 25, 29, 27, 28, 29. Le premier
    // « 29 » est le 26, et le recollage l'avait soudé au vrai 29, huit lignes plus bas.
    // Le référent tranche : son 7,26 porte « Alors le roi envoya Nicanor ».
    { ch: 7, imprime: 29, debut: 'Alors le roi envoya Nicanor', v: 26 },
  ],
  // Ha 1,6 est imprimé « 7 » : le transcripteur l'a rétabli de lui-même et signalé, et la
  // fusion referme à 56/56. Rien à déclarer ici — une règle sans objet serait du bruit.
  DAN: [
    // Dn 5,27 imprimé « 17 », entre le 26 et le 28 : le vrai 17 est sur la même page, et le
    // recollage avait soudé les deux. Le référent tranche — THECEL est bien le v. 27.
    { ch: 5, imprime: 17, debut: 'THECEL, vous avez été pesé', v: 27 },
  ],
  LUK: [
    // Lc 8,28 imprimé « 20 » : la page 474 porte alors DEUX versets numérotés 20, et le 28
    // manque entre le 27 et le 29. Le transcripteur a agrandi le fac-similé pour s'assurer
    // du chiffre plutôt que de le supposer.
    { ch: 8, imprime: 20, debut: 'Aussi-tôt qu’il eut apperçu JESUS', v: 28 },
    // Lc 10,18 imprimé « 10 », entre le 17 et le 19. Le transcripteur l'avait rétabli de
    // lui-même en le signalant ; le lot a été remis à l'état imprimé pour que la correction
    // passe ici, où elle laisse une trace, et non en amont où elle serait muette.
    { ch: 10, imprime: 10, debut: 'Il leur répondit : Je voyois satan', v: 18 },
  ],
  JHN: [
    // Jn 4,12 imprimé « 22 », entre le 11 et le 13 ; le vrai 22 est deux pages plus loin.
    { ch: 4, imprime: 22, debut: 'Etes-vous plus grand que notre pere Jacob', v: 12 },
  ],
  OBA: [
    // Abd 6 imprimé « 9 », d'où deux « 9 » dans ce livre d'un seul chapitre.
    { ch: 1, imprime: 9, debut: 'Mais comment les ennemis ont-ils traité Esaü', v: 6 },
  ],
  EZK: [
    // Éz 11,25 imprimé « 23 », après le 24 : le verset est à sa place, seul le numéro est
    // faux, et le recollage l'avait soudé au vrai 11,23 — les deux étant sur la même page.
    // Le référent tranche : son 11,25 porte « Et je racontai aux captifs toutes les choses
    // que Yahweh m'avait fait voir ».
    { ch: 11, imprime: 23, debut: 'je dis au peuple captif', v: 25 },
  ],
  BAR: [
    // Ba 1,18 imprimé « 28 ». Le verset est à SA PLACE dans la colonne — il suit le 17 et
    // précède le 19 —, seul son numéro est faux ; c'est le tri par numéro qui le rejetait en
    // fin de chapitre. Le référent confirme : son 1,18 porte « et nous lui avons désobéi.
    // Nous n'avons pas écouté la voix du Seigneur ».
    { ch: 1, imprime: 28, debut: 'Nous ne lui avons point été assujettis', v: 18 },
  ],
  JER: [
    // Jr 5,4 imprimé « 3 » : deux versets consécutifs portent « 3 » sur la même page 76,
    // et le recollage les avait soudés en un seul. Le référent tranche — son 5,4 porte
    // « Et moi, je disais : Ce ne sont que les petits », ce que Sacy rend par « Pour moi
    // je disois : Il n'y a peut-être que les pauvres qui sont sans sagesse ».
    { ch: 5, imprime: 3, debut: 'Pour moi je disois', v: 4 },
  ],
  JDT: [
    // Jdt 6,3 imprimé « 9 ». Le vrai 9 arrive six versets plus loin, et la fusion avait
    // soudé les deux textes en un seul — ce que le contrôle des doublons ne pouvait pas voir,
    // les deux fragments étant sur des pages différentes : le recollage multi-pages a fait
    // son office, sur un numéro qui n'était pas le bon. Le référent tranche : son 6,3 porte
    // « Lorsque nous les aurons tous frappés comme un seul homme », son 6,9 « Les Assyriens
    // se détournèrent en côtoyant la montagne ».
    { ch: 6, imprime: 9, debut: 'lorsque nous les aurons tous tués', v: 3 },
  ],
  SIR: [
    // Si 1,12 imprimé « 22 » : suit le v. 11 ; le vrai 22 est en colonne de droite.
    { ch: 1,  imprime: 22, debut: 'La crainte du Seigneur réjouira', v: 12 },
    // Si 6,10 imprimé « 19 » : suit le v. 9 ; le vrai 19 est à la page suivante.
    { ch: 6,  imprime: 19, debut: 'Tel est ami qui ne l’est que pour la table', v: 10 },
    // Si 10,19 imprimé « 9 », le 1 n'ayant pas mordu ; le vrai 9 est en colonne de gauche.
    { ch: 10, imprime: 9,  debut: 'Le Seigneur a détruit les terres', v: 19 },
  ],
}
// ── SECTIONS « SELON LES HEBREUX » (psautier) ──────────────────────────────────────────
// Deux psaumes de la Vulgate réunissent deux psaumes de l'hébreu, et l'édition de 1730 le
// signale par une rubrique en italique au milieu du psaume — « Pseaume X. selon les
// Hebreux. » — APRÈS LAQUELLE LA NUMÉROTATION IMPRIMÉE RECOMMENCE À 1.
//
// C'est un piège redoutable pour le recollage : les versets 1 à 18 de la seconde partie
// portent les mêmes numéros que ceux de la première, et la fusion les a soudés deux à deux,
// bout à bout. Le Ps 9,1 portait « Je vous louerai, Seigneur » SUIVI de « Pourquoi,
// Seigneur, vous êtes-vous retiré loin » — dix-huit versets corrompus en silence. Le
// contrôle des doublons ne pouvait rien voir : les deux moitiés sont sur des pages
// différentes, et il ne regarde que la même page.
//
// On donne donc à la seconde partie son rang dans le canon (`decalage`) TOUT EN CONSERVANT
// le numéro que l'édition imprime (`imprime`), qui part dans `v_imprime` et deviendra la
// numérotation d'origine. La colonne des numéros dira donc « 9, 1 » deux fois dans le même
// psaume : c'est la vérité de l'édition.
const SECTIONS = {
  PSA: [
    // Ps 9 de la Vulgate = Ps 9 + Ps 10 de l'hébreu. Transcrit 1-18 → canon 22-39.
    { page: 675, ch: 9,   depuis: 1, jusqua: 18, decalage: 21, imprime: 0,
      rubrique: 'Pseaume X. selon les Hebreux.' },
    // Ps 113 = Ps 114 + Ps 115 de l'hébreu. Le transcripteur avait DÉJÀ renuméroté en
    // continu (9-26) pour éviter la collision : le décalage au canon est donc nul, et
    // c'est le numéro IMPRIMÉ qu'il faut rétablir (1-18).
    { page: 752, ch: 113, depuis: 9, jusqua: 26, decalage: 0,  imprime: -8,
      rubrique: 'Pseaume CXV. selon les Hebreux.' },
  ],
}
const sections = SECTIONS[CODE] || []
const rubriques = new Map()      // clé du premier verset de la section → rubrique
let sectionsVues = 0

const coquilles = COQUILLES[CODE] || []
const coquillesVues = new Set()
const sansApos = s => (s || '').replace(/['’]/g, '’')

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
      const cq = coquilles.find(c => c.ch === v.ch && c.imprime === v.v
        && sansApos(v.texte).replace(/<\/?i>/g, '').trimStart().startsWith(sansApos(c.debut)))
      // On rétablit le numéro exigé par la place du verset, MAIS on garde trace de celui que
      // l'édition imprime : v_imprime part dans la numérotation d'origine, qui doit dire
      // l'état réel de la page — corriger sans le dire effacerait le fait éditorial.
      if (cq){ coquillesVues.add(`${cq.ch}.${cq.imprime}`); v.v_imprime = cq.imprime; v.v = cq.v }
      // Section « selon les Hebreux » : on décale pour le canon, on garde l'imprimé.
      const sec = sections.find(s => s.page === p.pageImp && s.ch === v.ch
        && ((v.v === 0) || (v.v >= s.depuis && v.v <= s.jusqua)))
      if (sec){
        // La rubrique elle-même est transcrite en suscription (v. 0) : elle n'est pas un
        // verset, et elle entrerait en collision avec la vraie suscription du psaume.
        if (v.v === 0){ rubriques.set(`${sec.ch}.${sec.depuis + sec.decalage}`, sec.rubrique); continue }
        v.v_imprime = v.v + sec.imprime
        v.v = v.v + sec.decalage
        sectionsVues++
      }
      const k = v.ch+'.'+v.v
      // Depuis la consigne « tout texte vu doit figurer dans un verset », les transcripteurs
      // marquent « [suite] » le second fragment d'un verset coupé entre deux pages. C'est une
      // bonne convention — mais le marqueur ne doit pas survivre au recollage.
      const texte = (v.texte||'').replace(/^\s*\[\s*suite\s*\]\s*/i, '').trim()
      // Note propre à l'ÉDITION (Sacy commente lui-même les additions grecques d'Esther) :
      // elle accompagne le verset sans en faire partie, et va dans `notes`, pas dans `texte`.
      // ── ARGUMENTS DE L'ÉDITEUR ──
      // Sacy fait précéder chaque psaume d'un « argument » en italique, qui n'est pas du
      // texte biblique. Les transcripteurs l'ont noté de TROIS façons selon les lots :
      // champ `note_edition`, champ `argument`, ou entrée séparée marquée `est_argument`.
      // ⚠️ Ce dernier cas est dangereux : l'entrée porte le même numéro 0 que la suscription
      // et serait recollée AVEC elle, l'argument venant se souder au texte sacré.
      // On le route donc vers la note, jamais vers le texte.
      if (v.est_argument === true){
        const cible = frags.get(k)
        if (cible && cible.length) cible[cible.length-1].note = [cible[cible.length-1].note, texte].filter(Boolean).join(' ')
        else (frags.get(k) ?? frags.set(k,[]).get(k)).push({ page:p.pageImp, texte:'', note: texte, suscription: true })
        continue
      }
      ;(frags.get(k) ?? frags.set(k,[]).get(k)).push({
        page: p.pageImp, texte,
        note: v.note_edition || v.argument || null,
        suscription: v.est_suscription === true,
        v_imprime: v.v_imprime,
      })
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
  // Le mot de la lettrine peut être suivi d'un mot qui commence lui-même par une capitale
  // (« LE Seigneur », « VISION prophetique ») : les deux règles ci-dessus, qui exigent une
  // minuscule après la lettrine, le laissaient alors tout en capitales. Quatorze versets
  // s'ouvraient ainsi sur « LE Seigneur », contre la règle §23.9.
  t = t.replace(/^([A-ZÀ-Ü])([A-ZÀ-Ü]+)(?=\s)/, (m,x,y)=>x+y.toLowerCase())
  if (t!==a) lettrines++
  return t
}

const versets = [...frags].map(([k,parts])=>{
  const [ch,v] = k.split('.').map(Number)
  const note = parts.map(p=>p.note).filter(Boolean).join(' ') || null
  const susc = parts.some(p=>p.suscription)
  const imp = parts.find(p => p.v_imprime !== undefined)?.v_imprime
  const rub = rubriques.get(k)
  return { ch, v, texte: normLettrine(recoller(parts.filter(p=>p.texte))),
    ...(imp !== undefined ? { v_imprime: imp } : {}),
    ...(note || rub ? { note: [rub && `L’édition imprime ici la rubrique « ${rub} » et RECOMMENCE la numérotation à 1 : ce psaume de la Vulgate en réunit deux de l’hébreu. Le numéro d’origine conservé est celui que l’édition imprime.`, note].filter(Boolean).join(' ') } : {}),
    ...(susc ? { est_suscription: true } : {}) }
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

// Soudures vérifiées à la main, que le lexique ne connaît pas. On ne soude JAMAIS sur la
// seule vraisemblance : chaque entrée a été lue sur l'image, et le mot obtenu vérifié dans
// la phrase. La liste reste courte à dessein — elle est l'exception, pas la commodité.
const SOUDURES = new Set(['universelle', 'nabajoth', 'parceque', 'appellée', 'méchans', 'magnificence', 'notre', 'parcequ', 'arrachât', 'adoroit'])

// Une balise d'italique n'enveloppant QUE de la ponctuation n'a pas de sens : l'italique
// marque les mots ajoutés par le traducteur, jamais les signes. Elle empêche en outre la
// passe typographique de poser l'insécable, le signe se trouvant précédé d'un « > ».
// Corrigé d'abord à la main sur Éz 36,33 — et défait au rechargement suivant, faute d'être
// ici. Une correction qui ne remonte pas dans le pipeline ne tient pas.
let italPonct = 0
for (const v of versets){
  const n = v.texte.replace(/<i>\s*([;:!?…,.])\s*<\/i>/g, '$1')
  if (n !== v.texte){ italPonct++; v.texte = n }
}
if (italPonct) console.log(`  italiques n’enveloppant qu’une ponctuation, retirées : ${italPonct}`)

// Une césure peut tomber ENTRE DEUX BALISES d'italique — « <i>no-</i> <i>tre</i> » —, le
// transcripteur ayant balisé chaque fragment de ligne séparément. La réparation ci-dessous
// ne voyait alors rien, tandis que le contrôle de l'audit, qui retire les balises avant de
// tester, la signalait : d'où deux césures qui revenaient à chaque rechargement sans qu'on
// comprenne pourquoi. On referme d'abord ces coupures-là, en gardant l'italique.
let cesuresBalises = 0
for (const v of versets){
  const n = v.texte.replace(/<i>([A-Za-zÀ-ÿ]+)-<\/i>\s*<i>([a-zà-ÿ]{2,})<\/i>/g,
    (m, a, b) => (lexFr.has(nfd(a+b)) || SOUDURES.has((a+b).toLowerCase())) ? `<i>${a}${b}</i>` : m)
  if (n !== v.texte){ cesuresBalises++; v.texte = n }
}
if (cesuresBalises) console.log(`  césures recollées à travers des balises d’italique : ${cesuresBalises}`)

let cesures = 0; const cesuresDouteuses = []
for (const v of versets){
  // Une seule lettre peut précéder le trait (« d’ê- tre ») : c'est le contrôle du lexique,
  // et non la longueur, qui empêche de souder à tort.
  v.texte = v.texte.replace(/([A-Za-zÀ-ÿ]+)-\s+([a-zà-ÿ]{2,})/g, (m,a,b)=>{
    if (lexFr.has(nfd(a+b)) || SOUDURES.has((a+b).toLowerCase())){ cesures++; return a+b }
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
if (coquilles.length){
  const orphelines = coquilles.filter(c => !coquillesVues.has(`${c.ch}.${c.imprime}`))
    .map(c => `${c.ch},${c.imprime}`)
  console.log(`  coquilles de numérotation rétablies : ${coquillesVues.size} / ${coquilles.length}`)
  // Une coquille déclarée qui ne rencontre plus rien signale que la transcription a changé
  // sous elle — le rétablissement s'appliquerait alors peut-être au mauvais verset.
  if (orphelines.length) console.log(`  ⚠ coquilles déclarées SANS EFFET (à revoir) : ${orphelines.join(' ')}`)
}
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
