/**
 * Le dessin d'une carte de commentaire — UNE seule boîte, la même partout
 *
 * Trois endroits affichent un commentaire : le volet d'un verset
 * (`PanneauPatristique`), l'onglet d'une œuvre (`OngletCommentaires`) et le pied
 * d'un essai (`EssaiCommentaires`). Ils portaient trois copies du même dessin, et
 * les trois avaient dérivé sur les mêmes deux défauts (relevés par l'auteur le
 * 2026-09-08) :
 *
 * ⛔ LE BANDEAU DE GAUCHE. Un `borderLeft: 4px` peint dans la couleur… de la
 *    bordure. Sur un commentaire ordinaire — le cas de presque tous — il n'était
 *    donc qu'un côté épaissi, qui ne disait rien. Le CERTIFIÉ et l'EN RÉVISION s'y
 *    signalaient bien, mais ils portent déjà un badge et une teinte de fond : la
 *    barre coûtait du bruit sur chaque carte pour une information rare, déjà dite
 *    deux fois. Les états passent désormais par la bordure ENTIÈRE et le fond.
 *
 * ⛔ LE BLOC DANS LE BLOC. Le texte recevait son propre fond, son propre rayon et
 *    son propre creux, à un pixel de ceux de la carte : deux boîtes concentriques
 *    pour un seul objet. Le fond du texte était de surcroît un blanc translucide
 *    écrit en dur (`rgba(255,255,255,0.54)`), c'est-à-dire un voile laiteux sur le
 *    sol du Cuir. Le texte se pose maintenant à même la carte.
 *
 * ⚠️ Une RÉPONSE ne reprend pas de filet : elle s'indente, et son fond rentre d'un
 * cran (`--cs-fond-doux`). Le décalage et le sol disent la subordination, et tous
 * deux tiennent sous les deux thèmes — ce que ne faisait pas `--cs-fond-clair`,
 * qui vaut EXACTEMENT `--cs-surface` en Cuir : la réponse y aurait été invisible.
 *
 * Les valeurs sont toutes des jetons, tous les rayons sont sur l'échelle des
 * formes et tous les corps sur celle des tailles ; les trois gardes mécaniques
 * (`formes`, `echelleTypographique`, `couleursEnDur`) le vérifient.
 */
import type { CSSProperties } from 'react'

export type EtatCommentaire = {
  /** Commentaire certifié par la modération : la seule carte qui se met en avant. */
  certifie?: boolean
  /** Commentaire encore soumis au contrôle, visible de son auteur et de l'admin. */
  enRevision?: boolean
  /** Réponse à un commentaire : indentée, posée un cran plus bas que son parent. */
  reponse?: boolean
}

/** L'indentation d'une réponse, en pixels. Le volet d'un verset est étroit : au-delà,
 *  la colonne de texte se paie plus cher que la hiérarchie ne rapporte. */
export const RETRAIT_REPONSE = 14

/** La carte elle-même : un fond, un filet, un rayon, un creux. Rien d'autre. */
export function carteCommentaire({ certifie, enRevision, reponse }: EtatCommentaire = {}): CSSProperties {
  const fond = certifie
    ? 'rgba(var(--cs-vert-rgb),0.07)'
    : enRevision
      ? 'var(--cs-danger-fond)'
      : reponse
        ? 'var(--cs-fond-doux)'
        : 'var(--cs-surface)'
  const bord = certifie
    ? 'rgba(var(--cs-vert-rgb),0.30)'
    : enRevision
      ? 'var(--cs-danger-bord)'
      : 'var(--cs-bord-clair)'
  return {
    background: fond,
    border: `1px solid ${bord}`,
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '8px',
    marginLeft: reponse ? `${RETRAIT_REPONSE}px` : 0,
  }
}

/** L'en-tête : le nom à gauche avec ses badges, la date à droite. */
export const ENTETE_COMMENTAIRE: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  gap: '8px', marginBottom: '5px',
}

export const NOM_COMMENTAIRE: CSSProperties = {
  fontSize: '0.71875rem', fontWeight: 600, color: 'var(--cs-encre)', margin: 0,
}

export const DATE_COMMENTAIRE: CSSProperties = {
  fontSize: '0.625rem', color: 'var(--cs-texte-faible)',
  whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto',
}

/** Le rang de lecture (« Disciple »…) : sa teinte vient de `couleurRang`. */
export const BADGE_RANG: CSSProperties = {
  fontSize: '0.5625rem', fontWeight: 600, padding: '1px 6px',
  borderRadius: '4px', letterSpacing: '0.02em', whiteSpace: 'nowrap',
}

/** Un état de modération : capitales, et la couleur porte le sens. */
export const BADGE_ETAT: CSSProperties = {
  fontSize: '0.5625rem', fontWeight: 700, padding: '1px 6px',
  borderRadius: '4px', letterSpacing: '0.04em', whiteSpace: 'nowrap',
}

/** Le corps du commentaire, à même la carte. */
export const TEXTE_COMMENTAIRE: CSSProperties = {
  fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--cs-texte)',
  margin: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere',
}

/** Le passage cité, quand le commentaire en porte un (essais). */
export const CITATION_COMMENTAIRE: CSSProperties = {
  fontSize: '0.6875rem', color: 'var(--cs-texte-second)', fontStyle: 'italic',
  borderLeft: '2px solid var(--cs-bord)', paddingLeft: '8px', margin: '0 0 6px',
}

/** La ligne des actions, sous le texte. */
export const PIED_COMMENTAIRE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', marginTop: '7px',
  flexWrap: 'nowrap', whiteSpace: 'nowrap', minWidth: 0,
}

/** Un bouton d'action : du texte, et rien qui l'entoure. */
export const ACTION_COMMENTAIRE: CSSProperties = {
  fontSize: '0.625rem', color: 'var(--cs-texte-doux)', background: 'none',
  border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
}

/** La ligne d'un commentaire supprimé : elle tient la place, sans faire une carte. */
export const EFFACE_COMMENTAIRE: CSSProperties = {
  fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0,
}
