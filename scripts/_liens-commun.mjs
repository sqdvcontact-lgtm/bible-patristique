// SOCLE COMMUN DES PASSES DE LIENS — source unique des helpers de résolution et
// de détection. Toute correction (ex. « citation enchâssée ») se fait ICI et vaut
// pour tous les outils, au lieu d'être recopiée dans chaque script (ce qui avait
// laissé passer des incohérences).
//
// Fonctions pures + chargeurs de données + une FABRIQUE de résolveur (codeLivre,
// livreEnAmont, cibleDe) paramétrée par l'ossature et le dictionnaire chargés.

export const normaliser = s => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[\s.]/g, '')

/** Chiffres romains → entier ; les éditions anciennes en usent pour rang et chapitre. */
export function versEntier(s) {
  const t = String(s).trim().toLowerCase()
  if (/^\d+$/.test(t)) return +t
  if (!/^[ivxlcdm]+$/.test(t)) return null
  const V = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
  let n = 0
  for (let k = 0; k < t.length; k++) { const a = V[t[k]], b = V[t[k + 1]]; n += b && a < b ? -a : a }
  return n || null
}

/** Renvois internes (« Ibid. », « Question 22 ») — PAS des livres bibliques. */
export const RENVOIS_INTERNES = new Set([
  'ibid', 'ibidem', 'idem', 'id', 'op', 'opcit', 'loccit', 'cit',
  'question', 'q', 'art', 'article', 'chap', 'chapitre', 'livre',
  'supra', 'infra', 'cidessus', 'cidessous', 'sect', 'section', 'part', 'partie',
  'marche', 'homelie', 'sermon', 'discours', 'lettre', 'epitre', 'traite',
  'voy', 'voyez', 'vid', 'vide', 'foy', 'serm', 'hom', 'liv', 'livr', 'lett',
  'vers', 'verset', 'ib', 'note', 'not', 'missel', 'preface', 'prol', 'prologue',
  'canon', 'const', 'concile', 'symb', 'symbole', 'cat', 'catech',
])

/** Ordinaux pour le rang d'une épître en toutes lettres (« première épître aux… »). */
export const ORDINAUX = { premiere: 1, premier: 1, seconde: 2, second: 2, deuxieme: 2,
  troisieme: 3, quatrieme: 4, i: 1, ii: 2, iii: 3, iv: 4, 1: 1, 2: 2, 3: 3, 4: 4 }

// Numérotation Vulgate mise de côté (jamais insérée sur une cible fausse) ; les
// Psaumes se convertissent via l'ossature hébraïque.
export const VULGATE_A_CONVERTIR = new Set(['SIR', 'TOB', 'JDT', 'BAR'])
export const NUMEROTATION_HEBRAIQUE = new Set(['PSA'])

// Parenthèse (peut porter « cf. », « et », plusieurs réfs) ; référence avec livre ;
// parenthèse purement numérique (livre en amont). Employées UNIQUEMENT via matchAll.
// Groupes RE_REF : 1=rang, 2=nom, 3=chBrut, 4=v, 5=vFin (plage « v-vFin »),
// 6=queue d'énumération (« . 28 . 30 » dans « Gn 1, 26. 28 »).
export const RE_PARENTHESE = /\(([^)]{3,90})\)/g
export const RE_REF = /(?:^|[\s;,]|\bcf\.?\s*|\bet\s+|\bvoir\s+)(?:([1-4]|[IV]{1,3})\s+)?([A-ZÉÈÀÎÔÜÇ][A-Za-zÉÈÀÎÔÜÇéèêàïôûç]{1,15})\.?\s+([0-9]{1,3}|[IVXLCDM]{1,7})\s*(?:[,.]\s*([0-9]{1,3})(?:\s*[-–]\s*([0-9]{1,3}))?((?:\s*\.\s*[0-9]{1,3})+)?)?/g
// Groupes RE_PAREN_NUM : 1=ch, 2=v, 3=vFin, 4=queue d'énumération.
export const RE_PAREN_NUM = /\(\s*([0-9]{1,3}|[IVXLCDM]{1,7})\s*[,.]\s*([0-9]{1,3})(?:\s*[-–]\s*([0-9]{1,3}))?((?:\s*\.\s*[0-9]{1,3})+)?\s*(?:Vg\.?)?\s*\)/g

