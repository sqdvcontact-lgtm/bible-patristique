/** Amener un élément en haut de la fenêtre, en glissant si le navigateur veut bien.
 *
 * ⛔ `scrollIntoView({ behavior: 'smooth' })` peut ne RIEN faire du tout — ni animer,
 * ni même arriver. Constaté le 2026-08-22 sur le site en ligne, dans Chrome 151 sous
 * Windows : la même ancre, au même instant, ne bougeait pas d'un pixel en `'smooth'` et
 * défilait de 2 486 px en `'auto'`. Ni `prefers-reduced-motion` (inactif) ni une règle
 * `scroll-behavior` (les deux à `auto`) n'y étaient pour quelque chose : c'est le
 * défilement doux lui-même qui ne s'exécute pas, selon les réglages d'animation du
 * système.
 *
 * La conséquence n'était pas cosmétique. Le sommaire d'une œuvre lue en TEXTE ENTIER ne
 * fait que cela — amener le lecteur à la section choisie, puisque tout est déjà chargé
 * dans la page. Chaque entrée pointait vers une ancre qui existait bel et bien, et le
 * clic ne produisait rien. Le mode paraissait donc ne pas s'appliquer, alors qu'il
 * s'appliquait : c'était la navigation qui était morte.
 *
 * On demande donc le glissement, puis on VÉRIFIE. Si rien n'a bougé après un court
 * délai, on y va d'un coup. Le lecteur garde l'animation là où elle fonctionne et
 * atteint sa section là où elle ne fonctionne pas.
 *
 * ⚠️ Ne jamais revenir à un `scrollIntoView` doux et nu pour une navigation FONCTIONNELLE
 * (sommaire, ancre de note, retour à un segment). Un défilement doux est une politesse ;
 * il ne peut pas être le seul moyen d'arriver quelque part.
 */

/** Délai après lequel on constate que le glissement n'a pas eu lieu. Assez long pour
 *  qu'une animation réelle ait déjà parcouru quelques pixels, assez court pour que le
 *  rattrapage ne se voie pas comme un second mouvement. */
const DELAI_CONSTAT_MS = 150

/** Seuil en pixels sous lequel on considère que rien n'a bougé. */
const SEUIL_IMMOBILE_PX = 2

function glisserPuisVerifier(element: HTMLElement) {
  const depart = window.scrollY
  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  window.setTimeout(() => {
    // Si le lecteur a fait défiler lui-même entre-temps, `scrollY` a bougé et l'on ne
    // se mêle plus de rien : c'est lui qui commande.
    if (Math.abs(window.scrollY - depart) < SEUIL_IMMOBILE_PX) {
      element.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
  }, DELAI_CONSTAT_MS)
}

/** Amène l'élément portant cet identifiant en haut de la fenêtre.
 *  Renvoie `false` si l'élément n'est pas dans la page. */
export function allerAAncre(id: string): boolean {
  if (typeof document === 'undefined') return false
  const element = document.getElementById(id)
  if (!element) return false
  glisserPuisVerifier(element)
  return true
}

/** Même chose pour un élément qu'on tient déjà. */
export function allerAElement(element: HTMLElement | null | undefined): boolean {
  if (typeof document === 'undefined' || !element) return false
  glisserPuisVerifier(element)
  return true
}
