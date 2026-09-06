/**
 * LA VISITE DE LA BIBLE CLASSIQUE — le premier scénario, et le modèle des autres.
 *
 * Sept arrêts, dans l'ordre où la page SE PRÉSENTE : de haut en bas, de gauche à
 * droite (demande de l'auteur, 2026-09-06). Le volet de gauche d'abord (ce qu'on
 * lit, comment on trouve un livre, où l'on va) ; la colonne du texte ensuite (de
 * quelle bible il s'agit, ce que fait un clic sur un verset, ce que la marge
 * offre) ; le volet de droite enfin.
 * C'est l'ordre de la mise en page, et c'est le seul qui n'oblige pas le lecteur à
 * revenir sur ses pas.
 *
 * ⚠️ LES COLONNES SE PRENNENT L'UNE APRÈS L'AUTRE, jamais par bandes
 * horizontales. Mesuré sur la page servie le 2026-09-06, fenêtre de 2 560 px : la
 * carte de l'édition, l'en-tête du texte et le volet des Pères ouvrent tous trois
 * leur colonne à 77 px du haut. Les ranger par ordonnée ferait sauter le regard
 * d'un bord de l'écran à l'autre trois fois de suite ; on descend donc une colonne
 * entière avant de passer à la suivante, comme on lit une page à trois colonnes.
 *
 * ⛔ CHAQUE ÉTAPE VISE UN ÉLÉMENT DÉJÀ RENDU, par un repère « data-visite » posé
 * dans le composant qui le dessine, ou par une classe qui existait déjà. Aucune
 * n'est décrite par un sélecteur de structure (« le troisième div du volet ») :
 * une visite qui se règle sur la forme du DOM se casse au premier remaniement,
 * sans que rien ne le signale, et le lecteur reçoit une case posée sur du vide.
 *
 * ⚠️ Les sujets sont donnés en LISTE, du plus précis au plus général. L'étape du
 * verset vise d'abord un verset que les Pères commentent — c'est le seul qui
 * porte le nombre dont elle parle — et retombe sur n'importe quel verset ;
 * l'étape disparaît si le chapitre n'en a aucun (voir « etapesPresentes »).
 *
 * ⛔ AUCUNE ÉTAPE SUR LA BARRE DU SITE. Elle y a figuré le 6 septembre 2026, sur
 * un contresens de ma part, et l'auteur l'a retirée le soir même : une visite
 * montre la PAGE qu'on vient d'ouvrir, et la barre n'est d'aucune page en
 * particulier. Elle coûtait de surcroît au dessin, le voile devant passer
 * par-dessus la barre pour qu'un cadre pût s'y poser.
 *
 * ⛔ UN PARAGRAPHE PAR IDÉE (demande de l'auteur, 2026-09-06) : on change de
 * paragraphe quand on change de chose à dire, et l'on s'arrête à deux ou trois.
 * Une visite se lit debout, entre deux clics ; ce qui demande un développement
 * n'est pas une explication mais un mode d'emploi, et un mode d'emploi ne se lit
 * pas.
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien
 *  entre cette visite et les lecteurs qui l'ont déjà vue. La changer la rendrait
 *  à tout le monde, y compris à ceux qui l'ont passée. */
export const CLE_VISITE_BIBLE = 'bible-classique'

