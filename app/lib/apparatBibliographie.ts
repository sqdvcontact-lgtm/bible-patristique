/**
 * Le style COMMUN de toutes les bibliographies de l'apparat.
 *
 * Une seule famille sert la pièce « Du même auteur », toute pièce ou section
 * « Bibliographie », et tout bloc que la donnée déclare
 * `presentation.style = 'bibliographie'` — quelle que soit l'édition, l'auteur
 * ou la pièce.
 *
 * ⛔ Le genre ne se lit JAMAIS dans le texte du titre. « Du même auteur »,
 * « Bibliographie », « Ouvrages consultés » nomment des PIÈCES, non des
 * compositions : le style vient du style de composition déclaré sur le bloc, ou
 * de la liste structurée que la pièce porte. ⛔ Aucune classe ne prend le nom
 * d'une pièce ni d'une édition — ni `du-meme-auteur`, ni `bibliographie-fillion`.
 *
 * ⛔ Le TITRE de la pièce n'est pas concerné : il garde son rang dans la
 * hiérarchie de l'apparat (`cs-bible-title--tN`). Ce style ne compose que les
 * notices placées dessous.
 *
 * La forme vit dans `app/globals.css`, section « apparat bibliographique ».
 */

/**
 * Les classes de la famille, déclarées ICI et nulle part ailleurs : deux
 * composants les portent, et une famille qui se réécrit à la main dans chacun
 * d'eux se dédouble au premier ajout.
 */
export const CLASSES_BIBLIOGRAPHIE = {
  bloc: 'cs-apparat-bibliographie',
  /**
   * Une bibliographie lue SEULE — une pièce liminaire entière — n'a pas de
   * texte hôte sous lequel descendre d'un cran : son corps est absolu, et elle
   * pose elle-même la police et l'encre que l'apparat lui donnerait.
   *
   * ⚠️ Il n'y a pas de modificateur symétrique : une bibliographie prise dans
   * un texte qui l'accueille est le cas GÉNÉRAL, et la classe de base y suffit.
   */
  corpsPropre: 'cs-apparat-bibliographie--corps-propre',
  liste: 'cs-apparat-bibliographie__liste',
  entree: 'cs-apparat-bibliographie__entree',
} as const

/**
 * Le vocabulaire des styles de CARACTÈRE d'une notice, court et CLOS.
 *
 * Un style ne se crée que s'il répond d'une fonction bibliographique réelle.
 * ⛔ La ponctuation — le deux-points du sous-titre, les virgules, le point
 * final — n'a aucun style propre : elle appartient à la séquence où elle tombe
 * et en hérite la composition.
 */
export const STYLES_CARACTERE_BIBLIOGRAPHIE = [
  /** L'auteur affiché, en romain. */
  'bibliographie-auteur',
  /** Son nom de famille, en petites capitales. */
  'bibliographie-nom-auteur',
  'bibliographie-titre-ouvrage',
  'bibliographie-sous-titre',
  /** Lieu, éditeur, année : les données retenues, en romain. */
  'bibliographie-donnees',
] as const

export type StyleCaractereBibliographie = typeof STYLES_CARACTERE_BIBLIOGRAPHIE[number]

/** Du nom sémantique porté par la donnée à la classe qui le compose. */
export const CLASSE_CARACTERE_BIBLIOGRAPHIE: Record<StyleCaractereBibliographie, string> = {
  'bibliographie-auteur': 'cs-apparat-bibliographie__auteur',
  'bibliographie-nom-auteur': 'cs-apparat-bibliographie__nom-auteur',
  'bibliographie-titre-ouvrage': 'cs-apparat-bibliographie__titre-ouvrage',
  'bibliographie-sous-titre': 'cs-apparat-bibliographie__sous-titre',
  'bibliographie-donnees': 'cs-apparat-bibliographie__donnees',
}
