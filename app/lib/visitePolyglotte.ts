/**
 * LA VISITE DE LA POLYGLOTTE — la seconde, au patron de la première.
 *
 * Sept arrêts, dans l'ordre où la page SE PRÉSENTE : de haut en bas, de gauche à
 * droite (règle de l'auteur, 2026-09-06). Le volet de gauche d'abord (combien de
 * colonnes, comment trouver un livre, quel passage), puis le tableau lui-même, de
 * l'en-tête à la rangée et de la rangée à la cellule, la colonne des notes pour
 * finir.
 *
 * ⚠️ LE VOLET SE DESCEND DANS L'ORDRE OÙ IL SE VOIT, et c'est l'inverse de ce que
 * la visite faisait jusqu'au 2026-09-06 au soir. Mesuré sur la page servie, fenêtre
 * de 2 560 px : le bloc des traductions visibles ouvre le volet à 154 px du haut,
 * le champ de recherche vient à 308, la liste des livres à 354. On ne remonte pas
 * un volet qu'on vient de descendre.
 *
 * ⛔ CE QUI DISTINGUE CETTE PAGE de la Bible classique, et que la visite doit
 * dire, tient en trois faits : une rangée est un créneau du CANON, non un verset
 * d'une édition ; chaque édition y garde sa propre numérotation, qui ne suit pas
 * toujours ; et les actions appartiennent à la CELLULE, donc à une traduction, et
 * non au verset en général. Tout le reste est du réglage.
 *
 * ⛔ AUCUNE ÉTAPE SUR LA BARRE DU SITE (retirée par l'auteur le 6 septembre 2026,
 * le soir) : une visite montre la PAGE qu'on vient d'ouvrir, et la barre n'est
 * d'aucune page en particulier.
 *
 * ⛔ PAS D'ÉTAPE SUR LES VERSETS SURNUMÉRAIRES, et c'est un arbitrage. Les rangées
 * violettes, propres à la Septante et hors de l'ossature canonique, méritent une
 * explication, mais elles ne paraissent que sur une minorité de chapitres :
 * l'étape s'effacerait le plus souvent, au prix d'une seconde d'attente pour tout
 * le monde (voir « DELAI_SUJET_MS »). Une visite ne paie pas ce prix à chaque
 * lecteur pour un cas qui ne se présente pas.
 *
 * ⚠️ UNE SEULE SCÈNE À PRÉPARER, celle des notes : sous 820 px la page ne se rend
 * pas du tout et renvoie à un écran large, si bien qu'il n'y a ici ni onglets ni
 * volets à ouvrir. La visite ne s'ouvre que là où le tableau existe (voir la page).
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien
 *  entre cette visite et les lecteurs qui l'ont déjà vue. */
export const CLE_VISITE_POLYGLOTTE = 'polyglotte'

export const VISITE_POLYGLOTTE: Visite = {
  cle: CLE_VISITE_POLYGLOTTE,
  titre: 'La Bible polyglotte',
  accroche: [
    'Plusieurs traductions sont placées côte à côte. Chaque ligne présente le même verset.',
  ],
  etapes: [
    {
      cle: 'colonnes',
      sujet: ['[data-visite="poly-colonnes"]'],
      titre: 'Colonnes',
      texte: [
        'Le mode **Auto** affiche autant de colonnes que l’écran le permet.',
        'Vous pouvez aussi en fixer le nombre, de deux à cinq.',
      ],
      cote: 'droite',
    },
    {
      cle: 'recherche-livre',
      // ⚠️ Le champ est celui de la Bible classique, au repère près : les deux pages
      // partagent « NavLivres ». Ce qu'il FAIT diffère pourtant, et l'étape le dit :
      // une référence n'emmène pas ailleurs, elle vise le verset dans le tableau
      // (« appliquerRefParsee », branche « onChoisirVerset »).
      sujet: ['[data-visite="recherche-livre"]'],
      titre: 'Recherche',
      texte: [
        'Tapez le nom d’un livre pour le retrouver.',
        'Vous pouvez aussi saisir une référence complète, comme « Jean 3, 16 », pour ouvrir directement le passage.',
      ],
      cote: 'droite',
    },
    {
      cle: 'passage',
      // ⚠️ Le volet est celui de la Bible classique, au repère près : les deux pages
      // partagent « NavLivres », et la visite y trouve un « data-visite » déjà posé.
      sujet: ['[data-visite="livres"]'],
      titre: 'Passage',
      texte: [
        'Choisissez un livre puis un chapitre pour l’afficher.',
        '**Livre entier** présente tout le livre d’un seul tenant dans les différentes colonnes.',
      ],
      cote: 'droite',
    },
    {
      cle: 'entete',
      sujet: ['[data-visite="poly-entete"]'],
      titre: 'Traductions',
      texte: [
        'Chaque en-tête ouvre la liste des Bibles, classées par langue.',
        'Si vous choisissez une traduction déjà affichée dans une autre colonne, les deux échangent leur place.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'rangee',
      sujet: ['.poly-row'],
      titre: 'Versets',
      texte: [
        'Chaque ligne présente le même verset dans toutes les traductions.',
        'La marge de gauche indique la référence canonique. Le petit numéro placé au début de chaque cellule reprend la numérotation propre à l’édition, qui peut en différer.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'actions',
      // ⛔ LA CELLULE, non la rangée : les actions y sont posées une fois par
      // colonne, et c'est précisément ce que l'étape dit. La page Bible, elle, cerne
      // la rangée entière, sa colonne d'actions étant unique.
      sujet: ['.poly-row .poly-texte-cell'],
      revele: 'actions',
      titre: 'Actions',
      texte: [
        'Au survol d’une cellule, trois boutons apparaissent dans son coin.',
        'Ils ne concernent que cette traduction : le texte copié ou cité est bien celui de la colonne choisie.',
      ],
      illustration: 'actions-verset',
      cote: 'dessous',
    },
    {
      cle: 'notes',
      sujet: ['[data-visite="poly-notes"]'],
      titre: 'Notes',
      texte: [
        'La dernière colonne permet d’écrire une note sur chaque verset.',
        'Vos notes sont conservées avec votre compte et restent disponibles d’une visite à l’autre.',
        'Vous pouvez fermer cette colonne et la rouvrir avec le bouton en forme de crayon.',
      ],
      // ⚠️ L'étape OUVRE la colonne, que le lecteur garde souvent repliée : sans
      // cela elle cernerait un rail de vingt-six pixels. La page rend son état à la
      // fin de la visite — le pli est un réglage, non un décor.
      scene: { ouvrirNotes: true },
      cote: 'gauche',
    },
  ],
}
