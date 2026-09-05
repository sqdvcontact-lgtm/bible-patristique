/**
 * Le style COMMUN de toutes les bibliographies de l'apparat.
 *
 * Une seule famille sert la pièce « Du même auteur », toute pièce ou section
 * « Bibliographie », et tout bloc que la donnée déclare
 * `presentation.style = 'bibliographie'` — quelle que soit l'édition, l'auteur
 * ou la pièce. Et une seule RÉFÉRENCE, `cs-reference-bibliographique`, porte les
 * fragments d'une notice où qu'elle paraisse : dans une liste de l'apparat, dans un
 * paragraphe d'une œuvre, dans la bibliographie d'une péricope, dans la fiche
 * d'un ouvrage. C'est à elle que les rôles de caractère se pendent.
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
 * Les classes de la famille, déclarées ICI et nulle part ailleurs : plusieurs
 * composants les portent, et une famille qui se réécrit à la main dans chacun
 * d'eux se dédouble au premier ajout.
 */
export const CLASSES_BIBLIOGRAPHIE = {
  bloc: 'cs-apparat-bibliographie',
  /**
   * La bibliographie compose ELLE-MÊME, faute d'un hôte qui le fasse pour elle.
   *
   * ⚠️ Ce n'est pas « lue seule » : c'est « sans ancêtre qui porte la
   * composition ». Un bloc d'apparat pose son corps, sa police et son encre sur
   * ses PARAGRAPHES, en style inline ; la bibliographie n'en est pas l'enfant
   * mais la sœur, et un `em` s'y calculerait sur la page. Une pièce liminaire
   * lue seule est dans le même cas. La fenêtre d'une note, elle, compose sur
   * son conteneur : la classe de base y suffit, et le cran relatif joue.
   */
  sansHote: 'cs-apparat-bibliographie--sans-hote',
  liste: 'cs-apparat-bibliographie__liste',
  entree: 'cs-apparat-bibliographie__entree',
  /**
   * UNE référence, où qu'elle paraisse. C'est l'enveloppe des fragments d'une
   * notice, et l'ancre des rôles de caractère : `.cs-reference-bibliographique
   * .cs-apparat-bibliographie__nom-auteur`, (0,2,0), l'emporte sur toute règle
   * d'ambiance qui viserait la balise. Une entrée de la liste la porte comme un
   * paragraphe d'œuvre ou une ligne de péricope : la notice se compose partout
   * de la même façon, et son cadre — liste, paragraphe, ligne — reste celui de
   * la surface.
   */
  reference: 'cs-reference-bibliographique',
} as const

/**
 * Le vocabulaire des styles de CARACTÈRE d'une notice, court et CLOS.
 *
 * Un style ne se crée que s'il répond d'une fonction bibliographique réelle.
 * ⛔ La ponctuation — le point du sous-titre, les virgules, les guillemets, le
 * point final —, et les LIANTS (« dans », « éd. », « trad. », « dir. », « coll. »,
 * « p. ») n'ont aucun style propre : ils appartiennent à la séquence où ils
 * tombent et en héritent la composition.
 *
 * ⚠️ Étendu de deux valeurs le 5 septembre 2026, pour l'article et la
 * contribution (charte § 35.6.2) : le titre d'un article se compose en romain
 * entre guillemets, l'intitulé de son hôte en italique.
 */
export const STYLES_CARACTERE_BIBLIOGRAPHIE = [
  /** L'auteur affiché, en romain. */
  'bibliographie-auteur',
  /** Son nom de famille, en petites capitales. */
  'bibliographie-nom-auteur',
  'bibliographie-titre-ouvrage',
  'bibliographie-sous-titre',
  /** Le titre d'un article, d'une contribution, d'une entrée : romain, entre guillemets. */
  'bibliographie-titre-article',
  /** Le titre du périodique ou de l'ouvrage collectif qui accueille la contribution : italique. */
  'bibliographie-titre-hote',
  /** Lieu, éditeur, année, tomaison, pages : les données retenues, en romain. */
  'bibliographie-donnees',
] as const

export type StyleCaractereBibliographie = typeof STYLES_CARACTERE_BIBLIOGRAPHIE[number]

/** Du nom sémantique porté par la donnée à la classe qui le compose. */
export const CLASSE_CARACTERE_BIBLIOGRAPHIE: Record<StyleCaractereBibliographie, string> = {
  'bibliographie-auteur': 'cs-apparat-bibliographie__auteur',
  'bibliographie-nom-auteur': 'cs-apparat-bibliographie__nom-auteur',
  'bibliographie-titre-ouvrage': 'cs-apparat-bibliographie__titre-ouvrage',
  'bibliographie-sous-titre': 'cs-apparat-bibliographie__sous-titre',
  'bibliographie-titre-article': 'cs-apparat-bibliographie__titre-article',
  'bibliographie-titre-hote': 'cs-apparat-bibliographie__titre-hote',
  'bibliographie-donnees': 'cs-apparat-bibliographie__donnees',
}
