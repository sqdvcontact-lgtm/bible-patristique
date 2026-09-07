/**
 * LA VISITE DE LA RECHERCHE — la sixième.
 *
 * Six arrêts, dans l'ordre où la page SE PRÉSENTE : le volet de gauche entier, du
 * haut vers le bas, puis la colonne des résultats. C'est la règle des pages à
 * plusieurs colonnes, posée sur la page d'œuvre (charte § 46).
 *
 * ⛔ CE QUE LA VISITE DOIT DIRE, et qu'aucune page voisine ne dit :
 *  · qu'il y a TROIS façons de chercher, et que « Famille de mots » trouve un mot
 *    sous toutes ses formes — c'est la plus puissante, et rien à l'écran ne le dit ;
 *  · qu'on peut chercher dans TOUTES les bibles et lire le résultat dans UNE ;
 *  · qu'une recherche se garde, avec sa page et sa position ;
 *  · que les quatre onglets ne font que TROIS corpus, la Polyglotte étant une autre
 *    vue sur les mêmes versets ;
 *  · que chaque ligne de la répartition RESTREINT les résultats au lieu de les
 *    compter seulement.
 * Le reste se voit.
 *
 * ⛔ RIEN SUR LA RÉFÉRENCE TAPÉE, et ce n'est pas un oubli. « Jean 3, 16 » ne lance
 * aucune recherche : la page pose une carte « Passage biblique » et s'arrête là. Le
 * fait mérite d'être su, mais cette carte n'existe QUE dans ce cas, donc jamais au
 * moment où la visite passe : une étape sans sujet ne se donne pas, et l'on
 * n'explique pas ce qui n'est pas à l'écran.
 *
 * ⚠️ ELLE NE S'OUVRE QU'UNE FOIS DES RÉSULTATS AFFICHÉS. Quatre de ses six arrêts
 * n'existent pas sur une page vide : ni les onglets, ni la répartition, ni le bouton
 * qui garde la recherche, ni le moindre résultat. ⛔ Et l'on ne tape PAS à la place
 * du lecteur pour s'en donner : une visite montre la page telle qu'il l'a ouverte.
 */

import type { Visite } from './visiteGuidee'

/** ⛔ La clé de mémoire ne change JAMAIS sans raison : elle est le seul lien entre
 *  cette visite et les lecteurs qui l'ont déjà vue. */
export const CLE_VISITE_RECHERCHE = 'recherche'

export const VISITE_RECHERCHE: Visite = {
  cle: CLE_VISITE_RECHERCHE,
  titre: 'Chercher dans tout le fonds.',
  accroche: [
    'Les bibles, les Pères de l’Église et les publications, d’une même recherche.',
    'Quelques arrêts suffisent à savoir ce que le volet de gauche commande.',
  ],
  etapes: [
    {
      cle: 'champ',
      sujet: ['[data-visite="recherche-champ"]'],
      titre: 'Ce que l’on cherche',
      texte: [
        'Un mot suffit, et plusieurs se cherchent ensemble.',
        'Le nombre de résultats se tient à droite du titre, et suit chaque recherche.',
      ],
      cote: 'droite',
    },
    {
      cle: 'mode',
      // ⚠️ L'infobulle du « ? » donne déjà le détail des trois modes : l'étape ne le
      // répète pas, elle dit qu'ils existent et lequel sert à quoi. On n'explique pas
      // ce qui est écrit ; on montre ce qui est caché derrière un survol.
      sujet: ['[data-visite="recherche-mode"]'],
      titre: 'Trois façons de chercher',
      texte: [
        'Début de mot ratisse large, Mot exact ne prend que la forme tapée.',
        'Famille de mots trouve le mot sous toutes ses formes : « aimer » ramène aime, aimait, aimé.',
        'Le point d’interrogation en donne le détail.',
      ],
      cote: 'droite',
    },
    {
      cle: 'perimetre',
      sujet: ['[data-visite="recherche-perimetre"]'],
      titre: 'Où chercher, et en quelle langue',
      texte: [
        'Chercher dans borne la recherche à une bible, ou la laisse courir sur toutes.',
        'Afficher en choisit la traduction dans laquelle les versets trouvés se lisent.',
      ],
      cote: 'droite',
    },
    {
      cle: 'garder',
      sujet: ['[data-visite="recherche-garder"]'],
      titre: 'Garder une recherche',
      texte: [
        'Enregistrer retient les mots, la page et l’endroit où vous en étiez.',
        'Reprendre vous y ramène, même après avoir fermé le site.',
      ],
      cote: 'droite',
    },
    {
      cle: 'onglets',
      sujet: ['[data-visite="recherche-onglets"]'],
      titre: 'Quatre onglets, trois corpus',
      texte: [
        'Bible et Polyglotte donnent les mêmes versets, en liste ou en colonnes comparées.',
        'Les Pères de l’Église cherchent dans les œuvres, la Communauté dans les publications.',
        'Sous l’onglet ouvert, chaque ligne restreint les résultats à ce livre ou à cette œuvre.',
      ],
      cote: 'droite',
    },
    {
      cle: 'resultat',
      // ⚠️ La classe existait déjà : une ligne de résultat, dans son groupe. Aucun
      // repère à poser dans la page pour cet arrêt.
      sujet: ['.grp-corps .grp-ligne', '.grp-ligne'],
      titre: 'Un résultat',
      texte: [
        'Le mot trouvé se lève en gras dans son passage, sans surligneur.',
        'Le titre au-dessus dit le livre ou l’œuvre d’où il vient.',
        'Un clic ouvre le texte à cet endroit précis.',
      ],
      cote: 'gauche',
    },
  ],
}
