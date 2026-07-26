// Constitution des liens bibliques — Augustin, « Annotations sur le livre de Job »
// (A0010O0100), première œuvre portée dans `liens_bibliques`.
//
// STRUCTURE DE L'ŒUVRE. Chaque segment cite un lemme de Job entre guillemets, puis
// le commente. `ref_niv1` donne le chapitre (« Chapitre I »), jamais le verset :
// c'est donc au texte du lemme de dire lequel. On l'apparie contre la Bible de
// Sacy, traduite de la Vulgate — celle-là même qu'Augustin commente. Segond ou
// Crampon, traduits de l'hébreu, donneraient des correspondances plus lâches.
//
// DEUX LIENS PAR SEGMENT (arbitrage n°17, cumul obligatoire quand il est fondé) :
//   type 1 — le lemme est une citation exacte ;
//   type 3 — le commentaire porte sur ce même verset.
//
//   node scripts/liens-augustin-job.mjs --dry 1     (essai sur le chapitre I)
//   node scripts/liens-augustin-job.mjs --dry       (essai sur toute l'œuvre)
//   node scripts/liens-augustin-job.mjs             (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierLienMecanique } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = 'A0010O0100'
const DRY = process.argv.includes('--dry')
const CHAP_ARG = process.argv.find(a => /^\d+$/.test(a))

// UNE FOIS L'ALIGNEMENT MONOTONE EN PLACE, LE SCORE LEXICAL N'EST PLUS LE JUGE.
// Il l'était tant qu'on appariait chaque lemme isolément. Maintenant, ce qui
// fonde un rattachement, c'est la place du lemme dans la suite : encadré par des
// voisins sûrs, un lemme au vocabulaire pourtant éloigné tombe juste. Sur le
// chapitre I, trois appariements corrects (v. 4, 5, 12) marquaient moins de 0,24
// et auraient été jetés.
//
// Le score ne sert donc plus qu'à graduer la confiance, jamais à écarter :
//   ≥ SEUIL_SUR  → probable, l'éditeur n'a rien à faire
//   ≥ SEUIL_BAS  → probable, mais signalé à l'arbitrage
//   en dessous   → douteux, signalé lui aussi
// Rien ne part « vérifié » : ce mot reste au jugement humain.
const SEUIL_SUR = 0.42
const SEUIL_BAS = 0.15

// En revanche on n'apparie JAMAIS deux textes qui n'ont pas un mot en commun :
// sans cela l'alignement comble les trous au hasard, faute de mieux.
const PLANCHER_APPARIEMENT = 0.05

const ROMAINS = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 }
function romain(s) {
  const t = s.trim().toUpperCase()
  if (!/^[IVXLCDM]+$/.test(t)) return null
  let n = 0
  for (let i = 0; i < t.length; i++) {
    const v = ROMAINS[t[i]], w = ROMAINS[t[i + 1]]
    n += w && v < w ? -v : v
  }
  return n
}

/** NORMALISER LES DEUX GRAPHIES AVANT DE COMPARER.
 *
 *  Sacy imprime en 1730, le traducteur d'Augustin écrit au XIXe : « alloient »
 *  contre « allaient », « étoit » contre « était », « enfans » contre « enfants ».
 *  Ce sont les mêmes mots, et ils ne se reconnaissaient pas — d'où des scores
 *  effondrés sur des passages pourtant identiques.
 *
 *  Deux passes, appliquées des DEUX côtés, donc sans risque : ce qui compte
 *  n'est pas l'exactitude de la forme obtenue mais qu'elle soit la même pour
 *  les deux textes. « droit » devient « drait » ici comme là.
 *    1. terminaisons verbales en -oi- ramenées en -ai- ;
 *    2. troncature à cinq lettres, qui absorbe le reste de la morphologie
 *       (pluriels en -ans/-ants, désinences, accords).
 */
// `oi` → `ai` PARTOUT, et non aux seules terminaisons : « connoissoit » porte le
// sien au milieu. La règle déborde (« roi » devient « rai »), mais elle déborde
// des deux côtés — c'est tout ce qu'on lui demande.
const ancienneGraphie = m => m
  .replace(/oi/g, 'ai')
  .replace(/([bcdfgjklmnpqrstvxz])ans$/, '$1ants')

