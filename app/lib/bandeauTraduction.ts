// Le sol du bandeau d'une notice de traduction. Ces valeurs vivent ici, et non
// dans la page, parce que l'aperçu de cadrage de l'administration se veut une
// COPIE EXACTE du bandeau public : deux jeux de constantes auraient dérivé au
// premier réglage, et l'administrateur aurait cadré sur un rendu qui n'existe pas.

/** Le VOILE : un dégradé brun très sombre, ancré à gauche, qui s'éteint avant le
 *  milieu de l'image.
 *
 *  ⛔ Il ne sert pas d'ornement : il FABRIQUE le contraste que l'image ne promet
 *  pas. Le bandeau lisait auparavant la luminance de la photo pour choisir entre
 *  une encre crème et une encre noire, et le noir revenait sur les images pâles —
 *  la Segond, son lac, son ciel. Une encre noire cernée d'un halo blanc sur une
 *  peinture n'est pas une composition, c'est un pis-aller ; l'auteur l'a écarté le
 *  27 août 2026. Le voile donne à toutes les notices le MÊME sol : l'encre y est
 *  toujours le crème, et la mesure de luminance a disparu — avec elle, un décodage
 *  en canevas par notice et une dépendance au CORS.
 *
 *  ⚠️ Le brun (26 19 12) n'est pas un noir : un noir neutre posé sur une peinture
 *  ancienne la refroidit et la fait paraître grise. */
export const VOILE_BANDEAU =
  'linear-gradient(97deg, rgba(26,19,12,0.68) 0%, rgba(26,19,12,0.50) 26%,' +
  ' rgba(26,19,12,0.24) 50%, rgba(26,19,12,0.06) 68%, rgba(26,19,12,0) 82%)'

/** ⛔ Sur une PHOTO, l'encre s'écrit en valeur LITTÉRALE, jamais en jeton de thème.
 *  Le sol de ces trois lignes est une image, et une image ne se transpose pas : le
 *  jeton, lui, se retourne. `var(--cs-fond)` valait le crème du site au Clair et
 *  devenait `#1c1813` en Cuir, c'est-à-dire du brun très sombre écrit sur une photo
 *  sombre — le titre de la traduction disparaissait (relevé le 2026-08-23).
 *  `#f7f4ef` EST la valeur claire de `--cs-fond`. */
export const ENCRE_SUR_PHOTO = '#f7f4ef'
export const META_SUR_PHOTO = 'rgba(247,244,239,0.82)'
export const MENTION_SUR_PHOTO = 'rgba(247,244,239,0.58)'
export const CHEVRON_SUR_PHOTO = 'rgba(247,244,239,0.7)'

/** ⚠️ UNE seule ombre, courte et portée. Les trois couches de halo noir qui la
 *  précédaient — jusqu'à vingt pixels de flou — bavaient autour des lettres et se
 *  lisaient comme une salissure. Le voile porte le contraste ; l'ombre ne fait plus
 *  que détacher le trait. */
export const OMBRE_SUR_PHOTO = '0 1px 3px rgba(0,0,0,0.55)'

/** ⚠️ L'assombrissement général est LÉGER, maintenant que le voile porte le
 *  contraste là où il sert. Écrasé à 0,78, il éteignait la moitié droite de la
 *  peinture, qu'aucune ligne ne recouvre. */
export const BRILLANCE_BANDEAU = { ferme: 0.95, ouvert: 0.88 }

/** ⚠️ Aucune ligne ne doit courir au-delà du voile. La notice de la Bible française
 *  du XIIIe siècle porte une langue, deux dates et une cote de manuscrit : sa ligne
 *  de méta sortait du dégradé et finissait sur les quadrilobes de l'enluminure,
 *  illisible. Bornée, elle se plie dans le sombre. Le bandeau grandit alors de
 *  quelques pixels pour cette notice-là : c'est le prix d'une ligne qui se lit. */
export const MESURE_TEXTE_BANDEAU = '64%'