/** Développe une référence de verset(s) en LISTE de numéros : le verset seul, la
 *  plage « v-vFin » (charte : un lien par verset), et l'énumération « . 28 . 30 ».
 *  Renvoie [] si pas de verset (référence au chapitre). Plage plafonnée (12) pour
 *  éviter qu'un intervalle aberrant ne fabrique des dizaines de liens. */
export function versetsDe(v, vFin, enumTail) {
  if (v === undefined || v === null) return []
  const out = new Set([+v])
  if (vFin) { const a = +v, b = +vFin; if (b > a && b - a <= 12) for (let k = a + 1; k <= b; k++) out.add(k) }
  if (enumTail) for (const mm of String(enumTail).matchAll(/[0-9]{1,3}/g)) out.add(+mm[0])
  return [...out]
}

/** Une citation directe (« … », même partielle) accolée À la référence — ou qui
 *  l'ENCHÂSSE — la fait basculer en type 1. Trois dispositions : ouvrant après,
 *  fermant avant, et référence à l'intérieur de la citation. */
export function citationAdjacente(texte, start, end) {
  if (texte.slice(end, end + 40).includes('«')) return true
  if (texte.slice(Math.max(0, start - 40), start).includes('»')) return true
  const avant = texte.slice(0, start)
  if (avant.lastIndexOf('«') > avant.lastIndexOf('»')) {
    const apres = texte.slice(end)
    const f = apres.indexOf('»'), o = apres.indexOf('«')
    if (f >= 0 && (o < 0 || f < o)) return true
  }
  return false
}

/** Dictionnaire d'abréviations (`abreviations_bibliques`), paginé. */
export async function chargerAbrev(sb) {
  const ABREV = new Map()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('abreviations_bibliques').select('forme, livre').order('forme').range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    for (const r of data) ABREV.set(r.forme, r.livre)
    if (data.length < 1000) break
  }
  return ABREV
}

/** Ossature : créneaux, chapitres présents, table hébraïque, livres à un chapitre. */
export async function chargerOssature(sb) {
  const canon = new Set(), chapitres = new Set(), parHebreu = new Map()
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('versets_canon').select('id, livre, ch_canon, ch_heb, v_heb').order('id').range(from, from + 999)
    if (!data?.length) break
    for (const r of data) {
      canon.add(r.id)
      chapitres.add(`${r.livre}.${r.ch_canon}`)
      if (r.ch_heb != null && r.v_heb != null) parHebreu.set(`${r.livre}.${r.ch_heb}.${r.v_heb}`, r.id)
    }
    if (data.length < 1000) break
  }
  const unChapitre = new Set()
  {
    const parLivre = new Map()
    for (const c of chapitres) { const [liv, ch] = c.split('.'); (parLivre.get(liv) ?? parLivre.set(liv, new Set()).get(liv)).add(+ch) }
    for (const [liv, chs] of parLivre) if (chs.has(1) && !chs.has(2)) unChapitre.add(liv)
  }
  return { canon, chapitres, parHebreu, unChapitre }
}

