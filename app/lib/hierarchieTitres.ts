/**
 * Hiérarchie des titres — les quatre rangs du site
 *
 * Chaque page composait jusqu'ici son `<h1>` pour elle-même. Il n'en résultait pas
 * une variété voulue mais une absence de rang : le même titre principal allait de
 * 16,8 px en gras (volet de l'Histoire, catalogue des péricopes) à 50 px en maigre
 * (frontispice d'œuvre), en six encres différentes et trois graisses. Sur deux pages,
 * le titre était plus petit que le texte courant de la page voisine, et mis en gras,
 * c'est-à-dire composé comme une étiquette et non comme un titre.
 *
 * Les valeurs ci-dessous ne sont pas inventées : chacune est ANCRÉE sur celle qui
 * dominait déjà son rang, exactement comme les tokens de couleur. Le rang « page »
 * reprend `.cc-titre` du centre de contrôle, le rang « volet » reprend `NavLivres`,
 * le rang « carte » reprend les écrans d'exception centrés.
 *
 * ⚠️ Pas de `clamp(…vw…)` sur ces rangs, et c'est délibéré. La police racine est déjà
 * fluide (`html { font-size: clamp(16px, calc(7px + 0.625vw), 22px) }`), si bien qu'un
 * `rem` grandit tout seul sur un grand écran. Un `clamp` en pixels par-dessus ne
 * faisait que POSER UN PLAFOND à la place : mesuré sur `/contact`, le titre restait
 * à 34 px de 1280 px à 2400 px de large pendant que le corps de texte passait de
 * 13,5 à 18,6 px. Le rapport titre/texte tombait de 2,52 à 1,83 : la hiérarchie
 * s'aplatissait à mesure que l'écran s'agrandissait, sur les plus gros caractères
 * du site. Ne pas réintroduire de borne en px ici.
 *
 * Les FRONTISPICES gardent leur `clamp`, en rem : ce sont des compositions à part
 * (page de titre d'œuvre, ouverture d'un essai, accroche de l'accueil), où la taille
 * fait partie du dessin. Ils ne sont donc pas tokenisés, seulement recensés ici.
 */

/** Titre d'une page de contenu. Ancré sur `.cc-titre` (centre de contrôle). */
export const TITRE_PAGE = '1.75rem'

/** Titre du volet latéral d'une page à colonnes. Ancré sur `NavLivres`. */
export const TITRE_VOLET = '1.15rem'

/** Titre d'une carte centrée : écran réservé, « écran large requis », formulaire court. */
export const TITRE_CARTE = '1.375rem'

/** Graisse d'un titre. Le volet seul est demi-gras : il tient dans peu de place. */
export const GRAISSE_TITRE = 'normal'
export const GRAISSE_TITRE_VOLET = 500

/**
 * Encre des titres. Une seule par rang.
 * Page, volet et frontispice prennent l'encre profonde ; la carte prend l'encre
 * ordinaire, plus légère, accordée à un bloc qui n'est pas la page entière.
 */
export const ENCRE_TITRE = 'var(--cs-encre-fonce)'
export const ENCRE_TITRE_CARTE = 'var(--cs-encre)'