const mots = s => (s || '')
  .replace(/<[^>]+>/g, ' ')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  .split(' ').filter(m => m.length > 2)
  .map(m => ancienneGraphie(m).slice(0, 5))

// Les mots creux se retrouvent partout et gonflent tous les scores de la même
// façon : les écarter fait ressortir le vocabulaire propre au verset.
const VIDES = new Set(['les','des','que','qui','pour','dans','avec','est','son','sur','plus','tout','tous','par','une','aux','ses','leur','ils','elle','vous','nous','mais','comme','cette','ces','pas','ont','sont'])
const sac = s => new Set(mots(s).filter(m => !VIDES.has(m)))

/** POIDS DES MOTS : un mot rare partagé prouve bien davantage qu'un mot courant.
 *
 *  À poids égal, « Seigneur » commun aux deux textes comptait autant que
 *  « Selmon » — alors que le premier se trouve dans presque tout verset de la
 *  Bible et ne prouve rien, quand le second ne se rencontre qu'ici.
 *  `concordance_lexique` donne la fréquence de chaque mot du corpus : on s'en
 *  sert pour pondérer, à la manière d'un IDF.
 */
let POIDS = new Map()
let POIDS_DEFAUT = 6

function poids(mot) { return POIDS.get(mot) ?? POIDS_DEFAUT }

/** Dice pondéré : 2·Σpoids(A∩B) / (Σpoids(A) + Σpoids(B)). */
function score(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0, sa = 0, sb = 0
  for (const m of a) { const p = poids(m); sa += p; if (b.has(m)) inter += p }
  for (const m of b) sb += poids(m)
  return (2 * inter) / (sa + sb)
}

/** Tous les passages entre guillemets d'un segment, dans l'ordre.
 *  Le PREMIER est le lemme — le verset que le segment commente. Les suivants
 *  sont des citations du commentaire : souvent la suite du lemme, parfois un
 *  tout autre livre (Augustin cite 1 Co 3, 1 en commentant Job 3). */