/** Fabrique le résolveur, lié au dictionnaire et à l'ossature chargés. */
export function creerResolveur({ ABREV, canon, chapitres, parHebreu, unChapitre }) {
  /** Résout un nom de livre, avec son rang éventuel (« 1 Cor », « I Co », « Cor »). */
  function codeLivre(rangBrut, nomBrut) {
    const nom = normaliser(nomBrut)
    if (!nom || RENVOIS_INTERNES.has(nom)) return null
    const rang = rangBrut ? versEntier(rangBrut) : null
    if (rang) { const entier = ABREV.get(`${rang}${nom}`); if (entier) return entier }
    const base = ABREV.get(nom)
    if (!base) return null
    if (!rang) return base
    const m = base.match(/^([1-4])(.+)$/)
    return m ? `${rang}${m[2]}` : null
  }

  /** Nom de livre le plus proche EN AMONT d'une parenthèse numérique (verbes
   *  intercalés ignorés ; ordinal proche → rang de l'épître). */
  function livreEnAmont(texte, avant) {
    const mots = texte.slice(Math.max(0, avant - 55), avant).split(/[^A-Za-zÀ-ÿ]+/).filter(Boolean)
    for (let k = mots.length - 1, saut = 0; k >= 0 && saut < 5; k--, saut++) {
      const brut = normaliser(mots[k])
      if (!brut || RENVOIS_INTERNES.has(brut)) continue
      let rang = null
      for (let j = k - 1; j >= 0 && j >= k - 3; j--) { const o = ORDINAUX[normaliser(mots[j])]; if (o) { rang = String(o); break } }
      const code = codeLivre(rang, mots[k]) || codeLivre(null, mots[k])
      if (code) return code
    }
    return null
  }

  /** Cible d'une référence : canon_id (verset), `livre.ch` (chapitre entier), ou
   *  null si hors ossature. Gère les livres à un chapitre (« 2 Jn 4 » = verset 4)
   *  et la conversion hébraïque des Psaumes. Ne convertit PAS la Vulgate deutéro. */
  function cibleDe(livre, chBrut, v) {
    const ch = versEntier(chBrut)
    if (!ch) return null
    if (v === undefined) {
      if (unChapitre.has(livre) && !chapitres.has(`${livre}.${ch}`) && canon.has(`${livre}.1.${ch}`)) return `${livre}.1.${ch}`
      return chapitres.has(`${livre}.${ch}`) ? `${livre}.${ch}` : null
    }
    const c = NUMEROTATION_HEBRAIQUE.has(livre) ? parHebreu.get(`${livre}.${ch}.${+v}`) : `${livre}.${ch}.${+v}`
    return (c && canon.has(c)) ? c : null
  }

  return { codeLivre, livreEnAmont, cibleDe }
}

// ── Appariement sémantique (Passe 2, conversion Vulgate) ─────────────────────
// Le Dice brut sur sacs de mots échoue quand deux versets partagent des mots
// FRÉQUENTS (« Dieu », « Seigneur ») sans être le même. On corrige par : (1) une
// pondération IDF — un mot partagé RARE pèse, un mot banal presque rien ; (2) un
// bonus de BIGRAMMES — les séquences contiguës trahissent une vraie citation ;
// (3) côté appelant, une garde d'ambiguïté (meilleur score nettement > 2ᵉ).

const MOTS_VIDES = new Set(['les','des','que','qui','pour','dans','avec','est','son','sur','plus','tout','tous','par','une','aux','ses','leur','ils','elle','vous','nous','mais','comme','cette','ces','pas','ont','sont','ne','se','de','la','le','du','un','en','et','il','au','ce','sa','ni','on','lui','ou','y'])

/** Stems ORDONNÉS (mots > 2 lettres, tronqués à 5) — base des sacs et bigrammes. */
export function stemmes(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter(m => m.length > 2).map(m => m.slice(0, 5))
}

/** IDF lissé sur un corpus (tableau de tableaux de stems). */
export function construireIdf(docsStems) {
  const df = new Map(), N = docsStems.length || 1
  for (const d of docsStems) for (const w of new Set(d)) df.set(w, (df.get(w) || 0) + 1)
  return w => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 1
}

function bigrammes(stems) {
  const s = new Set()
  for (let i = 0; i + 1 < stems.length; i++) s.add(stems[i] + ' ' + stems[i + 1])
  return s
}

/** Score d'appariement citation ↔ verset : 0,7·Dice(IDF) + 0,3·Dice(bigrammes).
 *  `idf` vient de construireIdf sur le corpus de recherche. */
