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

/** Le « ; » du catalogue sépare DEUX MAISONS qui ont coédité le même ouvrage : c’est la
 *  norme du catalogage, et ce n’est donc JAMAIS le nom d’une maison. ⛔ Une autorité ne
 *  porte pas de point-virgule, et une coédition n’a pas sa place dans la liste des
 *  éditeurs répertoriés. ⚠️ La barre oblique, elle, appartient à de vrais noms de maison
 *  (« Centre Thomas More / CADIR », « Leuven University Press / Peeters ») : elle ne
 *  décide de rien. */
export function partiesCoedition(nom: string): string[] {
  return nom.split(/\s*;\s*/u).map((p) => p.trim()).filter(Boolean)
}

/** Deux maisons ou plus dans une même mention. */
export function estCoedition(nom: string): boolean {
  return partiesCoedition(nom).length > 1
}

/** La barre qui joint deux co-éditeurs, encadrée de FINES INSÉCABLES (U+202F) : espace
 *  légère, et la barre ne passe jamais seule à la ligne. Écrite en échappement, faute de
 *  quoi une réécriture du fichier la rendrait en espace ordinaire sans que rien ne le
 *  montre — le dépôt a déjà perdu des fines de cette façon. */
export const SEPARATEUR_COEDITEURS = '\u202f/\u202f'

/** Les morceaux d’une mention d’éditeur, pour le RENDU. On y ajoute la barre oblique
 *  parce que c’est par elle que la fonction joint ses résultats : sans cela, repasser un
 *  affichage déjà composé le découperait autrement la seconde fois. */
function morceauxDeMention(nom: string): string[] {
  return nom.split(/\s*[;/]\s*/u).map((p) => p.trim()).filter(Boolean)
}

/** Affichage d'un champ éditeur : « / » entre co-éditeurs (jamais le « ; » brut du
 *  catalogue), et nom répertorié quand il l'est. */
export function normaliserNomEditeur(
  editeur: string | null | undefined,
  index: IndexEditeurs | null,
): string {
  const brut = (editeur ?? '').trim()
  if (!brut) return ''
  // La forme ENTIÈRE d’abord : « Veuve Jean Camusat ; Pierre Le Petit » est UNE graphie
  // de la maison, non deux maisons. Découper avant de chercher rend introuvable toute
  // variante qui porte un « ; » — et c’est ainsi qu’une variante déclarée restait sans effet.
  const entier = resoudreNomEditeur(brut, index)
  if (entier && !estCoedition(entier)) return entier
  // ⛔ Une COÉDITION ne se rend jamais telle quelle. Chaque maison se résout pour son
  // propre compte et la barre les joint, que la forme composée soit restée dans la table
  // (résidu d’import) ou qu’elle n’y ait jamais été.
  return morceauxDeMention(entier ?? brut)
    .map((part) => resoudreNomEditeur(part, index) ?? part)
    .join(SEPARATEUR_COEDITEURS)
}

/** Un segment de notice porte-t-il un ou plusieurs éditeurs RÉPERTORIÉS ? On exige que
 *  TOUTES les parties séparées par « ; » soient connues : « J. Angé ; A. Cherest » est
 *  une co-édition, tandis que « volume 1, Paris, J. Angé » n'est pas un segment
 *  d'éditeur, c'est une bribe de notice où il s'en trouve un. */
export function editeursDuSegment(segment: string, index: IndexEditeurs | null): string | null {
  if (!index) return null
  // Même ordre que ci-dessus, et même refus de rendre une coédition telle quelle.
  const entier = resoudreNomEditeur(segment, index)
  if (entier && !estCoedition(entier)) return entier
  const parts = morceauxDeMention(entier ?? segment)
  if (!parts.length) return null
  const noms = parts.map((p) => resoudreNomEditeur(p, index))
  if (noms.some((n) => n === null)) return null
  return noms.join(SEPARATEUR_COEDITEURS)
}

/** Reconnaît une ville répertoriée. */
export function estVilleConnue(segment: string, index: IndexEditeurs | null): boolean {
  return !!index && index.villes.has(cleEditeur(segment.trim()))
}
