import type { CSSProperties, ReactNode } from 'react'
import { HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'

/**
 * UNE SEULE APPARENCE POUR TOUT CE QUI ATTEND, celle de la page Bible (demande de
 * l'auteur, 2026-09-06 : « uniformiser l'apparence des chargements sur le modèle de
 * la page Bible classique »). Le site disait « Chargement… » de vingt-cinq façons :
 * cinq corps, deux encres, trois polices, des points de suspension tantôt composés
 * tantôt tapés, et le mot venait tantôt d'un coup, tantôt jamais. Il n'y a plus que
 * trois pièces, et chacune vient d'ici :
 *  - `MotAttente`, le mot, là où un bloc VIDE attend son premier contenu ;
 *  - `Anneau`, l'anneau qui tourne, là où un contenu DÉJÀ LÀ se remplace
 *    (`MarqueAttente` et `MarqueAttenteVolet`, `attenteNavigation.tsx`) ;
 *  - `EcranAttente`, la page entière réduite au mot, pour les pages qui n'ont
 *    pas de volets à dessiner en creux.
 * ⛔ Écrire un « Chargement… » ailleurs qu'ici, c'est rouvrir la dérive.
 *
 * Les pièces d'un écran d'attente dessiné EN CREUX complètent le tout : la page
 * vide, aux largeurs réelles de ses volets, le temps que le texte arrive. Trois
 * écrans les partagent, la Bible (`app/loading.tsx`), l'œuvre
 * (`app/oeuvre/[id]/loading.tsx`) et la publication (`app/essais/[id]/loading.tsx`) ;
 * une forme recopiée à plusieurs endroits ne reste identique que par accident.
 *
 * ⚠️ Aucun crochet ici : le module sert des composants client (la Bible lit son
 * chemin) et des composants serveur (l'œuvre), et doit rester importable des deux.
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

/** Le mot d'attente. Il hérite la police de son bloc, comme sur la Bible : ce sont
 *  le corps, l'encre, l'italique et le délai qui font son apparence, pas la fonte. */
export function MotAttente({ children = 'Chargement…', centre = false, marge, enLigne = false }: {
  children?: ReactNode
  /** Centré dans la largeur de son bloc. */
  centre?: boolean
  /** La marge autour du mot, quand le bloc qui l'attend en demande une. */
  marge?: CSSProperties['margin']
  /** Un `<span>` au lieu d'un paragraphe, là où un paragraphe n'a pas sa place (un titre). */
  enLigne?: boolean
}) {
  const style: CSSProperties = { ...MOT_ATTENTE, margin: marge, textAlign: centre ? 'center' : undefined }
  if (enLigne) return <span style={style}>{children}</span>
  return <p style={style}>{children}</p>
}

/** L'anneau qui tourne : la marque d'attente de la page et des volets
 *  (`attenteNavigation.tsx`), et de tout ce qui, ailleurs, tourne en attendant. Une
 *  seule forme : deux pixels de filet, le bord du site pour la piste, le vert pour la
 *  part qui tourne, sept dixièmes de seconde par tour. En relief, il se pose sur un
 *  voile et porte un fond et une ombre, pour se détacher du texte qu'on lit dessous. */
export function Anneau({ taille = '2.25rem', enRelief = false }: { taille?: string; enRelief?: boolean }) {
  return (
    <span
      style={{
        display: 'block',
        width: taille,
        height: taille,
        borderRadius: '50%',
        border: '2px solid var(--cs-bord)',
        borderTopColor: 'var(--cs-vert)',
        animation: 'spin 0.7s linear infinite',
        ...(enRelief ? { background: 'var(--cs-surface)', boxShadow: 'var(--cs-ombre-flottante)' } : {}),
      }}
    />
  )
}

/** L'écran d'attente entier, pour une page sans volets à dessiner en creux : le
 *  fond du site sous la barre, et le mot au centre. C'est l'écran de route des pages
 *  qui n'en ont pas de propre (`app/loading.tsx`), et celui que montrent les pages
 *  CLIENT le temps de leur première lecture (compte, profil, prélèvements, péricope),
 *  pour que le passage de l'un à l'autre ne se voie pas.
 *  ⛔ Pas de rembourrage sous la barre : `#cs-corps` le pose déjà (AGENTS.md). */
export function EcranAttente({ children }: { children?: ReactNode }) {
  return (
    <main aria-busy="true" style={{ minHeight: HAUTEUR_SOUS_NAVBAR, background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MotAttente>{children}</MotAttente>
    </main>
  )
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
