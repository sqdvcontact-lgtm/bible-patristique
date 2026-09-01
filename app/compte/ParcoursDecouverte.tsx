'use client'

// L'affichage du parcours d'entrée. Le raisonnement, lui, vit dans
// app/lib/parcoursLecteur.ts, où une garde le tient (parcoursLecteur.test.ts).

import { Carte } from '@/app/compte/champsCompte'
import { etapesParcours, libelleAvancement, parcoursAcheve, type EtatLecteur } from '@/app/lib/parcoursLecteur'

export default function ParcoursDecouverte(etat: EtatLecteur) {
  const etapes = etapesParcours(etat)
  if (parcoursAcheve(etapes)) return null

  return (
    <Carte titre="Vos premiers pas">
      <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: '-8px 0 4px', lineHeight: 1.6 }}>
        Dix gestes qui font le tour du site. {libelleAvancement(etapes)}
      </p>
      {/* ⚠️ Le motif de l'avance se DIT. Nunes et Drèze : l'effet des cases déjà
          cochées disparaît quand on ne justifie pas pourquoi elles le sont. */}
      <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', margin: '0 0 18px', lineHeight: 1.6, fontStyle: 'italic' }}>
        Les trois premiers sont acquis : vous les avez faits en vous inscrivant.
      </p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {etapes.map(({ cle, fait, libelle, glose, href, acquise }) => (
          <li key={cle} style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
            <span aria-hidden="true"
              style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem',
                background: 'var(--cs-fond)',
                border: `1.5px solid ${fait ? 'var(--cs-vert-clair)' : 'var(--cs-bord)'}`,
                color: fait ? 'var(--cs-vert)' : 'transparent',
              }}>
              {fait ? '✓' : ''}
            </span>
            <div style={{ minWidth: 0 }}>
              {href && !fait ? (
                <a href={href} style={{ fontSize: '0.8125rem', color: 'var(--cs-vert)', textDecoration: 'none', fontWeight: 500 }}>{libelle}</a>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: fait ? 'var(--cs-texte-faible)' : 'var(--cs-texte)' }}>{libelle}</span>
              )}
              {/* La glose s'efface une fois le geste appris : elle enseigne, elle ne
                  décore pas. Gardée sur les dix lignes, elle ferait un mur. Les trois
                  acquises la portent en petit, sans quoi elles seraient des cases
                  cochées sans raison dite. */}
              {!fait && (
                <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', margin: '2px 0 0', lineHeight: 1.5 }}>{glose}</p>
              )}
              {acquise && (
                <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', margin: '1px 0 0', lineHeight: 1.45, fontStyle: 'italic' }}>{glose}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Carte>
  )
}