export const VISITE_BIBLE_CLASSIQUE: Visite = {
  cle: CLE_VISITE_BIBLE,
  // ⛔ Ni « Comment utiliser le site », ni « les fonctionnalités » (demande de
  // l'auteur, 2026-09-06) : le premier annonce une difficulté, le second est un
  // mot de logiciel. La phrase dit ce qui va se passer, et rien de plus.
  titre: 'Faisons le tour de la page.',
  accroche: [
    'À gauche les livres, au centre le texte, à droite ce que les Pères de l’Église en ont dit.',
    'Quelques étapes suffisent à vous montrer où tout se trouve.',
  ],
  etapes: [
    {
      cle: 'edition',
      sujet: ['[data-visite="edition"]'],
      titre: 'Ce que vous lisez',
      texte: [
        'Cette carte nomme la bible ouverte, son traducteur et l’édition d’où le texte est tiré.',
        'Cliquez sur son nom pour ouvrir sa fiche.',
      ],
      cote: 'droite',
      scene: { volet: 'livres' },
    },
    {
      cle: 'recherche-livre',
      sujet: ['[data-visite="recherche-livre"]'],
      titre: 'Trouver un livre',
      texte: [
        'Ce champ ne cherche que dans les livres de la bible ouverte.',
        'Une référence entière fonctionne aussi, comme Jean 3, 16, et vous y mène d’un clic.',
      ],
      cote: 'droite',
      scene: { volet: 'livres' },
    },
    {
      cle: 'livres',
      sujet: ['[data-visite="livres"]'],
      titre: 'Les livres et leurs chapitres',
      texte: [
        'Ouvrez un livre pour voir ses chapitres.',
        'Plus la case d’un chapitre est verte, plus les Pères de l’Église y ont commenté de versets.',
      ],
      cote: 'droite',
      scene: { volet: 'livres' },
    },
    {
      cle: 'entete',
      sujet: ['[data-visite="entete-lecture"]'],
      titre: 'Changer de bible',
      texte: [
        'Le titre rappelle le livre et le chapitre ouverts.',
        'Le menu juste dessous passe d’une traduction à l’autre sans quitter le passage.',
      ],
      cote: 'dessous',
      scene: { volet: 'texte' },
    },
    {
      cle: 'verset',
      // ⚠️ Un verset COMMENTÉ d'abord : lui seul porte le nombre dont l'étape parle.
      sujet: ['.verset-row:has(.marque-densite)', '.verset-row'],
      titre: 'Cliquez sur un verset',
      texte: [
        'Le volet de droite se remplit alors de ce que les Pères en ont dit.',
        'Le nombre inscrit dans la marge compte les œuvres en ligne qui le commentent.',
      ],
      // ⚠️ La carte se pose à GAUCHE, sur le volet des livres : à droite elle
      // couvrirait le volet qui se remplit à l'instant même, c'est-à-dire la
      // seule chose que l'étape donne à voir.
      cote: 'gauche',
      scene: { volet: 'texte', choisirVerset: true },
    },
    {
      cle: 'actions',
      // ⛔ LA MÊME RANGÉE QUE L'ÉTAPE PRÉCÉDENTE, et non la seule colonne
      // d'actions. Mesurée sur la page servie, celle-ci fait trente pixels sur
      // vingt-cinq : cernée seule, elle devient une petite boîte isolée au milieu
      // du texte, dont rien ne dit à quoi elle se rattache, et la case explicative
      // va se poser au milieu des versets pour la rejoindre. La case ne bouge donc
      // pas d'une étape à l'autre ; ce qui change, c'est que la colonne s'allume
      // dedans — et c'est précisément ce dont l'étape parle.
      sujet: ['.verset-row:has(.marque-densite)', '.verset-row'],
      revele: 'actions',
      titre: 'Garder, copier, signaler',
      // ⚠️ Les trois boutons sont NOMMÉS un par un dans l'illustration, avec leur
      // dessin réel : à onze pixels dans la marge, on ne les reconnaît pas de la
      // seule prose (demande de l'auteur, 2026-09-06).
      texte: [
        'Au survol d’un passage, une colonne d’actions paraît dans sa marge.',
        'On la retrouve partout où le site donne un texte, ici comme dans le volet de droite.',
      ],
      illustration: 'actions-verset',
      cote: 'gauche',
      scene: { volet: 'texte' },
    },
    {
      cle: 'peres',
      sujet: ['[data-visite="peres"]'],
      titre: 'Les Pères, en regard',
      texte: [
        'Ce volet réunit les œuvres qui citent ou commentent le verset choisi, rangées par nature.',
        'Les filtres les trient par auteur, par siècle ou par tradition.',
        'L’onglet Commentaires vous laisse écrire le vôtre.',
      ],
      cote: 'gauche',
      scene: { volet: 'commentaires' },
    },
  ],
}
