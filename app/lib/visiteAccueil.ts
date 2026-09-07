/**
 * LA VISITE DE L'ACCUEIL — la seule qui parle de la BARRE, et non de sa page.
 *
 * Demande de l'auteur, 2026-09-06 au soir : « un tuto sur la page d'accueil qui
 * explique globalement la navbar, avec pour la bible et la patristique deux
 * flèches, y compris vers les cartes ».
 *
 * ⛔ C'EST L'EXCEPTION À LA RÈGLE, et elle la confirme. Une visite montre la page
 * qu'on vient d'ouvrir, et la barre n'est d'aucune page en particulier : c'est
 * pourquoi elle a été retirée des trois autres. Mais l'accueil n'a pas d'autre
 * objet que d'être une PORTE, et la barre est la porte. Elle est donc ici le sujet,
 * non l'ornement — et la visite le déclare (« couvreLaBarre »), ce qui fait passer
 * le voile par-dessus la barre le temps de cette visite-là, et d'elle seule.
 *
 * ⚠️ DEUX FLÈCHES sur les bibles et sur la patristique : la barre y mène, et la
 * carte du milieu de page aussi. Une étape qui ne montrerait que l'onglet laisserait
 * croire que la carte fait autre chose. Le second sujet ORNE l'étape, il ne la
 * commande pas : la carte absente, l'étape se donne quand même.
 *
 * Sept arrêts, dans l'ordre où la barre se lit, de gauche à droite : elle-même
 * d'abord, puis ses entrées de lecture, puis ce qui n'est pas de la lecture.
 *
 * ⛔ RIEN SUR ADMINISTRATION : cet onglet ne paraît qu'à l'auteur du site, et une
 * visite s'écrit pour le lecteur. ⛔ Ni sur la marque, en tête de barre : un nom de
 * site qui ramène à l'accueil ne s'explique pas, et l'on est déjà dessus.
 *
 * ⚠️ ELLE NE S'OUVRE QU'EN ÉCRAN LARGE, et la page le vérifie. Sous le seuil du
 * menu déroulant, la barre n'est plus qu'un bouton de menu : ses onglets sont dans
 * le document mais de taille nulle, et sept étapes s'effaceraient l'une après
 * l'autre. ⛔ Ouvrir le menu pour les montrer ne vaut pas mieux : le panneau couvre
 * la page, cartes comprises, c'est-à-dire la moitié de ce que la visite désigne.
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien
 *  entre cette visite et les lecteurs qui l'ont déjà vue. */
export const CLE_VISITE_ACCUEIL = 'accueil'

export const VISITE_ACCUEIL: Visite = {
  cle: CLE_VISITE_ACCUEIL,
  titre: 'L’accueil',
  accroche: [
    'La barre supérieure donne accès aux principales parties du site. Elle reste visible d’une page à l’autre.',
  ],
  // ⛔ La seule visite qui le demande : le voile passe au-dessus de la barre, sans
  // quoi aucune case ne pourrait s'y poser.
  couvreLaBarre: true,
  etapes: [
    {
      cle: 'barre',
      sujet: ['[data-visite="nav-barre"]'],
      titre: 'Navigation',
      texte: [
        'À gauche se trouvent les lectures. À droite, la recherche et les fonctions liées à votre compte.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'bibles',
      sujet: ['[data-visite="nav-bibles"]'],
      sujetBis: ['.ac-bible'],
      titre: 'Bible',
      texte: [
        '**Classique** affiche un chapitre dans la traduction de votre choix, avec les passages des Pères qui s’y rapportent.',
        '**Polyglotte** place jusqu’à cinq traductions côte à côte, verset par verset.',
        'Les cartes de l’accueil mènent aux mêmes lectures.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'patristique',
      sujet: ['[data-visite="nav-patristique"]'],
      sujetBis: ['.ac-patristique'],
      titre: 'Pères de l’Église',
      texte: [
        'La Bibliothèque rassemble les auteurs, leurs œuvres et les éditions disponibles.',
        'Le menu conserve les dernières œuvres que vous avez ouvertes. La carte de l’accueil mène également à la Bibliothèque.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'communaute',
      sujet: ['[data-visite="nav-communaute"]'],
      titre: 'Communauté',
      texte: [
        'La Communauté rassemble les études, notes de lecture et essais publiés par les lecteurs.',
        'Avec un compte, vous pouvez y publier vos propres textes.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'plus-loin',
      sujet: ['[data-visite="nav-plus-loin"]'],
      titre: 'Ressources',
      texte: [
        'Cet onglet réunit les traductions, les péricopes, l’histoire de l’Église, les statistiques et une page consacrée aux librairies.',
        'Le menu s’ouvre au survol et présente brièvement chacune de ces pages.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'recherche',
      sujet: ['[data-visite="nav-recherche"]'],
      titre: 'Recherche',
      texte: [
        'La recherche propose des œuvres, des livres bibliques, des auteurs et des péricopes à mesure que vous écrivez.',
        'La touche Entrée ouvre la recherche complète dans les textes.',
      ],
      cote: 'dessous',
    },
    {
      cle: 'compte',
      sujet: ['[data-visite="nav-compte"]'],
      titre: 'Compte',
      texte: [
        'Vous trouvez ici le soutien au projet, vos messages, vos notifications et votre compte.',
        'Celui-ci conserve vos favoris, vos prélèvements et vos lectures en cours.',
      ],
      cote: 'gauche',
    },
  ],
}
