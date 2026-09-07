/**
 * LA VISITE DE LA BIBLIOTHÈQUE — la troisième, au patron des deux premières.
 *
 * ⚠️ La barre de navigation appelle cette page « Patristique », son titre dit
 * « Bibliothèque », et son adresse est /bibliotheque. Le code prend le nom de la
 * PAGE, qui est aussi celui de sa route : « Patristique » nomme une section de la
 * barre, non l'écran qu'on ouvre.
 *
 * Cinq arrêts, dans l'ordre où la page SE PRÉSENTE : de haut en bas (règle de
 * l'auteur, 2026-09-06). Les trois sections, ce qui restreint la liste, une carte
 * d'auteur, ce qu'elle déplie, et ce qu'une ligne d'édition offre.
 *
 * ⚠️ UNE SEULE COLONNE, donc pas de question d'ordre entre volets : tout se lit de
 * haut en bas. Mesuré sur la page servie le 2026-09-06, fenêtre de 2 560 px : les
 * onglets à 107 px du haut, la recherche à 141, la première carte à 163, son pied
 * à 271, la première ligne d'édition à 320.
 *
 * ⛔ CE QUE LA VISITE DOIT DIRE, et qu'aucune page voisine ne dit : que la liste ne
 * porte QUE les auteurs dont une œuvre est en ligne, que le catalogue en recense
 * bien d'autres qui ne le sont pas, et que l'étoile d'une ligne d'édition remplit
 * l'onglet Favoris. Le reste se voit.
 *
 * ⛔ PAS D'ÉTAPE SUR LE SIGNALEMENT NI SUR « PROPOSER UNE ŒUVRE ». Le premier est
 * une action rare, offerte partout où le site donne un texte, et la visite de la
 * Bible classique la présente déjà ; le second ne paraît que sous l'onglet du
 * catalogue, donc jamais au moment où la visite passe.
 *
 * ⛔ NI SUR LA PAGINATION, NI SUR LA BARRE DU SITE, retirées toutes deux par
 * l'auteur le 6 septembre 2026 au soir. Le pied de la liste écrit lui-même « Page
 * 1 sur 2 », et l'on n'explique pas ce qui s'écrit ; quant à la barre, une visite
 * montre la PAGE qu'on vient d'ouvrir, et elle n'est d'aucune page en particulier.
 * ⚠️ L'étape de la pagination coûtait de surcroît la descente de toute la liste,
 * pour remonter ensuite : le plus long défilement qu'une visite du site ait
 * demandé.
 *
 * ⚠️ L'ÉTAPE DES ŒUVRES DÉPLIE LA PREMIÈRE CARTE, que la page garde repliée :
 * sans cela, celle des éditions n'aurait rien à cerner. La page rend son état à la
 * fin de la visite (voir « ouvrirOeuvres »).
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien
 *  entre cette visite et les lecteurs qui l'ont déjà vue. */
export const CLE_VISITE_BIBLIOTHEQUE = 'bibliotheque'

export const VISITE_BIBLIOTHEQUE: Visite = {
  cle: CLE_VISITE_BIBLIOTHEQUE,
  titre: 'La Bibliothèque',
  accroche: [
    'La Bibliothèque rassemble les Pères de l’Église, leurs œuvres et les éditions dans lesquelles vous pouvez les lire.',
  ],
  etapes: [
    {
      cle: 'onglets',
      sujet: ['[data-visite="bib-onglets"]'],
      titre: 'Sections',
      texte: [
        '**Bibliothèque** présente les auteurs dont au moins une œuvre est disponible.',
        '**Favoris** rassemble les éditions que vous avez conservées.',
        '**Catalogue des traductions** recense les traductions connues qui ne sont pas encore en ligne.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'recherche',
      sujet: ['[data-visite="bib-recherche"]'],
      titre: 'Recherche',
      texte: [
        'Le champ recherche un auteur ou un titre d’œuvre.',
        'Les filtres permettent de limiter la liste par période, par langue ou par tradition.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'auteur',
      sujet: ['[data-visite="bib-auteur"]'],
      titre: 'Auteur',
      texte: [
        'Chaque carte donne le portrait de l’auteur, ses dates et une courte notice biographique.',
        'Cliquez sur son nom pour ouvrir sa fiche, avec sa chronologie et l’ensemble de ses œuvres.',
      ],
      cote: 'droite',
    },
    {
      cle: 'oeuvres',
      // ⚠️ Le sujet n'existe qu'une fois la carte dépliée : la scène s'en charge, et
      // la boucle attend le temps qu'il faut avant de renoncer (« DELAI_SUJET_MS »).
      sujet: ['[data-visite="bib-oeuvres"]'],
      titre: 'Œuvres',
      texte: [
        'Le bas de la carte déploie les œuvres de l’auteur disponibles sur le site.',
        'Chaque édition occupe une ligne avec le traducteur, la ville, l’éditeur et l’année.',
        'Lorsqu’un texte latin ou grec est disponible, il possède sa propre ligne.',
      ],
      scene: { ouvrirOeuvres: true },
      cote: 'droite',
    },
    {
      cle: 'etoile',
      // ⛔ LA LIGNE ENTIÈRE, non l'étoile seule. Celle-ci fait douze pixels : cernée
      // pour elle-même, elle devient une petite boîte isolée dont rien ne dit à quoi
      // elle se rattache — le défaut relevé sur la colonne d'actions d'un verset.
      sujet: ['[data-visite="bib-edition"]'],
      titre: 'Favoris',
      texte: [
        'L’étoile placée au début d’une ligne ajoute cette édition à vos favoris.',
        'Vous la retrouverez dans l’onglet **Favoris**.',
      ],
      cote: 'droite',
    },
  ],
}
