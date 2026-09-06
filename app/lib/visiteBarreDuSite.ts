/**
 * LA BARRE DU SITE — l'arrêt que TOUTES les visites partagent.
 *
 * La barre de navigation est la seule chose qui ne change pas d'une page à
 * l'autre. Son étape s'écrit donc une fois, ici, et chaque scénario l'ouvre en
 * tête : la barre couronne le reste, et l'ordre des étapes est celui de la page,
 * de haut en bas et de gauche à droite (charte § 46).
 *
 * ⛔ NE PAS LA RECOPIER DANS UN SCÉNARIO. Deux exemplaires d'une même explication
 * divergent au premier ajustement, et le lecteur qui ferait deux visites lirait
 * deux fois la même chose de deux façons.
 *
 * ⚠️ ELLE NE SE MONTRE QU'EN ÉCRAN LARGE, et son étape s'efface ailleurs : sur un
 * téléphone la barre range sa recherche dans le menu déplié, et déplier ce menu
 * couvrirait la page qu'on explique. L'étape coûte alors la seconde d'attente de
 * « DELAI_SUJET_MS », comme toute étape dont le sujet manque.
 *
 * ⛔ LE REPÈRE VISE LE BLOC QUI PORTE LE CHAMP OU LA LOUPE, jamais le champ : à
 * l'étroit celui-ci se replie en loupe, et un repère posé dessus s'évanouirait au
 * moment même où la recherche devient la plus difficile à trouver.
 */

import type { EtapeVisite } from './visiteGuidee'

export const ETAPE_RECHERCHE_SITE: EtapeVisite = {
  cle: 'recherche-site',
  sujet: ['[data-visite="recherche-site"]'],
  titre: 'Chercher dans tout le site',
  texte: [
    'Ici, la recherche porte sur tout le site : œuvres des Pères, livres bibliques, auteurs, péricopes.',
    'Elle répond à mesure que vous tapez, et la touche Entrée ouvre la page des résultats.',
    'Celle-ci cherche dans le texte même, celui des bibles comme celui des Pères.',
  ],
  cote: 'dessous',
}
