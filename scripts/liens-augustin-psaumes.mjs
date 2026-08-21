// Constitution des liens bibliques — Augustin, « Discours sur les Psaumes »
// (Enarrationes in Psalmos, A0010O0004). Même méthode que sur Job : alignement de
// séquence des lemmes contre le Psautier, chaque segment citant un verset entre
// guillemets puis le commentant.
//
// DEUX DIFFÉRENCES AVEC JOB.
//   — L'échelle : 64 591 segments de texte, 6 092 lemmes, 150 psaumes. Tout est
//     paginé (segments ET versets) ; sans quoi PostgREST plafonnerait à 1000 —
//     c'est le bug qui n'avait laissé voir que Sacy sur Job.
//   — La numérotation : Augustin suit le grec/Vulgate, QUI COÏNCIDE avec l'ossature
//     du canon (à la différence de Job, où l'hébreu de Segond divergeait). Le
//     numéro de psaume de ref_niv1 (« Psaume CXVIII ») se rattache donc directement.
//
// DEUX LIENS PAR SEGMENT (arbitrage n°17) : type 1 (citation du lemme) + type 3
// (commentaire du même verset). Tout en provenance = ia, rien en « vérifié ».
//
//   node scripts/liens-augustin-psaumes.mjs --dry 118   (essai sur le psaume 118)
//   node scripts/liens-augustin-psaumes.mjs --dry        (essai sur tout)
//   node scripts/liens-augustin-psaumes.mjs              (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierLienMecanique } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = 'A0010O0004'
const LIVRE = 'PSA'
const DRY = process.argv.includes('--dry')
const PS_ARG = process.argv.find(a => /^\d+$/.test(a))

// Le score gradue la confiance, il n'écarte plus (leçon de Job) : ce qui fonde un
// rattachement, c'est la place du lemme dans la suite, pas la ressemblance des mots.
const SEUIL_SUR = 0.42
const SEUIL_BAS = 0.15
const PLANCHER_APPARIEMENT = 0.05
const PENALITE_LEMME_ORPHELIN = 0.80
const SEUIL_SECONDAIRE = 0.45

const ROMAINS = { i:1, v:5, x:10, l:50, c:100, d:500, m:1000 }
function romain(s) {
  const t = String(s).trim().toLowerCase()
  if (!/^[ivxlcdm]+$/.test(t)) return null
  let n = 0
  for (let i = 0; i < t.length; i++) {
    const v = ROMAINS[t[i]], w = ROMAINS[t[i + 1]]
    n += w && v < w ? -v : v
  }
  return n
}
/** Numéro du psaume depuis « Psaume CXVIII » ou « Psaume 118 ». */
function numeroPsaume(niv1) {
  const m = String(niv1 || '').match(/psaume\s+([ivxlcdm]+|\d+)/i)
  if (!m) return null
  return /^\d+$/.test(m[1]) ? +m[1] : romain(m[1])
}

