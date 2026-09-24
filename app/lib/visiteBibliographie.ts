/**
 * LA VISITE DE LA BIBLIOGRAPHIE — la huitième (2026-09-21).
 *
 * Trois arrêts (l'index des lettres est retiré le 2026-09-24), colonne par colonne (charte § 46) : le volet de gauche entier, du
 * haut vers le bas, puis la liste.
 *
 * ⛔ CE QUE LA VISITE DOIT DIRE, et que la page ne dit pas : que « Cité pour » classe
 * les ouvrages selon l'USAGE qu'en font les notices, et non selon leur sujet ; qu'une
 * entrée nomme les péricopes qui s'appuient sur elle ; et que la référence se copie
 * MISE EN FORME, italique et petites capitales comprises.
 *
 * ⚠️ ELLE NE S'OUVRE QU'EN ÉCRAN LARGE : sous 900 px le volet est un panneau replié,
 * et trois arrêts sur quatre y perdraient leur sujet. Même parti que la page d'œuvre.
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison. */
export const CLE_VISITE_BIBLIOGRAPHIE = 'bibliographie'

export const VISITE_BIBLIOGRAPHIE: Visite = {
  cle: CLE_VISITE_BIBLIOGRAPHIE,
  titre: 'La Bibliographie',
  accroche: [
    'La recherche est en tête de la liste, les filtres à gauche. Les ouvrages se suivent par ordre alphabétique.',
  ],
  etapes: [
    {
      cle: 'recherche',
      sujet: ['[data-visite="biblio-recherche"]'],
      titre: 'Recherche',
      texte: [
        'Le champ cherche par auteur, titre, collection, maison d’édition ou année.',
        'Il se combine avec les filtres du volet de gauche.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'filtres',
      sujet: ['[data-visite="biblio-filtres"]'],
      titre: 'Filtres',
      texte: [
        '**Genre** distingue les commentaires, les éditions, les études et les outils.',
        '**Cité pour** classe les ouvrages selon l’usage qu’en font les notices : exégèse, théologie, réception, critique textuelle.',
        'Le nombre en regard de chaque case dit combien d’ouvrages elle retient.',
      ],
      cote: 'droite',
    },
    {
      cle: 'ouvrage',
      // La classe existait déjà : une entrée de la liste.
      sujet: ['.biblio-entree'],
      titre: 'Ouvrage',
      texte: [
        'Chaque ouvrage se donne dans la forme où il se cite, suivi de son genre.',
        'Les péricopes qui s’appuient sur lui sont nommées dessous et mènent à leur page.',
        '**Copier** place la référence dans le presse-papiers, avec sa mise en forme.',
      ],
      cote: 'gauche',
    },
  ],
}
