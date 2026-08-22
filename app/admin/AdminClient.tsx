'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  const COUL_FAMILLE: Record<string, string> = { corpus: 'var(--cs-vert)', communaute: 'var(--cs-or)', systeme: 'var(--cs-systeme)' }
  const LABEL_FAMILLE: Record<'corpus' | 'communaute' | 'systeme', string> = { corpus: 'Corpus & catalogue', communaute: 'Communauté', systeme: 'Système & doctrine' }
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
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)' }}>
      <style>{`
        .btn-vert { background: var(--cs-vert) !important; color: var(--cs-surface) !important; border: none !important; }
        .btn-vert:hover { background: var(--cs-vert-fonce) !important; }
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
          (15 entrées) s'empilait sur ~6 rangées et mangeait tout l'écran : on la remplace
          par un menu déroulant groupé par famille (compact, natif).

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

          MESURÉ sur les quinze onglets, à racine 16 : 2 042 px avant, 1 399 après, soit
          un tiers rendu. La barre tient donc d'une pièce dès 1 440 px, la largeur où la
          police racine commence à croître ; au-delà, les deux grandissent ensemble et
          l'écart ne se referme jamais (1 676 px de barre pour 1 920 d'écran, 1 940 pour
          2 400). En dessous de 1 440 elle défile, ce qui vaut mieux que de se replier.
          Le tiers vient de trois postes : le corps passe de 1rem à 0,8125 (le rang de
          l'échelle qui tient sans être illisible ; 0,75 aurait gagné 80 px de plus pour
          un intitulé de douze pixels, marché refusé), les rembourrages de 12/14 à 9/8,
          et la pastille de famille disparaît.

          Rembourrage vertical ramené à 6px après coup : la barre rendait 42,5px de haut
          et l'on ne demandait pas de la remplir, seulement de la traverser. */}
      {mobile ? (
        <div style={{ position: 'sticky', top: '3.5rem', zIndex: 40, background: 'var(--cs-surface)', borderBottom: '1px solid var(--cs-vert-pale)', padding: '8px 12px', boxShadow: 'var(--cs-ombre-posee)' }}>
          <label style={{ display: 'block', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 2px 4px' }}>Section d’administration</label>
          <select value={onglet} onChange={e => setOnglet(e.target.value as Onglet)} aria-label="Section d’administration"
            style={{ width: '100%', font: 'inherit', fontSize: '0.9375rem', padding: '9px 10px', border: `1px solid ${COUL_FAMILLE[ONGLETS.find(o => o.key === onglet)?.famille ?? 'corpus']}`, borderRadius: '8px', background: 'var(--cs-fond-clair)', color: 'var(--cs-encre)' }}>
            {(['corpus', 'communaute', 'systeme'] as const).map(fam => (
              <optgroup key={fam} label={LABEL_FAMILLE[fam]}>
                {ONGLETS.filter(o => o.famille === fam).map(o => (
                  <option key={o.key} value={o.key}>{o.label}{o.badge ? ` (${o.badge})` : ''}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      ) : (
        <div ref={refOnglets} className="cs-defilement-discret" style={{ position: 'sticky', top: '3.5rem', zIndex: 40, background: 'var(--cs-surface)', borderBottom: '1px solid var(--cs-vert-pale)', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', overscrollBehaviorX: 'contain', padding: '2px 14px 0', boxShadow: 'var(--cs-ombre-posee)' }}>
          {ONGLETS.map((o) => {
            const actif = onglet === o.key
            const coul = COUL_FAMILLE[o.famille]
            return (
              <React.Fragment key={o.key}>
                {o.separateur && (
                  <span aria-hidden style={{ alignSelf: 'center', width: '1px', height: '16px', margin: '0 5px 9px', background: 'var(--cs-vert-pale)', flexShrink: 0 }} />
                )}
                {/* `flexShrink: 0` : en nowrap, un onglet se laisserait comprimer et son
                    intitulé serait coupé par le `whiteSpace: nowrap` sans que rien ne le
                    dise. Les onglets gardent donc leur largeur et c'est la barre qui défile.
                    Plus de pastille de famille devant l'intitulé : sept pixels et leur
                    gouttière sur quinze onglets, pour une couleur que l'onglet actif porte
                    déjà dans son texte et son soulignement, et que les filets de séparation
                    disent pour les autres. */}
                <button onClick={() => setOnglet(o.key)} className="adm-onglet"
                  style={{ padding: '6px 8px', fontSize: '0.8125rem', fontWeight: actif ? 600 : 500, color: actif ? coul : '#6a8074', background: actif ? `${colorMix(coul, 8)}` : 'transparent', border: 'none', borderBottom: actif ? `3px solid ${coul}` : '3px solid transparent', borderRadius: '4px 4px 0 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 0.12s, background 0.12s' }}>
                  {o.label}
                  {o.badge !== undefined && o.badge > 0 && <span style={{ fontSize: '0.71875rem', background: 'var(--cs-danger)', color: 'var(--cs-surface)', borderRadius: '8px', padding: '1px 6px', fontWeight: 600, lineHeight: 1.4 }}>{o.badge}</span>}
                </button>
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
