// Recherche et présentation du CATALOGUE des péricopes — logique PURE.
//
// Ce module ne connaît ni Supabase ni React : il est importable depuis un test.
// `app/lib/pericopes.ts` ouvre, lui, un client navigateur dès son import, ce qui
// interdit d'y tester quoi que ce soit sous Vitest (environnement `node`, sans
// variables publiques). D'où la séparation.
//
// Trois services :
//   1. `premierePhraseNotice` — l'avant-goût affiché sous chaque titre du catalogue.
//   2. `analyserRequetePericope` — comprendre « Mt 5 », « Genèse 22 », « psaume 22 ».
//   3. `filtrerCatalogue` — l'ensemble des filtres du volet, en une fonction.

import { LIVRES, ABREV_FR } from '@/app/lib/bible'
import { parsePointCanonique } from '@/app/lib/referencesBibliques'
import type { PericopeCatalogueItem } from '@/app/lib/pericopes'

export const TESTAMENT_LIVRE: Record<string, 'AT' | 'NT' | 'AUTRES'> =
  Object.fromEntries(LIVRES.map(l => [l.code, l.testament]))

/** Minuscules, sans accents, apostrophes unifiées, espaces réduites. Sert à la fois
 *  à la requête et aux textes comparés : les deux passent par la MÊME fonction. */
