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
