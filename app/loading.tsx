'use client'

import { usePathname } from 'next/navigation'
import { HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'
import { Barre, Blanc, MOT_ATTENTE, StyleVoletsEnCreux, VoletEnCreux } from '@/app/lib/attenteEnCreux'

/**
 * L'écran d'attente des pages qui n'en ont pas de propre (l'œuvre et la publication
 * ont le leur). Il ne paraît qu'en CHANGEANT DE ROUTE : d'une adresse à l'autre de
 * la même page (un autre chapitre, une autre bible), le routeur garde la page
 * courante, et c'est elle qui s'efface et paraît (voir `BibleLayout`, « passage »).
 *
 * Demande de l'auteur (2026-09-02) : « quand je clique sur Bible classique ou
 * Polyglotte, j'aimerais que la page se charge, même avant le texte, pour ne pas
 * laisser l'utilisateur sans savoir si son clic a marché ». D'où la Bible dessinée
 * en creux : ses trois volets aux largeurs réelles, vides, le temps que le chapitre
 * arrive. ⚠️ Un tel écran fait aussi que le routeur PRÉCHARGE la page jusqu'à lui
 * au survol du lien : le châssis paraît alors sans attendre le serveur.
 *
 * Les pièces (barres, volets, le mot et son délai) vivent dans
 * `app/lib/attenteEnCreux.tsx`, partagées avec l'écran de l'œuvre.
 *
 * ⛔ Pas de rembourrage sous la barre : `#cs-corps` le pose déjà (AGENTS.md).
 */
function AttenteBible() {
  return (
    <main aria-busy="true" style={{ display: 'flex', height: HAUTEUR_SOUS_NAVBAR, overflow: 'hidden', background: 'var(--cs-fond)' }}>
      <StyleVoletsEnCreux />
      <VoletEnCreux largeur="clamp(200px, 14vw, 320px)" fond="var(--cs-fond-clair)" cote="gauche">
        <Barre largeur="58%" />
        <Barre largeur="84%" />
        <Barre largeur="72%" />
        <Blanc />
        <Barre largeur="40%" />
        <Barre largeur="46%" />
        <Barre largeur="36%" />
        <Barre largeur="50%" />
        <Barre largeur="42%" />
      </VoletEnCreux>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderBottom: '1px solid var(--cs-bord)', padding: '18px 32px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Barre largeur="11rem" />
          <Barre largeur="7rem" />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={MOT_ATTENTE}>Chargement…</p>
        </div>
      </div>
      <VoletEnCreux largeur="clamp(260px, 20vw, 460px)" fond="var(--cs-surface)" cote="droite">
        <Barre largeur="48%" />
        <Blanc hauteur="10px" />
        <Barre largeur="90%" />
        <Barre largeur="76%" />
        <Barre largeur="84%" />
      </VoletEnCreux>
    </main>
  )
}

export default function AttentePage() {
  const chemin = usePathname()
  if (chemin === '/') return <AttenteBible />
  return (
    <main aria-busy="true" style={{ minHeight: HAUTEUR_SOUS_NAVBAR, background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={MOT_ATTENTE}>Chargement…</p>
    </main>
  )
}
