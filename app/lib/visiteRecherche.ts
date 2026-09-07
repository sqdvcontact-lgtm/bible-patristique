/**
 * LA VISITE DE LA RECHERCHE — la sixième.
 *
 * Six arrêts, dans l'ordre où la page SE PRÉSENTE : le volet de gauche entier, du
 * haut vers le bas, puis la colonne des résultats. C'est la règle des pages à
 * plusieurs colonnes, posée sur la page d'œuvre (charte § 46).
 *
 * ⛔ CE QUE LA VISITE DOIT DIRE, et qu'aucune page voisine ne dit :
 *  · qu'il y a TROIS façons de chercher, et que « Famille de mots » trouve un mot
 *    sous toutes ses formes — c'est la plus puissante, et son nom seul ne le dit pas ;
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
  titre: 'La recherche',
  accroche: [
    'La recherche porte sur les Bibles, les œuvres des Pères et les publications de la Communauté.',
  ],
  etapes: [
    {
      cle: 'champ',
      sujet: ['[data-visite="recherche-champ"]'],
      titre: 'Recherche',
      texte: [
        'Vous pouvez chercher un mot ou plusieurs à la fois.',
        'Le nombre de résultats apparaît à droite du titre et se met à jour avec chaque recherche.',
      ],
      cote: 'droite',
    },
    {
      cle: 'mode',
      // ⚠️ L'infobulle du « ? » donne déjà le détail des trois modes : l'étape ne le
      // répète pas, elle dit qu'ils existent et lequel sert à quoi. On n'explique pas
      // ce qui est écrit ; on montre ce qui est caché derrière un survol.
      sujet: ['[data-visite="recherche-mode"]'],
      titre: 'Modes',
      texte: [
        '**Début de mot** retrouve les mots qui commencent par la forme saisie.',
        '**Mot exact** ne retient que cette forme.',
        '**Famille de mots** retrouve les différentes formes d’un même mot : « aimer » peut ainsi donner « aime », « aimait » ou « aimé ».',
        'Le point d’interrogation explique le fonctionnement de chaque mode.',
      ],
      cote: 'droite',
    },
    {
      cle: 'perimetre',
      sujet: ['[data-visite="recherche-perimetre"]'],
      titre: 'Périmètre',
      texte: [
        '**Chercher dans** limite la recherche à une Bible ou l’étend à toutes.',
        '**Afficher en** choisit la traduction dans laquelle les versets trouvés sont présentés.',
      ],
      cote: 'droite',
    },
    {
      cle: 'garder',
      sujet: ['[data-visite="recherche-garder"]'],
      titre: 'Recherches enregistrées',
      texte: [
        '**Enregistrer** conserve les termes recherchés, la page et l’endroit où vous en étiez.',
        '**Reprendre** vous y ramène lors d’une visite ultérieure.',
      ],
      cote: 'droite',
    },
    {
      cle: 'onglets',
      sujet: ['[data-visite="recherche-onglets"]'],
      titre: 'Corpus',
      texte: [
        '**Bible** et **Polyglotte** présentent les mêmes versets sous deux formes : en liste ou en colonnes.',
        '**Pères de l’Église** recherche dans les œuvres. **Communauté** recherche dans les publications des lecteurs.',
        'Sous l’onglet ouvert, vous pouvez encore limiter les résultats à un livre ou à une œuvre.',
      ],
      cote: 'droite',
    },
    {
      cle: 'resultat',
      // ⚠️ La classe existait déjà : une ligne de résultat, dans son groupe. Aucun
      // repère à poser dans la page pour cet arrêt.
      sujet: ['.grp-corps .grp-ligne', '.grp-ligne'],
      titre: 'Résultat',
      texte: [
        'Le mot recherché apparaît en gras dans son passage.',
        'Le titre indique le livre ou l’œuvre dont il est tiré.',
        'Un clic ouvre directement le texte à cet endroit.',
      ],
      cote: 'gauche',
    },
  ],
}
