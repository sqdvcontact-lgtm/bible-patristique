/**
 * L'invite qui paraît au survol d'un commentaire en attente de contrôle.
 *
 * ⛔ Elle est posée EN ABSOLU sur la carte repliée et ne change rien à sa boîte : la
 * carte ne bouge pas d'un pixel au survol (demande de l'auteur, 2026-09-21 — le
 * décalage d'avant ouvrait une barre de défilement). Sa forme vit dans la feuille
 * de chaque surface (`FEUILLE_COMMENTAIRE_RETRACTE`), la flèche est un tracé en
 * `currentColor`, jamais un glyphe de police.
 */
export default function LireQuandMeme() {
  return (
    <span className="commentaire-retracte-lire" aria-hidden="true">
      Lire tout de même
      <svg viewBox="0 0 16 10" fill="none">
        <path d="M1 5h13M10 1.5 14 5l-4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** La feuille de la carte repliée, commune aux trois surfaces de commentaires. */
export const FEUILLE_COMMENTAIRE_RETRACTE = `
.commentaire-retracte {
  transition: background var(--cs-duree-courte) ease, border-color var(--cs-duree-courte) ease;
}
.commentaire-retracte:hover,
.commentaire-retracte:focus-visible {
  background: color-mix(in srgb, var(--cs-danger-aplat) 10%, var(--cs-danger-fond)) !important;
  border-color: var(--cs-danger) !important;
}
.commentaire-retracte-contenu {
  transition: opacity var(--cs-duree-courte) ease;
}
.commentaire-retracte:hover .commentaire-retracte-contenu,
.commentaire-retracte:focus-visible .commentaire-retracte-contenu {
  opacity: 0;
}
.commentaire-retracte-lire {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45em;
  color: var(--cs-danger-fonce);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--cs-duree-courte) ease;
}
.commentaire-retracte-lire svg {
  width: 1.3em;
  height: auto;
  transition: transform var(--cs-duree-moyenne) ease;
}
.commentaire-retracte:hover .commentaire-retracte-lire,
.commentaire-retracte:focus-visible .commentaire-retracte-lire {
  opacity: 1;
}
.commentaire-retracte:hover .commentaire-retracte-lire svg,
.commentaire-retracte:focus-visible .commentaire-retracte-lire svg {
  transform: translateX(3px);
}
@media (prefers-reduced-motion: reduce) {
  .commentaire-retracte-lire svg { transition: none; transform: none !important; }
}
`
