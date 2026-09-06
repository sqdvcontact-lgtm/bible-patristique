/**
 * LA VISITE DE LA POLYGLOTTE — la seconde, au patron de la première.
 *
 * Six arrêts, dans l'ordre où l'on prend la page : le volet de gauche (quel
 * passage, combien de colonnes), l'en-tête (quelle bible dans chaque colonne),
 * puis le tableau lui-même, de la rangée à la cellule, et la colonne des notes
 * pour finir.
 *
 * ⛔ CE QUI DISTINGUE CETTE PAGE de la Bible classique, et que la visite doit
 * dire, tient en trois faits : une rangée est un créneau du CANON, non un verset
 * d'une édition ; chaque édition y garde sa propre numérotation, qui ne suit pas
 * toujours ; et les actions appartiennent à la CELLULE, donc à une traduction, et
 * non au verset en général. Tout le reste est du réglage.
 *
 * ⛔ PAS D'ÉTAPE SUR LES VERSETS SURNUMÉRAIRES, et c'est un arbitrage. Les
 * rangées violettes — les versets propres à la Septante, hors de l'ossature
 * canonique — méritent une explication, mais elles ne paraissent que sur une
 * minorité de chapitres : l'étape s'effacerait le plus souvent, au prix d'une
 * seconde d'attente pour tout le monde (voir `DELAI_SUJET_MS`). Une visite ne
 * paie pas ce prix à chaque lecteur pour un cas qui ne se présente pas.
 *
 * ⚠️ AUCUNE SCÈNE À PRÉPARER : sous 820 px la page ne se rend pas du tout et
 * renvoie à un écran large, si bien qu'il n'y a ici ni onglets ni volets à
 * ouvrir. La visite ne s'ouvre que là où le tableau existe (voir la page).
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien
 *  entre cette visite et les lecteurs qui l'ont déjà vue. */
export const CLE_VISITE_POLYGLOTTE = 'polyglotte'

export const VISITE_POLYGLOTTE: Visite = {
  cle: CLE_VISITE_POLYGLOTTE,
  titre: 'Plusieurs bibles, côte à côte.',
  accroche: [
    'Chaque colonne porte une traduction, chaque rangée un même verset.',
    'Quelques étapes suffisent à vous montrer où tout se règle.',
  ],
  etapes: [
    {
      cle: 'passage',
      // ⚠️ Le volet est celui de la Bible classique, au repère près : les deux pages
      // partagent `NavLivres`, et la visite y trouve un `data-visite` déjà posé.
      sujet: ['[data-visite="livres"]'],
      titre: 'Choisir le passage',
      texte: [
        'Ouvrez un livre, puis un chapitre : le tableau s’ouvre dessus.',
        'Livre entier met le livre d’un seul tenant sur les colonnes.',
      ],
      cote: 'droite',
    },
    {
      cle: 'colonnes',
      sujet: ['[data-visite="poly-colonnes"]'],
      titre: 'Combien de colonnes',
      texte: [
        'Auto en met autant que votre écran peut en porter.',
        'Vous pouvez aussi en fixer le nombre, de deux à cinq.',
      ],
      cote: 'droite',
    },
    {
      cle: 'entete',
      sujet: ['[data-visite="poly-entete"]'],
      titre: 'Changer une bible',
      texte: [
        'Chaque en-tête ouvre la liste des bibles, rangées par langue.',
        'En choisir une déjà affichée ailleurs échange les deux colonnes.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'rangee',
      sujet: ['.poly-row'],
      titre: 'Une rangée, un verset',
      texte: [
        'Une rangée porte le même verset dans toutes les colonnes.',
        'En marge, à gauche, la référence du canon.',
        'Dans chaque cellule, le petit numéro de tête est celui de l’édition, qui ne compte pas toujours comme le canon.',
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
      titre: 'Garder, copier, signaler',
      texte: [
        'Au survol d’une cellule, trois boutons paraissent dans son coin.',
        'Ils ne portent que sur cette colonne : on cite la traduction qu’on a sous les yeux.',
      ],
      illustration: 'actions-verset',
      cote: 'dessous',
    },
    {
      cle: 'notes',
      sujet: ['[data-visite="poly-notes"]'],
      titre: 'Vos notes',
      texte: [
        'La dernière colonne vous laisse écrire une note sur chaque verset.',
        'Elle est gardée sur votre compte, et vous la retrouvez d’une visite à l’autre.',
        'Elle se referme d’un clic, et le crayon qui la remplace la rouvre.',
      ],
      // ⚠️ L'étape OUVRE la colonne, que le lecteur garde souvent repliée : sans
      // cela elle cernerait un rail de vingt-six pixels. La page rend son état à la
      // fin de la visite — le pli est un réglage, non un décor.
      scene: { ouvrirNotes: true },
      cote: 'gauche',
    },
  ],
}