export function normaliserRecherche(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’ʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// ── 1. Avant-goût : la première phrase d'une notice ──────────────────────────

// Abréviations françaises dont le point ne termine PAS une phrase. La liste est
// courte à dessein : les notices sont de la prose suivie, pas de l'apparat critique.
const ABREVIATIONS = new Set(['cf', 'v', 'vv', 'ch', 'chap', 'p', 'pp', 'av', 'apr', 'etc', 'st', 'ste', 'ms', 'mss'])

/**
 * Première phrase d'une notice, plafonnée à `maxi` caractères (coupe au dernier mot
 * entier, suivie de « … »). Une phrase se termine par « . », « ! », « ? » ou « … »
 * suivi d'une espace et d'une capitale ou d'un guillemet ouvrant — sauf après une
 * abréviation connue ou une initiale isolée (« J. »).
 */
export function premierePhraseNotice(notice: string | null | undefined, maxi = 230): string {
  if (!notice) return ''
  const texte = notice.trim().replace(/\s+/g, ' ')
  if (!texte) return ''
  const fin = /([.!?…])\s+(?=[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ«"'‘“])/g
  let phrase = texte
  let m: RegExpExecArray | null
  while ((m = fin.exec(texte)) !== null) {
    const avant = texte.slice(0, m.index)
    const dernierMot = normaliserRecherche(avant.split(/[\s(]/).pop() ?? '')
    // « cf. », « v. » : le point n'achève pas la phrase. Une initiale isolée non plus.
    if (m[1] === '.' && (ABREVIATIONS.has(dernierMot) || dernierMot.length === 1)) continue
    phrase = texte.slice(0, m.index + 1)
    break
  }
  if (phrase.length <= maxi) return phrase
  const coupe = phrase.slice(0, maxi)
  const espace = coupe.lastIndexOf(' ')
  return (espace > maxi * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[,;:.…\s]+$/, '') + '…'
}

// ── 2. Requêtes de RÉFÉRENCE (« Mt 5 », « Genèse 22 », « Jn 3, 16 ») ─────────

const NOM_NORM: { code: string; nom: string }[] = LIVRES.map(l => ({ code: l.code, nom: normaliserRecherche(l.nom) }))
const ABREV_NORM: Record<string, string> = Object.fromEntries(
  Object.entries(ABREV_FR).map(([code, abrev]) => [normaliserRecherche(abrev).replace(/\s/g, ''), code]),
)

/**
 * Code du livre désigné par `s`, ou `null`. Reconnaît le nom exact, l'abréviation
 * française, et le préfixe d'un nom (à partir de trois caractères).
 *
 * ⚠️ Sur un préfixe ambigu on retient le nom le PLUS COURT, et non `null` : sans
 * cela « psaume » ne désignerait rien, puisqu'il ouvre aussi « Psaume 151 » et
 * « Psaumes de Salomon ». Le plus court est le livre le plus attendu.
 */
export function trouverLivre(s: string): string | null {
  const n = normaliserRecherche(s)
  if (!n) return null
  const exact = NOM_NORM.find(l => l.nom === n)
  if (exact) return exact.code
  const abrev = ABREV_NORM[n.replace(/\s/g, '')]
  if (abrev) return abrev
  if (n.length < 3) return null
  const prefixes = NOM_NORM.filter(l => l.nom.startsWith(n))
  if (!prefixes.length) return null
  return prefixes.reduce((a, b) => (b.nom.length < a.nom.length ? b : a)).code
}

export type RequetePericope = {
  /** Recherche en texte libre (vide dès qu'une référence chiffrée est reconnue). */
  texte: string
  livre: string | null
  chapitre: number | null
  verset: number | null
}

/**
 * Décompose une saisie. « Mt 5 » et « Matthieu 5, 3 » donnent une référence ;
 * « Jonas » donne un livre SANS chapitre (on réunira alors le livre et les titres
 * qui portent ce mot) ; tout le reste reste du texte libre.
 */
export function analyserRequetePericope(q: string): RequetePericope {
  const vide: RequetePericope = { texte: '', livre: null, chapitre: null, verset: null }
  const brut = q.trim()
  if (!brut) return vide
  const m = /^(.*?)[\s.]*(\d{1,3})(?:\s*[,:.]\s*(\d{1,3}))?\s*$/.exec(brut)
  if (m && m[1].trim()) {
    const livre = trouverLivre(m[1])
    if (livre) return { texte: '', livre, chapitre: Number(m[2]), verset: m[3] ? Number(m[3]) : null }
  }
  const livreSeul = trouverLivre(brut)
  return { texte: normaliserRecherche(brut), livre: livreSeul, chapitre: null, verset: null }
}

/** Vrai si la plage de la péricope contient le point (chapitre, verset) demandé. */
export function pericopeCouvre(it: PericopeCatalogueItem, chapitre: number, verset: number | null): boolean {
  const d = parsePointCanonique(it.canon_debut)
  if (!d || d.chapitre == null) return false
  const f = it.canon_fin ? parsePointCanonique(it.canon_fin) : d
  const c2 = f?.chapitre ?? d.chapitre
  if (chapitre < d.chapitre || chapitre > c2) return false
  if (verset == null) return true
  if (chapitre === d.chapitre && d.verset != null && verset < d.verset) return false
  if (chapitre === c2 && f?.verset != null && verset > f.verset) return false
  return true
}

// ── 3. Le filtre complet du volet ────────────────────────────────────────────

export type ResultatCatalogue = {
  items: PericopeCatalogueItem[]
  /** id → appellation qui a permis la trouvaille, quand ce n'est pas le titre. */
  via: Record<string, string>
  /** Référence comprise, à afficher près du compte (« Matthieu 5 »). */
  reference: RequetePericope | null
}

/**
 * Applique la recherche et les deux jeux de cases. Ordre des opérations : la
 * recherche d'abord (c'est elle qui peut désigner un livre), les cases ensuite —
 * elles restreignent toujours, jamais l'inverse.
 */
export function filtrerCatalogue(
  items: PericopeCatalogueItem[],
  q: string,
  testaments: ReadonlySet<string>,
  registres: ReadonlySet<string>,
): ResultatCatalogue {
  const req = analyserRequetePericope(q)
  const via: Record<string, string> = {}
  let list = items

  if (req.livre && req.chapitre != null) {
    // Référence chiffrée : on ne montre QUE le passage demandé.
    list = list.filter(it => it.livre === req.livre && pericopeCouvre(it, req.chapitre!, req.verset))
  } else if (req.texte) {
    // Nom de livre seul (« Jonas ») : le livre ET les titres qui portent ce mot,
    // car « Jonas » est aussi bien un livre qu'un personnage de récit.
    list = list.filter(it => {
      if (req.livre && it.livre === req.livre) return true
      if (normaliserRecherche(it.nom).includes(req.texte)) return true
      const alias = it.appellations.find(a => normaliserRecherche(a).includes(req.texte))
      if (alias) { via[it.id] = alias; return true }
      return false
    })
  }

  if (testaments.size) list = list.filter(it => testaments.has(TESTAMENT_LIVRE[it.livre] ?? 'AUTRES'))
  if (registres.size) list = list.filter(it => registres.has(it.categorie))

  const gardes = new Set(list.map(it => it.id))
  for (const id of Object.keys(via)) if (!gardes.has(id)) delete via[id]

  return { items: list, via, reference: req.livre && req.chapitre != null ? req : null }
}
