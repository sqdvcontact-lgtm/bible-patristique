/**
 * LES TITRES QUE LA LECTURE MONTRE, et la frontière qu'ils posent aux citations.
 *
 * Demande de l'auteur, 16 septembre 2026 : « exclure les titres, mais forcer la division
 * des citations-prélèvements-copier/coller au niveau des titres ». Deux passages que
 * sépare un titre ne se réunissent ni d'un trait ni par une élision : « […] » dit qu'il
 * manque un morceau du même développement, un titre dit qu'une autre partie commence.
 * Doctrine : charte § 38.8.1.
 *
 * ⛔ LE TITRE EST CELUI QUE LA PAGE MONTRE. La lecture d'une œuvre compose les titres de
 * ses groupes jusqu'à la profondeur réglée pour elle (`oeuvres.niveaux_corps`) : un
 * changement de division plus profond ne s'y voit pas, et il ne coupe rien. Mesuré le
 * 16 septembre 2026, sept textes portent des titres de niveau 2 que leur œuvre ne montre
 * pas, et deux des titres de niveau 3.
 *
 * ⛔ LA RÈGLE DU RENDU VIT ICI (`titresDuGroupe`), et la page de lecture l'emploie : une
 * seconde écriture ferait couper une citation là où la page ne montre rien.
 *
 * Module pur : aucune requête, aucun rendu.
 */

import { profondeurBornee } from '@/app/oeuvre/[id]/niveauxAffichage'

/** Les niveaux de division d'un passage, tels que la donnée les porte, le vide dit `''`. */
export type NiveauxDuPassage = { niv1: string; niv2: string; niv3: string; niv4: string }

/** Rien n'a encore été montré. */
export const AUCUN_TITRE_MONTRE: NiveauxDuPassage = { niv1: '', niv2: '', niv3: '', niv4: '' }

/** Les niveaux d'un segment lu en base. */
export function niveauxDuSegment(segment: {
  ref_niv1?: string | null
  ref_niv2?: string | null
  ref_niv3?: string | null
  ref_niv4?: string | null
}): NiveauxDuPassage {
  return {
    niv1: segment.ref_niv1 || '',
    niv2: segment.ref_niv2 || '',
    niv3: segment.ref_niv3 || '',
    niv4: segment.ref_niv4 || '',
  }
}

export type ReglageDesTitres = {
  /** Jusqu'à quel niveau le corps compose ses titres (`oeuvres.niveaux_corps`, borné). */
  profondeur: number
  /** Le titre de niveau 1 se compose-t-il DANS le corps ? En lecture ordinaire, il est la
   *  barre de division, et une page n'en porte qu'un. */
  niveau1DansLeCorps: boolean
}

export type TitresDuGroupe = {
  niv1: boolean
  niv2: boolean
  niv3: boolean
  niv4: boolean
  /** Le dernier titre montré à chaque niveau, une fois le groupe passé. */
  montres: NiveauxDuPassage
}

/**
 * Les titres qu'un groupe compose en tête. Un niveau se montre s'il porte un titre, s'il
 * est dans la profondeur, et s'il n'est pas déjà celui qu'on vient de montrer.
 *
 * ⚠️ Les quatre décisions se prennent sur ce qui était montré AVANT le groupe ; l'état se
 * met à jour ensuite, et un titre de niveau 1 remet les niveaux suivants à zéro.
 */
export function titresDuGroupe(
  groupe: NiveauxDuPassage,
  montres: NiveauxDuPassage,
  reglage: ReglageDesTitres,
): TitresDuGroupe {
  const { profondeur, niveau1DansLeCorps } = reglage
  const niv1 = niveau1DansLeCorps && profondeur >= 1 && groupe.niv1 !== '' && groupe.niv1 !== montres.niv1
  const niv2 = profondeur >= 2 && groupe.niv2 !== '' && groupe.niv2 !== montres.niv2
  const niv3 = profondeur >= 3 && groupe.niv3 !== '' && groupe.niv3 !== montres.niv3
  const niv4 = profondeur >= 4 && groupe.niv4 !== '' && groupe.niv4 !== montres.niv4
  let suite = niv1 ? { niv1: groupe.niv1, niv2: '', niv3: '', niv4: '' } : montres
  if (niv2) suite = { ...suite, niv2: groupe.niv2 }
  if (niv3) suite = { ...suite, niv3: groupe.niv3 }
  if (niv4) suite = { ...suite, niv4: groupe.niv4 }
  return { niv1, niv2, niv3, niv4, montres: suite }
}

/** Le groupe compose-t-il au moins un titre ? */
export function montreUnTitre(titres: TitresDuGroupe): boolean {
  return titres.niv1 || titres.niv2 || titres.niv3 || titres.niv4
}

/**
 * Les passages qui OUVRENT un titre sur la page : le premier passage rendu de chaque
 * groupe dont la tête compose au moins un titre. `estRendu` écarte ce que la page ne rend
 * pas dans le groupe (les introductions, hissées en tête).
 *
 * ⚠️ Un groupe dont rien n'est rendu ne compose rien et ne change pas l'état : c'est ce
 * que fait la page.
 */
export function passagesQuiOuvrentUnTitre<Id>(
  groupes: readonly (NiveauxDuPassage & { itemIds: readonly Id[] })[],
  depart: NiveauxDuPassage,
  reglage: ReglageDesTitres,
  estRendu: (id: Id) => boolean = () => true,
): Set<Id> {
  const ouvrent = new Set<Id>()
  let montres = depart
  for (const groupe of groupes) {
    const rendus = groupe.itemIds.filter(estRendu)
    if (rendus.length === 0) continue
    const titres = titresDuGroupe(groupe, montres, reglage)
    montres = titres.montres
    if (montreUnTitre(titres)) ouvrent.add(rendus[0])
  }
  return ouvrent
}

/**
 * Un titre se lit-il ENTRE deux passages d'un même texte, hors de la page de lecture
 * (le volet des Pères, « Mes citations ») ?
 *
 * `chaine` : le premier passage, ceux qui les séparent, puis le second, dans l'ordre du
 * texte. `niveauxCorps` : la colonne de l'œuvre, `null` quand elle est vide (la page
 * retombe alors sur 1), `undefined` quand on ne la connaît pas encore.
 *
 * ⛔ Rend `null` quand un maillon manque ou que la profondeur n'est pas connue : on ne
 * réunit que ce qu'on sait, comme pour une élision.
 * ⚠️ Hors de la page, un changement de niveau 1 est TOUJOURS un titre : en lecture
 * ordinaire, c'est une autre division, qu'on ouvre par sa barre.
 */
export function titreEntrePassages(
  chaine: readonly (NiveauxDuPassage | null | undefined)[],
  niveauxCorps: number | null | undefined,
): boolean | null {
  if (niveauxCorps === undefined) return null
  if (chaine.some(maillon => !maillon)) return null
  const passages = chaine as readonly NiveauxDuPassage[]
  if (passages.length < 2) return false
  const reglage: ReglageDesTitres = { profondeur: profondeurBornee(niveauxCorps, 'corps'), niveau1DansLeCorps: true }
  let montres = passages[0]
  for (const passage of passages.slice(1)) {
    const titres = titresDuGroupe(passage, montres, reglage)
    if (montreUnTitre(titres)) return true
    montres = titres.montres
  }
  return false
}
