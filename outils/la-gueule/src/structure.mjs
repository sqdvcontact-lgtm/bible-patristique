// Analyse de STRUCTURE ÉDITORIALE (Boèce Ceriziers) — d'après les instructions GPT du 2026-08-08.
//
// PRINCIPE ABSOLU : tout est SUGGESTION. On ne modifie jamais la source (bbox, ocr0), on
// n'insère jamais une lettre, on ne supprime jamais un fragment, on n'attribue aucun niveau de
// titre sans validation humaine. Chaque suggestion est distincte, réversible, tracée. Rien n'est
// activé par défaut avant évaluation sur pages réelles. Les « exclusions » retirent du CORPS
// éditorial, jamais de la donnée source.
//
// Fonctions pures et testables. Étapes 1-4 du plan GPT (modèle, hors-corps partiel, T1/T2,
// lettrines). Poésie (blocs, continuations, blancs) et propagation aux exports : étapes suivantes.

// ── §1 Modèle commun d'annotation ────────────────────────────────────────────
export const ROLES = [
  'corps', 'titre', 'vers', 'continuation_typographique', 'titre_courant',
  'numero_page', 'signature', 'reclame', 'paratexte_titre', 'ornement', 'bruit', 'indetermine',
]

/** Annotation vierge : distingue la suggestion automatique de la décision humaine. */
export function annotationVide() {
  return {
    role_suggere: null,      // proposé par l'analyse
    role_confirme: null,     // posé par l'humain (fait foi)
    statut: 'suggere',       // 'suggere' | 'confirme'
    score: 0,
    regle: null,             // règle appliquée (traçabilité)
    preuves: {},             // signaux ayant motivé la suggestion (traçabilité)
    export_corps: true,      // la ligne entre-t-elle dans le corps éditorial ?
    interdit_entrainement: false,
    poeme_id: null,          // passe 4 : identifiant technique stable du poème (null = prose / hors poème)
    poeme_ref: null,         // référence lisible (« livre-1-poesie-1 »), recalculable
  }
}

// ── Helpers géométriques ─────────────────────────────────────────────────────
const x0 = (l) => l.bbox[0]
const y0 = (l) => l.bbox[1]
const larg = (l) => l.bbox[2]
const haut = (l) => l.bbox[3]
const droite = (l) => l.bbox[0] + l.bbox[2]
const bas = (l) => l.bbox[1] + l.bbox[3]
const texte = (l) => String(l.dip ?? l.ocr0 ?? l.texte ?? '')

const mediane = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
export const hauteurMediane = (lignes) => mediane(lignes.filter((l) => l.bbox).map(haut))
/** Largeur moyenne d'un caractère sur une ligne (approx : largeur boîte / nb caractères). */
const largCar = (l) => { const n = [...texte(l)].length; return n ? larg(l) / n : larg(l) }

// ── §6 (helper) Normalisation POUR COMPARAISON seulement (jamais la donnée) ───
/** minuscules ; ſ→s ; ponctuation périphérique retirée ; espaces réduits. Le texte source
 *  reste inchangé — ceci ne sert qu'aux comparaisons (titres courants, réclames). */
export function normaliserComparaison(t) {
  return String(t ?? '')
    .toLowerCase()
    .replace(/ſ/g, 's')                 // ſ → s (comparaison seulement)
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')        // retire la ponctuation
    .replace(/\s+/g, ' ')
    .trim()
}

/** Similarité normalisée [0..1] entre deux chaînes (Sørensen–Dice sur bigrammes de caractères). */
export function similarite(a, b) {
  const na = normaliserComparaison(a), nb = normaliserComparaison(b)
  if (!na && !nb) return 1
  if (!na || !nb) return 0
  if (na === nb) return 1
  const big = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1) } return m }
  const A = big(na), B = big(nb); let inter = 0, tot = 0
  for (const [g, c] of A) { tot += c; if (B.has(g)) inter += Math.min(c, B.get(g)) }
  for (const [, c] of B) tot += c
  return tot ? (2 * inter) / tot : 0
}

// ── §7 Numéros de page ───────────────────────────────────────────────────────
const EST_NOMBRE = (t) => /^\s*\d{1,4}\s*$/.test(t)
/** Une ligne « nombre seul » en HAUT, ou en BAS mais CENTRÉE → numero_page (hors corps).
 *  Un nombre en bas NON centré (coin) n'est PAS un folio : c'est plutôt une signature (§7). */
export function detecterNumeroPage(l, page) {
  if (!l.bbox || !EST_NOMBRE(texte(l))) return null
  const H = page.hauteur || 0, W = page.largeur || 0
  const enHaut = H && y0(l) < H * 0.15
  const centre = W ? Math.abs((x0(l) + larg(l) / 2) - W / 2) < W * 0.10 : false
  const enBasCentre = H && bas(l) > H * 0.88 && centre
  if (!enHaut && !enBasCentre) return null
  const a = annotationVide()
  a.role_suggere = 'numero_page'; a.score = 2; a.export_corps = false
  a.preuves = { nombre_seul: true, zone: enHaut ? 'haut' : 'bas_centre' }
  return a
}

// ── §7 Signatures de cahier (bas de page : « B », « 2 », « B2 »…) ─────────────
export function detecterSignature(l, page, { lignes = [] } = {}) {
  if (!l.bbox) return null
  const t = texte(l).trim()
  if (!/^[A-Za-z0-9]{1,4}$/.test(t)) return null                 // 1 à 4 caractères alphanumériques
  const H = page.hauteur || 0, W = page.largeur || 0
  if (!(H && bas(l) > H * 0.88)) return null                     // dans les 12 % inférieurs
  if (W && larg(l) > W * 0.10) return null                       // largeur < 10 % du bloc
  if (detecterNumeroPage(l, page)) return null                   // pas déjà un folio (bas-centre)
  // Isolée du corps : soit un blanc vertical au-dessus, soit décalée horizontalement (loin de la
  // marge du corps). Les signatures de Ceriziers sont au ras de la dernière ligne, mais à droite.
  const corps = lignes.filter((o) => o !== l && o.bbox && larg(o) > W * 0.15)
  const margeCorps = corps.length ? Math.min(...corps.map(x0)) : 0
  const auDessus = corps.filter((o) => bas(o) <= y0(l) + 5).sort((a, b) => bas(b) - bas(a))[0]
  const blancDessus = !auDessus || (y0(l) - bas(auDessus)) > (hauteurMediane(lignes) || 40) * 1.1
  const decalee = x0(l) > margeCorps + W * 0.25
  if (!blancDessus && !decalee) return null
  const a = annotationVide()
  a.role_suggere = 'signature'; a.score = 3; a.export_corps = false
  a.preuves = { bas_de_page: true, court: t.length, largeur_faible: true, isolee: blancDessus ? 'blanc' : 'decalee', texte: t }
  return a
}

