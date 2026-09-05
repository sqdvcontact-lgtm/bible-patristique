/**
 * L'ADRESSE D'UNE ÉDITION : « Bar-le-Duc, Louis Guérin, 1866 ».
 *
 * Trois mentions, un ordre, et c'est la charte qui le fixe (§ 5, rappelé par l'auteur
 * le 5 septembre 2026) : la VILLE, puis l'ÉDITEUR, puis l'ANNÉE. C'est l'ordre de la
 * notice bibliographique (§ 35.6.1), et il n'y a aucune raison qu'un libellé court dise
 * les mêmes trois choses dans un autre ordre.
 *
 * ⛔ Elle était écrite à SEPT endroits, et quatre d'entre eux la disaient à l'envers —
 * la ligne d'une édition dans le sélecteur d'une œuvre, la mention d'une œuvre sœur, la
 * ligne qui départage deux entrées de « Du même auteur », la carte de la bibliothèque,
 * et le menu des œuvres récentes de la barre. Le lecteur passait donc de « Louis Guérin,
 * Bar-le-Duc, 1866 » à « Bar-le-Duc, Louis Guérin, 1866 » d'une page à l'autre, pour la
 * même édition. Une seule écriture désormais, et une règle qui change ici change partout.
 *
 * ⛔ Ce N'EST PAS une notice bibliographique, et ce module ne cherche pas à en faire une :
 * pas de titre, pas d'auteur, pas d'italique, pas de point final. Une notice se compose
 * par le MOTEUR (`referenceBibliographique.ts`). L'adresse en est la seule partie qu'un
 * libellé de navigation reprend, et c'est pour cela qu'elle a son module à elle.
 *
 * ⚠️ Ce module ne RÉSOUT rien : l'éditeur lui arrive sous son nom répertorié
 * (`normaliserNomEditeur`, `formaterEditeur`) et la date déjà mise en forme
 * (`formaterDateHistorique`). Il décide de l'ORDRE et du séparateur, et s'arrête là.
 *
 * Module PUR : ni React, ni Supabase. Testé dans `adresseEdition.test.ts`.
 */

/** La virgule qui sépare deux mentions d'une même adresse (charte § 35.6.1). */
export const SEPARATEUR_ADRESSE = ', '

export type AdresseEdition = {
  /** Le lieu d'édition, une ou plusieurs villes déjà jointes (`joindreLieux`). */
  ville?: string | null
  /** La maison, sous son nom d'autorité, coéditeurs déjà joints. */
  editeur?: string | null
  /** Le millésime TEL QU'IL S'AFFICHE : « 1866 », « 1870-1873 », « vers 1260 ». */
  annee?: string | null
}

function propre(valeur: string | null | undefined): string | null {
  const texte = (valeur ?? '').trim()
  return texte ? texte : null
}

/**
 * Les mentions de l'adresse, dans l'ordre, les absentes ôtées.
 *
 * ⚠️ Une surface dont l'une des mentions est un NŒUD — la carte de la bibliothèque, qui
 * rend sa date par `HistoricalDate` — prend cette liste plutôt que la chaîne, et pose sa
 * mention à elle avec le même séparateur. C'est ainsi qu'elle garde l'ordre sans avoir à
 * le réécrire.
 */
export function mentionsAdresseEdition(adresse: AdresseEdition): string[] {
  return [propre(adresse.ville), propre(adresse.editeur), propre(adresse.annee)]
    .filter((mention): mention is string => mention !== null)
}

/**
 * L'adresse en une chaîne. Vide quand aucune des trois mentions n'est là : l'appelant
 * n'affiche alors rien du tout, plutôt qu'une virgule esseulée.
 */
export function adresseEdition(adresse: AdresseEdition): string {
  return mentionsAdresseEdition(adresse).join(SEPARATEUR_ADRESSE)
}
