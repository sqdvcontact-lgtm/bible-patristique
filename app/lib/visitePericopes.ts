/**
 * LA VISITE DU CATALOGUE DES PÉRICOPES — la neuvième (2026-09-21).
 *
 * Cinq arrêts, colonne par colonne (charte § 46) : le volet de gauche entier, du haut
 * vers le bas, puis la colonne de la liste, de ses onglets à sa première entrée.
 *
 * ⛔ CE QUE LA VISITE DOIT DIRE, et que la page ne dit pas : qu'une péricope se
 * retrouve aussi sous un AUTRE NOM que le sien (l'entrée dit alors par lequel),
 * qu'un livre du sommaire fait DÉFILER la liste et ne la restreint pas, et que la
 * page d'une péricope porte ce que les Pères en disent.
 *
 * ⚠️ ELLE NE S'OUVRE QU'EN ÉCRAN LARGE : sous 900 px le volet est un panneau replié,
 * et trois arrêts sur cinq y perdraient leur sujet. Même parti que la Bibliographie.
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison. */
export const CLE_VISITE_PERICOPES = 'pericopes'

export const VISITE_PERICOPES: Visite = {
  cle: CLE_VISITE_PERICOPES,
  titre: 'Les péricopes',
  accroche: [
    'La recherche et le sommaire des livres sont à gauche, le catalogue à droite, dans l’ordre du texte biblique.',
  ],
  etapes: [
    {
      cle: 'recherche',
      sujet: ['[data-visite="peri-recherche"]'],
      titre: 'Recherche',
      texte: [
        'Le champ accepte un titre, un nom de livre ou une référence.',
        'Une péricope connue sous un autre nom se retrouve aussi : l’entrée indique alors par quel nom.',
      ],
      cote: 'droite',
    },
    {
      cle: 'sommaire',
      sujet: ['[data-visite="peri-sommaire"]'],
      titre: 'Livres',
      texte: [
        'Un clic sur un livre fait défiler le catalogue jusqu’à lui.',
        'Chaque Testament se replie par sa flèche.',
      ],
      cote: 'droite',
    },
    {
      cle: 'registre',
      sujet: ['[data-visite="peri-filtres"]'],
      titre: 'Registre',
      texte: [
        'Le registre retient un genre de passage : récit, parabole, miracle, discours, psaume et d’autres encore.',
        'Le nombre en regard de chaque case dit combien de péricopes elle retient.',
      ],
      cote: 'droite',
    },
    {
      cle: 'onglets',
      // La classe existait déjà : le groupe des Testaments, en tête de la liste.
      sujet: ['.peri-onglets'],
      titre: 'Testaments',
      texte: [
        '**Tout** montre le catalogue entier.',
        'Les onglets suivants le limitent à un Testament.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'entree',
      sujet: ['.peri-entree'],
      titre: 'Péricope',
      texte: [
        'Chaque ligne donne la référence, le titre de la péricope et le début de sa notice.',
        'Un clic ouvre sa page : la notice entière et ce que les Pères disent du passage.',
      ],
      cote: 'dessous',
    },
  ],
}