function citations(texte) {
  return [...String(texte || '').matchAll(/[«"]\s*([^»"]{6,})\s*[»"]/g)].map(m => m[1].trim())
}

function lemme(texte) {
  return citations(texte)[0] ?? null
}

// LES CITATIONS SECONDAIRES N'ONT PAS D'ANCRE. Le lemme est tenu par ses voisins ;
// elles, non — elles peuvent viser n'importe quel verset de n'importe quel livre.
// Le lexical y est donc seul juge, et il doit être bien plus exigeant : sous ce
// seuil on n'écrit rien, car une citation d'un AUTRE livre trouverait toujours
// dans Job un verset vaguement ressemblant à qui la lui demanderait.
const SEUIL_SECONDAIRE = 0.45

// ── Chargement ───────────────────────────────────────────────────────────────
const { data: segs, error: e1 } = await sb.from('segments')
  .select('id, segment_numero, ref_niv1, segment_texte')
  .eq('id_oeuvre', OEUVRE).eq('nature', 'texte').order('segment_numero')
if (e1) throw e1

// Fréquences du corpus → poids. Les formes du lexique sont normalisées comme les
// nôtres (troncature comprise), donc les fréquences s'additionnent par forme.
{
  const brut = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('concordance_lexique').select('mot, freq').range(from, from + 999)
    if (!data?.length) break
    brut.push(...data); if (data.length < 1000) break
  }
  const parForme = new Map()
  let total = 0
  for (const { mot, freq } of brut) {
    for (const f of mots(mot)) { parForme.set(f, (parForme.get(f) ?? 0) + freq); total += freq }
  }
  for (const [f, n] of parForme) POIDS.set(f, Math.log(total / n))
  POIDS_DEFAUT = Math.log(total / 1)   // mot inconnu du lexique : réputé très rare
  console.log(`lexique : ${brut.length} entrées → ${parForme.size} formes pondérées`)
}

// PLUSIEURS TRADUCTIONS. Le traducteur d'Augustin paraphrase parfois si librement
// qu'aucun mot ne subsiste chez Sacy — alors qu'il en reste chez Crampon ou
// Segond. On garde, pour chaque créneau, le meilleur score des trois : c'est
// gratuit, les trois Bibles étant déjà en base.
const TRADS_APPARIEMENT = ['TR0001', 'TR0003', 'TR0002']
// PAGINER, sous peine de ne charger que Sacy. PostgREST plafonne à 1000 lignes ;
// or les trois Bibles totalisent ~3200 versets sur Job. Sans pagination, la
// requête ne renvoyait QUE les 1000 premières — toutes de Sacy —, et le « meilleur
// des trois traductions » vanté plus haut ne s'appliquait jamais : l'alignement
// se faisait sur Sacy seul, amputé de surcroît de sa fin.
const versets = []
for (let de = 0; ; de += 1000) {
  const { data, error: e2 } = await sb.from('versets_v2')
    .select('canon_id, trad_id, texte').in('trad_id', TRADS_APPARIEMENT)
    .eq('livre', 'JOB').not('canon_id', 'is', null)
    .order('canon_id').order('trad_id').range(de, de + 999)
  if (e2) throw e2
  versets.push(...data)
  if (data.length < 1000) break
}

const jobParChapitre = new Map()
{
  const parCreneau = new Map()
  for (const v of versets) {
    if (!parCreneau.has(v.canon_id)) parCreneau.set(v.canon_id, [])
    parCreneau.get(v.canon_id).push(sac(v.texte))
  }
  for (const [canon_id, sacs] of parCreneau) {
    const ch = +canon_id.split('.')[1]
    if (!jobParChapitre.has(ch)) jobParChapitre.set(ch, [])
    jobParChapitre.get(ch).push({ canon_id, sacs })
  }
}

/** Meilleur score du lemme contre les traductions disponibles du créneau. */
function scoreCreneau(sacLemme, creneau) {
  let best = 0
  for (const s of creneau.sacs) { const sc = score(sacLemme, s); if (sc > best) best = sc }
  return best
}

/** ALIGNEMENT DE SÉQUENCES, ET NON APPARIEMENT UN À UN.
 *
 *  Le premier jet cherchait, pour chaque lemme isolément, le verset qui lui
 *  ressemblait le plus. Sur le chapitre I : 4 justes sur 9, et un ordre
 *  incohérent — 7, 7, 4, 6, 7, 11, 6, —, 21. Or Augustin suit Job pas à pas :
 *  la vérité était 3, 4, 5, 6, 7, 11, 12, 15, 21, strictement croissante.
 *
 *  Cette croissance est une contrainte bien plus sûre que la ressemblance des
 *  mots, qui est faible ici — Sacy et le traducteur d'Augustin rendent le même
 *  latin autrement. On aligne donc les deux suites d'un bloc, en n'autorisant
 *  que des correspondances qui avancent : sauter un verset ne coûte rien
 *  (Augustin en commente peu), laisser un lemme sans cible coûte, mais reste
 *  possible.
 */
const PENALITE_LEMME_ORPHELIN = 0.80

function aligner(lemmes, versets) {
  const n = lemmes.length, m = versets.length
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1))
  const choix = Array.from({ length: n + 1 }, () => new Int8Array(m + 1))
  for (let i = 1; i <= n; i++) {
    dp[i][0] = dp[i - 1][0] - PENALITE_LEMME_ORPHELIN
    choix[i][0] = 2
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sc = scoreCreneau(lemmes[i - 1].sac, versets[j - 1])
      const apparier = sc < PLANCHER_APPARIEMENT ? -Infinity : dp[i - 1][j - 1] + sc
      const sauterVerset = dp[i][j - 1]
      const orphelin = dp[i - 1][j] - PENALITE_LEMME_ORPHELIN
      let best = apparier, c = 1
      if (sauterVerset > best) { best = sauterVerset; c = 3 }
      if (orphelin > best) { best = orphelin; c = 2 }
      dp[i][j] = best; choix[i][j] = c
    }
  }
  const paires = []
  let i = n, j = m
  while (i > 0 && j > 0) {
    const c = choix[i][j]
    if (c === 1) { paires.push({ lemme: lemmes[i - 1], verset: versets[j - 1], sc: scoreCreneau(lemmes[i - 1].sac, versets[j - 1]) }); i--; j-- }
    else if (c === 3) j--
    else i--
  }
  return paires.reverse()
}

