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
 * points médians, l'actif seul en encre du site (décision de l'auteur, 27 août
 * 2026).
 *
 * ⛔ Il remplace la pile de cases pleine largeur pour les axes de la page Bible.
 * Cinq cadres y tenaient deux décisions — trois langues, un oui-ou-non sur les
 * commentaires — et pesaient 181 px en tête du volet, avant même la recherche et
 * la liste des livres. Un axe est une suite d'états, non une collection d'objets :
 * il se lit comme une ligne, pas comme un formulaire.
 *
 * ⚠️ Le mot ACTIF n'est pas cliquable et ne s'annonce pas comme tel : c'est là
 * qu'on est. Les autres portent le gris des liens du volet et se soulignent au
 * survol — c'est le seul signal d'action, le cadre ayant disparu.
 */
export const MOT_DU_FIL = (actif: boolean): CSSProperties => ({
  background: 'none',
  border: 'none',
  padding: '1px 0',
  fontSize: '0.6875rem',
  lineHeight: 1.5,
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-second)',
  fontWeight: actif ? 600 : 400,
  cursor: actif ? 'default' : 'pointer',
  textDecoration: 'none',
  textUnderlineOffset: '3px',
})

/** Le point médian qui sépare deux mots du fil. Il ne se clique pas. */
export const SEPARATEUR_FIL: CSSProperties = {
  padding: '0 4px',
  fontSize: '0.6875rem',
  color: 'var(--cs-texte-faible)',
}

/**
 * La LIGNE D'ACTION d'un groupe binaire : elle dit ce qu'un clic fera, non l'état
 * où l'on est — « Masquer les commentaires », qui devient « Afficher les
 * commentaires » une fois masqués.
 *
 * ⛔ Un oui-ou-non ne se rend pas en deux cases dont l'une est toujours éteinte :
 * c'est une décision, pas un choix entre deux objets. La ligne se nomme
 * elle-même, et se passe donc de l'étiquette de rubrique.
 */
export const LIGNE_ACTION_VOLET: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  padding: '2px 0',
  fontSize: '0.71875rem',
  lineHeight: 1.45,
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontStyle: 'italic',
  color: 'var(--cs-texte-second)',
  cursor: 'pointer',
  textUnderlineOffset: '3px',
}