// ── Filigrane de numérisation (« Digitized by Google ») → bruit (hors-corps) ──
export function detecterFiligrane(l) {
  const n = normaliserComparaison(texte(l))
  if (!/\bgoogle\b/.test(n) && !/digitized by google/.test(n)) return null
  const a = annotationVide()
  a.role_suggere = 'bruit'; a.score = 3; a.export_corps = false
  a.preuves = { filigrane: 'google' }
  return a
}

// ── §4 Lettrines et artefacts ────────────────────────────────────────────────
// Fragment suspect en tête : 1-2 capitales (éventuellement + ponctuation) formant un non-mot.
const MOTS_COURTS_OK = new Set(['a', 'à', 'ô', 'y', 'o', 'i', 'e', 'en', 'un', 'la', 'le', 'du', 'de', 'ce', 'il', 'et', 'ne', 'où', 'on', 'sa', 'ses', 'les', 'des'])
function fragmentInitial(t) {
  const m = /^([A-ZÎÉÈÀÔ]{1,2})([!?.,;:]?)(\s|$)/.exec(t.trim())
  if (!m) return null
  const frag = m[1]
  if (MOTS_COURTS_OK.has(frag.toLowerCase())) return null // vrai petit mot en capitale d'attaque
  return { frag, ponct: m[2] || '' }
}

/**
 * Détecte lettrines (initiale ornée perdue/garbée) et artefacts (fragment d'ornement collé en
 * tête d'une ligne voisine). NE RESTITUE JAMAIS la lettre. `debutsBloc` = indices des lignes qui
 * commencent un paragraphe/strophe (après un titre ou un grand blanc). Renvoie une Map i→annotation.
 */
export function detecterLettrines(lignes, { medH = null, debutsBloc = null } = {}) {
  const L = lignes.map((l, i) => ({ l, i })).filter((x) => x.l.bbox)
  const hMed = medH || hauteurMediane(lignes) || 50
  const debuts = debutsBloc || debutsDeBloc(lignes)
  const out = new Map()
  for (let k = 0; k < L.length; k++) {
    const { l, i } = L[k]
    const t = texte(l)
    const frag = fragmentInitial(t)
    const estDebut = debuts.has(i)

    if (estDebut) {
      // Signaux de lettrine sur une ligne d'attaque de paragraphe/strophe.
      let score = 0; const preuves = {}
      // +2 : les premières lignes du bloc démarrent nettement plus à droite, puis reviennent.
      const margeBloc = margeGaucheRetour(L, k)
      if (margeBloc && x0(l) > margeBloc + hMed * 1.2) { score += 2; preuves.premieres_lignes_a_droite = true }
      // +1 : fragment suspect / capitale incomplète / ponctuation incohérente en tête.
      if (frag) { score += 1; preuves.fragment_initial = frag.frag + frag.ponct }
      // +1 : suit un blanc vertical / un titre (début de paragraphe).
      score += 1; preuves.debut_de_bloc = true
      // +1 : la ligne est sensiblement plus haute que la médiane (grande initiale).
      if (haut(l) > hMed * 1.4) { score += 1; preuves.ligne_haute = true }
      if (score >= 3) {
        const a = annotationVide()
        a.role_suggere = 'lettrine_candidate'; a.score = score; a.preuves = preuves
        a.interdit_entrainement = true // la lettrine perdue invalide la paire image/texte
        out.set(i, a)
        continue
      }
    }
    // Artefact : fragment court en tête d'une ligne NON-début, adjacent à une lettrine plausible.
    if (!estDebut && frag) {
      const a = annotationVide()
      a.role_suggere = 'artefact_candidate'; a.score = 2
      a.preuves = { fragment: frag.frag, lie_lettrine: true }
      a.interdit_entrainement = true
      out.set(i, a)
    }
  }
  return out
}

/** Indices des lignes qui commencent un bloc : première ligne, ou ligne suivant un titre
 *  (« … POESIE … », « … PROSE … », « LIVRE … ») ou un grand saut vertical. */
export function debutsDeBloc(lignes) {
  const L = lignes.map((l, i) => ({ l, i })).filter((x) => x.l.bbox).sort((a, b) => y0(a.l) - y0(b.l))
  const hMed = hauteurMediane(lignes) || 50
  const set = new Set()
  for (let k = 0; k < L.length; k++) {
    if (k === 0) { set.add(L[k].i); continue }
    const prec = L[k - 1].l
    const gap = y0(L[k].l) - bas(prec)
    if (gap > hMed * 1.1) set.add(L[k].i)                 // grand blanc vertical
    else if (/\b(PO[ÉE]SIE|PROSE|LIVRE|LIURE)\b/i.test(texte(prec))) set.add(L[k].i) // suit un titre
  }
  return set
}

/** Marge de gauche « de retour » : le HPOS minimal des lignes qui suivent, dans la fenêtre du bloc
 *  (celle vers laquelle le texte revient après l'initiale). */
function margeGaucheRetour(L, k) {
  const suivantes = L.slice(k + 1, k + 8).map((x) => x0(x.l))
  if (!suivantes.length) return null
  return Math.min(...suivantes)
}

// ── §2 (passe 2) Région de titre / paratexte / ornement (page de titre) ──────
const RE_LEXIQUE_TITRE = /consolation|philosophie|livre|liure|trait[eé]|de la|po[ée]sie|prose/i
/**
 * Détecte une region_titre_candidate (groupe de lignes du haut) et classe ses lignes en
 * paratexte_titre_candidate (mots centrés du titre) ou ornement_candidate (fragments de marge).
 * La région s'arrête AVANT le 1er titre de section (POESIE I / PROSE I) ou 2 lignes consécutives
 * de géométrie de corps. Score ≥ 4 requis. Renvoie Map i→annotation (vide si pas de région).
 */