const liens = []
const stats = { total: 0, sansLemme: 0, sansChapitre: 0, sur: 0, douteux: 0, rejete: 0, interpoles: 0 }
const apercu = []

// Regrouper les segments par chapitre : l'alignement se fait chapitre par chapitre.
const segsParChapitre = new Map()
for (const s of segs) {
  const ch = romain(String(s.ref_niv1 || '').replace(/chapitre/i, ''))
  if (!ch) { stats.sansChapitre++; continue }
  if (CHAP_ARG && ch !== +CHAP_ARG) continue
  const l = lemme(s.segment_texte)
  if (!l) { stats.sansLemme++; stats.total++; continue }
  stats.total++
  if (!segsParChapitre.has(ch)) segsParChapitre.set(ch, [])
  segsParChapitre.get(ch).push({ s, texte: l, sac: sac(l) })
}

for (const [ch, lemmes] of [...segsParChapitre.entries()].sort((a, b) => a[0] - b[0])) {
  const versets = (jobParChapitre.get(ch) ?? []).sort(
    (a, b) => +a.canon_id.split('.')[2] - +b.canon_id.split('.')[2])
  if (!versets.length) { stats.rejete += lemmes.length; continue }

  const paires = aligner(lemmes, versets)

  // COMBLER LES TROUS PAR LA POSITION, PUISQUE LE VOCABULAIRE SE TAIT.
  //
  // Restent des lemmes qu'aucun mot ne rattache : le traducteur d'Augustin
  // paraphrase si librement qu'il ne partage rien avec Sacy — « Le juste se
  // nourrira de ce qu'il aura amassé » contre « L'affamé dévorera sa moisson »,
  // c'est le même verset et pas un mot commun. Aucun lexique n'y peut rien.
  //
  // Leur PLACE, elle, est connue : l'ordre étant garanti, un lemme abandonné
  // entre deux voisins appariés se trouve forcément entre leurs deux versets.
  // Quand il ne reste qu'un seul créneau libre dans cet intervalle, la déduction
  // est sans autre issue possible — on le pose, en « douteux ».
  const parIndex = new Map(paires.map(p => [lemmes.indexOf(p.lemme), p]))
  const numero = c => +c.canon_id.split('.')[2]
  for (let i = 0; i < lemmes.length; i++) {
    if (parIndex.has(i)) continue
    let avant = null, apres = null
    for (let k = i - 1; k >= 0; k--) if (parIndex.has(k)) { avant = parIndex.get(k); break }
    for (let k = i + 1; k < lemmes.length; k++) if (parIndex.has(k)) { apres = parIndex.get(k); break }
    if (!avant || !apres) continue
    const pris = new Set([...parIndex.values()].map(p => p.verset.canon_id))
    const libres = versets.filter(v => numero(v) > numero(avant.verset)
                                    && numero(v) < numero(apres.verset)
                                    && !pris.has(v.canon_id))
    if (libres.length === 1) {
      parIndex.set(i, { lemme: lemmes[i], verset: libres[0], sc: 0, interpole: true })
      stats.interpoles++
    }
  }
  const paires2 = [...parIndex.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1])

  const apparies = new Set(paires2.map(p => p.lemme.s.id))
  for (const l of lemmes) if (!apparies.has(l.s.id)) {
    stats.rejete++
    apercu.push({ s: l.s, l: l.texte, ch, sc: 0, cible: null, verdict: 'ÉCARTÉ' })
  }

  for (const p of paires2) {
    // Score haut (champ restreint) → probable sans arbitrage ; sinon douteux +
    // arbitrage. JAMAIS probable ET arbitrage ensemble.
    const sur = !p.interpole && p.sc >= SEUIL_SUR
    const fiabilite = sur ? 'probable' : 'douteux'
    sur ? stats.sur++ : stats.douteux++
    apercu.push({ s: p.lemme.s, l: p.lemme.texte, ch, sc: p.sc, cible: p.verset.canon_id,
                  verdict: p.interpole ? 'interpolé' : sur ? 'sûr' : fiabilite === 'probable' ? 'à arbitrer' : 'douteux' })

    const commun = {
      segment_id: p.lemme.s.id, canon_id: p.verset.canon_id,
      fiabilite, provenance: 'ia',
      arbitrage_requis: !sur,
      motif: p.interpole
        ? `Aucun mot commun avec le verset : rattachement déduit de la position, seul créneau libre entre les deux voisins alignés. À relire.`
        : `Lemme « ${p.lemme.texte.slice(0, 80)} » aligné sur le texte de Job, score ${p.sc.toFixed(2)}.`,
    }
    // Le lemme est une CITATION (type 1). PAS de type 3 automatique : le lien 3
    // exige que l'auteur EXPLIQUE le verset (§9.3) — l'explication est dans les
    // segments suivants et ne s'établit qu'en lecture, pas en dupliquant la citation.
    liens.push({ ...commun, type: 1 })
  }
}