// Normalisation : mêmes deux graphies des deux côtés (voir le script de Job).
const ancienneGraphie = m => m.replace(/oi/g, 'ai').replace(/([bcdfgjklmnpqrstvxz])ans$/, '$1ants')
const mots = s => (s || '')
  .replace(/<[^>]+>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  .split(' ').filter(m => m.length > 2).map(m => ancienneGraphie(m).slice(0, 5))
const VIDES = new Set(['les','des','que','qui','pour','dans','avec','est','son','sur','plus','tout','tous','par','une','aux','ses','leur','ils','elle','vous','nous','mais','comme','cette','ces','pas','ont','sont'])
const sac = s => new Set(mots(s).filter(m => !VIDES.has(m)))

let POIDS = new Map(), POIDS_DEFAUT = 6
const poids = mot => POIDS.get(mot) ?? POIDS_DEFAUT
function score(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0, sa = 0, sb = 0
  for (const m of a) { const p = poids(m); sa += p; if (b.has(m)) inter += p }
  for (const m of b) sb += poids(m)
  return (2 * inter) / (sa + sb)
}
const citations = texte => [...String(texte || '').matchAll(/[«"]\s*([^»"]{6,})\s*[»"]/g)].map(m => m[1].trim())
// LE LEMME EST LA CITATION DE TÊTE, et non la première venue. Dans les
// Enarrationes le verset commenté ouvre le segment ; une citation en milieu de
// phrase (« car il est dit : “Abraham vit mon jour” ») vise le plus souvent un
// AUTRE livre, et n'a rien à faire dans le psaume commenté. Le texte peut s'ouvrir
// par une balise ou un tiret de dialogue avant le guillemet.
const lemme = texte => {
  const t = String(texte || '').replace(/<[^>]+>/g, '').replace(/^[\s—–-]+/, '')
  const m = t.match(/^[«"]\s*([^»"]{6,})\s*[»"]/)
  return m ? m[1].trim() : null
}

// ── Chargement (paginé) ──────────────────────────────────────────────────────
const segs = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('segments')
    .select('id, segment_numero, ref_niv1, segment_texte')
    .eq('id_oeuvre', OEUVRE).eq('nature', 'texte').order('segment_numero').range(from, from + 999)
  if (error) throw error
  segs.push(...data); if (data.length < 1000) break
}
console.log(`${segs.length} segments de texte chargés`)

{
  const brut = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('concordance_lexique').select('mot, freq').range(from, from + 999)
    if (!data?.length) break
    brut.push(...data); if (data.length < 1000) break
  }
  const parForme = new Map(); let total = 0
  for (const { mot, freq } of brut) for (const f of mots(mot)) { parForme.set(f, (parForme.get(f) ?? 0) + freq); total += freq }
  for (const [f, n] of parForme) POIDS.set(f, Math.log(total / n))
  POIDS_DEFAUT = Math.log(total / 1)
  console.log(`lexique : ${brut.length} entrées → ${parForme.size} formes pondérées`)
}

// Psautier des trois traductions, paginé, groupé par psaume.
const TRADS_APPARIEMENT = ['TR0001', 'TR0003', 'TR0002']
const versets = []
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from('versets_v2')
    .select('canon_id, trad_id, texte').in('trad_id', TRADS_APPARIEMENT)
    .eq('livre', LIVRE).not('canon_id', 'is', null).order('canon_id').order('trad_id').range(de, de + 999)
  if (error) throw error
  versets.push(...data); if (data.length < 1000) break
}
const psautierParNumero = new Map()
{
  const parCreneau = new Map()
  for (const v of versets) {
    if (!parCreneau.has(v.canon_id)) parCreneau.set(v.canon_id, [])
    parCreneau.get(v.canon_id).push(sac(v.texte))
  }
  for (const [canon_id, sacs] of parCreneau) {
    const ps = +canon_id.split('.')[1]
    if (!psautierParNumero.has(ps)) psautierParNumero.set(ps, [])
    psautierParNumero.get(ps).push({ canon_id, sacs })
  }
}
console.log(`Psautier : ${versets.length} versets sur ${psautierParNumero.size} psaumes`)

const scoreCreneau = (sacLemme, creneau) => {
  let best = 0
  for (const s of creneau.sacs) { const sc = score(sacLemme, s); if (sc > best) best = sc }
  return best
}

/** APPARIEMENT DIRECT, RÉPÉTITIONS AUTORISÉES — et non alignement monotone.
 *
 *  Les Enarrationes sont des sermons : Augustin re-cite chaque verset plusieurs
 *  fois en le commentant (le psaume 3 a 9 versets mais 72 lemmes). Un alignement
 *  1:1 monotone n'en apparierait qu'un par verset et rejetterait les reprises.
 *  Le champ de recherche étant minuscule — les quelques versets d'UN psaume —,
 *  le meilleur score y désigne le verset avec bien moins de risque que sur tout
 *  le canon. On prend donc, pour chaque lemme, son meilleur verset dans le
 *  psaume ; une locution biblique voisine (score sous le plancher) reste écartée.
 */
function apparier(lemmes, versets) {
  const paires = []
  for (const lemme of lemmes) {
    let best = null, bestSc = 0
    for (const v of versets) { const sc = scoreCreneau(lemme.sac, v); if (sc > bestSc) { bestSc = sc; best = v } }
    if (best && bestSc >= PLANCHER_APPARIEMENT) paires.push({ lemme, verset: best, sc: bestSc })
  }
  return paires
}

const liens = []
const stats = { total: 0, sansLemme: 0, sansPsaume: 0, sur: 0, douteux: 0, rejete: 0, interpoles: 0 }

// Regrouper les segments par psaume.
const segsParPsaume = new Map()
for (const s of segs) {
  const ps = numeroPsaume(s.ref_niv1)
  if (!ps) { stats.sansPsaume++; continue }
  if (PS_ARG && ps !== +PS_ARG) continue
  const l = lemme(s.segment_texte)
  if (!l) { if (!PS_ARG || ps === +PS_ARG) stats.total++; stats.sansLemme++; continue }
  stats.total++
  if (!segsParPsaume.has(ps)) segsParPsaume.set(ps, [])
  segsParPsaume.get(ps).push({ s, texte: l, sac: sac(l) })
}

for (const [ps, lemmes] of [...segsParPsaume.entries()].sort((a, b) => a[0] - b[0])) {
  const versets = (psautierParNumero.get(ps) ?? []).sort((a, b) => +a.canon_id.split('.')[2] - +b.canon_id.split('.')[2])
  if (!versets.length) { stats.rejete += lemmes.length; continue }

  const paires = apparier(lemmes, versets)
  const apparies = new Set(paires.map(p => p.lemme.s.id))
  for (const l of lemmes) if (!apparies.has(l.s.id)) stats.rejete++

  for (const p of paires) {
    // Score haut (champ restreint = un psaume) → probable, sans arbitrage.
    // En dessous → douteux + arbitrage. JAMAIS probable ET arbitrage à la fois.
    const sur = p.sc >= SEUIL_SUR
    const fiabilite = sur ? 'probable' : 'douteux'
    sur ? stats.sur++ : stats.douteux++
    const commun = {
      segment_id: p.lemme.s.id, canon_id: p.verset.canon_id, fiabilite, provenance: 'ia', arbitrage_requis: !sur,
      motif: `Lemme « ${p.lemme.texte.slice(0, 80)} » apparié au verset du psaume, score ${p.sc.toFixed(2)}.`,
    }
    // Le lemme est une CITATION (type 1). PAS de type 3 automatique : le lien 3
    // (commentaire) exige que l'auteur EXPLIQUE le verset (§9.3), ce qu'un lemme
    // cité ne fait pas — l'explication est dans les segments SUIVANTS, et cela ne
    // s'établit qu'en lecture. Générer un t3 par duplication de citation est faux.
    liens.push({ ...commun, type: 1 })
  }
}

// ── Citations secondaires (dans le psaume commenté et ses voisins) ────────────
const tousVersets = [...psautierParNumero.values()].flat()
const dejaVise = new Set(liens.filter(l => l.type === 1).map(l => `${l.segment_id}|${l.canon_id}`))
const statsSec = { examinees: 0, retenues: 0 }
for (const s of segs) {
  const ps = numeroPsaume(s.ref_niv1)
  if (!ps || (PS_ARG && ps !== +PS_ARG)) continue
  for (const c of citations(s.segment_texte).slice(1)) {
    statsSec.examinees++
    const sacC = sac(c)
    const candidats = tousVersets.filter(v => Math.abs(+v.canon_id.split('.')[1] - ps) <= 1)
    let meilleur = null, meilleurScore = 0
    for (const v of candidats) { const sc = scoreCreneau(sacC, v); if (sc > meilleurScore) { meilleurScore = sc; meilleur = v } }
    if (!meilleur || meilleurScore < SEUIL_SECONDAIRE) continue
    const cle = `${s.id}|${meilleur.canon_id}`
    if (dejaVise.has(cle)) continue
    dejaVise.add(cle); statsSec.retenues++
    liens.push({
      segment_id: s.id, canon_id: meilleur.canon_id, type: 1, fiabilite: 'douteux', provenance: 'ia', arbitrage_requis: true,
      motif: `Citation dans le commentaire (hors lemme) : « ${c.slice(0, 70)} » — score ${meilleurScore.toFixed(2)}, cherchée dans le psaume et ses voisins.`,
    })
  }
}

console.log(`\nSegments à lemme examinés : ${stats.total - stats.sansLemme}`)
console.log(`  appariés, score sûr (≥ ${SEUIL_SUR})  : ${stats.sur}`)
console.log(`  appariés, à arbitrer (≥ ${SEUIL_BAS}) : ${stats.douteux}`)
console.log(`  écartés, aucun mot commun            : ${stats.rejete}`)
console.log(`  psaume illisible dans ref_niv1       : ${stats.sansPsaume}`)
console.log(`Citations secondaires : ${statsSec.examinees} examinées, ${statsSec.retenues} rattachées`)
console.log(`→ ${liens.length} liens`)

if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0) }

// Reprise : on efface les liens ia de l'œuvre, jamais les arbitrages d'éditeur.
const idsSegments = segs.map(s => s.id)
let supprimes = 0
for (let i = 0; i < idsSegments.length; i += 300) {
  const { data, error } = await sb.from('liens_bibliques')
    .delete().eq('provenance', 'ia').in('segment_id', idsSegments.slice(i, i + 300)).select('id')
  if (error) throw error
  supprimes += data?.length ?? 0
}
console.log(`\n${supprimes} liens ia retirés`)
liens.forEach(verifierLienMecanique)   // garde-fou : aucun type 3/4 affirmé
for (let i = 0; i < liens.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(liens.slice(i, i + 500))
  if (error) throw error
}
console.log(`✓ ${liens.length} liens écrits`)