export function detecterRegionTitre(page) {
  const out = new Map()
  const lignes = page.lignes || []
  const W = page.largeur || 1000
  const L = lignes.map((l, i) => ({ l, i })).filter((x) => x.l.bbox).sort((a, b) => y0(a.l) - y0(b.l))
  if (L.length < 3) return out
  const hMed = hauteurMediane(lignes) || 50
  const estSectionTitre = (l) => RE_T2.test(texte(l).trim())
  const estCorps = (l) => larg(l) > W * 0.5 && x0(l) < W * 0.28
  // Borne de fin : avant le 1er titre de section, ou avant 2 lignes de corps consécutives.
  let fin = L.length, corpsConsec = 0
  for (let k = 0; k < L.length; k++) {
    if (estSectionTitre(L[k].l)) { fin = k; break }
    if (estCorps(L[k].l)) { corpsConsec++; if (corpsConsec >= 2) { fin = k - 1; break } } else corpsConsec = 0
  }
  const region = L.slice(0, Math.max(0, fin))
  if (region.length < 3) return out
  const centre = (l) => Math.abs((x0(l) + larg(l) / 2) - W / 2) < W * 0.20
  // Score de région.
  let score = 0; const preuves = {}
  const nC = region.filter((x) => centre(x.l)).length
  if (nC >= 3) { score += 2; preuves.centrees = nC }
  if (region.some((x) => RE_LEXIQUE_TITRE.test(texte(x.l)))) { score += 2; preuves.motif_lexical = true }
  if (region.filter((x) => larg(x.l) < W * 0.65).length > region.length / 2) { score += 1; preuves.majorite_courtes = true }
  const hs = region.map((x) => haut(x.l)); if ((Math.max(...hs) - Math.min(...hs)) > hMed * 0.8) { score += 1; preuves.hauteurs_variables = true }
  if (region.some((x) => [...texte(x.l).trim()].length <= 2)) { score += 1; preuves.fragments = true }
  if (fin < L.length) { score += 1; preuves.aucun_paragraphe_avant_fin = true }
  if (score < 4) return out
  // Classement : mots CENTRÉS avec lettres → paratexte ; fragments de marge → ornement.
  for (const { l, i } of region) {
    const t = texte(l).trim()
    const lettres = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length
    const a = annotationVide()
    a.score = score; a.export_corps = false; a.preuves = { region_titre: true, ...preuves }
    if (centre(l) && lettres >= 2) { a.role_suggere = 'paratexte_titre_candidate'; a.regle = 'region_titre/paratexte' }
    else { a.role_suggere = 'ornement_candidate'; a.regle = 'region_titre/ornement' }
    out.set(i, a)
  }
  return out
}

// ── §3 Continuations typographiques (jamais « rejet » dans la donnée) ─────────
// Mots-outils qui terminent rarement un vers : leur présence en fin de ligne précédente signale
// une continuation typographique (« changez par ma » → « douleur »). « parlé » n'en est pas un
// → « que de ioye » reste un vers à part entière (et NON une continuation).
const MOTS_INCOMPLETS = new Set('ma mon ton son sa au aux le la les des du de un une mes tes ses nos vos leur leurs cet cette ce et ne en par pour sur dans sous sans qui que qu où dont si ni ou mais car a à d l n s'.split(' '))
const dernierMot = (t) => { const m = normaliserComparaison(t).split(' '); return m[m.length - 1] || '' }
const finitIncomplet = (t) => /[-¬]$/.test(String(t).trim()) || MOTS_INCOMPLETS.has(dernierMot(t))
const medianeGaps = (B) => { const g = []; for (let k = 1; k < B.length; k++) g.push(y0(B[k].l) - bas(B[k - 1].l)); return mediane(g.filter((x) => x >= 0)) || 20 }

/** Détecte les continuations typographiques d'un BLOC poétique. Jamais de fusion automatique.
 *  Renvoie Map i→annotation {type_ligne:'continuation_typographique', continuation_de, blanc_poesie:null}. */
export function detecterContinuations(bloc) {
  const B = bloc.map((l, i) => ({ l, i })).filter((x) => x.l.bbox).sort((a, b) => y0(a.l) - y0(b.l))
  if (B.length < 2) return new Map()
  const margeD = Math.max(...B.map((x) => droite(x.l)))
  const largVerseMed = mediane(B.map((x) => larg(x.l))) || 1
  const interligne = medianeGaps(B)
  const out = new Map()
  for (let k = 1; k < B.length; k++) {
    const { l, i } = B[k], prev = B[k - 1].l
    let score = 0; const preuves = {}
    if (droite(prev) >= margeD - 2.5 * largCar(prev)) { score += 1; preuves.prec_pleine = true }
    if (larg(l) < largVerseMed * 0.45) { score += 1; preuves.courte = true }
    if (texte(l).trim().split(/\s+/).filter(Boolean).length <= 3) { score += 1; preuves.peu_de_mots = true }
    const gap = y0(l) - bas(prev)
    if (gap >= -5 && gap < interligne * 1.6) { score += 1; preuves.interligne_normal = true }
    const relation = finitIncomplet(texte(prev))
    if (relation) { score += 2; preuves.prec_finit_incomplet = dernierMot(texte(prev)) }
    // La RELATION avec la ligne précédente est décisive : sans elle, on ne déclasse pas un vers.
    if (score >= 3 && relation) {
      const a = annotationVide()
      a.role_suggere = 'continuation_typographique'; a.score = score; a.preuves = preuves
      a.type_ligne = 'continuation_typographique'; a.continuation_de = B[k - 1].i; a.blanc_poesie = null
      a.retrait_source_normalise = 0.0
      out.set(i, a)
    }
  }
  return out
}

// ── §4 Blancs poétiques à trois niveaux (par BLOC, jamais en px absolus) ──────
/** Regroupe des valeurs 1D en 1 à `maxAmas` amas (coupures aux plus grands écarts ≥ sepMin). */
export function grouper1D(vals, maxAmas = 3, sepMin = 0.08) {
  const n = vals.length
  if (!n) return { clusters: [], centres: [] }
  const ordre = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const gaps = []
  for (let k = 1; k < n; k++) gaps.push({ pos: k, g: ordre[k].v - ordre[k - 1].v })
  const coupures = gaps.filter((x) => x.g >= sepMin).sort((a, b) => b.g - a.g).slice(0, maxAmas - 1).map((x) => x.pos).sort((a, b) => a - b)
  const idSorted = new Array(n); let c = 0
  for (let k = 0; k < n; k++) { if (coupures.includes(k)) c++; idSorted[k] = c }
  const nC = c + 1, sommes = new Array(nC).fill(0), comptes = new Array(nC).fill(0)
  for (let k = 0; k < n; k++) { sommes[idSorted[k]] += ordre[k].v; comptes[idSorted[k]]++ }
  const centres = sommes.map((s, ci) => s / comptes[ci])
  const clusters = new Array(n)
  for (let k = 0; k < n; k++) clusters[ordre[k].i] = idSorted[k]
  return { clusters, centres }
}

/** Classe les blancs poétiques (petit/moyen/large) d'un bloc, APRÈS exclusion des continuations.
 *  retrait_normalise = (HPOS - marge_gauche_bloc) / largeur_bloc. Renvoie Map i→annotation vers. */
export function classerBlancsPoesie(bloc, continuations = new Map()) {
  const B = bloc.map((l, i) => ({ l, i })).filter((x) => x.l.bbox && !continuations.has(x.i))
  if (!B.length) return new Map()
  const marge = Math.min(...B.map((x) => x0(x.l)))
  const droiteMax = Math.max(...B.map((x) => droite(x.l)))
  const largeurBloc = (droiteMax - marge) || 1
  const retraits = B.map((x) => Math.max(0, (x0(x.l) - marge) / largeurBloc))
  const { clusters, centres } = grouper1D(retraits, 3, 0.08)
  const noms = centres.length <= 1 ? ['petit'] : centres.length === 2 ? ['petit', 'moyen'] : ['petit', 'moyen', 'large']
  const tailleAmas = centres.map((_, ci) => clusters.filter((cc) => cc === ci).length)
  const out = new Map()
  B.forEach((x, k) => {
    const c = clusters[k]
    const a = annotationVide()
    a.role_suggere = 'vers'; a.type_ligne = 'vers'
    a.blanc_poesie = noms[c] || 'petit'
    a.retrait_source_normalise = Math.round(retraits[k] * 1000) / 1000
    a.preuves = { cluster: c, centre: Math.round(centres[c] * 1000) / 1000, amas_isole: tailleAmas[c] === 1 }
    a.score = tailleAmas[c] === 1 ? 1 : 3 // un amas d'une seule ligne = faible confiance (§4)
    out.set(x.i, a)
  })
  return out
}

