/**
 * LA VISITE D'UNE ŒUVRE — la cinquième, au patron des quatre premières.
 *
 * Sept arrêts, dans l'ordre où la page SE PRÉSENTE (règle de l'auteur, 2026-09-06) :
 * de haut en bas, de gauche à droite, chaque colonne prise ENTIÈRE avant la suivante.
 * Le volet de gauche d'abord, du haut vers le bas ; puis la colonne de lecture ; puis
 * le volet de droite. ⛔ Jamais par bandes horizontales : les trois colonnes ouvrent
 * toutes à la même hauteur, et les ranger par ordonnée ferait sauter le regard d'un
 * bord de l'écran à l'autre à chaque arrêt.
 *
 * ⛔ CE QUE LA VISITE DOIT DIRE, et qu'aucune page voisine ne dit :
 *  · que le nom de l'auteur, dans le volet, OUVRE sa fiche ;
 *  · qu'une œuvre se lit dans plusieurs langues quand l'édition les porte, et qu'on
 *    ne perd pas sa place en changeant ;
 *  · que l'apparat critique est une seconde lecture, à part du texte ;
 *  · qu'un passage se CLIQUE, et que le volet de droite répond ;
 *  · que ce volet porte les versets visés et les commentaires des lecteurs.
 * Le reste se voit.
 *
 * ⛔ PAS D'ÉTAPE SUR LA CELLULE D'ACTIONS qui paraît au survol d'un passage
 * (prélever, copier, signaler). C'est la même raison que pour le signalement dans la
 * visite de la Bibliothèque : une action offerte partout où le site donne un texte,
 * et que la visite de la Bible classique présente déjà. La montrer ici demanderait en
 * outre de simuler un survol, donc de poser une cellule flottante que le lecteur n'a
 * pas appelée.
 *
 * ⛔ NI SUR LA BARRE DU SITE : une visite montre la PAGE qu'on vient d'ouvrir, et la
 * barre n'est d'aucune page en particulier (charte § 46).
 *
 * ⚠️ DEUX ARRÊTS SUR SEPT DISPARAISSENT D'EUX-MÊMES quand l'œuvre ne les porte pas,
 * et c'est voulu : « Comment lire » n'existe que si l'édition offre plus d'une langue,
 * et « L'apparat critique » que si l'éditeur en a laissé un. La boucle du composant
 * renonce au bout d'un délai et passe à la suivante, sans qu'on ait rien à déclarer.
 *
 * ⚠️ L'ARRÊT DU VOLET DE DROITE RETIENT UN PASSAGE pour de bon (« choisirSegment ») :
 * sans lui, le volet montrerait son écran vide, et l'étape promettrait ce qu'elle ne
 * montre pas. Le passage retenu est le premier qui vise réellement un verset.
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien entre
 *  cette visite et les lecteurs qui l'ont déjà vue.
 *  ⚠️ Elle vaut pour TOUTES les œuvres, et non pour celle qu'on ouvre : la page est la
 *  même, et l'on ne refait pas visiter le même écran à chaque titre. */
export const CLE_VISITE_OEUVRE = 'oeuvre'

export const VISITE_OEUVRE: Visite = {
  cle: CLE_VISITE_OEUVRE,
  titre: 'Une œuvre, et de quoi la lire.',
  accroche: [
    'Le texte au milieu, ce qui le situe à gauche, ce qu’il cite à droite.',
    'Quelques arrêts suffisent à savoir où regarder.',
  ],
  etapes: [
    {
      cle: 'oeuvre',
      sujet: ['[data-visite="oeuvre-tete"]'],
      titre: 'L’œuvre et son auteur',
      texte: [
        'Le nom de l’auteur ouvre sa fiche : sa vie, sa chronologie et toutes ses œuvres.',
        'L’étoile range l’œuvre parmi vos favoris, que vous retrouvez dans la Bibliothèque.',
        'Sous le titre, un lien mène à la fiche de l’édition dans laquelle vous lisez.',
      ],
      cote: 'droite',
    },
    {
      cle: 'lecture',
      sujet: ['[data-visite="oeuvre-lecture"]'],
      titre: 'Dans quelle langue',
      texte: [
        'Quand l’édition porte l’original, on peut lire la traduction seule, les deux en regard, ou l’original seul.',
        'Vous ne perdez pas votre place : le passage que vous lisiez se retrouve dans l’autre texte.',
      ],
      cote: 'droite',
    },
    {
      cle: 'apparat',
      sujet: ['[data-visite="oeuvre-apparat"]'],
      titre: 'L’apparat critique',
      texte: [
        'Ce que l’éditeur a relevé sous son texte : les leçons des manuscrits, ses sources, ses remarques.',
        'Il se lit à part, division par division, et n’encombre pas la page.',
      ],
      cote: 'droite',
    },
    {
      cle: 'sommaire',
      sujet: ['[data-visite="oeuvre-sommaire"]'],
      titre: 'Le sommaire',
      texte: [
        'Les divisions de l’œuvre, telles que l’édition les donne.',
        'Un clic ouvre la section, et le texte s’y rend.',
      ],
      cote: 'droite',
    },
    {
      cle: 'frontispice',
      sujet: ['[data-visite="oeuvre-frontispice"]'],
      titre: 'La page de titre',
      texte: [
        'Chaque œuvre s’ouvre comme un livre, sur son titre et le nom de qui l’a traduite.',
        'Au bas, le colophon dit l’édition suivie et l’année de sa mise en ligne.',
      ],
      cote: 'droite',
    },
    {
      cle: 'texte',
      // ⚠️ La classe existait déjà : un segment du corps, celui que le survol éclaire
      // et que le clic retient. Aucun repère à poser dans la page pour cet arrêt.
      sujet: ['.seg-inline'],
      titre: 'Le texte',
      texte: [
        'Le texte est découpé en passages, tels que l’édition les paragraphe.',
        'Cliquez sur l’un d’eux : il se retient, et le volet de droite répond.',
        'Les appels de note ouvrent la note de l’éditeur sans quitter la ligne.',
      ],
      cote: 'droite',
    },
    {
      cle: 'bible',
      sujet: ['[data-visite="oeuvre-bible"]'],
      titre: 'Ce que le passage cite',
      // ⚠️ TROIS paragraphes, et le deuxième n'est pas un ornement : éprouvé sur les
      // Confessions le 2026-09-07, la première division est l'avertissement du
      // traducteur, où AUCUN passage ne cite l'Écriture. Le volet dit alors qu'il n'y a
      // rien, et une étape qui aurait promis des versets aurait promis en l'air. Une
      // étape dit ce que la page fait, y compris quand elle n'a rien à montrer.
      texte: [
        'Bible donne les versets que le passage retenu cite, dans la traduction de votre choix.',
        'Quand il n’en cite aucun, le volet vous le dit plutôt que de rester muet.',
        'Commentaires porte ce que les lecteurs en ont écrit, et vous permet d’y répondre.',
      ],
      scene: { choisirSegment: true },
      cote: 'gauche',
    },
  ],
}
