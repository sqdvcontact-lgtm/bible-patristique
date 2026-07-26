'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import SectionBibliotheque from './SectionBibliotheque'
import SectionVerifications from './SectionVerifications'
import SectionTraductions from './SectionTraductions'
import SectionModeration from './SectionModeration'
import SectionEssaisAdmin from './SectionEssaisAdmin'
import SectionCharte from './SectionCharte'
import SectionCharteAccentuation from './SectionCharteAccentuation'
import SectionPropositions from './SectionPropositions'
import SectionTaches from './SectionTaches'
import SectionControleOeuvres from './SectionControleOeuvres'
import type { AdminProps as Props, Onglet } from './adminTypes'

export default function AdminClient({
  commentaires, commentairesPublications, signalements, demandesCertification, essaisEnAttente, essaisModification, essaisPublies, essaisBrouillons, segMap, versetMap, versetTexteMap, oeuvreTitreMap, signalementAuteurMap, auteurs, traductions,
  nbVerifications,
  actionDeconnexion, actionValider, actionSupprimerCommentaire, actionValiderCommentaireEssai, actionSupprimerCommentaireEssai,
  actionMarquerTraite, actionMarquerTraiteSilencieux, actionSupprimerSignalement,
  actionCertifier, actionRetirerDemandeCertification,
  actionPublierEssai, actionRenvoyerBrouillonEssai,
}: Props) {
  const [onglet, setOnglet] = useState<Onglet>('bibliotheque')
  const [nbVerif, setNbVerif] = useState(nbVerifications)
  const [nbMod, setNbMod] = useState(commentaires.length + commentairesPublications.length + signalements.length + demandesCertification.length)
  const [nbEssais, setNbEssais] = useState(essaisEnAttente.length + essaisModification.length)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('onglet') === 'controle-oeuvres') setOnglet('controle-oeuvres')
  }, [])

  useEffect(() => {
    const charger = async () => {
      const [mod1, mod2, mod3, mod4, ess] = await Promise.all([
        supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('valide', false).or('demande_validation.is.null,demande_validation.eq.false'),
        supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('traite', false),
        supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('demande_validation', true),
        supabase.from('essais_commentaires').select('id', { count: 'exact', head: true }).eq('valide', false).eq('supprime', false),
        supabase.from('essais').select('id', { count: 'exact', head: true }).in('statut', ['en_attente', 'a_reviser']),
      ])
      setNbMod((mod1.count ?? 0) + (mod2.count ?? 0) + (mod3.count ?? 0) + (mod4.count ?? 0))
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
    { key: 'controle-oeuvres',    label: 'Contrôle œuvres' },
    { key: 'traductions',         label: 'Traductions' },
    { key: 'essais',              label: 'Essais', badge: nbEssais },
    { key: 'verifications',       label: 'Vérifications', badge: nbVerif, separateur: true },
    { key: 'moderation',          label: 'Modération', badge: nbMod },
    { key: 'propositions',         label: 'Propositions', separateur: true },
    { key: 'charte',              label: 'Charte IA' },
    { key: 'charte-accentuation', label: 'Accentuation' },
    { key: 'taches',              label: 'À faire', separateur: true },
  ]

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#e8eceb' }}>
      <style>{`
        .btn-vert { background: #3d6b4f !important; color: #fff !important; border: none !important; }
        .btn-vert:hover { background: #2e5440 !important; }
        .btn-rouge { background: #fff !important; color: #c0562a !important; border: 1px solid #e4c4b8 !important; }
        .btn-rouge:hover { background: #fdf2ee !important; }
        .btn-gris { background: transparent !important; color: #9ab0a4 !important; border: 1px solid #4a6459 !important; }
        .btn-gris:hover { background: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* Bandeau d'en-tête fixe */}
      <div style={{ position: 'sticky', top: '48px', zIndex: 50, background: '#1e2e26', borderBottom: '1px solid #2e4438', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: '42px' }}>
        <span style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7aaa8e' }}>
          Administration
        </span>
        <form action={actionDeconnexion}>
          <button type="submit" className="btn-gris" style={{ fontSize: '10.5px', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>Déconnexion</button>
        </form>
      </div>

      {/* Onglets — aussi sticky, juste en dessous */}
      <div style={{ position: 'sticky', top: '90px', zIndex: 40, background: '#28382e', borderBottom: '1px solid #344d3e', display: 'flex', alignItems: 'flex-end', padding: '0 20px' }}>
        {ONGLETS.map((o) => (
          <React.Fragment key={o.key}>
            {o.separateur && (
              <span style={{ padding: '0 4px 8px', color: '#4a6459', fontSize: '16px', fontWeight: 100, lineHeight: 1, display: 'inline-block', transform: 'rotate(15deg)', userSelect: 'none' }}>/</span>
            )}
            <button onClick={() => setOnglet(o.key)}
              style={{ padding: '9px 13px', fontSize: '11.5px', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? '#a8d4b8' : '#6a9080', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid #7aaa8e' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              {o.label}
              {o.badge !== undefined && o.badge > 0 && <span style={{ fontSize: '9.5px', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 5px', fontWeight: 600 }}>{o.badge}</span>}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Contenu */}
      <div style={onglet === 'controle-oeuvres'
        // Le contrôle des œuvres prend toute la largeur : on y lit du texte suivi en
        // regard d'un volet d'analyse, et l'un comme l'autre étouffaient à 1320 px.
        ? { maxWidth: 'none', margin: 0, padding: '20px 14px 48px' }
        : { maxWidth: '960px', margin: '0 auto', padding: '28px 24px 64px' }}>
        {onglet === 'taches'               && <SectionTaches />}
        {onglet === 'charte'               && <SectionCharte />}
        {onglet === 'charte-accentuation'  && <SectionCharteAccentuation />}
        {onglet === 'propositions'   && <SectionPropositions />}
        {onglet === 'bibliotheque'   && <SectionBibliotheque auteurs={auteurs} />}
        {onglet === 'controle-oeuvres' && <SectionControleOeuvres auteurs={auteurs} />}
        {onglet === 'verifications'  && <SectionVerifications onCountChange={setNbVerif} />}
        {onglet === 'traductions'    && <SectionTraductions traductions={traductions} />}

        {onglet === 'moderation' && (
          <SectionModeration
            commentaires={commentaires}
            commentairesPublications={commentairesPublications}
            signalements={signalements}
            demandesCertification={demandesCertification}
            segMap={segMap}
            versetMap={versetMap}
            versetTexteMap={versetTexteMap}
            oeuvreTitreMap={oeuvreTitreMap}
            signalementAuteurMap={signalementAuteurMap}
            actionValider={id => decrMod(() => actionValider(id))}
            actionSupprimerCommentaire={id => decrMod(() => actionSupprimerCommentaire(id))}
            actionValiderCommentaireEssai={id => decrMod(() => actionValiderCommentaireEssai(id))}
            actionSupprimerCommentaireEssai={id => decrMod(() => actionSupprimerCommentaireEssai(id))}
            actionMarquerTraite={id => decrMod(() => actionMarquerTraite(id))}
            actionMarquerTraiteSilencieux={id => decrMod(() => actionMarquerTraiteSilencieux(id))}
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