/** Analyse complète d'un bloc poétique : continuations PUIS blancs. Map i→annotation. */
export function analyserBlocPoesie(bloc) {
  const cont = detecterContinuations(bloc)
  const blancs = classerBlancsPoesie(bloc, cont)
  const out = new Map()
  for (const [i, a] of cont) out.set(i, a)
  for (const [i, a] of blancs) if (!out.has(i)) out.set(i, a)
  return out
}

// ── §6 Titres courants (par RÉPÉTITION inter-pages ; parité prise en compte) ──
/** Lignes candidates au titre courant : dans les 15 % supérieurs de la page. */
function candidatsTitreCourant(page) {
  const H = page.hauteur || 0
  return (page.lignes || []).map((l, i) => ({ l, i })).filter((x) => x.l.bbox && H && y0(x.l) < H * 0.15 && normaliserComparaison(texte(x.l)))
}

/**
 * Détecte les titres courants par répétition. `pages` = [{ num, largeur, hauteur, lignes }] ordonnées.
 * Propose titre_courant si le même texte (similarité ≥ 0,90) revient ≥3 fois sur des pages de MÊME
 * parité (fenêtre de 8 pages), ou ≥4 fois dans le volume, en tête de page. Renvoie Map num→(Map i→annotation).
 */
export function detecterTitresCourants(pages) {
  const occ = [] // { num, i, parite, cle, l }
  for (const p of pages) for (const { l, i } of candidatsTitreCourant(p)) occ.push({ num: p.num, i, parite: p.num % 2, cle: normaliserComparaison(texte(l)), l })
  const out = new Map()
  const marque = (o, preuves) => {
    if (!out.has(o.num)) out.set(o.num, new Map())
    const a = annotationVide()
    a.role_suggere = 'titre_courant'; a.score = 3; a.export_corps = false
    a.preuves = preuves
    out.get(o.num).set(o.i, a)
  }
  for (const o of occ) {
    // occurrences « semblables » (similarité ≥ 0,90) hors la ligne courante
    const semblables = occ.filter((q) => q !== o && similarite(q.cle, o.cle) >= 0.90)
    const memeParite = semblables.filter((q) => q.parite === o.parite && Math.abs(q.num - o.num) <= 8)
    const total = semblables.length
    if (memeParite.length >= 2 || total >= 3) { // +la ligne courante → ≥3 même parité, ou ≥4 total
      marque(o, { repetition: total + 1, meme_parite: memeParite.length + 1, cle: o.cle })
    }
  }
  return out
}

// ── §4 (passe 2) Réclames : ligne courte au coin BAS-DROITE reprise page suivante ─
const ROLE_EXCLU_RECLAME = new Set(['numero_page', 'titre_courant', 'signature', 'bruit', 'ornement_candidate', 'paratexte_titre_candidate'])
/** Première ligne de CORPS d'une page (hors folio / en-tête / rôles hors-corps). {l, i} ou null. */
function premiereLigneCorps(page, anns = null) {
  const H = page.hauteur || 0
  const L = (page.lignes || []).map((l, i) => ({ l, i })).filter((x) => x.l.bbox).sort((a, b) => y0(a.l) - y0(b.l))
  return L.find((x) => !EST_NOMBRE(texte(x.l)) && (!H || y0(x.l) > H * 0.13) && !(anns && anns[x.i] && ROLE_EXCLU_RECLAME.has(anns[x.i].role_suggere))) || L[0] || null
}
/**
 * Détecte les réclames (§4) : parmi les lignes courtes du coin BAS-DROITE (jamais « la plus basse »),
 * après exclusion des folios/signatures/bruit/ornement/paratexte, celle qui correspond le mieux au
 * début de corps de la page SUIVANTE. `annotations` = Map num→anns[] (rôles déjà posés) pour exclure.
 * Renvoie Map num→(Map i→annotation). Ne confirme jamais sans page suivante sûre.
 */
export function detecterReclames(pages, annotations = null) {
  const out = new Map()
  const exclu = (num, i) => { const r = annotations?.get(num)?.[i]?.role_suggere; return r && ROLE_EXCLU_RECLAME.has(r) }
  for (let p = 0; p < pages.length - 1; p++) {
    const page = pages[p], suiv = pages[p + 1]
    const W = page.largeur || 1000, H = page.hauteur || 0
    const L = (page.lignes || []).map((l, i) => ({ l, i })).filter((x) => x.l.bbox)
    if (!L.length) continue
    const hMed = hauteurMediane(page.lignes || []) || 40
    const basCorps = Math.max(0, ...L.filter((x) => larg(x.l) > W * 0.4).map((x) => bas(x.l)))
    const cand = L.filter(({ l, i }) => {
      if (exclu(page.num, i)) return false
      const t = texte(l).trim(); const car = [...t].length; const mots = t.split(/\s+/).filter(Boolean).length
      if (mots < 1 || mots > 4 || car < 2 || car > 30) return false
      if (/^\d+$/.test(t) || /^[IVXLC]+\.?$/i.test(t) || /^[A-Za-z0-9]{1,4}$/.test(t) || /\bgoogle\b/i.test(t)) return false
      const enBas = (H && bas(l) > H * 0.80) || (basCorps && y0(l) > basCorps - hMed * 0.2)
      const aDroite = droite(l) >= W * 0.82 || (x0(l) + larg(l) / 2) > W * 0.72
      const etroite = larg(l) <= W * 0.35
      return enBas && aDroite && etroite
    })
    if (!cand.length) continue
    const debut = premiereLigneCorps(suiv, annotations?.get(suiv.num))
    if (!debut) continue
    const cibleNorm = normaliserComparaison(texte(debut.l))
    const cibleLettrine = /lettrine/.test(annotations?.get(suiv.num)?.[debut.i]?.role_suggere || '')
    let best = null
    for (const c of cand) {
      const src = normaliserComparaison(texte(c.l)); const n = Math.max(1, src.split(' ').length)
      let sim = similarite(src, cibleNorm.split(' ').slice(0, n).join(' '))
      if (cibleLettrine) sim = Math.max(sim, similarite(src, cibleNorm.replace(/^\S/, '').trim().split(' ').slice(0, n).join(' ')))
      const geo = (droite(c.l) >= W * 0.82 ? 1 : 0) + (larg(c.l) <= W * 0.35 ? 1 : 0) + (H && bas(c.l) > H * 0.80 ? 1 : 0)
      if (!best || sim > best.sim || (sim === best.sim && geo > best.geo)) best = { c, sim, geo }
    }
    if (!best) continue
    const a = annotationVide(); a.regle = 'reclame/bas-droite'; a.export_corps = false
    a.preuves = { page_source: page.num, ligne_source: texte(best.c.l), page_cible: suiv.num, ligne_cible: texte(debut.l), similarite: Math.round(best.sim * 100) / 100, score_geometrie: best.geo, pages_consecutives_confirmees: true }
    if (best.sim >= 0.90) { a.role_suggere = 'reclame'; a.score = 3 }
    else if (best.sim >= 0.78 && best.geo >= 2) { a.role_suggere = 'reclame'; a.score = 2; a.preuves.confiance = 'moyenne'; a.preuves.a_revoir = true }
    else { a.role_suggere = 'reclame_candidate_geometrique'; a.score = 1; a.preuves.confiance = 'geometrique_seule' }
    if (!out.has(page.num)) out.set(page.num, new Map())
    out.get(page.num).set(best.c.i, a)
  }
  return out
}

