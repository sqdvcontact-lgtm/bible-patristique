import type { CSSProperties } from 'react'

/**
 * La forme des menus de choix du volet de gauche — étiquette de rubrique et liste
 * verticale de boutons pleine largeur, de même gabarit, pour un alignement parfait.
 *
 * Elle vient de la page Œuvre, où elle sert les menus « Lecture » / « Édition ».
 * La page Bible l'emploie pour son menu « Lecture » (`NavLivres`), afin que le même
 * geste — choisir comment on lit ce qu'on a sous les yeux — se présente de la même
 * façon des deux côtés du site.
 *
 * ⛔ Il n'y a plus qu'une seule définition, et il ne doit pas y en avoir d'autre.
 * `app/oeuvre/[id]/OeuvreClient.tsx` en a porté une copie du 2026-08-22 au 2026-08-23,
 * le temps d'un chantier ; elle a été réunie ici avant d'avoir dérivé. Une forme
 * recopiée à deux endroits ne reste identique que par accident.
 */
export const LABEL_VOLET: CSSProperties = {
  fontSize: '0.5rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--cs-texte-faible)',
  display: 'block',
}

export const BTN_VOLET = (actif: boolean): CSSProperties => ({
  width: '100%',
  textAlign: 'left',
  fontSize: '0.625rem',
  lineHeight: 1.32,
  padding: '4px 8px',
  borderRadius: '4px',
  border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`,
  background: actif ? 'rgba(var(--cs-vert-rgb),0.07)' : 'transparent',
  color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-second)',
  cursor: 'pointer',
  fontWeight: actif ? 600 : 400,
  transition: 'border-color 0.12s, background 0.12s',
})

/**
 * Le FIL de choix : les états d'un même axe posés en ligne, séparés par des
 * points médians, l'actif seul marqué (décision de l'auteur, 27 août 2026).
 *
 * ⛔ Il remplace la pile de cases pleine largeur pour les axes de la page Bible.
 * Cinq cadres y tenaient deux décisions — trois langues, un oui-ou-non sur les
 * commentaires — et pesaient 181 px en tête du volet, avant même la recherche et
 * la liste des livres. Un axe est une suite d'ÉTATS, non une collection d'objets :
 * il se lit comme une ligne, pas comme un formulaire.
 *
 * ⛔ Le premier jet le composait en SÉRIF, gris, sans autre marque que la teinte
 * de l'actif : trois mots de prose au milieu d'un volet, qui ne s'annonçaient pas
 * comme un réglage (relevé par l'auteur le 27 août 2026). Il porte donc les deux
 * signaux dont le site se sert déjà pour dire ce qu'on a choisi — le SANS des
 * repères d'interface, et le TRAIT vert sous l'état retenu, celui des onglets de
 * la bibliothèque et du catalogue des péricopes.
 *
 * ⛔ Le trait prend `--cs-vert`, JAMAIS `--cs-vert-aplat` dont les onglets du
 * site se servent : le second est un APLAT, et sur le Cuir il vaut un brun de
 * 4a3c2c posé sur un sol de 1c1813 — le trait y disparaîtrait, c'est-à-dire
 * précisément la marque qui dit ce qu'on lit. Les deux valent le même vert au
 * Clair. ⚠️ Le trait est posé sur les
 * DEUX états, transparent quand le mot n'est pas retenu : sinon le fil sauterait
 * d'un pixel à chaque changement.
 */
export const MOT_DU_FIL = (actif: boolean): CSSProperties => ({
  background: 'none',
  border: 'none',
  borderBottom: `2px solid ${actif ? 'var(--cs-vert)' : 'transparent'}`,
  padding: '0 0 3px',
  fontSize: '0.71875rem',
  lineHeight: 1.35,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-second)',
  fontWeight: actif ? 600 : 500,
  cursor: actif ? 'default' : 'pointer',
  transition: 'color 0.12s, border-color 0.12s',
})

/**
 * Le BLANC qui sépare deux états du fil, posé sur le conteneur.
 *
 * ⛔ Ce fut d'abord un point médian, et il ne pouvait pas tenir : le fil se coupe
 * quand les libellés sont longs — les trois graphies de la Bible 899 font 187 px
 * pour 179 de volet — et le point restait alors SEUL en bout de ligne. Le trait
 * vert liant désormais la série à lui seul, le point n'avait plus d'office que
 * d'ajouter du bruit à 11,5 px.
 */
export const BLANC_DU_FIL = '14px'

/**
 * La LIGNE D'ACTION d'un groupe binaire : elle dit ce qu'un clic fera, non l'état
 * où l'on est — « Masquer les commentaires », qui devient « Afficher les
 * commentaires » une fois masqués.
 *
 * ⛔ Un oui-ou-non ne se rend pas en deux cases dont l'une est toujours éteinte :
 * c'est une décision, pas un choix entre deux objets. La ligne se nomme
 * elle-même, et se passe donc de l'étiquette de rubrique.
 *
 * ⚠️ Elle porte le VERT du site, quand les mots du fil portent l'encre et le gris :
 * dans ce volet, la teinte dit ce qu'on peut faire et l'encre ce qu'on lit. En
 * italique grisée, elle passait pour une note de bas de page.
 */
export const LIGNE_ACTION_VOLET: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  padding: '2px 0 0',
  fontSize: '0.71875rem',
  lineHeight: 1.4,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontWeight: 500,
  color: 'var(--cs-vert)',
  cursor: 'pointer',
  textUnderlineOffset: '3px',
}
