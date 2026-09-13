/**
 * LE MENU CENTRAL DES BIBLES : les membres d'une même famille d'édition sous un seul nom.
 *
 * Les bibles d'une famille d'édition portent un nom commun suivi de leur langue, séparés par
 * un tiret demi-cadratin (charte § 15.6) : « Bible XIIIe – Ancien français », « Bible XIIIe –
 * Français moderne ». Le menu central les réunit en UNE entrée, « Bible XIIIe », dont un
 * sous-menu décline les langues (décision de l'auteur, 2026-09-13).
 *
 * ⛔ CHOISIR LA FAMILLE OUVRE LE TEXTE D'ORIGINE (`member_role = 'source_text'`), et le
 * sous-menu le met en tête : l'ancien français pour la Bible XIIIe, la Vulgate pour Fillion
 * (décision de l'auteur, 2026-09-13). La traduction reste un clic plus loin.
 *
 * ⛔ L'appartenance se lit dans le catalogue des éditions (`v_bible_edition_catalog`), jamais
 * dans une table écrite ici : une famille publiée demain se regroupe sans qu'on y pense.
 * ⚠️ Une famille dont un seul membre est lisible ne se déploie pas : ce membre redevient une
 * bible ordinaire, sous son nom entier.
 */

/** Ce que le catalogue dit d'une bible membre d'une famille. */
export type AppartenanceFamille = { cle: string; role: string; rang: number }

export type BibleDuMenu = { code: string; label: string; famille?: AppartenanceFamille | null }

/** Un texte du sous-menu : la bible qu'il ouvre, et la langue qui le nomme. */
export type MembreDuMenu = { index: number; libelle: string }

export type EntreeDuMenu =
  | { sorte: 'bible'; index: number }
  /** `membres[0]` est le membre PAR DÉFAUT, celui que la famille ouvre. */
  | { sorte: 'famille'; cle: string; nom: string; membres: MembreDuMenu[] }

/** Le tiret qui sépare le nom commun de la langue (charte § 15.6). */
export const SEPARATEUR_FAMILLE = ' – '

/** Le nom commun d'une bible de famille : « Bible XIIIe ». Un nom sans tiret reste entier. */
export function nomCommun(nom: string): string {
  const i = nom.indexOf(SEPARATEUR_FAMILLE)
  return i > 0 ? nom.slice(0, i) : nom
}

/** La langue que déclare le nom d'une bible de famille : « Ancien français ». */
export function langueDuNom(nom: string): string {
  const i = nom.indexOf(SEPARATEUR_FAMILLE)
  return i > 0 ? nom.slice(i + SEPARATEUR_FAMILLE.length) : nom
}

/**
 * Les entrées du menu, dans l'ordre des bibles reçues. Une famille prend la place de son
 * premier membre dans cet ordre ; ses membres suivent le texte d'origine d'abord, puis le rang
 * que la famille leur donne.
 */
export function entreesDuMenu(bibles: readonly BibleDuMenu[]): EntreeDuMenu[] {
  const parFamille = new Map<string, number[]>()
  bibles.forEach((bible, index) => {
    const cle = bible.famille?.cle
    if (cle) parFamille.set(cle, [...(parFamille.get(cle) ?? []), index])
  })

  const origine = (i: number) => (bibles[i].famille?.role === 'source_text' ? 0 : 1)
  const rang = (i: number) => bibles[i].famille?.rang ?? 0
  const entrees: EntreeDuMenu[] = []
  const posees = new Set<string>()
  bibles.forEach((bible, index) => {
    const cle = bible.famille?.cle
    const indices = cle ? parFamille.get(cle) ?? [] : []
    if (!cle || indices.length < 2) {
      entrees.push({ sorte: 'bible', index })
      return
    }
    if (posees.has(cle)) return
    posees.add(cle)
    const membres = [...indices]
      .sort((a, b) => origine(a) - origine(b) || rang(a) - rang(b) || a - b)
      .map(i => ({ index: i, libelle: langueDuNom(bibles[i].label) }))
    entrees.push({ sorte: 'famille', cle, nom: nomCommun(bibles[membres[0].index].label), membres })
  })
  return entrees
}
