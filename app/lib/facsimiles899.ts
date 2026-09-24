// Le FAC-SIMILÉ d'un verset de la Bible du XIIIe siècle (Paris, BnF, fr. 899).
//
// Un verset recomposé sait où il commence et où il finit dans le témoin : les segments
// portent `source_line_start` et `source_line_end`, identifiants de ligne du TEI
// (`f100r_a_l04` : image f100r, colonne a, ligne 4). Ce module lit ces identifiants et
// les résout contre la TABLE DES COLONNES (`facsimiles899.json`, engendrée par
// `scripts/facsimiles899/table-des-colonnes.mjs`).
//
// ⛔ La clé de colonne suit la numérotation des IMAGES, jamais celle du manuscrit : après
// la lacune du folio 296, l'image `f296r_a` montre le folio 297r. Le folio qu'on AFFICHE
// vient donc de la table, jamais de la clé.
//
// ⚠️ La table (64 Ko) ne se charge qu'à l'ouverture de la fenêtre (`chargerTableFacsimiles899`) :
// la page Bible ne la porte pas.

/** Un repère dans le témoin : la colonne et la ligne où le verset commence ou finit. */
export type RepereFacsimile899 = { colonne: string; ligne: number }

/** Une colonne de la table : [clé, fichier, largeur, hauteur, folio natif]. */
export type LigneTableFacsimiles899 = [string, string, number, number, string]

export type ColonneFacsimile899 = {
  cle: string
  fichier: string
  largeur: number
  hauteur: number
  /** Le folio du manuscrit (« 297r »), non celui de l'image. */
  folio: string
  /** « a » ou « b ». */
  colonne: string
}

const FORME_LIGNE = /^(f\d+[rv]_[ab])_l(\d+)$/u

/** « f100r_a_l04 » → { colonne: « f100r_a », ligne: 4 } ; `null` pour toute autre forme. */
export function lireRepere899(valeur: unknown): RepereFacsimile899 | null {
  if (typeof valeur !== 'string') return null
  const m = FORME_LIGNE.exec(valeur.trim())
  return m ? { colonne: m[1], ligne: Number(m[2]) } : null
}

// Le seau public `manuscrits`, lu DIRECTEMENT par le navigateur. ⛔ Jamais par `next/image` :
// l'optimisation d'images de Vercel compte chaque colonne à chaque largeur, sur un quota.
// ⛔ La fenêtre lit les COPIES D'AFFICHAGE (`bible-899-web/`, WebP qualité 88, même
// définition, cinq fois plus légères : 300 Ko contre 1,6 Mo), jamais les maîtres PNG, qui
// restent au lecteur de chantier et gardent les empreintes du manifeste. Une colonne
// nouvelle reçoit sa copie par `tmp/reduction-images/facsimiles899-web.mjs`.
const BASE_COPIES_899 =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/manuscrits/bible-899-web`

export function urlColonneFacsimile899(colonne: Pick<ColonneFacsimile899, 'fichier'>): string {
  return `${BASE_COPIES_899}/${colonne.fichier.replace(/\.png$/iu, '.webp')}`
}

export type TableFacsimiles899 = {
  colonnes: ColonneFacsimile899[]
  rang: Map<string, number>
}

export function construireTableFacsimiles899(lignes: readonly LigneTableFacsimiles899[]): TableFacsimiles899 {
  const colonnes = lignes.map(([cle, fichier, largeur, hauteur, folio]) => ({
    cle, fichier, largeur, hauteur, folio, colonne: cle.slice(-1),
  }))
  return { colonnes, rang: new Map(colonnes.map((c, i) => [c.cle, i])) }
}

let tableEnCours: Promise<TableFacsimiles899> | null = null

/** La table, chargée une fois à la première ouverture, puis gardée. */
export function chargerTableFacsimiles899(): Promise<TableFacsimiles899> {
  tableEnCours ??= import('./facsimiles899.json')
    .then((module) => construireTableFacsimiles899(module.default as unknown as LigneTableFacsimiles899[]))
    .catch((erreur) => { tableEnCours = null; throw erreur })
  return tableEnCours
}

/** « f. 297r, col. a » */
export function libelleColonne899(colonne: Pick<ColonneFacsimile899, 'folio' | 'colonne'>): string {
  return `f. ${colonne.folio}, col. ${colonne.colonne}`
}