// ── Phase 2 : les citations secondaires ──────────────────────────────────────
//
// Le commentaire cite encore, après son lemme : le plus souvent la suite du même
// verset ou un passage voisin de Job, parfois un tout autre livre. On les cherche
// dans TOUT Job — sans contrainte d'ordre, puisqu'elles n'en ont aucune.
//
// D'où l'exigence : rien ne s'écrit sous SEUIL_SECONDAIRE. Une citation venue
// d'ailleurs (1 Co 3, 1) trouverait toujours dans Job un verset vaguement proche
// si on la lui laissait chercher assez bas. Mieux vaut la manquer que la loger
// de force — elle sera reprise par une passe sémantique (charte §25.8).
const tousVersetsJob = [...jobParChapitre.values()].flat()
const dejaVise = new Set(liens.filter(l => l.type === 1).map(l => `${l.segment_id}|${l.canon_id}`))
const statsSec = { examinees: 0, retenues: 0, sousSeuil: 0 }
const apercuSec = []

for (const s of segs) {
  const ch = romain(String(s.ref_niv1 || '').replace(/chapitre/i, ''))
  if (CHAP_ARG && ch !== +CHAP_ARG) continue
  const toutes = citations(s.segment_texte)
  for (const c of toutes.slice(1)) {
    statsSec.examinees++
    // LA PROXIMITÉ PÈSE PLUS QUE LE SCORE. Cherchée dans tout Job, une citation
    // secondaire trouve trop souvent un verset lointain qui lui ressemble par
    // hasard : « Car la main du Seigneur m'a touché », citée au chapitre 19, était
    // rattachée à Job 2, 6 alors qu'elle est en Job 19, 21. Tout ce qui restait
    // dans le chapitre commenté, en revanche, tombait juste.
    // On s'y tient donc, ainsi qu'aux chapitres immédiatement voisins — un
    // commentateur revient sur ce qu'il vient de lire. Les citations d'un autre
    // livre, elles, relèvent de la passe sémantique (charte §25.8) : ici on les
    // manque volontiers plutôt que de les loger de force dans Job.
    const sacC = sac(c)
    const candidats = tousVersetsJob.filter(v => Math.abs(+v.canon_id.split('.')[1] - ch) <= 1)
    let meilleur = null, meilleurScore = 0
    for (const v of candidats) {
      const sc = scoreCreneau(sacC, v)
      if (sc > meilleurScore) { meilleurScore = sc; meilleur = v }
    }
    if (!meilleur || meilleurScore < SEUIL_SECONDAIRE) { statsSec.sousSeuil++; continue }
    const cle = `${s.id}|${meilleur.canon_id}`
    if (dejaVise.has(cle)) continue          // déjà porté par le lemme
    dejaVise.add(cle)
    statsSec.retenues++
    apercuSec.push({ seg: s.segment_numero, ch, cible: meilleur.canon_id, sc: meilleurScore, txt: c })
    if (DRY) console.log(`  sec. seg ${String(s.segment_numero).padStart(4)} (ch.${ch}) → ${meilleur.canon_id.padEnd(11)} ${meilleurScore.toFixed(2)}  « ${c.slice(0, 62)} »`)
    liens.push({
      segment_id: s.id, canon_id: meilleur.canon_id, type: 1,
      fiabilite: 'douteux', provenance: 'ia', arbitrage_requis: true,
      motif: `Citation dans le commentaire (hors lemme) : « ${c.slice(0, 70)} » — score ${meilleurScore.toFixed(2)}, cherchée dans tout le livre de Job.`,
    })
  }
}

