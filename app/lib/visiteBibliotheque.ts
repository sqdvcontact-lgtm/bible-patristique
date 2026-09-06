/**
 * LA VISITE DE LA BIBLIOTHÈQUE — la troisième, au patron des deux premières.
 *
 * ⚠️ La barre de navigation appelle cette page « Patristique », son titre dit
 * « Bibliothèque », et son adresse est /bibliotheque. Le code prend le nom de la
 * PAGE, qui est aussi celui de sa route : « Patristique » nomme une section de la
 * barre, non l'écran qu'on ouvre.
 *
 * Sept arrêts, dans l'ordre où la page SE PRÉSENTE : de haut en bas (règle de
 * l'auteur, 2026-09-06). La barre du site d'abord, puis les trois sections, puis
 * ce qui restreint la liste, puis une carte d'auteur, ce qu'elle déplie, ce qu'une
 * ligne d'édition offre, et la façon de tourner les pages.
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
 * ⚠️ L'ÉTAPE DES ŒUVRES DÉPLIE LA PREMIÈRE CARTE, que la page garde repliée :
 * sans cela, celle des éditions n'aurait rien à cerner. La page rend son état à la
 * fin de la visite (voir « ouvrirOeuvres »).
 */

import { ETAPE_RECHERCHE_SITE } from './visiteBarreDuSite'
import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien
 *  entre cette visite et les lecteurs qui l'ont déjà vue. */
export const CLE_VISITE_BIBLIOTHEQUE = 'bibliotheque'

export const VISITE_BIBLIOTHEQUE: Visite = {
  cle: CLE_VISITE_BIBLIOTHEQUE,
  titre: 'Le fonds, auteur par auteur.',
  accroche: [
    'Les Pères de l’Église, leurs œuvres, et les éditions dans lesquelles on les lit.',
    'Quelques étapes suffisent à vous montrer où tout se trouve.',
  ],
  etapes: [
    // ⚠️ La barre du site est la même partout : son étape est PARTAGÉE, et se lit
    // dans « visiteBarreDuSite ».
    ETAPE_RECHERCHE_SITE,
    {
      cle: 'onglets',
      sujet: ['[data-visite="bib-onglets"]'],
      titre: 'Trois sections',
      texte: [
        'Bibliothèque réunit les auteurs dont une œuvre au moins se lit ici.',
        'Favoris garde celles que vous avez marquées.',
        'Catalogue des traductions recense ce qui existe ailleurs et n’est pas encore en ligne.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'recherche',
      sujet: ['[data-visite="bib-recherche"]'],
      titre: 'Restreindre la liste',
      texte: [
        'Le champ cherche un auteur comme un titre d’œuvre.',
        'Filtres la restreint par période, par langue et par tradition.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'auteur',
      sujet: ['[data-visite="bib-auteur"]'],
      titre: 'Un auteur, une carte',
      texte: [
        'Le portrait, les dates et une notice qui dit l’essentiel de sa vie.',
        'Cliquez sur son nom pour ouvrir sa fiche, avec sa chronologie et toutes ses œuvres.',
      ],
      cote: 'droite',
    },
    {
      cle: 'oeuvres',
      // ⚠️ Le sujet n'existe qu'une fois la carte dépliée : la scène s'en charge, et
      // la boucle attend le temps qu'il faut avant de renoncer (« DELAI_SUJET_MS »).
      sujet: ['[data-visite="bib-oeuvres"]'],
      titre: 'Ce que l’on peut lire',
      texte: [
        'Le pied de la carte déplie les œuvres de l’auteur qui sont en ligne.',
        'Sous chaque titre, une ligne par édition : le traducteur, puis la ville, l’éditeur et l’année.',
        'Quand l’original latin ou grec est là, il a sa propre ligne.',
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
      titre: 'Garder une édition',
      texte: [
        'L’étoile en tête de ligne range l’édition parmi vos favoris.',
        'Vous la retrouvez sous l’onglet Favoris, en haut de la page.',
      ],
      cote: 'droite',
    },
    {
      cle: 'pagination',
      sujet: ['[data-visite="bib-pagination"]'],
      titre: 'Tourner les pages',
      texte: [
        'La liste se donne dix auteurs à la fois.',
        'Sur un écran large, deux flèches rondes en font autant depuis les bords, sans qu’on descende jusqu’ici.',
      ],
      cote: 'droite',
    },
  ],
}
