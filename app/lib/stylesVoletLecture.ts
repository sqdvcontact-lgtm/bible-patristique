import type { CSSProperties } from 'react'

/**
 * La forme des menus de choix du VOLET DE LECTURE — la rubrique d’un axe, et ses
 * options en liste verticale, l’option retenue sur pastille verte.
 *
 * ⛔ IL N’Y A QU’UNE SEULE FORME, et pour les DEUX pages. Elle est née dans le volet
 * de la page Bible ; la page Œuvre en portait une autre — étiquette en capitales
 * espacées, boutons encadrés d’un filet — jusqu’au 2026-09-04, où l’auteur a demandé
 * qu’elles se rejoignent : « mettre à jour la mise en forme de Lecture et Éditions de
 * ce texte pour correspondre à la mise en forme qu’on trouve dans Bible classique ».
 * `LABEL_VOLET` et `BTN_VOLET`, qui portaient l’ancienne, sont partis avec elle.
 *
 * ⚠️ Le même geste — choisir comment on lit ce qu’on a sous les yeux — se présente
 * donc de la même façon des deux côtés du site.
 */

/**
 * La RUBRIQUE d'un axe : « Lecture », « Commentaires », « Éditions de ce texte ».
 *
 * ⛔ En casse ORDINAIRE. L'auteur a refusé les capitales du volet le 28 août 2026,
 * d'abord sur la barre d'onglets, puis ici : un volet de lecture n'a rien à crier,
 * et une rubrique de trois mots se distingue assez par sa petitesse et sa pâleur.
 *
 * ⚠️ La page Œuvre les porte elle aussi depuis le 2026-09-04 : ses rubriques sont
 * passées de « LECTURE » en capitales espacées à « Lecture » en casse ordinaire.
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
