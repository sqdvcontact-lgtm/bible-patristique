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
 * La RUBRIQUE d'un axe, dans le volet de la Bible : « Lecture », « Commentaires ».
 *
 * ⛔ En casse ORDINAIRE. L'auteur a refusé les capitales du volet le 28 août 2026,
 * d'abord sur la barre d'onglets, puis ici : un volet de lecture n'a rien à crier,
 * et une rubrique de trois mots se distingue assez par sa petitesse et sa pâleur.
 *
 * ⚠️ `LABEL_VOLET` ci-dessus, qui les porte encore, ne sert plus que la page Œuvre.
 * Les unifier est une décision qui n'a pas été prise : elle changerait les intitulés
 * d'une page que l'auteur n'a pas nommée.
 */
export const RUBRIQUE_AXE: CSSProperties = {
  display: 'block',
  fontSize: '0.59375rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  color: 'var(--cs-texte-faible)',
  // ⚠️ 1 pixel, non 3 : une rubrique doit toucher la liste qu'elle coiffe. Le blanc
  // qui compte est celui qui SÉPARE les deux axes (6 pixels dans `NavLivres`) ; à
  // trois pixels de part et d'autre, les deux blancs se ressemblaient assez pour
  // que « Commentaires » paraisse appartenir à la liste du dessus.
  marginBottom: '1px',
}

/**
 * Une OPTION d'axe : une ligne pleine largeur, l'option retenue sur pastille verte.
 *
 * ⛔ Une option par LIGNE, et toutes les options montrées (décision de l'auteur,
 * 28 août 2026) : « je veux qu'on distingue en un coup d'œil toutes les options ».
 * Deux formes ont été essayées avant, et toutes deux cachaient quelque chose. Le
 * FIL en ligne — les états d'un axe posés côte à côte, l'actif souligné de vert —
 * imitait la barre d'onglets qu'il surmontait, si bien que le volet portait deux
 * rangs de mots soulignés l'un sur l'autre. Et la LIGNE D'ACTION d'un axe binaire
 * (« Masquer les commentaires ») ne disait que le geste : l'état ne s'y lisait qu'à
 * l'envers, et l'axe n'avait pas l'air d'un choix.
 *
 * ⚠️ La pastille est celle de la LISTE DES LIVRES, dans le même volet, à quelques
 * pixels de là : c'est le signal dont le volet se sert déjà pour dire « voici ce
 * que vous lisez ». Trois autres marqueurs ont été mis en regard le même jour —
 * filet vert à gauche, puce pleine, cases encadrées — et celui-ci l'a emporté
 * parce qu'il n'en introduit aucun de plus.
 *
 * ⚠️ La pastille DÉBORDE le bloc de sept pixels de chaque côté, comme une rangée
 * de livre déborde le sien : sans cela elle paraîtrait rentrée par rapport à la
 * liste qui la suit.
 *
 * ⚠️ La RANGÉE est resserrée depuis le 2026-08-30 (condensation demandée par
 * l'auteur) : deux pixels de rembourrage au lieu de trois, interligne 1,3 au lieu
 * de 1,35. Elle mesure alors 17 pixels pour un texte de 11,5 — la même proportion
 * qu'une rangée de la liste des livres, à quelques pixels de là, qui en vaut 22
 * pour un texte de 13,5. ⛔ Ne pas descendre plus bas : la pastille cesserait de se
 * lire comme une cible, et cinq rangées d'affilée n'ont pas d'autre respiration.
 *
 * ⚠️ Ces deux pixels sont donc un PLANCHER, et non une mesure : depuis le
 * 2026-08-31 la rangée les tient d'`--volet-air-fin`, l'échelle du volet, qui
 * part exactement de là et s'ouvre avec l'écran et la poignée (globals.css,
 * « L'échelle du volet »). Le repli `2px` sert la page Œuvre, hors du volet,
 * où la variable n'existe pas.
 */
export const OPTION_VOLET = (actif: boolean): CSSProperties => ({
  display: 'block',
  width: 'calc(100% + 14px)',
  margin: '0 -7px',
  boxSizing: 'border-box',
  textAlign: 'left',
  padding: 'var(--volet-air-fin, 2px) 7px',
  borderRadius: '4px',
  border: 'none',
  background: actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'transparent',
  color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-second)',
  fontWeight: actif ? 600 : 400,
  fontSize: '0.71875rem',
  lineHeight: 1.3,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  cursor: actif ? 'default' : 'pointer',
  transition: 'background 0.12s, color 0.12s',
})
