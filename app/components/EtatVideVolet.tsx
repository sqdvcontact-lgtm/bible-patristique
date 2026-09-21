import type { ReactNode } from 'react'

/**
 * ⛔ UN ÉTAT VIDE DE VOLET SE TIENT AU MÊME ENDROIT PARTOUT (demande de l'auteur,
 * 2026-09-21) : centré en largeur, et posé au TIERS SUPÉRIEUR de la hauteur libre, non
 * au milieu ni collé en haut. « Aucune occurrence. », « Aucun lien biblique pour ce
 * passage. », « Cliquez sur un paragraphe. », « Aucun commentaire… » et les listes de
 * notes vides passent toutes par ici.
 *
 * La place vient de deux espaceurs de la feuille (`.cs-etat-vide`, globals.css), dans
 * le rapport 1 à 2 : le haut du propos tombe au tiers de la hauteur qui reste.
 * ⚠️ Le bloc prend la hauteur libre de deux façons, pour les deux hôtes du site : en
 * `flex: 1 0 auto` dans une colonne flexible, en `min-height: 100%` dans un défileur
 * ordinaire. Sans hauteur à partager (volet empilé sur un téléphone), il se pose en
 * haut, dans son rembourrage.
 */
export default function EtatVideVolet({ children }: { children: ReactNode }) {
  return (
    <div className="cs-etat-vide">
      <div className="cs-etat-vide-corps">{children}</div>
    </div>
  )
}

/** La mention elle-même, dans la voix des absences du site. */
export function MentionVide({ children }: { children: ReactNode }) {
  return <p className="cs-etat-vide-mention">{children}</p>
}
