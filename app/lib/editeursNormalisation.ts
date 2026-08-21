// Normalisation d'AFFICHAGE des noms d'éditeurs, à partir de la table de référence
// `editeurs` (nom complet, variantes rencontrées, ville). La donnée brute n'est jamais
// réécrite : on remplace au rendu une forme rencontrée par le nom répertorié, et l'on
// garde la forme brute tant qu'un éditeur n'est pas répertorié.
//
// Module PUR, sans React ni Supabase : il sert au serveur (page d'œuvre) comme au
// navigateur (bibliothèque), et se teste sans monter quoi que ce soit.

export type LigneEditeur = {
  nom_complet: string
  variantes: string[] | null
  ville?: string | null
}

export type IndexEditeurs = {
  /** clé d'une forme rencontrée → nom complet répertorié */
  noms: Map<string, string>
  /** clé d'une ville → ville telle qu'on l'écrit */
  villes: Map<string, string>
}

/** Clé de comparaison, identique à la fonction SQL `cle_editeur` : minuscule, sans
 *  accents ni ponctuation, espaces normalisés. « L. Guérin & Cie » et « l guerin cie »
 *  se rejoignent donc, et l'esperluette ne sépare pas deux maisons. */
export function cleEditeur(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
}

export function construireIndexEditeurs(
  editeurs: LigneEditeur[],
  villesSupplementaires: (string | null | undefined)[] = [],
): IndexEditeurs {
  const noms = new Map<string, string>()
  const villes = new Map<string, string>()
  const ajouterVille = (v: string | null | undefined) => {
    const t = (v ?? '').trim()
    if (t) villes.set(cleEditeur(t), t)
  }
  editeurs.forEach((e) => {
    const nom = (e.nom_complet ?? '').trim()
    if (!nom) return
    noms.set(cleEditeur(nom), nom)
    ;(e.variantes ?? []).forEach((v) => { if (v && v.trim()) noms.set(cleEditeur(v), nom) })
    ajouterVille(e.ville)
  })
  villesSupplementaires.forEach(ajouterVille)
  return { noms, villes }
}

export const INDEX_VIDE: IndexEditeurs = { noms: new Map(), villes: new Map() }

/** Nom répertorié d'une forme unique, ou null si elle n'est pas connue. */
export function resoudreNomEditeur(brut: string, index: IndexEditeurs | null): string | null {
  if (!index) return null
  const t = brut.trim()
  return t ? (index.noms.get(cleEditeur(t)) ?? null) : null
}

/** Affichage d'un champ éditeur : « / » entre co-éditeurs (jamais le « ; » brut du
 *  catalogue), et nom répertorié quand il l'est. La barre est encadrée de fines
 *  insécables, si bien qu'elle ne passe pas seule à la ligne. */
export function normaliserNomEditeur(
  editeur: string | null | undefined,
  index: IndexEditeurs | null,
): string {
  const brut = (editeur ?? '').trim()
  if (!brut) return ''
  return brut.split(/\s*[;/]\s*/u).filter(Boolean)
    .map((part) => resoudreNomEditeur(part, index) ?? part)
    .join(' / ')
}

/** Un segment de notice porte-t-il un ou plusieurs éditeurs RÉPERTORIÉS ? On exige que
 *  TOUTES les parties séparées par « ; » soient connues : « J. Angé ; A. Cherest » est
 *  une co-édition, tandis que « volume 1, Paris, J. Angé » n'est pas un segment
 *  d'éditeur, c'est une bribe de notice où il s'en trouve un. */
export function editeursDuSegment(segment: string, index: IndexEditeurs | null): string | null {
  if (!index) return null
  const parts = segment.split(/\s*;\s*/u).map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return null
  const noms = parts.map((p) => resoudreNomEditeur(p, index))
  if (noms.some((n) => n === null)) return null
  return noms.join(' / ')
}

/** Reconnaît une ville répertoriée. */
export function estVilleConnue(segment: string, index: IndexEditeurs | null): boolean {
  return !!index && index.villes.has(cleEditeur(segment.trim()))
}
