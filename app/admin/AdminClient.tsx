'use client'

import React, { useState, useEffect, useRef } from 'react'
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

  // ── La roulette fait circuler la barre d'onglets ──────────────────────────
  // La barre défile horizontalement, mais une roulette de souris n'émet que du deltaY :
  // sans cela, il faudrait attraper le pouce, ou connaître Maj+roulette. On traduit donc
  // le mouvement vertical en déplacement horizontal tant que le curseur survole la barre.
  //
  // ⛔ Le listener est posé À LA MAIN, en `passive: false`. React attache `wheel` sur la
  // racine en PASSIF : un `onWheel={...}` en JSX ne pourrait pas appeler preventDefault,
  // et la page défilerait sous la barre en même temps qu'elle. Le défaut serait discret
  // et permanent — deux mouvements pour un seul geste.
  //
  // Deux gardes, et chacune rend la main au navigateur plutôt que de la prendre :
  // quand la barre tient tout entière, rien à faire circuler, donc la page défile comme
  // toujours ; et quand le geste porte DÉJÀ de l'horizontal (pavé tactile, roulette
  // inclinable), on ne s'en mêle pas, le navigateur le fait mieux et plus doucement.
  const refOnglets = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const barre = refOnglets.current
    if (!barre) return
    const surRoulette = (e: WheelEvent) => {
      if (barre.scrollWidth <= barre.clientWidth) return
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      // ⚠️ deltaY n'est PAS toujours en pixels : `deltaMode` vaut 1 pour des LIGNES
      // (cas courant de Firefox sous Windows, où une crantée vaut 3) et 2 pour des
      // PAGES. Pris tel quel, un cran de roulette ferait alors glisser la barre de trois
      // pixels et l'on croirait le geste inopérant. Le rapport de comparaison avec deltaX
      // reste juste, lui : les deux axes partagent la même unité.
      const pas = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? barre.clientWidth : 1
      barre.scrollLeft += e.deltaY * pas
    }
    barre.addEventListener('wheel', surRoulette, { passive: false })
    return () => barre.removeEventListener('wheel', surRoulette)
  }, [mobile])

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

  // ── LA BARRE D'ONGLETS SE LIT DANS LA TABLE PARTAGÉE ────────────────────────
  //
  // ⛔ Elle avait sa propre liste, et le menu « Administration » de la barre du haut
  // la sienne : les deux avaient divergé de cinq entrées — Centre de contrôle,
  // Audience, Planche des styles, Propositions de GPT et Bible 899 — que le menu
  // nommait et que la barre taisait. Or quand on est DÉJÀ dans l'administration, on
  // cherche dans la barre, pas dans un menu du haut : ces pages n'existaient donc
  // pas pour qui travaille ici. Les deux listes viennent maintenant de
  // `app/lib/adminNavigation.ts` et ne peuvent plus se contredire, ni sur les
  // entrées, ni sur leur ordre.
  //
  // Ce que la barre ajoute à la table, et qui ne pouvait pas y tenir :
  //   — le COMPTEUR de chaque section (relevé toutes les trente secondes) ;
  //   — le filet de CHANGEMENT DE FAMILLE, déduit de l'ordre. La table n'écrit que
  //     les filets de sous-groupe, comme celui de la bibliographie.
  const COUL_FAMILLE: Record<FamilleAdmin, string> = { corpus: 'var(--cs-vert)', communaute: 'var(--cs-or)', systeme: 'var(--cs-systeme)' }
  const LABEL_FAMILLE = Object.fromEntries(FAMILLES_ADMIN.map(f => [f.cle, f.label])) as Record<FamilleAdmin, string>
  const BADGES: Partial<Record<Onglet, number>> = { essais: nbEssais, verifications: nbVerif, moderation: nbMod }
  const ENTREES = ENTREES_ADMIN.map((e, i) => ({
    ...e,
    badge: e.onglet ? BADGES[e.onglet] : undefined,
    separateur: !!e.filet || (i > 0 && ENTREES_ADMIN[i - 1].famille !== e.famille),
  }))

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

      {/* Navigation des sections. Sticky sous la navbar. Sur mobile, la barre d'onglets
          s'empilait sur ~6 rangées et mangeait tout l'écran : on la remplace par un menu
          déroulant groupé par famille (compact, natif).

          Sur desktop, elle tient sur UNE SEULE LIGNE. Elle était en flex-wrap et se
          repliait sur deux ou trois rangées, ce qui coûtait deux fois : la hauteur, prise
          à un bandeau collant qui suit tout le défilement, et surtout la lecture, car une
          barre d'onglets sur trois rangées n'est plus une barre mais une grille, où l'œil
          ne sait plus si l'ordre se lit en lignes ou en colonnes. Le repliement est donc
          refusé (nowrap) et le trop-plein défile horizontalement. C'est le même parti que
          le menu « Administration » de la navbar : borner et faire défiler, jamais rogner
          ni replier.

          overflow-y reste HIDDEN, sans quoi le conteneur de défilement horizontal se
          donnerait aussi une barre verticale pour trois pixels de soulignement.

          ⚠️ La mesure qui suit DATE d'avant la fusion des deux listes : elle portait sur
          quinze onglets, la barre en compte vingt et un depuis que les pages autonomes y
          ont pris leur rang (cf. la table partagée, plus haut). Elle défile donc sur la
          plupart des écrans — ce qu'elle est faite pour faire. La remesurer avant de s'en
          servir pour décider quoi que ce soit.

          MESURÉ sur les quinze onglets, à racine 16 : 2 042 px avant, 1 399 après, soit
          un tiers rendu. Le tiers vient de trois postes : le corps passe de 1rem à 0,8125 (le rang de
          l'échelle qui tient sans être illisible ; 0,75 aurait gagné 80 px de plus pour
          un intitulé de douze pixels, marché refusé), les rembourrages de 12/14 à 9/8,
          et la pastille de famille disparaît.

          Rembourrage vertical ramené à 6px après coup : la barre rendait 42,5px de haut
          et l'on ne demandait pas de la remplir, seulement de la traverser. */}
      {mobile ? (
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
      ) : (
        <div ref={refOnglets} className="cs-defilement-discret" style={{ position: 'sticky', top: '3.5rem', zIndex: 40, background: 'var(--cs-surface)', borderBottom: '1px solid var(--cs-vert-pale)', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', overscrollBehaviorX: 'contain', padding: '2px 14px 0', boxShadow: 'var(--cs-ombre-posee)' }}>
          {ENTREES.map((e) => {
            const cle = e.onglet
            const actif = cle !== undefined && onglet === cle
            const coul = COUL_FAMILLE[e.famille]
            // Le DESSIN est le même pour une section et pour une page autonome : au repos,
            // rien ne les sépare, et c'est bien ainsi — la barre dit d'abord ce qu'on peut
            // faire ici, non par quel mécanisme. Deux différences, et deux seulement : la
            // page est un LIEN (elle quitte l'écran, le clavier et le clic droit doivent le
            // savoir), et elle porte une flèche, qui dit qu'on s'en va.
            const dessin: React.CSSProperties = {
              padding: '6px 8px', fontSize: '0.8125rem',
              fontWeight: actif ? 600 : 500,
              color: actif ? coul : '#6a8074',
              background: actif ? colorMix(coul, 8) : 'transparent',
              border: 'none',
              borderBottom: actif ? `3px solid ${coul}` : '3px solid transparent',
              borderRadius: '4px 4px 0 0',
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: '5px',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'color 0.12s, background 0.12s',
            }
            return (
              <React.Fragment key={e.href}>
                {e.separateur && (
                  <span aria-hidden style={{ alignSelf: 'center', width: '1px', height: '16px', margin: '0 5px 9px', background: 'var(--cs-vert-pale)', flexShrink: 0 }} />
                )}
                {/* `flexShrink: 0` : en nowrap, un onglet se laisserait comprimer et son
                    intitulé serait coupé par le `whiteSpace: nowrap` sans que rien ne le
                    dise. Les onglets gardent donc leur largeur et c'est la barre qui défile.
                    Plus de pastille de famille devant l'intitulé : sept pixels et leur
                    gouttière sur chaque onglet, pour une couleur que l'onglet actif porte
                    déjà dans son texte et son soulignement, et que les filets de séparation
                    disent pour les autres. */}
                {cle !== undefined ? (
                  <button onClick={() => setOnglet(cle)} className="adm-onglet" style={{ ...dessin, cursor: 'pointer' }}>
                    {e.label}
                    {e.badge !== undefined && e.badge > 0 && <span style={{ fontSize: '0.71875rem', background: 'var(--cs-danger-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', padding: '1px 6px', fontWeight: 600, lineHeight: 1.4 }}>{e.badge}</span>}
                  </button>
                ) : (
                  <Link href={e.href} className="adm-onglet" style={dessin}>
                    {e.label}
                    <span aria-hidden style={{ fontSize: '0.71875rem', opacity: 0.6 }}>→</span>
                  </Link>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}

      {/* Contenu */}
      <div className="adm-contenu" style={mobile
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
