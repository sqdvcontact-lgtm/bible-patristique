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
 * paragraphe quand on change de chose à dire. Une visite se lit debout, entre deux
 * clics ; ce qui demande un développement n'est pas une explication mais un mode
 * d'emploi, et un mode d'emploi ne se lit pas.
 * ⚠️ Deux ou trois paragraphes, et QUATRE quand l'arrêt présente un axe qui a
 * quatre états : le « Modes » de la recherche nomme les trois façons de chercher,
 * puis dit où leur explication se trouve. Ce n'est pas une idée de plus, c'est la
 * liste que l'écran porte, et la couper serait en taire un morceau.
 *
 * ⛔ LE REGISTRE EST CELUI D'UN MANUEL (reprise de l'auteur, 2026-09-07). Les six
 * scénarios ont été réécrits ce jour-là : le titre d'un arrêt est un NOM, court et
 * nominal (« Édition », « Verset », « Actions »), jamais une phrase ni une formule
 * d'accueil ; le texte énonce ce que la chose FAIT, sans s'adresser au lecteur par
 * une tournure engageante ; et l'accroche d'une visite tient en UNE phrase qui
 * situe la page. ⛔ La formule « Quelques étapes suffisent à vous montrer… », qui
 * fermait les six accroches, est retirée : une visite n'a pas à se présenter
 * elle-même, ses boutons le font.
 *
 * ⚠️ UN NOM DE COMMANDE SE COMPOSE EN GRAS, par la syntaxe `**…**` du site :
 * « **Classique** », « **Livre entier** », « **Famille de mots** ». C'est le seul
 * enrichissement qu'emploient les six scénarios, et il est RENDU (voir le
 * doc-comment de `VisiteGuidee.tsx`) : écrit sans lui, l'astérisque s'imprimerait.
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
  titre: 'La Bible classique',
  accroche: [
    'Les livres sont à gauche, le texte au centre, les Pères de l’Église à droite.',
  ],
  etapes: [
    {
      cle: 'edition',
      sujet: ['[data-visite="edition"]'],
      titre: 'Édition',
      texte: [
        'Cette carte indique la Bible ouverte, son traducteur et l’édition suivie.',
        'Cliquez sur son nom pour ouvrir la fiche de l’édition.',
      ],
      cote: 'droite',
      scene: { volet: 'livres' },
    },
    {
      cle: 'recherche-livre',
      sujet: ['[data-visite="recherche-livre"]'],
      titre: 'Recherche',
      texte: [
        'Ce champ cherche parmi les livres de la Bible ouverte.',
        'Vous pouvez aussi saisir une référence complète, comme « Jean 3, 16 », pour ouvrir directement le passage.',
      ],
      cote: 'droite',
      scene: { volet: 'livres' },
    },
    {
      cle: 'livres',
      sujet: ['[data-visite="livres"]'],
      titre: 'Livres et chapitres',
      texte: [
        'Ouvrez un livre pour afficher ses chapitres.',
        // ⚠️ « Teintée » et non « verte » : en thème sombre, la teinte est l'or.
        'Plus la case d’un chapitre est teintée, plus ce chapitre contient de versets commentés par les Pères.',
      ],
      cote: 'droite',
      scene: { volet: 'livres' },
    },
    {
      cle: 'entete',
      sujet: ['[data-visite="entete-lecture"]'],
      titre: 'Traduction',
      texte: [
        'Le titre indique le livre et le chapitre ouverts.',
        'Le menu placé dessous permet de changer de traduction sans quitter le passage.',
      ],
      cote: 'dessous',
      scene: { volet: 'texte' },
    },
    {
      cle: 'verset',
      // ⚠️ Un verset COMMENTÉ d'abord : le volet de droite s'y remplit. La rangée le dit
      // par `data-oeuvres`, qu'elle porte même quand la marque ne tient pas à l'écran :
      // chercher la marque elle-même retombait sur le premier verset venu dès que la
      // place manquait (2026-09-13).
      sujet: ['.verset-row[data-oeuvres]', '.verset-row'],
      titre: 'Verset',
      texte: [
        'Cliquez sur un verset pour afficher à droite ce que les Pères en ont dit.',
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
      sujet: ['.verset-row[data-oeuvres]', '.verset-row'],
      revele: 'actions',
      titre: 'Actions',
      // ⚠️ Les trois boutons sont NOMMÉS un par un dans l'illustration, avec leur
      // dessin réel : à onze pixels dans la marge, on ne les reconnaît pas de la
      // seule prose (demande de l'auteur, 2026-09-06).
      // ⚠️ Le nombre d'œuvres se présente ICI depuis le 13 septembre 2026 : il ferme la
      // rangée d'actions et ne paraît qu'avec elle, au survol, quand il y tient.
      texte: [
        'Au survol d’un passage, les actions apparaissent dans la marge.',
        'Elles permettent de le conserver, de le copier ou de le signaler. Vous les retrouverez partout où le site donne à lire un texte.',
        'Quand la place le permet, un nombre les suit : celui des œuvres en ligne qui commentent le passage.',
      ],
      illustration: 'actions-verset',
      cote: 'gauche',
      scene: { volet: 'texte' },
    },
    {
      cle: 'peres',
      sujet: ['[data-visite="peres"]'],
      titre: 'Pères de l’Église',
      texte: [
        // ⚠️ RELU LE 2026-09-21 : les filtres sont Auteur, Tradition, Genre et Période, et
        // « Commentaires » nomme DEUX onglets, celui des Pères et celui des lecteurs.
        'Le volet de droite rassemble les œuvres qui citent le verset choisi, le commentent ou y font écho : **Citations**, **Commentaires**, **Échos**.',
        'Vous pouvez les filtrer par auteur, par tradition, par genre ou par période.',
        'En tête du volet, l’onglet **Commentaires** réunit ceux des lecteurs et permet d’écrire le vôtre.',
      ],
      cote: 'gauche',
      scene: { volet: 'commentaires' },
    },
  ],
}

/**
 * ⚠️ LA VISITE DIT CE QUE L’ÉCRAN MONTRE, et l’en-tête ne montre pas la même chose
 * partout. Au doigt, le titre « Genèse ❧ Chapitre 1 » n’y est plus (2026-09-20, voir
 * `TexteBible`) : il ne reste que le menu des bibles. Une phrase qui nomme un titre
 * absent est une case posée sur du vide, en mots — et c’est le même défaut que celui
 * contre lequel les sujets sont donnés en repères plutôt qu’en sélecteurs.
 * ⛔ La visite ne se DUPLIQUE pas pour autant : une seule étape change, et elle change
 * ici, au même endroit que le scénario.
 */
export function visiteBibleClassiquePour(mobile: boolean): Visite {
  if (!mobile) return VISITE_BIBLE_CLASSIQUE
  return {
    ...VISITE_BIBLE_CLASSIQUE,
    etapes: VISITE_BIBLE_CLASSIQUE.etapes.map((etape) => (etape.cle === 'entete'
      ? {
          ...etape,
          texte: [
            'Le menu indique la traduction affichée.',
            'Il permet d’en changer sans quitter le passage.',
          ],
        }
      : etape)),
  }
}