// ── §5 Délimitation des blocs (poésie / prose) + §9 orchestration ────────────
const RE_TITRE_POESIE = /\bPO[ÉE]SIE\b/i
const RE_TITRE_PROSE = /\bPROSE\b/i
const estLigneTitre = (l) => RE_T1.test(texte(l).trim()) || RE_T2.test(texte(l).trim())

/** Découpe une page en blocs { type:'poesie'|'prose'|'autre', idx:[…] } délimités par les titres. */
export function delimiterBlocs(lignes) {
  const L = lignes.map((l, i) => ({ l, i })).filter((x) => x.l.bbox).sort((a, b) => y0(a.l) - y0(b.l))
  const blocs = []
  let courant = null
  for (const { l, i } of L) {
    const t = texte(l).trim()
    if (estLigneTitre(l)) {
      courant = { type: RE_TITRE_POESIE.test(t) ? 'poesie' : RE_TITRE_PROSE.test(t) ? 'prose' : 'autre', idx: [], titre: i }
      blocs.push(courant)
      continue
    }
    if (!courant) { courant = { type: 'autre', idx: [] }; blocs.push(courant) }
    courant.idx.push(i)
  }
  return blocs
}

// ── §3.1 Folios robustes : géométrie + (répétition de position OU séquence) ──
/**
 * Détecte les numéros de page CONFIRMÉS au niveau du VOLUME. Un nombre isolé (géométrie seule,
 * famille A) ne suffit plus : il faut au moins une 2ᵉ famille — répétition de position sur ≥2 pages
 * de même parité (C), ou séquence numérique croissante sur ≥3 pages (B). `regionSet` = Map num→Set(i)
 * des lignes déjà en région de titre (exclues). Renvoie Map num→(Map i→annotation numero_page).
 */
export function detecterFoliosVolume(pages, regionSet = null) {
  const cands = []
  for (const page of pages) {
    const W = page.largeur || 1000, H = page.hauteur || 0
    const region = regionSet?.get(page.num) || new Set()
    ;(page.lignes || []).forEach((l, i) => {
      if (!l.bbox || region.has(i)) return
      const t = texte(l).trim()
      if (!/^\d{1,4}$/.test(t)) return
      const enHaut = H && y0(l) < H * 0.10
      const enBas = H && bas(l) > H * 0.88
      if (!enHaut && !enBas) return                                   // famille A : géométrie de folio
      const zone = Math.max(0, Math.min(5, Math.round(((x0(l) + larg(l) / 2) / W) * 5)))
      cands.push({ num: page.num, i, val: +t, parity: page.num % 2, hb: enHaut ? 'H' : 'B', zone })
    })
  }
  const familles = new Map() // "num:i" → { c, fam:Set }
  const marquer = (c, fam) => { const k = c.num + ':' + c.i; const p = familles.get(k) || { c, fam: new Set() }; p.fam.add(fam); familles.set(k, p) }
  // C) répétition de position (même parité, zone, haut/bas) sur ≥2 autres pages (fenêtre 16).
  for (const c of cands) {
    if (cands.filter((q) => q !== c && q.parity === c.parity && q.hb === c.hb && q.zone === c.zone && Math.abs(q.num - c.num) <= 16).length >= 2) marquer(c, 'repetition')
  }
  // B) séquence croissante (val +1..4 quand num +1..3) sur ≥3 pages, même zone/haut-bas.
  const grp = {}
  for (const c of cands) { const k = c.hb + ':' + c.zone; (grp[k] = grp[k] || []).push(c) }
  for (const k of Object.keys(grp)) {
    const arr = grp[k].sort((a, b) => a.num - b.num)
    for (let s = 0; s < arr.length; s++) {
      const run = [arr[s]]
      for (let t = s + 1; t < arr.length; t++) {
        const prev = run[run.length - 1], cur = arr[t], dn = cur.num - prev.num, dv = cur.val - prev.val
        if (dn >= 1 && dn <= 3 && dv >= 1 && dv <= 4) run.push(cur); else break
      }
      if (run.length >= 3) run.forEach((c) => marquer(c, 'sequence'))
    }
  }
  const out = new Map()
  for (const { c, fam } of familles.values()) {
    const a = annotationVide()
    a.role_suggere = 'numero_page'; a.regle = 'folio/geometrie+' + [...fam].join('+'); a.score = fam.size + 1; a.export_corps = false
    a.preuves = { folio: true, familles: ['geometrie', ...fam], zone: c.zone, position: c.hb === 'H' ? 'haut' : 'bas' }
    if (!out.has(c.num)) out.set(c.num, new Map())
    out.get(c.num).set(c.i, a)
  }
  return out
}

/**
 * Orchestration §9 : compose toutes les suggestions par ligne, dans l'ordre de priorité
 * (hors-corps → titres T1/T2 → lettrines → poésie). Renvoie, par page, un tableau d'annotations
 * aligné sur page.lignes. `pages` = [{ num, largeur, hauteur, lignes }] ordonnées.
 * NE MODIFIE RIEN de la source ; ne produit que des SUGGESTIONS (statut 'suggere').
 */
