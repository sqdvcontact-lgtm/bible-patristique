'use client'

import { usePathname } from 'next/navigation'
import { HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'

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
 * ⛔ Pas de rembourrage sous la barre : `#cs-corps` le pose déjà (AGENTS.md).
 * Les mots ne viennent qu'au bout d'un instant : une arrivée rapide ne montre que
 * le châssis, et rien ne clignote.
 */
const MOT = { fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', animation: 'cs-attente-paraitre 0.3s ease-out 0.45s both' } as const

function AttenteBible() {
  const barre = (largeur: string) => (
    <div style={{ height: '9px', width: largeur, borderRadius: '4px', background: 'var(--cs-fond-doux)' }} />
  )
  return (
    <main className="cs-attente-bible" aria-busy="true" style={{ display: 'flex', height: HAUTEUR_SOUS_NAVBAR, overflow: 'hidden', background: 'var(--cs-fond)' }}>
      <style>{`
        .cs-attente-bible__volet { display: flex; }
        @media (max-width: 900px) { .cs-attente-bible__volet { display: none; } }
      `}</style>
      <div className="cs-attente-bible__volet" style={{ width: 'clamp(200px, 14vw, 320px)', flexShrink: 0, flexDirection: 'column', gap: '12px', padding: '18px 16px', background: 'var(--cs-fond-clair)', borderRight: '1px solid var(--cs-bord)' }}>
        {barre('58%')}{barre('84%')}{barre('72%')}
        <div style={{ height: '18px' }} />
        {barre('40%')}{barre('46%')}{barre('36%')}{barre('50%')}{barre('42%')}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderBottom: '1px solid var(--cs-bord)', padding: '18px 32px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          {barre('11rem')}
          {barre('7rem')}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={MOT}>Chargement…</p>
        </div>
      </div>
      <div className="cs-attente-bible__volet" style={{ width: 'clamp(260px, 20vw, 460px)', flexShrink: 0, flexDirection: 'column', gap: '12px', padding: '18px 16px', background: 'var(--cs-surface)', borderLeft: '1px solid var(--cs-bord)' }}>
        {barre('48%')}
        <div style={{ height: '10px' }} />
        {barre('90%')}{barre('76%')}{barre('84%')}
      </div>
    </main>
  )
}

export default function AttentePage() {
  const chemin = usePathname()
  if (chemin === '/') return <AttenteBible />
  return (
    <main aria-busy="true" style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={MOT}>Chargement…</p>
    </main>
  )
}
