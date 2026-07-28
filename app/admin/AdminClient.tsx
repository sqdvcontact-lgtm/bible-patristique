'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import SectionBibliotheque from './SectionBibliotheque'
import SectionVerifications from './SectionVerifications'
import SectionTraductions from './SectionTraductions'
import SectionEditeurs from './SectionEditeurs'
import SectionModeration from './SectionModeration'
import SectionEssaisAdmin from './SectionEssaisAdmin'
import SectionCharte from './SectionCharte'
import SectionCharteAccentuation from './SectionCharteAccentuation'
import SectionPropositions from './SectionPropositions'
import SectionTaches from './SectionTaches'
import SectionControleOeuvres from './SectionControleOeuvres'
import type { AdminProps as Props, Onglet } from './adminTypes'

export default function AdminClient({
  commentaires, commentairesPublications, signalements, demandesCertification, essaisEnAttente, essaisModification, essaisPublies, essaisBrouillons, segMap, versetMap, versetTexteMap, oeuvreTitreMap, signalementAuteurMap, commentaireParentMap, auteurs, traductions,
  nbVerifications,
  actionValider, actionSupprimerCommentaire, actionValiderCommentaireEssai, actionSupprimerCommentaireEssai,
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
    { key: 'editeurs',            label: 'Éditeurs' },
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
        /* Bouton secondaire neutre — réaccordé à la mise en page claire (l'ancienne
           version, pensée pour l'en-tête sombre, jurait sur fond clair). */
        .btn-gris { background: #fff !important; color: #6b6560 !important; border: 1px solid #d6d0c4 !important; }
        .btn-gris:hover { background: #f4f2ee !important; border-color: #c8c0b4 !important; }
        .btn-gris:disabled { opacity: 0.5 !important; cursor: default !important; }
        .adm-onglet:hover { color: #2f6046 !important; background: rgba(61,107,79,0.05) !important; }
      `}</style>

      {/* Barre d'onglets, seule et sticky sous la navbar (l'ancien bandeau « Administration »
          + Déconnexion est retiré). Surface BLANCHE distincte du fond de la zone admin, pour
          se lire comme une vraie barre d'outils ; onglets clairs, grands, lisibles ; actif
          souligné de vert. */}
      <div style={{ position: 'sticky', top: '48px', zIndex: 40, background: '#fff', borderBottom: '1px solid #dfe4e1', display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', padding: '2px 20px 0', boxShadow: '0 2px 8px rgba(30,46,38,0.08)' }}>
        {ONGLETS.map((o) => {
          const actif = onglet === o.key
          return (
            <React.Fragment key={o.key}>
              {o.separateur && (
                <span aria-hidden style={{ alignSelf: 'center', width: '1px', height: '18px', margin: '0 8px 10px', background: '#e2e6e3' }} />
              )}
              <button onClick={() => setOnglet(o.key)} className="adm-onglet"
                style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: actif ? 600 : 500, color: actif ? '#2f6046' : '#6a8074', background: actif ? 'rgba(61,107,79,0.06)' : 'transparent', border: 'none', borderBottom: actif ? '3px solid #3d6b4f' : '3px solid transparent', borderRadius: '5px 5px 0 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap', transition: 'color 0.12s, background 0.12s' }}>
                {o.label}
                {o.badge !== undefined && o.badge > 0 && <span style={{ fontSize: '10px', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 600, lineHeight: 1.4 }}>{o.badge}</span>}
              </button>
            </React.Fragment>
          )
        })}
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
        {onglet === 'editeurs'       && <SectionEditeurs />}

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
            commentaireParentMap={commentaireParentMap}
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