export function analyserVolume(pages) {
  const titresC = detecterTitresCourants(pages)
  const etat = new Map() // num → { anns, horsCorps }

  // ── PHASE 1 : hors-corps (ordre §1) ──
  // 1a) filigrane + région de titre (on note les lignes de région pour exclure leurs nombres des folios).
  const regionSet = new Map()
  for (const page of pages) {
    const lignes = page.lignes || []
    const anns = lignes.map(() => annotationVide())
    const horsCorps = new Set()
    const poser = (i, a) => { anns[i] = a; horsCorps.add(i) }
    lignes.forEach((l, i) => { const fg = detecterFiligrane(l); if (fg) poser(i, fg) })            // 2 filigrane
    const reg = detecterRegionTitre(page)                                                          // 3 région
    for (const [i, a] of reg) if (!horsCorps.has(i)) poser(i, a)
    regionSet.set(page.num, new Set(reg.keys()))
    etat.set(page.num, { anns, horsCorps })
  }
  // 1b) folios robustes (§3.1 : géométrie + répétition/séquence), puis titres courants et signatures.
  const folios = detecterFoliosVolume(pages, regionSet)
  for (const page of pages) {
    const lignes = page.lignes || []
    const { anns, horsCorps } = etat.get(page.num)
    const poser = (i, a) => { anns[i] = a; horsCorps.add(i) }
    for (const [i, a] of (folios.get(page.num) || [])) if (!horsCorps.has(i)) poser(i, a)          // 4 folios
    for (const [i, a] of (titresC.get(page.num) || [])) if (!horsCorps.has(i)) poser(i, a)         // 5 titres courants
    lignes.forEach((l, i) => { if (horsCorps.has(i)) return; const sg = detecterSignature(l, page, { lignes }); if (sg) poser(i, sg) }) // 6 signatures
  }

  // 7) réclames : après les rôles hors-corps (exclusions), en comparant à la page suivante.
  const annsSeules = new Map(); for (const [n, v] of etat) annsSeules.set(n, v.anns)
  const reclames = detecterReclames(pages, annsSeules)
  for (const page of pages) {
    const { anns, horsCorps } = etat.get(page.num)
    for (const [i, a] of (reclames.get(page.num) || [])) if (!horsCorps.has(i)) { anns[i] = a; horsCorps.add(i) }
  }

  // ── PHASE 2 : corps (titres T1/T2 → numéral → lettrines → poésie) ──
  for (const page of pages) {
    const lignes = page.lignes || []
    const { anns, horsCorps } = etat.get(page.num)
    // 8) titres de structure T1/T2 (hors hors-corps).
    lignes.forEach((l, i) => { if (horsCorps.has(i)) return; const ti = suggererNiveauTitre(l, page, { lignes }); if (ti) anns[i] = ti })
    // 8.5) numéral de titre détaché (« I. » avant « PROSE. ») → titre, ni lettrine ni artefact.
    const parYt = lignes.map((l, i) => ({ l, i })).filter((x) => x.l.bbox).sort((a, b) => y0(a.l) - y0(b.l))
    for (let k = 1; k < parYt.length; k++) {
      const cur = parYt[k], prev = parYt[k - 1]
      if (anns[cur.i].role_suggere === 'titre' && !horsCorps.has(prev.i)) {
        const t = texte(prev.l).trim()
        if (/^[IVXLC]{1,4}\.?$/i.test(t) || /^\d{1,3}\.?$/.test(t)) {
          const a = annotationVide(); a.role_suggere = 'titre'; a.niveau_suggere = anns[cur.i].niveau_suggere; a.regle = 'numeral_de_titre'; a.preuves = { numeral_de_titre: true }
          anns[prev.i] = a
        }
      }
    }
    // 9) lettrines / artefacts (jamais sur hors-corps ni titre).
    for (const [i, a] of detecterLettrines(lignes)) if (!horsCorps.has(i) && anns[i].role_suggere !== 'titre') { a.blanc_poesie = anns[i].blanc_poesie ?? null; anns[i] = { ...anns[i], ...a } }
    // 10) poésie : blocs 'poesie' → continuations + blancs (hors hors-corps/titre).
    for (const bloc of delimiterBlocs(lignes)) {
      if (bloc.type !== 'poesie') continue
      const idx = bloc.idx.filter((i) => !horsCorps.has(i))
      const res = analyserBlocPoesie(idx.map((i) => lignes[i]))
      res.forEach((a, k) => {
        const i = idx[k]
        if (anns[i].role_suggere === 'lettrine_candidate' || anns[i].role_suggere === 'artefact_candidate') {
          anns[i].type_ligne = a.type_ligne; anns[i].blanc_poesie = a.blanc_poesie
          anns[i].retrait_source_normalise = a.retrait_source_normalise; anns[i].continuation_de = a.continuation_de
        } else if (anns[i].role_suggere == null || anns[i].role_suggere === 'corps') {
          anns[i] = { ...anns[i], ...a }
        }
      })
    }
  }
  const out = new Map(); for (const [n, v] of etat) out.set(n, v.anns); return out
}

// ── §8 Propagation : rattacher les suggestions au projet, exclure le hors-corps ─
/** Rôles qui, une fois CONFIRMÉS par l'humain, sortent du corps éditorial (jamais de la source). */
export const ROLES_HORS_CORPS = ['numero_page', 'signature', 'reclame', 'titre_courant', 'paratexte_titre', 'ornement', 'bruit']

/** Une ligne est-elle hors-corps CONFIRMÉ ? (la suggestion seule ne suffit pas — décision humaine). */
export function estHorsCorpsConfirme(ligne) {
  const r = ligne?.suggestion?.role_confirme
  return !!r && ROLES_HORS_CORPS.includes(r)
}

/** Extrait les annotations de structure par page/ligne pour l'export JSON (le site rend les blancs
 *  poétiques par CSS via ces classes, sans jamais ajouter de caractères au texte). */
export function extraireStructure(projet) {
  const out = {}
  for (const num of Object.keys(projet?.pages || {})) {
    const lignes = projet.pages[num].lignes || []
    const arr = []
    lignes.forEach((l, i) => {
      const s = l.suggestion
      if (!s || !s.role_suggere) return
      arr.push({
        ligne: i, bbox: l.bbox || null,
        role_suggere: s.role_suggere, role_confirme: s.role_confirme ?? null, statut: s.statut || 'suggere',
        blanc_poesie: s.blanc_poesie ?? null, classe_css: s.blanc_poesie ? 'blanc-poesie-' + s.blanc_poesie : null,
        retrait_source_normalise: s.retrait_source_normalise ?? null,
        niveau_suggere: s.niveau_suggere ?? null, continuation_de: s.continuation_de ?? null,
        poeme_id: s.poeme_id ?? null, poeme_ref: s.poeme_ref ?? null,
        export_corps: s.export_corps !== false, interdit_entrainement: !!s.interdit_entrainement,
      })
    })
    if (arr.length) out[num] = arr
  }
  return out
}

/**
 * Attache à chaque ligne du projet sa SUGGESTION de structure (`l.suggestion`), en préservant une
 * éventuelle confirmation humaine antérieure (`role_confirme`). Ne modifie NI le texte, NI les
 * coordonnées. Renvoie le projet (muté en place pour `l.suggestion` seulement).
 */
const ROLES_HORS_CORPS_POEME = new Set(['numero_page', 'titre_courant', 'signature', 'reclame', 'paratexte_titre', 'ornement', 'bruit', 'indetermine'])

