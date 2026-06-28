'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import SectionBibliotheque from './SectionBibliotheque'
import SectionVerifications from './SectionVerifications'
import SectionAjouterOeuvre from './SectionAjouterOeuvre'
import SectionDepotOeuvre from './SectionDepotOeuvre'
import SectionTraductions from './SectionTraductions'
import SectionModeration from './SectionModeration'
import SectionEssaisAdmin from './SectionEssaisAdmin'
import type { AdminProps as Props, Onglet } from './adminTypes'

export default function AdminClient({
  commentaires, signalements, demandesCertification, essaisEnAttente, essaisModification, essaisPublies, essaisBrouillons, segMap, versetMap, auteurs, traductions,
  nbVerifications,
  actionDeconnexion, actionValider, actionSupprimerCommentaire,
  actionMarquerTraite, actionSupprimerSignalement,
  actionCertifier, actionRetirerDemandeCertification,
  actionPublierEssai, actionRenvoyerBrouillonEssai,
}: Props) {
  const [onglet, setOnglet] = useState<Onglet>('bibliotheque')
  const [nbVerif, setNbVerif] = useState(nbVerifications)
  const [nbMod, setNbMod] = useState(commentaires.length + signalements.length + demandesCertification.length)
  const [nbEssais, setNbEssais] = useState(essaisEnAttente.length + essaisModification.length)

  useEffect(() => {
    const charger = async () => {
      const [mod1, mod2, mod3, ess] = await Promise.all([
        supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('valide', false).or('demande_validation.is.null,demande_validation.eq.false'),
        supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('traite', false),
        supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('demande_validation', true),
        supabase.from('essais').select('id', { count: 'exact', head: true }).in('statut', ['en_attente', 'a_reviser']),
      ])
      setNbMod((mod1.count ?? 0) + (mod2.count ?? 0) + (mod3.count ?? 0))
      setNbEssais(ess.count ?? 0)
    }
    charger()
    const interval = window.setInterval(charger, 30000)
    const onVisible = () => { if (!document.hidden) charger() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const decrMod = async (fn: () => Promise<void>) => { await fn(); setNbMod(n => Math.max(0, n - 1)) }

  const ONGLETS: { key: Onglet; label: string; badge?: number; separateur?: boolean }[] = [
    { key: 'bibliotheque',        label: 'Bibliothèque' },
    { key: 'ajouter-oeuvre',      label: '+ Ajouter une œuvre' },
    { key: 'depot-oeuvre',        label: '▣ Dépôt IA' },
    { key: 'traductions',         label: 'Traductions' },
    { key: 'essais',              label: 'Essais', badge: nbEssais },
    { key: 'verifications',       label: 'Vérifications', badge: nbVerif, separateur: true },
    { key: 'moderation',          label: 'Modération', badge: nbMod },
  ]

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', padding: '32px 24px 64px' }}>
      <style>{`
        .btn-vert { background: #3d6b4f !important; color: #fff !important; border: none !important; }
        .btn-vert:hover { background: #2e5440 !important; }
        .btn-rouge { background: #fff !important; color: #c0562a !important; border: 1px solid #e4c4b8 !important; }
        .btn-rouge:hover { background: #fdf2ee !important; }
        .btn-gris { background: #fff !important; color: #6b6560 !important; border: 1px solid #d6d0c4 !important; }
        .btn-gris:hover { background: #f3f0ea !important; }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: '24px', fontWeight: 'normal', color: '#2a3d30', margin: 0 }}>Administration</h1>
          <form action={actionDeconnexion}>
            <button type="submit" className="btn-gris" style={{ fontSize: '11.5px', padding: '6px 14px', borderRadius: '5px', cursor: 'pointer' }}>Déconnexion</button>
          </form>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #d6d0c4', marginBottom: '24px', alignItems: 'flex-end' }}>
          {ONGLETS.map((o) => (
            <React.Fragment key={o.key}>
              {o.separateur && (
                <span style={{ padding: '0 2px 10px', color: '#c8c2bc', fontSize: '20px', fontWeight: 100, lineHeight: 1, display: 'inline-block', transform: 'rotate(15deg)', userSelect: 'none' }}>
                  /
                </span>
              )}
              <button onClick={() => setOnglet(o.key)}
                style={{ padding: '9px 14px', fontSize: '12px', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                {o.label}
                {o.badge !== undefined && o.badge > 0 && <span style={{ fontSize: '10px', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 600 }}>{o.badge}</span>}
              </button>
            </React.Fragment>
          ))}
        </div>

        {onglet === 'bibliotheque'  && <SectionBibliotheque auteurs={auteurs} />}
        {onglet === 'verifications'  && <SectionVerifications onCountChange={setNbVerif} />}
        {onglet === 'ajouter-oeuvre' && <SectionAjouterOeuvre auteurs={auteurs} />}
        {onglet === 'depot-oeuvre' && <SectionDepotOeuvre />}
        {onglet === 'traductions'   && <SectionTraductions traductions={traductions} />}

        {onglet === 'moderation' && (
          <SectionModeration
            commentaires={commentaires}
            signalements={signalements}
            demandesCertification={demandesCertification}
            segMap={segMap}
            versetMap={versetMap}
            actionValider={id => decrMod(() => actionValider(id))}
            actionSupprimerCommentaire={id => decrMod(() => actionSupprimerCommentaire(id))}
            actionMarquerTraite={id => decrMod(() => actionMarquerTraite(id))}
            actionSupprimerSignalement={id => decrMod(() => actionSupprimerSignalement(id))}
            actionCertifier={id => decrMod(() => actionCertifier(id))}
            actionRetirerDemandeCertification={id => decrMod(() => actionRetirerDemandeCertification(id))}
          />
        )}

        {onglet === 'essais' && (
          <SectionEssaisAdmin
            essaisEnAttente={essaisEnAttente}
            essaisModification={essaisModification}
            essaisPublies={essaisPublies}
            essaisBrouillons={essaisBrouillons}
            actionPublierEssai={actionPublierEssai}
            actionRenvoyerBrouillonEssai={actionRenvoyerBrouillonEssai}
          />
        )}
      </div>
    </main>
  )
}
