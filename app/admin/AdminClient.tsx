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
import SectionControleOeuvres from './SectionControleOeuvres'
import SectionEvenements from './SectionEvenements'
import SectionFiabilite from './SectionFiabilite'
import SectionOuvrages from './SectionOuvrages'
import SectionValidationNotices from './SectionValidationNotices'
import SectionConstituerLiens from './SectionConstituerLiens'
import type { AdminProps as Props, Onglet } from './adminTypes'

export default function AdminClient({
  commentaires, commentairesPublications, signalements, demandesCertification, essaisEnAttente, essaisModification, essaisPublies, essaisBrouillons, segMap, versetMap, versetTexteMap, oeuvreTitreMap, signalementAuteurMap, commentaireParentMap, auteurs, traductions,
  nbVerifications,
  erreurChargement,
  actionValider, actionSupprimerCommentaire, actionValiderCommentaireEssai, actionSupprimerCommentaireEssai,
  actionMarquerTraite, actionMarquerTraiteSilencieux, actionSupprimerSignalement,
  actionCertifier, actionRetirerDemandeCertification,
  actionPublierEssai, actionRenvoyerBrouillonEssai,
}: Props) {
  const [onglet, setOnglet] = useState<Onglet>('bibliotheque')
  const [nbVerif, setNbVerif] = useState(nbVerifications)
  const [nbMod, setNbMod] = useState(commentaires.length + commentairesPublications.length + signalements.length + demandesCertification.length)
  const [nbEssais, setNbEssais] = useState(essaisEnAttente.length + essaisModification.length)

  // Arrivée via ?onglet=<clé> : le menu Administration de la navbar renvoie à chaque
  // section. Toute clé d'onglet valide est acceptée (pas seulement « controle-oeuvres »).
  useEffect(() => {
    const cle = new URLSearchParams(window.location.search).get('onglet') as Onglet | null
    const valides: Onglet[] = [
      'bibliotheque', 'controle-oeuvres', 'ouvrages', 'validation-notices', 'traductions', 'editeurs', 'fiabilite', 'evenements', 'essais',
      'verifications', 'constituer-liens', 'moderation', 'propositions', 'charte', 'charte-accentuation',
    ]
    if (cle && valides.includes(cle)) setOnglet(cle)
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

  // Familles d'administration, chacune sa couleur (division visuelle) :
  // Corpus & catalogue (vert), Communauté & modération (or), Système & doctrine (ardoise).
  const COUL_FAMILLE: Record<string, string> = { corpus: '#3d6b4f', communaute: '#9a7a38', systeme: '#5f6b86' }
  const ONGLETS: { key: Onglet; label: string; famille: 'corpus' | 'communaute' | 'systeme'; badge?: number; separateur?: boolean }[] = [
    { key: 'bibliotheque',        label: 'Bibliothèque',      famille: 'corpus' },
    { key: 'controle-oeuvres',    label: 'Contrôle œuvres',   famille: 'corpus' },
    { key: 'ouvrages',            label: 'Ouvrages',          famille: 'corpus' },
    { key: 'validation-notices',  label: 'Validation notices', famille: 'corpus' },
    { key: 'traductions',         label: 'Traductions',       famille: 'corpus' },
    { key: 'editeurs',            label: 'Éditeurs',          famille: 'corpus' },
    { key: 'fiabilite',           label: 'Valeur académique', famille: 'corpus' },
    { key: 'evenements',          label: 'Chronologie',       famille: 'corpus' },
    { key: 'essais',              label: 'Essais',            famille: 'communaute', badge: nbEssais, separateur: true },
    { key: 'verifications',       label: 'Vérifications',     famille: 'communaute', badge: nbVerif },
    { key: 'constituer-liens',    label: 'Constituer liens',  famille: 'communaute' },
    { key: 'moderation',          label: 'Modération',        famille: 'communaute', badge: nbMod },
    { key: 'propositions',        label: 'Propositions',      famille: 'communaute' },
    { key: 'charte',              label: 'Charte IA',         famille: 'systeme', separateur: true },
    { key: 'charte-accentuation', label: 'Accentuation',      famille: 'systeme' },
  ]

  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: '#e8eceb' }}>
      <style>{`
        .btn-vert { background: var(--cs-vert) !important; color: #fff !important; border: none !important; }
        .btn-vert:hover { background: var(--cs-vert-fonce) !important; }
        .btn-rouge { background: var(--cs-surface) !important; color: var(--cs-danger) !important; border: 1px solid var(--cs-danger-bord) !important; }
        .btn-rouge:hover { background: var(--cs-danger-fond) !important; }
        /* Bouton secondaire neutre — réaccordé à la mise en page claire (l'ancienne
           version, pensée pour l'en-tête sombre, jurait sur fond clair). */
        .btn-gris { background: var(--cs-surface) !important; color: var(--cs-texte-second) !important; border: 1px solid var(--cs-bord) !important; }
        .btn-gris:hover { background: #f4f2ee !important; border-color: var(--cs-bord) !important; }
        .btn-gris:disabled { opacity: 0.5 !important; cursor: default !important; }
        .adm-onglet:hover { color: #2f6046 !important; background: rgba(var(--cs-vert-rgb),0.05) !important; }
      `}</style>

      {erreurChargement && (
        <div role="alert" style={{ background: 'var(--cs-danger-fond)', borderBottom: '1px solid var(--cs-danger-bord)', color: '#a2564a', fontSize: '0.8125rem', padding: '10px 20px', textAlign: 'center' }}>
          Certaines données n’ont pas pu être chargées : des sections peuvent être incomplètes. Rechargez la page pour réessayer.
        </div>
      )}

      {/* Barre d'onglets, seule et sticky sous la navbar (l'ancien bandeau « Administration »
          + Déconnexion est retiré). Surface BLANCHE distincte du fond de la zone admin, pour
          se lire comme une vraie barre d'outils ; onglets clairs, grands, lisibles ; actif
          souligné de vert. */}
      <div style={{ position: 'sticky', top: '3.5rem', zIndex: 40, background: 'var(--cs-surface)', borderBottom: '1px solid #dfe4e1', display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', padding: '2px 20px 0', boxShadow: '0 2px 8px rgba(30,46,38,0.08)' }}>
        {ONGLETS.map((o) => {
          const actif = onglet === o.key
          const coul = COUL_FAMILLE[o.famille]
          return (
            <React.Fragment key={o.key}>
              {o.separateur && (
                <span aria-hidden style={{ alignSelf: 'center', width: '1px', height: '18px', margin: '0 8px 10px', background: '#e2e6e3' }} />
              )}
              <button onClick={() => setOnglet(o.key)} className="adm-onglet"
                style={{ padding: '12px 14px', fontSize: '0.97031rem', fontWeight: actif ? 600 : 500, color: actif ? coul : '#6a8074', background: actif ? `${coul}14` : 'transparent', border: 'none', borderBottom: actif ? `3px solid ${coul}` : '3px solid transparent', borderRadius: '5px 5px 0 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'color 0.12s, background 0.12s' }}>
                {/* Pastille de famille : division par couleur. */}
                <span aria-hidden style={{ width: '7px', height: '7px', borderRadius: '50%', background: coul, flexShrink: 0, opacity: actif ? 1 : 0.55 }} />
                {o.label}
                {o.badge !== undefined && o.badge > 0 && <span style={{ fontSize: '0.71875rem', background: 'var(--cs-danger)', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 600, lineHeight: 1.4 }}>{o.badge}</span>}
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
        // Essais : tableaux larges (colonne d'actions à boutons de largeur fixe).
        : onglet === 'essais'
        ? { maxWidth: '74rem', margin: '0 auto', padding: '28px 24px 64px' }
        // Bibliothèque : les lignes-œuvres publiées portent une longue rangée de
        // boutons (⚙, Modifier, Import/Export, Score, statut, URL/Notice/Fichier,
        // Détails, Contrôle, Dépublier, Supprimer) qui étouffaient à 60 rem.
        : onglet === 'bibliotheque' || onglet === 'ouvrages' || onglet === 'validation-notices'
        ? { maxWidth: '90rem', margin: '0 auto', padding: '28px 24px 64px' }
        // Éditeurs : mise en page à deux colonnes (formulaire + liste), plus large.
        : onglet === 'editeurs'
        ? { maxWidth: '72rem', margin: '0 auto', padding: '28px 24px 64px' }
        : { maxWidth: '60rem', margin: '0 auto', padding: '28px 24px 64px' }}>
        {onglet === 'charte'               && <SectionCharte />}
        {onglet === 'charte-accentuation'  && <SectionCharteAccentuation />}
        {onglet === 'propositions'   && <SectionPropositions />}
        {onglet === 'bibliotheque'   && <SectionBibliotheque auteurs={auteurs} />}
        {onglet === 'controle-oeuvres' && <SectionControleOeuvres auteurs={auteurs} />}
        {onglet === 'evenements'     && <SectionEvenements auteurs={auteurs} />}
        {onglet === 'verifications'  && <SectionVerifications onCountChange={setNbVerif} />}
        {onglet === 'constituer-liens' && <SectionConstituerLiens />}
        {onglet === 'traductions'    && <SectionTraductions traductions={traductions} />}
        {onglet === 'editeurs'       && <SectionEditeurs />}
        {onglet === 'fiabilite'      && <SectionFiabilite />}
        {onglet === 'ouvrages'       && <SectionOuvrages />}
        {onglet === 'validation-notices' && <SectionValidationNotices />}

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
