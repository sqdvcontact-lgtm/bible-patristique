'use client'

import React, { useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import SectionBibliotheque from './SectionBibliotheque'
import SectionVerifications from './SectionVerifications'
import SectionTraductions from './SectionTraductions'
import SectionEditeurs from './SectionEditeurs'
import SectionModeration from './SectionModeration'
import SectionCourrier from './SectionCourrier'
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
import type { AdminProps as Props } from './adminTypes'
import { useCompteursAdmin } from './CadreAdministration'
import { ongletDemande } from './sommaireAdmin'

export default function AdminClient({
  commentaires, commentairesPublications, signalements, demandesCertification, essaisEnAttente, essaisModification, essaisPublies, essaisBrouillons, segMap, versetMap, versetTexteMap, oeuvreTitreMap, signalementAuteurMap, commentaireParentMap, auteurs, textes, traductions,
  erreurChargement,
  actionValider, actionSupprimerCommentaire, actionValiderCommentaireEssai, actionSupprimerCommentaireEssai,
  actionMarquerTraite, actionMarquerTraiteSilencieux, actionSupprimerSignalement,
  actionCertifier, actionRetirerDemandeCertification,
  actionPublierEssai, actionRenvoyerBrouillonEssai,
}: Props) {
  // ── LA SECTION SE LIT DANS L'ADRESSE ────────────────────────────────────────
  //
  // Le sommaire a quitté cette page pour le layout de l'administration (14 septembre 2026) : il
  // porte toutes les pages, et non plus la seule /admin. Il ne pose donc plus un état de cette
  // page ; il change l'adresse, par l'API d'historique quand on est déjà ici, et la page lit sa
  // section dans `?onglet=`. ⚠️ Cela règle un défaut ancien : l'adresse n'était lue qu'au
  // montage, si bien qu'un lien du menu du haut vers une autre section, suivi depuis /admin,
  // changeait l'adresse sans changer la section.
  const onglet = ongletDemande(useSearchParams().get('onglet'))
  const mobile = useEstMobile(900)
  const { poserCompteur, retirerUn } = useCompteursAdmin()

  // ⛔ Des rappels STABLES : le courrier relit ses lettres quand son rappel change, et un rappel
  // neuf à chaque rendu relancerait la lecture sans fin.
  const poserVerifications = useCallback((n: number) => poserCompteur('verifications', n), [poserCompteur])
  const poserCourrier = useCallback((n: number) => poserCompteur('courrier', n), [poserCompteur])

  const decrMod = async (fn: () => Promise<void>) => { await fn(); retirerUn('moderation') }

  // Le contenu garde une largeur propre à chaque section, et se centre dans la colonne que le
  // sommaire laisse (marges automatiques).
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
    // Traductions : pleine largeur. Chaque fiche aligne ses colonnes (nom, dates,
    // identifiant, import) à gauche et sa rangée d'actions, quelque 56 rem, à droite :
    // à 90 rem, la plus longue passait encore à la ligne (2026-09-13).
    : onglet === 'traductions'
    ? { maxWidth: 'none', margin: 0, padding: '28px 24px 64px' }
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

      {/* Contenu. La navigation des sections vit dans le sommaire du layout
          (`CadreAdministration`), qui porte toutes les pages de l'administration. */}
      <div className="adm-contenu" style={largeurContenu}>
        {onglet === 'charte'               && <SectionCharte />}
        {onglet === 'charte-accentuation'  && <SectionCharteAccentuation />}
        {onglet === 'propositions'   && <SectionPropositions />}
        {onglet === 'courrier'       && <SectionCourrier onCountChange={poserCourrier} />}
        {onglet === 'lexique'        && <SectionLexique />}
        {onglet === 'styles'         && <SectionStyles />}
        {onglet === 'mecenes'        && <SectionMecenes />}
        {onglet === 'bibliotheque'   && <SectionBibliotheque auteurs={auteurs} textes={textes} />}
        {onglet === 'controle-oeuvres' && <SectionControleOeuvres auteurs={auteurs} />}
        {onglet === 'evenements'     && <SectionEvenements auteurs={auteurs} />}
        {onglet === 'verifications'  && <SectionVerifications onCountChange={poserVerifications} />}
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