export function scoreAppariement(stemsQ, stemsV, idf) {
  const sacQ = new Set(stemsQ.filter(m => !MOTS_VIDES.has(m)))
  const sacV = new Set(stemsV.filter(m => !MOTS_VIDES.has(m)))
  if (!sacQ.size || !sacV.size) return 0
  let inter = 0, sumQ = 0, sumV = 0
  for (const w of sacQ) { const i = idf(w); sumQ += i; if (sacV.has(w)) inter += i }
  for (const w of sacV) sumV += idf(w)
  const idfDice = sumQ + sumV ? (2 * inter) / (sumQ + sumV) : 0
  const bq = bigrammes(stemsQ), bv = bigrammes(stemsV)
  let bi = 0; for (const g of bq) if (bv.has(g)) bi++
  const bigram = (bq.size && bv.size) ? (2 * bi) / (bq.size + bv.size) : 0
  return 0.7 * idfDice + 0.3 * bigram
}

// ── Variante PRÉCALCULÉE (perf) ───────────────────────────────────────────────
// scoreAppariement recompose le sac, les bigrammes et la masse IDF du verset à
// CHAQUE comparaison — coûteux quand un verset est comparé à des milliers de
// citations. On précalcule donc le profil de chaque verset UNE fois ; le coût par
// paire retombe à O(taille de la citation).

/** Profil d'un verset : sac (mots pleins), masse IDF du sac, bigrammes. Nécessite
 *  l'idf déjà construit sur le corpus. */
export function profilVerset(stems, idf) {
  const sac = new Set(stems.filter(m => !MOTS_VIDES.has(m)))
  let masse = 0; for (const w of sac) masse += idf(w)
  return { sac, masse, bigrams: bigrammes(stems) }
}

/** Profil d'une citation (pas besoin de la masse IDF : recalculée au score). */
export function profilCitation(stems) {
  return { sac: new Set(stems.filter(m => !MOTS_VIDES.has(m))), bigrams: bigrammes(stems) }
}

/** Score entre deux profils : identique à scoreAppariement, mais sans recomposer
 *  le verset. */
export function scoreProfil(pQ, pV, idf) {
  if (!pQ.sac.size || !pV.sac.size) return 0
  let inter = 0, sumQ = 0
  for (const w of pQ.sac) { const i = idf(w); sumQ += i; if (pV.sac.has(w)) inter += i }
  const idfDice = (sumQ + pV.masse) ? (2 * inter) / (sumQ + pV.masse) : 0
  let bi = 0; for (const g of pQ.bigrams) if (pV.bigrams.has(g)) bi++
  const bigram = (pQ.bigrams.size && pV.bigrams.size) ? (2 * bi) / (pQ.bigrams.size + pV.bigrams.size) : 0
  return 0.7 * idfDice + 0.3 * bigram
}

// ── INVARIANT MÉCANIQUE (charte §9.0) ─────────────────────────────────────────
// Le COMMENTAIRE (type 3) et l'ÉCHO (type 4) relèvent de la LECTURE : un outil ne
// peut pas AFFIRMER que l'auteur explique/évoque un verset — il faut avoir lu.
// Une passe mécanique n'émet donc que : type 1 (citation), une PROPOSITION type 2
// en 'douteux', ou une cible attestée en 'à constituer' (type provisoire, file de
// lecture). Tout type 3/4 affirmé, ou tout type 2 'probable', issu d'un outil est
// un BUG — cette fonction le refuse à la source. À appeler sur chaque lien AVANT
// insertion dans toute passe mécanique.
export function verifierLienMecanique(l) {
  if ((l.type === 3 || l.type === 4) && l.fiabilite !== 'à constituer')
    throw new Error(`INVARIANT VIOLÉ — type ${l.type} (${l.type === 3 ? 'commentaire' : 'écho'}) AFFIRMÉ par une passe mécanique (segment ${l.segment_id}, ${l.canon_id}, fiabilite='${l.fiabilite}'). Le type 3/4 relève de la LECTURE ; le mécanique ne peut que le poser en 'à constituer'. Voir charte §9.0.`)
  if (l.type === 2 && l.fiabilite === 'probable')
    throw new Error(`INVARIANT VIOLÉ — type 2 (paraphrase) posé 'probable' par une passe mécanique (segment ${l.segment_id}, ${l.canon_id}). La paraphrase est incertaine : 'douteux' au plus, ou 'à constituer'.`)
  return l
}