console.log(`\nCitations secondaires : ${statsSec.examinees} examinées`)
console.log(`  rattachées dans Job (≥ ${SEUIL_SECONDAIRE}) : ${statsSec.retenues}`)
console.log(`  laissées de côté, score insuffisant        : ${statsSec.sousSeuil}`)

// ── Rapport ──────────────────────────────────────────────────────────────────
console.log(`\nSegments examinés : ${stats.total}`)
console.log(`  appariés, score sûr (≥ ${SEUIL_SUR})  : ${stats.sur}`)
console.log(`  appariés, à arbitrer (≥ ${SEUIL_BAS}) : ${stats.douteux}`)
console.log(`  déduits de la position (interpolés)  : ${stats.interpoles}`)
console.log(`  écartés, aucun mot commun            : ${stats.rejete}`)
console.log(`  sans lemme entre guillemets          : ${stats.sansLemme}`)
console.log(`  chapitre illisible dans ref_niv1     : ${stats.sansChapitre}`)
console.log(`→ ${liens.length} liens à écrire (2 par segment apparié : citation + doctrine)\n`)

if (DRY) {
  // On relit l'alignement DANS L'ORDRE DU TEXTE : c'est la seule façon de voir
  // d'un coup d'œil s'il est cohérent — la colonne des versets doit monter.
  const parSegment = [...apercu].sort((a, b) => a.s.segment_numero - b.s.segment_numero)
  console.log('── ALIGNEMENT DANS L’ORDRE DU TEXTE (la colonne des versets doit monter)')
  for (const a of parSegment) {
    const seg = String(a.s.segment_numero).padStart(4)
    const cible = String(a.cible ?? '—').padEnd(11)
    const verdict = a.verdict.padEnd(11)
    console.log(`  seg ${seg}  ${cible} ${a.sc.toFixed(2)}  ${verdict} « ${(a.l ?? '').slice(0, 68)} »`)
  }
  console.log('\n(--dry : rien écrit)')
  process.exit(0)
}

// REPRISE : on efface les liens que cette passe avait posés, jamais ceux qu'un
// éditeur a arrêtés. Un arbitrage humain ne se réécrit pas d'une passe machine —
// c'est précisément ce que la traçabilité (`provenance`) permet de garantir.
const idsSegments = segs.map(s => s.id)
let supprimes = 0
for (let i = 0; i < idsSegments.length; i += 500) {
  const { data, error } = await sb.from('liens_bibliques')
    .delete().eq('provenance', 'ia').in('segment_id', idsSegments.slice(i, i + 500)).select('id')
  if (error) throw error
  supprimes += data?.length ?? 0
}
const { count: gardes } = await sb.from('liens_bibliques')
  .select('*', { count: 'exact', head: true })
  .eq('provenance', 'editeur').in('segment_id', idsSegments.slice(0, 500))
console.log(`  ${supprimes} liens de la passe précédente retirés · ${gardes ?? 0} arbitrage(s) d'éditeur conservé(s)`)

liens.forEach(verifierLienMecanique)   // garde-fou : aucun type 3/4 affirmé
for (let i = 0; i < liens.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(liens.slice(i, i + 500))
  if (error) throw error
}
console.log(`✓ ${liens.length} liens écrits`)
