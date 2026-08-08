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
    preuves: {},             // signaux ayant motivé la suggestion (traçabilité)
    export_corps: true,      // la ligne entre-t-elle dans le corps éditorial ?
    interdit_entrainement: false,
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

// ── §7 Réclames (mot en bas de page repris au début de la page suivante) ─────
const premiereLigneCorps = (page) => {
  const L = (page.lignes || []).filter((l) => l.bbox).sort((a, b) => y0(a) - y0(b))
  const H = page.hauteur || 0
  return L.find((l) => !EST_NOMBRE(texte(l)) && (!H || y0(l) > H * 0.15)) || L[0] || null
}
/**
 * Détecte les réclames : un mot/court groupe isolé en bas de page dont le texte normalisé
 * correspond (≥ 0,90) au DÉBUT de la première ligne de corps de la page suivante. `pages` ordonnées.
 * Renvoie Map num→(Map i→annotation).
 */
export function detecterReclames(pages) {
  const out = new Map()
  for (let p = 0; p < pages.length - 1; p++) {
    const page = pages[p], suiv = pages[p + 1]
    const H = page.hauteur || 0
    const enBas = (page.lignes || []).map((l, i) => ({ l, i })).filter((x) => x.l.bbox && H && bas(x.l) > H * 0.85)
    if (!enBas.length) continue
    const cand = enBas.sort((a, b) => bas(b.l) - bas(a.l))[0] // la plus basse
    const mots = texte(cand.l).trim().split(/\s+/).filter(Boolean)
    if (mots.length === 0 || mots.length > 4) continue
    const debutSuiv = premiereLigneCorps(suiv)
    if (!debutSuiv) continue
    const debutMots = normaliserComparaison(texte(debutSuiv)).split(' ').slice(0, mots.length).join(' ')
    if (similarite(normaliserComparaison(texte(cand.l)), debutMots) >= 0.90) {
      if (!out.has(page.num)) out.set(page.num, new Map())
      const a = annotationVide()
      a.role_suggere = 'reclame'; a.score = 3; a.export_corps = false
      a.preuves = { repris_page_suivante: debutMots }
      out.get(page.num).set(cand.i, a)
    }
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

/**
 * Orchestration §9 : compose toutes les suggestions par ligne, dans l'ordre de priorité
 * (hors-corps → titres T1/T2 → lettrines → poésie). Renvoie, par page, un tableau d'annotations
 * aligné sur page.lignes. `pages` = [{ num, largeur, hauteur, lignes }] ordonnées.
 * NE MODIFIE RIEN de la source ; ne produit que des SUGGESTIONS (statut 'suggere').
 */
export function analyserVolume(pages) {
  const titresC = detecterTitresCourants(pages)
  const reclames = detecterReclames(pages)
  const parPage = new Map()
  for (const page of pages) {
    const lignes = page.lignes || []
    const anns = lignes.map(() => annotationVide())
    const horsCorps = new Set()
    // 1) hors-corps : numéro de page, signature, titre courant, réclame.
    lignes.forEach((l, i) => {
      const np = detecterNumeroPage(l, page); if (np) { anns[i] = np; horsCorps.add(i); return }
      const sg = detecterSignature(l, page, { lignes }); if (sg) { anns[i] = sg; horsCorps.add(i) }
    })
    for (const [i, a] of (titresC.get(page.num) || [])) { anns[i] = a; horsCorps.add(i) }
    for (const [i, a] of (reclames.get(page.num) || [])) { anns[i] = a; horsCorps.add(i) }
    // 2) titres de structure T1/T2 (hors lignes déjà hors-corps).
    lignes.forEach((l, i) => {
      if (horsCorps.has(i)) return
      const ti = suggererNiveauTitre(l, page, { horsCorps: false, lignes })
      if (ti) anns[i] = ti
    })
    // 3) lettrines / artefacts (peuvent coexister avec un vers → on garde le flag lettrine).
    //    JAMAIS sur une ligne déjà hors-corps ou déjà titrée (T1/T2) — ordre §9 : titres AVANT lettrines.
    const lettr = detecterLettrines(lignes)
    for (const [i, a] of lettr) if (!horsCorps.has(i) && anns[i].role_suggere !== 'titre') { a.blanc_poesie = anns[i].blanc_poesie ?? null; anns[i] = { ...anns[i], ...a } }
    // 4) poésie : blocs 'poesie' → continuations + blancs (hors lignes hors-corps/titre).
    for (const bloc of delimiterBlocs(lignes)) {
      if (bloc.type !== 'poesie') continue
      const idx = bloc.idx.filter((i) => !horsCorps.has(i))
      const sousBloc = idx.map((i) => lignes[i])
      const res = analyserBlocPoesie(sousBloc)
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
    parPage.set(page.num, anns)
  }
  return parPage
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
