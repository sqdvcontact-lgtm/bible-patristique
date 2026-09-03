import type { CSSProperties, ReactNode } from 'react'

/**
 * Les pièces d'un écran d'attente dessiné EN CREUX : la page vide, aux largeurs
 * réelles de ses volets, le temps que le texte arrive. Deux écrans les partagent,
 * la Bible (`app/loading.tsx`) et l'œuvre (`app/oeuvre/[id]/loading.tsx`) ; une
 * forme recopiée à deux endroits ne reste identique que par accident.
 *
 * ⚠️ Aucun crochet ici : le module sert un composant client (la Bible lit son
 * chemin) et un composant serveur (l'œuvre), et doit rester importable des deux.
 *
 * Le mot ne vient qu'au bout d'un instant (`cs-attente-paraitre`, `globals.css`) :
 * une arrivée rapide ne montre que le châssis, et rien ne clignote. Il se centre
 * dans le BLOC DE TEXTE, entre les volets, là où le texte va paraître — jamais
 * sur l'écran entier (demande de l'auteur, 2026-09-03).
 */
export const MOT_ATTENTE: CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--cs-texte-faible)',
  fontStyle: 'italic',
  animation: 'cs-attente-paraitre 0.3s ease-out 0.45s both',
}

/** Une ligne de texte figurée, aux largeurs qu'on lui donne. */
export function Barre({ largeur }: { largeur: string }) {
  return <div style={{ height: '9px', width: largeur, borderRadius: '4px', background: 'var(--cs-fond-doux)', flexShrink: 0 }} />
}

/** Un blanc entre deux groupes de lignes. */
export function Blanc({ hauteur = '18px' }: { hauteur?: string }) {
  return <div style={{ height: hauteur, flexShrink: 0 }} />
}

/** Les volets s'effacent sur un téléphone, comme ceux de la page qu'ils figurent
 *  (seuil de la charte, 900 px). La classe est posée par `VoletEnCreux`, la règle
 *  par ce bloc, que chaque écran d'attente émet une fois. */
const CLASSE_VOLET = 'cs-attente-volet'
export function StyleVoletsEnCreux() {
  return (
    <style>{`
      .${CLASSE_VOLET} { display: flex; }
      @media (max-width: 900px) { .${CLASSE_VOLET} { display: none; } }
    `}</style>
  )
}

/** Un volet vide, à la largeur du vrai, portant quelques lignes figurées. */
export function VoletEnCreux({ largeur, fond, cote, children }: {
  largeur: string
  fond: string
  /** Le côté du filet : un volet de gauche le porte à droite, et inversement. */
  cote: 'gauche' | 'droite'
  children: ReactNode
}) {
  return (
    <div className={CLASSE_VOLET} style={{
      width: largeur,
      flexShrink: 0,
      flexDirection: 'column',
      gap: '12px',
      padding: '18px 16px',
      background: fond,
      ...(cote === 'gauche' ? { borderRight: '1px solid var(--cs-bord)' } : { borderLeft: '1px solid var(--cs-bord)' }),
    }}>
      {children}
    </div>
  )
}