/**
 * Passe 4 — fil-conducteur `poeme_id`. Parcourt le volume EN ORDRE : un titre T2 POESIE ouvre un
 * poème, qui reste actif (vers, continuations, changements de page) jusqu'au prochain titre T2
 * (PROSE ou POESIE) ou à un titre T1 (LIVRE). Prose et hors-corps → `poeme_id=null`. `poeme_id` est
 * STABLE (fondé sur la position du titre → survit à une correction du libellé). Ne réattribue JAMAIS
 * silencieusement : une ligne qui perd son poème (titre supprimé/reclassé) est signalée ORPHELINE et
 * son ancienne attribution conservée. Mute les annotations de `parPage`. Renvoie {poemes, orphelins}.
 */
export function annoterPoemes(pagesOrdonnees, parPage) {
  const poemes = {}, orphelins = []
  let active = null, livre = 0, poesieDansLivre = 0
  for (const page of pagesOrdonnees) {
    const anns = parPage.get(page.num) || []
    ;(page.lignes || []).forEach((l, i) => {
      const ann = anns[i]; if (!ann) return
      const ancien = l.suggestion?.poeme_id ?? null
      const roleEff = ann.role_confirme || ann.role_suggere
      const estTitre = roleEff === 'titre'
      const niv = estTitre ? (ann.niveau_suggere ?? null) : null
      const t = texte(l).trim()
      if (estTitre && niv === 2 && RE_TITRE_POESIE.test(t)) {
        poesieDansLivre++
        const id = `poeme-${page.num}-${i}` // stable : position du titre, indépendant du libellé
        active = { poeme_id: id, poeme_ref: `livre-${livre || 1}-poesie-${poesieDansLivre}`, poeme_titre: t, niveau_source: 2, statut: ann.role_confirme === 'titre' ? 'confirme' : 'suggere', titre_ligne_id: `p${page.num}-l${i}` }
        poemes[id] = active
        ann.poeme_id = id; ann.poeme_ref = active.poeme_ref; ann.poeme_titre = t
      } else if (estTitre && niv === 2 && RE_TITRE_PROSE.test(t)) {
        active = null; ann.poeme_id = null; ann.poeme_ref = null // un titre PROSE ferme le poème
      } else if (estTitre && niv === 1) {
        active = null; livre++; poesieDansLivre = 0; ann.poeme_id = null; ann.poeme_ref = null // LIVRE ferme la section
      } else if (active && !ROLES_HORS_CORPS_POEME.has(roleEff)) {
        ann.poeme_id = active.poeme_id; ann.poeme_ref = active.poeme_ref // vers, continuation… → hérite
      } else {
        ann.poeme_id = null; ann.poeme_ref = null
      }
      if (ancien && !ann.poeme_id) { // avait un poème, l'a perdu → orphelin (jamais réattribué en silence)
        ann.poeme_orphelin = true; ann.poeme_id_ancien = ancien
        orphelins.push({ page: page.num, ligne: i, ancien_poeme_id: ancien })
      }
    })
  }
  return { poemes, orphelins }
}

/** Reconstruit le registre des poèmes depuis les lignes annotées (pour l'export JSON). */
export function registrePoemesProjet(projet) {
  const poemes = {}
  for (const num of Object.keys(projet?.pages || {})) {
    const lignes = projet.pages[num].lignes || []
    lignes.forEach((l, i) => {
      const s = l.suggestion
      if (s && s.poeme_id && s.poeme_titre) { // ligne d'ouverture (titre POESIE)
        poemes[s.poeme_id] = { poeme_id: s.poeme_id, poeme_ref: s.poeme_ref, poeme_titre: s.poeme_titre, niveau_source: 2, statut: s.statut || 'suggere', titre_ligne_id: `p${num}-l${i}` }
      }
    })
  }
  return poemes
}

export function annoterProjet(projet) {
  const nums = Object.keys(projet?.pages || {}).map(Number).sort((a, b) => a - b)
  const pages = nums.map((num) => ({ num, largeur: projet.pages[num].largeur, hauteur: projet.pages[num].hauteur, lignes: projet.pages[num].lignes || [] }))
  const parPage = analyserVolume(pages)
  const { poemes, orphelins } = annoterPoemes(pages, parPage) // passe 4 : fil poeme_id (avant l'attache)
  for (const num of nums) {
    const anns = parPage.get(num) || []
    const lignes = projet.pages[num].lignes || []
    lignes.forEach((l, i) => {
      const a = anns[i]; if (!a) return
      const confirme = l.suggestion?.role_confirme ?? null // on ne perd JAMAIS une décision humaine
      l.suggestion = { ...a, role_confirme: confirme, statut: confirme ? 'confirme' : 'suggere' }
    })
  }
  projet.poemes = poemes; projet.orphelins_poeme = orphelins // passe 4 : registre + orphelins signalés
  return projet
}

// ── Passe 3 Q1 — provenance d'une correction de lettrine ─────────────────────
// Distingue DEUX cas, jamais confondus :
//  - CAS A « omission_ocr » : la lettre est VISIBLE dans le fac-similé mais l'OCR l'a omise. Ce
//    n'est pas une restitution critique : on intègre la lettre au texte corrigé, sans marque dans
//    la lecture publique. Éligible au ground-truth SEULEMENT si le crop montre réellement la lettrine.
//  - CAS B « restitution_editoriale » : la lettre n'est PAS lisible sur l'image, restituée par
//    conjecture. Marque critique à l'affichage, JAMAIS versée au ground-truth OCR.
// Ne propose JAMAIS la lettre automatiquement (ni dictionnaire ni modèle de langue) : `texte_valide`
// vient toujours de la saisie humaine.
export function corrigerLettrine({ texte_ocr = '', texte_valide, visible_dans_source, certitude, bbox_source = null, crop_contient_lettrine = null } = {}) {
  const restitution = visible_dans_source === false
  const a = {
    type_correction: restitution ? 'restitution_editoriale' : 'omission_ocr',
    nature: 'lettrine',
    texte_ocr: String(texte_ocr ?? ''),
    texte_valide: String(texte_valide ?? ''),
    visible_dans_source: !restitution,
    origine_lecture: restitution ? 'conjecture' : 'image',
    validation: 'humaine',
    certitude: certitude || (restitution ? 'probable' : 'certaine'),
    bbox_source: bbox_source ?? null,
    restitution_editoriale: restitution,
    afficher_marque_critique: restitution, // marque critique réservée à la conjecture (CAS B)
  }
  // Éligibilité ground-truth : CAS B jamais ; CAS A interdit si le crop ne montre pas la lettrine
  // (ne jamais associer une transcription contenant « M » / « L' » à une image qui ne les montre pas).
  if (restitution || crop_contient_lettrine === false) a.interdit_entrainement = true
  return a
}

