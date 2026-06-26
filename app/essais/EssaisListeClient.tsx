'use client'

import { useState } from 'react'
import Link from 'next/link'

const CATEGORIES = ['Philosophie', 'Théologie', 'Exégèse', 'Spiritualité', 'Littérature', 'Poésie', 'Histoire', 'Patristique']

type EssaiResume = {
  id: number; titre: string; sous_titre: string | null; resume: string | null
  categories: string[]; nb_vues: number; publie_at: string | null; auteur: string
}

function sansAccents(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000

export default function EssaisListeClient({ essais }: { essais: EssaiResume[] }) {
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string | null>(null)

  const q = sansAccents(recherche.trim())
  const essaisFiltres = essais.filter(e => {
    if (filtreCategorie && !e.categories.includes(filtreCategorie)) return false
    if (!q) return true
    return sansAccents(e.auteur).includes(q) || sansAccents(e.titre).includes(q) || (e.resume && sansAccents(e.resume).includes(q))
  })

  const parAuteur = new Map<string, EssaiResume[]>()
  essaisFiltres.forEach(e => {
    const liste = parAuteur.get(e.auteur) ?? []
    liste.push(e)
    parAuteur.set(e.auteur, liste)
  })
  const auteurs = [...parAuteur.keys()].sort((a, b) => a.localeCompare(b, 'fr'))

  return (
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px 80px' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 'normal', color: '#1e2e24', marginBottom: '16px' }}>
            Essais et méditations
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            <Link href="/essais/mes-ecrits" style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '5px', border: '1px solid #3d6b4f', color: '#3d6b4f', textDecoration: 'none', fontWeight: 500 }}>
              Mes écrits
            </Link>
            <Link href="/essais/nouveau" style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '5px', background: '#3d6b4f', color: '#fff', textDecoration: 'none', fontWeight: 500 }}>
              + Écrire
            </Link>
          </div>

          <div style={{ position: 'relative', maxWidth: '320px', margin: '0 auto 16px' }}>
            <input
              type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher un auteur, un titre, un résumé"
              style={{ width: '100%', fontSize: '13px', padding: '8px 14px 8px 36px', border: '1px solid #d6d0c4', borderRadius: '20px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }} />
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
              <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
              <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setFiltreCategorie(null)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '12px', border: `1px solid ${!filtreCategorie ? '#3d6b4f' : '#d6d0c4'}`, background: !filtreCategorie ? 'rgba(61,107,79,0.10)' : '#fff', color: !filtreCategorie ? '#3d6b4f' : '#8a8278', cursor: 'pointer', fontWeight: !filtreCategorie ? 600 : 400 }}>Tout</button>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFiltreCategorie(c)}
                style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '12px', border: `1px solid ${filtreCategorie === c ? '#3d6b4f' : '#d6d0c4'}`, background: filtreCategorie === c ? 'rgba(61,107,79,0.10)' : '#fff', color: filtreCategorie === c ? '#3d6b4f' : '#8a8278', cursor: 'pointer', fontWeight: filtreCategorie === c ? 600 : 400 }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {auteurs.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun essai trouvé.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {auteurs.map(auteur => (
              <div key={auteur} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e4dfd8', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px 10px' }}>
                  <h2 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '14px', fontWeight: 700, color: '#3d6b4f', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                    {auteur}
                  </h2>
                </div>
                <div>
                  {parAuteur.get(auteur)!.map(e => {
                    const estNouveau = e.publie_at && (Date.now() - new Date(e.publie_at).getTime()) < SEMAINE_MS
                    return (
                      <Link key={e.id} href={`/essais/${e.id}`} style={{
                        display: 'block', padding: '12px 18px', borderTop: '1px solid #ede9e2', textDecoration: 'none',
                      }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(61,107,79,0.04)')}
                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{ fontFamily: "Georgia, serif", fontSize: '15px', color: '#1e2e24' }}>{e.titre}</span>
                          {estNouveau && (
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', background: '#c0562a', padding: '1px 7px', borderRadius: '8px', letterSpacing: '0.03em' }}>NOUVEAU</span>
                          )}
                          <span style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                            {e.categories.slice(0, 2).map(c => (
                              <span key={c} style={{ fontSize: '9px', color: '#3d6b4f', background: 'rgba(61,107,79,0.08)', padding: '1px 7px', borderRadius: '8px', fontWeight: 600 }}>{c}</span>
                            ))}
                          </span>
                        </div>
                        {e.sous_titre && <p style={{ fontSize: '11.5px', color: '#8a8278', fontStyle: 'italic', margin: '0 0 4px' }}>{e.sous_titre}</p>}
                        {e.resume && <p style={{ fontSize: '12px', color: '#5a5450', lineHeight: 1.5, margin: '0 0 4px' }}>{e.resume}</p>}
                        <p style={{ fontSize: '10px', color: '#b0a89e', margin: 0 }}>
                          {e.publie_at ? new Date(e.publie_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} · {e.nb_vues} vue{e.nb_vues > 1 ? 's' : ''}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
