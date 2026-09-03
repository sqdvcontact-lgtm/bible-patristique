'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
import SectionLexique from './SectionLexique'
import SectionMecenes from './SectionMecenes'
import SectionStyles from './SectionStyles'
import { useEstMobile } from '@/app/lib/useEstMobile'
import type { AdminProps as Props, Onglet } from './adminTypes'
import { colorMix } from '@/app/lib/couleurs'
import { FAMILLES_ADMIN, ENTREES_ADMIN, ONGLETS_VALIDES, type FamilleAdmin } from '@/app/lib/adminNavigation'

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
  const mobile = useEstMobile(900)
  const [nbVerif, setNbVerif] = useState(nbVerifications)
  const [nbMod, setNbMod] = useState(commentaires.length + commentairesPublications.length + signalements.length + demandesCertification.length)
  const [nbEssais, setNbEssais] = useState(essaisEnAttente.length + essaisModification.length)

  // Arrivée via ?onglet=<clé> : le menu Administration de la navbar renvoie à chaque
  // section. Toute clé d'onglet valide est acceptée (pas seulement « controle-oeuvres »).
  useEffect(() => {
    const cle = new URLSearchParams(window.location.search).get('onglet') as Onglet | null
    if (cle && ONGLETS_VALIDES.includes(cle)) setOnglet(cle)
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

  // ── LE SOMMAIRE SE LIT DANS LA TABLE PARTAGÉE ───────────────────────────────
  //
  // ⛔ La navigation de cette page avait sa propre liste, et le menu « Administration »
  // de la barre du haut la sienne : les deux avaient divergé de cinq entrées — Centre
  // de contrôle, Audience, Planche des styles, Propositions de GPT et Bible 899 — que
  // le menu nommait et que la page taisait. Or quand on est DÉJÀ dans l'administration,
  // on cherche sur place, pas dans un menu du haut : ces pages n'existaient donc pas
  // pour qui travaille ici. Les deux listes viennent maintenant de
  // `app/lib/adminNavigation.ts` et ne peuvent plus se contredire, ni sur les entrées,
  // ni sur leur ordre.
  //
  // Ce que le sommaire ajoute à la table, et qui ne pouvait pas y tenir : le COMPTEUR
  // de chaque section, relevé toutes les trente secondes. Les familles, elles, se
  // lisent dans la table : chacune fait un chapitre du sommaire, sous son propre titre.
  // Il n'y a donc plus de filet de changement de famille à déduire de l'ordre ; seul
  // reste le filet de sous-groupe, que la table écrit (celui de la bibliographie).
  const COUL_FAMILLE: Record<FamilleAdmin, string> = { corpus: 'var(--cs-vert)', communaute: 'var(--cs-or)', systeme: 'var(--cs-systeme)' }
  const LABEL_FAMILLE = Object.fromEntries(FAMILLES_ADMIN.map(f => [f.cle, f.label])) as Record<FamilleAdmin, string>
  const BADGES: Partial<Record<Onglet, number>> = { essais: nbEssais, verifications: nbVerif, moderation: nbMod }
  const ENTREES = ENTREES_ADMIN.map(e => ({ ...e, badge: e.onglet ? BADGES[e.onglet] : undefined }))

  // Le contenu garde une largeur propre à chaque section ; le sommaire, lui, a la
  // sienne, fixe, et le contenu se centre dans ce qui reste (marges automatiques).
  const largeurContenu: React.CSSProperties = mobile
    // Mobile : pleine largeur, padding resserré (les maxWidth/gouttières desktop
    // ne servent à rien sur téléphone et rognaient la place utile).
    ? { maxWidth: 'none', margin: 0, padding: '14px 10px 40px' }
    : onglet === 'controle-oeuvres'
    // Le contrôle des œuvres prend toute la largeur : on y lit du texte suivi en
    // regard d'un volet d'analyse, et l'un comme l'autre étouffaient à 1320 px.
    ? { maxWidth: 'none', margin: 0, padding: '20px 14px 48px' }
    // Essais : tableaux larges (colonne d'actions à boutons de largeur fixe).
    : onglet === 'essais'
    ? { maxWidth: '74rem', margin: '0 auto', padding: '28px 24px 64px' }
    // Bibliothèque : les lignes-œuvres publiées portent une longue rangée de
    // boutons (⚙, Modifier, Import/Export, Score, statut, URL/Notice/Fichier,
    // Détails, Contrôle, Dépublier, Supprimer) qui étouffaient à 60 rem.
    : onglet === 'bibliotheque' || onglet === 'ouvrages' || onglet === 'validation-notices' || onglet === 'styles'
    ? { maxWidth: '90rem', margin: '0 auto', padding: '28px 24px 64px' }
    // Éditeurs : mise en page à deux colonnes (formulaire + liste), plus large.
    : onglet === 'editeurs'
    ? { maxWidth: '72rem', margin: '0 auto', padding: '28px 24px 64px' }
    : { maxWidth: '60rem', margin: '0 auto', padding: '28px 24px 64px' }

  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)' }}>
      <style>{`
        .btn-vert { background: var(--cs-vert-aplat) !important; color: var(--cs-sur-aplat) !important; border: none !important; }
        .btn-vert:hover { background: var(--cs-vert-aplat-fonce) !important; }
        .btn-rouge { background: var(--cs-surface) !important; color: var(--cs-danger) !important; border: 1px solid var(--cs-danger-bord) !important; }
        .btn-rouge:hover { background: var(--cs-danger-fond) !important; }
        /* Bouton secondaire neutre — réaccordé à la mise en page claire (l'ancienne
           version, pensée pour l'en-tête sombre, jurait sur fond clair). */
        .btn-gris { background: var(--cs-surface) !important; color: var(--cs-texte-second) !important; border: 1px solid var(--cs-bord) !important; }
        .btn-gris:hover { background: var(--cs-fond) !important; border-color: var(--cs-bord) !important; }
        .btn-gris:disabled { opacity: 0.5 !important; cursor: default !important; }
        .adm-onglet:hover { color: var(--cs-vert-fonce) !important; background: rgba(var(--cs-vert-rgb),0.05) !important; }
        /* Garde-fous mobiles communs à TOUTES les sections (elles posent leur mise en
           page en styles inline, non surchargeables autrement) : un tableau large défile
           au lieu de déborder la page ; champs, images et blocs préformatés se bornent à
           la largeur de l'écran. Les grilles à colonnes fixes, elles, sont reprises
           section par section (l'inline ne se surcharge pas en CSS). */
        @media (max-width: 900px) {
          .adm-contenu table { display: block; overflow-x: auto; max-width: 100%; }
          .adm-contenu input:not([type="checkbox"]):not([type="radio"]),
          .adm-contenu textarea,
          .adm-contenu select { max-width: 100%; box-sizing: border-box; }
          .adm-contenu img { max-width: 100%; height: auto; }
          .adm-contenu pre { overflow-x: auto; max-width: 100%; }
        }
      `}</style>

      {erreurChargement && (
        <div role="alert" style={{ background: 'var(--cs-danger-fond)', borderBottom: '1px solid var(--cs-danger-bord)', color: '#a2564a', fontSize: '0.8125rem', padding: '10px 20px', textAlign: 'center' }}>
          Certaines données n’ont pas pu être chargées : des sections peuvent être incomplètes. Rechargez la page pour réessayer.
        </div>
      )}

      {/* Navigation des sections. Sur mobile, un menu déroulant groupé par famille
          (compact, natif) : la liste s'empilait sur ~6 rangées et mangeait tout l'écran.

          Sur desktop, un VOLET DE SOMMAIRE à gauche, collé sous la barre du haut, où
          les vingt et une entrées se lisent par famille, chacune sous son titre.

          ⛔ C'était une barre d'onglets horizontale sur une seule ligne. Elle avait été
          mesurée pour quinze onglets ; depuis que les pages autonomes y ont pris leur
          rang, elle en comptait vingt et un et défilait sur la plupart des écrans : la
          fin de la liste n'existait que pour qui savait la faire circuler (roulette
          traduite en horizontal, à la main). Et un filet entre deux onglets disait qu'on
          changeait de famille sans jamais dire laquelle. Le sommaire dit tout d'un coup :
          la famille est nommée, et la liste tient entière sans défiler, ou défile
          verticalement, ce que tout le monde sait faire. Le contenu se centre dans la
          place qui reste. */}
      {mobile && (
        <div style={{ position: 'sticky', top: '3.5rem', zIndex: 40, background: 'var(--cs-surface)', borderBottom: '1px solid var(--cs-vert-pale)', padding: '8px 12px', boxShadow: 'var(--cs-ombre-posee)' }}>
          <label style={{ display: 'block', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 2px 4px' }}>Section d’administration</label>
          {/* Une valeur qui commence par une barre oblique est une PAGE, pas une
              section : on la suit au lieu de basculer un onglet qui n'existe pas. */}
          <select value={onglet} onChange={e => {
            const choix = e.target.value
            if (choix.startsWith('/')) { window.location.href = choix; return }
            setOnglet(choix as Onglet)
          }} aria-label="Section d’administration"
            style={{ width: '100%', font: 'inherit', fontSize: '0.9375rem', padding: '9px 10px', border: `1px solid ${COUL_FAMILLE[ENTREES.find(e => e.onglet === onglet)?.famille ?? 'corpus']}`, borderRadius: '8px', background: 'var(--cs-fond-clair)', color: 'var(--cs-encre)' }}>
            {FAMILLES_ADMIN.map(fam => (
              <optgroup key={fam.cle} label={LABEL_FAMILLE[fam.cle]}>
                {/* Une section porte sa CLÉ ; une page autonome porte son ADRESSE, qui
                    commence par une barre oblique — c'est à cela qu'on les distingue. */}
                {ENTREES.filter(e => e.famille === fam.cle).map(e => (
                  <option key={e.href} value={e.onglet ?? e.href}>{e.label}{e.badge ? ` (${e.badge})` : ''}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      <div style={mobile ? undefined : { display: 'flex', alignItems: 'flex-start' }}>
        {!mobile && (
          /* Le volet est COLLANT et fait au moins la hauteur de la fenêtre : il se lit
             comme une colonne, quelle que soit la longueur du contenu à sa droite. Quand
             la fenêtre est plus basse que lui, il défile de lui-même, discrètement. */
          <nav aria-label="Sommaire de l’administration" className="cs-defilement-discret"
            style={{ position: 'sticky', top: '3.5rem', flex: '0 0 14.5rem', minHeight: 'calc(100vh - 3.5rem)', maxHeight: 'calc(100vh - 3.5rem)', overflowY: 'auto', boxSizing: 'border-box', background: 'var(--cs-surface)', borderRight: '1px solid var(--cs-vert-pale)', padding: '18px 10px 28px 12px' }}>
            {FAMILLES_ADMIN.map(fam => {
              const coul = COUL_FAMILLE[fam.cle]
              return (
                <div key={fam.cle} style={{ marginBottom: '18px' }}>
                  {/* Le titre de famille, dans la couleur du domaine, à la mesure des
                      intertitres du menu « Administration » (cf. .cs-plus-titre). Il
                      s'aligne sur le texte des entrées : trois pixels de filet, dix de
                      rembourrage. */}
                  <div style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: coul, opacity: 0.9, padding: '0 8px 0 13px', margin: '0 0 5px' }}>{fam.label}</div>
                  {ENTREES.filter(e => e.famille === fam.cle).map(e => {
                    const cle = e.onglet
                    const actif = cle !== undefined && onglet === cle
                    // Le DESSIN est le même pour une section et pour une page autonome :
                    // rien ne les sépare à l'œil, et c'est bien ainsi — le sommaire dit ce
                    // qu'on peut faire ici, non par quel mécanisme. Une seule différence,
                    // et elle est invisible : la page est un LIEN, parce qu'elle quitte
                    // l'écran et que le clavier comme le clic droit doivent le savoir.
                    const dessin: React.CSSProperties = {
                      display: 'flex', alignItems: 'center', gap: '8px',
                      width: '100%', boxSizing: 'border-box', textAlign: 'left',
                      padding: '5px 8px 5px 10px', fontSize: '0.8125rem', lineHeight: 1.3,
                      fontWeight: actif ? 600 : 500,
                      color: actif ? coul : '#6a8074',
                      background: actif ? colorMix(coul, 8) : 'transparent',
                      border: 'none',
                      borderLeft: actif ? `3px solid ${coul}` : '3px solid transparent',
                      borderRadius: '0 4px 4px 0',
                      textDecoration: 'none',
                      transition: 'color 0.12s, background 0.12s',
                    }
                    return (
                      <React.Fragment key={e.href}>
                        {e.filet && (
                          <div aria-hidden style={{ height: '1px', background: 'var(--cs-vert-pale)', margin: '6px 8px 6px 13px' }} />
                        )}
                        {cle !== undefined ? (
                          <button onClick={() => setOnglet(cle)} className="adm-onglet" aria-current={actif ? 'true' : undefined} style={{ ...dessin, cursor: 'pointer' }}>
                            {e.label}
                            {e.badge !== undefined && e.badge > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.71875rem', background: 'var(--cs-danger-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', padding: '1px 6px', fontWeight: 600, lineHeight: 1.4 }}>{e.badge}</span>}
                          </button>
                        ) : (
                          <Link href={e.href} className="adm-onglet" style={dessin}>
                            {e.label}
                          </Link>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              )
            })}
          </nav>
        )}

        {/* Contenu. `minWidth: 0` : sans lui, un tableau large forcerait la colonne à
            s'élargir au lieu de défiler dans son cadre. */}
        <div className="adm-contenu" style={mobile ? largeurContenu : { ...largeurContenu, flex: 1, minWidth: 0 }}>
        {onglet === 'charte'               && <SectionCharte />}
        {onglet === 'charte-accentuation'  && <SectionCharteAccentuation />}
        {onglet === 'propositions'   && <SectionPropositions />}
        {onglet === 'lexique'        && <SectionLexique />}
        {onglet === 'styles'         && <SectionStyles />}
        {onglet === 'mecenes'        && <SectionMecenes />}
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
      </div>
    </main>
  )
}