/** Intègre l'initiale validée au texte de ligne (CAS A/B) : « oy » + « M » → « Moy ». Sans crochets. */
export function integrerInitiale(texteLigne, texteValide) {
  return String(texteValide ?? '') + String(texteLigne ?? '')
}

// ── Passe 3 Q4 — métadonnées de page (folios, titres courants, marques de cahier, réclames) ──
// Distinguer IMPÉRATIVEMENT, sans jamais substituer l'un à l'autre :
//  1. `page_pdf`            : index de l'image / page du PDF ;
//  2. `pagination_source`   : pagination IMPRIMÉE, visible dans le fac-similé (lue ou ajoutée main) ;
//  3. `pagination_inferree` : valeur DÉDUITE par la séquence, aucun chiffre lisible → jamais un folio
//                             réellement imprimé, jamais de ground-truth, jamais de ligne source fictive.
// Tous ces éléments restent HORS corps (`export_corps:false`) mais sont conservés comme données de page.

/** Un folio imprimé visible (lu par l'OCR ou ajouté à la main). export_corps=false, affiché en marge. */
export function paginationSource({ valeur, origine = 'ocr', bbox = null, certitude = 'certaine', visible_dans_source = true } = {}) {
  return {
    valeur: String(valeur ?? ''),
    visible_dans_source: !!visible_dans_source,
    origine, // 'ocr' | 'ajout_humain'
    bbox: bbox ?? null,
    certitude,
    export_corps: false,
    affichage_public: 'marge',
  }
}

/** Une pagination SEULEMENT inférée par la séquence (aucun chiffre lisible). Jamais un vrai folio. */
export function paginationInferree({ valeur, source_regle = 'sequence' } = {}) {
  return {
    valeur: String(valeur ?? ''),
    visible_dans_source: false,
    origine: 'inference',
    source_regle,
    export_corps: false,
    ground_truth: false, // ne JAMAIS exporter comme vérité terrain
    affichage_public: 'interface_editoriale', // « pagination inférée », jamais présentée comme imprimée
  }
}

/** Structure de page : chaque famille hors-corps est conservée, jamais fondue dans le corps. */
export function metadonneesPage({ page_pdf = null, pagination_source = null, pagination_inferree = null, titre_courant = [], marques_cahier = [], reclames = [] } = {}) {
  return { page_pdf, pagination_source, pagination_inferree, titre_courant, marques_cahier, reclames }
}

/**
 * Construit, par page, les métadonnées Q4 à partir des rôles hors-corps CONFIRMÉS (role_confirme).
 * N'émet une page que si elle porte au moins un élément hors-corps. Ne touche NI au corps NI à la
 * source ; `page_pdf` (index) reste distinct de `pagination_source` (folio imprimé). Réservé aux
 * exports STRUCTURÉS (le corps, lui, est déjà nettoyé par estHorsCorpsConfirme).
 */
export function metadonneesPagesProjet(projet) {
  const out = {}
  for (const num of Object.keys(projet?.pages || {})) {
    const lignes = projet.pages[num].lignes || []
    let pagination_source = null
    const titre_courant = [], marques_cahier = [], reclames = []
    lignes.forEach((l, i) => {
      const r = l.suggestion?.role_confirme
      if (!r) return
      const t = String(l.dip ?? '').trim()
      const entree = { ligne: i, texte: t, bbox: l.bbox || null }
      if (r === 'numero_page') { if (!pagination_source) pagination_source = paginationSource({ valeur: t, origine: l.ajout_humain ? 'ajout_humain' : 'ocr', bbox: l.bbox || null, visible_dans_source: true }) }
      else if (r === 'titre_courant') titre_courant.push(entree)
      else if (r === 'signature') marques_cahier.push(entree) // rôle interne « signature », libellé « marque de cahier »
      else if (r === 'reclame') reclames.push(entree)
    })
    if (pagination_source || titre_courant.length || marques_cahier.length || reclames.length) {
      out[num] = metadonneesPage({ page_pdf: Number(num), pagination_source, titre_courant, marques_cahier, reclames })
    }
  }
  return out
}

// ── §8 Suggestions de niveaux de titre (T1/T2), propres à Ceriziers ──────────
const RE_T1 = /^\s*(LE\s+PREMIER\s+LIVRE|LIVRE|LIURE)\b.*\b([IVXLC]+|PREMIER|SECOND|TROISI[EÈ]ME|QUATRI[EÈ]ME|CINQUI[EÈ]ME)\.?\s*$/i
// « POESIE I. », « PROSE I », mais aussi « II. POESIE. », « III. PROSE. » (numéral avant ou après).
const RE_T2 = /^\s*(?:([IVXLC]+|\d+)[.\s]+)?(PROSE|PO[ÉE]SIE)(?:[.\s]+([IVXLC]+|\d+))?\.?\s*$/i

/**
 * Suggère un niveau de titre (T1/T2) sur une ligne, si (1) motif reconnu ET (2) géométrie de titre
 * (ligne courte, isolée). Ne s'applique PAS aux lignes déjà classées hors-corps (ex. titre courant).
 * Ne fait qu'UNE SUGGESTION : n'alimente pas ref_niv sans confirmation humaine.
 */
export function suggererNiveauTitre(l, page, { horsCorps = false, lignes = [] } = {}) {
  if (!l.bbox || horsCorps) return null
  const t = texte(l).trim()
  let niveau = null
  if (RE_T1.test(t)) niveau = 1
  else if (RE_T2.test(t)) niveau = 2
  if (!niveau) return null
  // Géométrie de titre : ligne COURTE, ou CENTRÉE, ou ISOLÉE par des blancs (§8). Sur une page de
  // poésie, un titre n'est pas plus court que les vers → le centrage/l'isolement priment.
  const W = page.largeur || 1000
  const largeurs = lignes.filter((o) => o.bbox && !EST_NOMBRE(texte(o))).map(larg)
  const largMed = mediane(largeurs) || W * 0.6
  const courte = larg(l) < largMed * 0.6
  const centree = Math.abs((x0(l) + larg(l) / 2) - W / 2) < W * 0.12
  const interligne = hauteurMediane(lignes) || 50
  const autres = lignes.filter((o) => o !== l && o.bbox)
  const above = autres.filter((o) => bas(o) <= y0(l)).sort((a, b) => bas(b) - bas(a))[0]
  const below = autres.filter((o) => y0(o) >= bas(l)).sort((a, b) => y0(a) - y0(b))[0]
  const isolee = (!above || (y0(l) - bas(above)) > interligne) && (!below || (y0(below) - bas(l)) > interligne)
  if (!(courte || centree || isolee)) return null
  const a = annotationVide()
  a.role_suggere = 'titre'; a.score = 3
  a.preuves = { motif: niveau === 1 ? 'LIVRE' : 'PROSE/POESIE', niveau_suggere: niveau, courte, centree, isolee }
  a.niveau_suggere = niveau // T1 ou T2, à confirmer
  return a
}
