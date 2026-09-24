/**
 * LA VISITE DE LA COMMUNAUTÉ — la septième (2026-09-21).
 *
 * Trois arrêts, colonne par colonne : le volet d'abord (la recherche, l'ordre et
 * les catégories), puis la page (les sections, une couverture). Depuis le
 * 2026-09-24, la Communauté prend le volet des pages sœurs.
 *
 * ⛔ CE QUE LA VISITE DOIT DIRE, et que la page ne dit pas : qu'« Écrire » cache deux
 * façons d'écrire, qu'une couverture se RETOURNE au survol pour donner son résumé, et
 * que son étoile remplit les favoris.
 *
 * ⚠️ ELLE NE S'OUVRE QUE SOUS « ÉCRITS DE LA COMMUNAUTÉ », ET S'IL Y A UN ÉCRIT : sur
 * les autres onglets comme sur un sommaire vide, deux des trois arrêts n'ont pas de
 * sujet (« une page doit porter de quoi DONNER sa visite », charte § 46).
 * ⚠️ Elle s'ouvre sur un téléphone : la page y est la même, en une ou deux
 * couvertures par rang. La quatrième de couverture n'y existe pas : son résumé passe
 * en légende sous le livre (2026-09-21), et l'arrêt le dit.
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien
 *  entre cette visite et les lecteurs qui l'ont déjà vue. */
export const CLE_VISITE_COMMUNAUTE = 'communaute'

export const VISITE_COMMUNAUTE: Visite = {
  cle: CLE_VISITE_COMMUNAUTE,
  titre: 'La Communauté',
  accroche: [
    'La Communauté rassemble les études, notes de lecture et essais publiés par les lecteurs du site.',
  ],
  etapes: [
    {
      cle: 'recherche',
      sujet: ['[data-visite="communaute-recherche"]'],
      titre: 'Recherche et filtres',
      texte: [
        'Le champ cherche parmi les auteurs, les titres et les résumés.',
        'Le volet règle aussi l’ordre des publications, et limite le sommaire à une catégorie de texte.',
      ],
      cote: 'droite',
    },
    {
      cle: 'sections',
      // La classe existait déjà : `OngletsPage` la reçoit de la page.
      sujet: ['.essais-onglets'],
      titre: 'Sections',
      texte: [
        '**Écrits de la communauté** présente les textes publiés.',
        '**Mes écrits** rassemble les vôtres, publiés ou non.',
        '**Écrire** permet de rédiger un texte, ou de commenter un verset tiré au hasard.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'couverture',
      sujet: ['.rayon .couverture'],
      titre: 'Publication',
      texte: [
        'Chaque publication se présente comme un petit livre, dont l’auteur a choisi la couleur. Un clic ouvre le texte.',
        'Avec une souris, la couverture se retourne au survol et donne le résumé. Sur un écran tactile, le résumé s’écrit sous elle.',
        'L’étoile ajoute la publication à vos favoris.',
      ],
      cote: 'droite',
    },
  ],
}
