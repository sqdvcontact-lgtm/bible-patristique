'use client'

// ── Fiche « À propos de cette édition » ────────────────────────────────────────
//
// La fenêtre s'ouvre depuis le volet de lecture d'une œuvre patristique (« En savoir
// plus sur cette édition »). Elle est composée sur le modèle de la FICHE D'AUTEUR
// (`app/components/ModaleAuteur`) et de la FICHE DE TRADUCTION
// (`app/components/ModaleTraduction`), dont elle reprend le cadre (52 rem, `--cs-fond`,
// rayon 12 px, croix collante, défilement du CONTENU et non du calque), l'en-tête
// (portrait à gauche, nom et repères à droite), les titres de section et les deux
// colonnes : à gauche l'édition qu'on lit, à droite ce qui la documente.
//
// Elle était restée une paire de petites cartes à étiquettes, quand les deux autres
// fiches disent la même chose d'objets voisins. Les trois se lisent désormais pareil.
//
// ⚠️ Le CONTENU est séparé de la fenêtre (`ContenuFicheEdition`), comme dans les deux
// autres : `createPortal` n'existe pas au rendu serveur, et une planche de contrôle
// hors session ne pourrait pas rendre la fiche si tout tenait dans un seul composant.

import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { espacerIntervallesHistoriques, formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { libelleLangue } from '@/app/lib/langues'
import { rendreSiecles } from '@/app/lib/siecles'
import { sansPointFinal } from '@/app/lib/titres'
import { separateurAuteurs, type AuteurOeuvre } from '@/app/lib/auteursOeuvre'
import {
  Consulter, LigneTech, PortraitAuteur, TitreSection,
} from '@/app/components/ModaleAuteur'
import { libelleTrad, formaterEditeur } from './PageTitre'
import { rendreTexteEnrichi } from './texteEnrichi'
import { libelleVersionComplet } from './versionTextuelle'
import type { Props, VersionTextuelle } from './oeuvreTypes'

const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

// La fiche s'ouvre au-dessus de la page de lecture ; la fiche d'auteur, qu'on ouvre
// DEPUIS elle en cliquant un nom, porte 2100 et passe donc par-dessus.
const Z_FICHE = 1200

/** Tout ce que la fiche a besoin de savoir. Les données lui arrivent chargées : la
 *  page de lecture les a déjà, et la fiche n'en redemande aucune au serveur, sauf le
 *  cadrage du portrait, qui n'appartient à la page à aucun autre titre. */
export type DonneesEdition = {
  oeuvre: Props['oeuvre']
  /** Titre de CATALOGUE. La composition du frontispice (`titre_affichage`) ne vaut
   *  que pour la page de titre ; partout ailleurs, c'est lui qui nomme l'œuvre. */
  titre: string
  auteurs: AuteurOeuvre[]
  /** Repli quand la liste des auteurs n'a pas été fournie : le nom composé, non cliquable. */
  auteurNom: string
  versionActive: VersionTextuelle | null
  versions: VersionTextuelle[]
  /** Un texte en langue originale se lit-il en regard du français ? */
  aTexteOriginal: boolean
}

// ── Rangée des colonnes étroites ──────────────────────────────────────────────
// La rangée partagée (`LigneTech`) porte une colonne d'étiquettes de 8,5 rem : elle
// tient dans la colonne large, pas dans l'étroite, où il ne resterait pas 170 px pour
// la valeur. La colonne de droite EMPILE donc étiquette et valeur, comme le faisaient
// les cartes d'avant. Deux formes, chacune pour la mesure qu'elle sert : c'est déjà ce
// que fait la fiche d'auteur, dont les deux colonnes ne se composent pas pareil.
const CLE_EMPILEE: React.CSSProperties = { fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', lineHeight: 1.4 }
const VAL_EMPILEE: React.CSSProperties = { fontSize: '0.71875rem', color: 'var(--cs-texte)', lineHeight: 1.35, display: 'block' }

function RangeeEmpilee({ c, italique, children }: { c: string; italique?: boolean; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div style={{ padding: '4px 0', borderTop: '1px solid var(--cs-fond)' }}>
      <span style={CLE_EMPILEE}>{c}</span>
      <span style={{ ...VAL_EMPILEE, fontStyle: italique ? 'italic' : 'normal' }}>{children}</span>
    </div>
  )
}

const STYLES_FICHE = `
  .fiche-edition-prose { font-family: ${SANS}; font-size: 0.75rem; line-height: 1.5; color: var(--cs-texte); text-align: justify; hyphens: auto; margin: 0; white-space: pre-line; }
  @media (max-width: 640px) {
    .fiche-edition-calque { padding: 14px 8px !important; }
    .fiche-edition-cadre { padding: 22px 15px 20px !important; border-radius: 8px !important; }
    .fiche-edition-grille { grid-template-columns: 1fr !important; gap: 16px !important; }
    .fiche-edition-colonne { border-right: none !important; padding-right: 0 !important; }
    /* Sur téléphone, 8,5 rem d'étiquette ne laissent plus rien à la valeur. */
    .fiche-edition-cadre .cs-fiche-cle { width: 6rem !important; }
  }
`

/** Millésime de l'édition en ligne, comme au colophon de la page de titre. ⛔ Pas la
 *  date au jour : `date_mise_en_ligne` a été estampillée en lot sur une partie du
 *  corpus, et une date précise y donnerait à croire à une précision qu'elle n'a pas. */
function anneeEnLigne(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const annee = new Date(valeur).getFullYear()
  return Number.isFinite(annee) ? String(annee) : null
}

/**
 * Le contenu de la fiche : en-tête, deux colonnes.
 * `photoPosition` arrive après coup (le cadrage du portrait se charge à l'ouverture) ;
 * le portrait, lui, paraît tout de suite, son adresse se déduisant de l'identifiant.
 */
export function ContenuFicheEdition({ donnees, photoPosition, onOuvrirAuteur }: {
  donnees: DonneesEdition
  photoPosition?: unknown
  onOuvrirAuteur: (idAuteur: string) => void
}) {
  const { oeuvre, titre, auteurs, auteurNom, versionActive, versions, aTexteOriginal } = donnees

  // Repères de l'œuvre, sur une seule ligne d'étiquettes : c'est la place que la fiche
  // d'auteur donne aux dates, à la langue et aux traditions.
  const reperes = [
    libelleLangue(oeuvre.langue_originale),
    espacerIntervallesHistoriques(formaterDateHistorique(oeuvre.date_composition)),
  ].filter(Boolean).join(' · ')

  const traducteur = versionActive?.traducteurLabel ?? libelleTrad(oeuvre.trad_auteur)
  const sourceUrl = versionActive?.sourceUrl ?? oeuvre.url_source ?? null
  // ⚠️ `nb_signes` mesure le texte PAR DÉFAUT de l'œuvre. Sur une autre édition du
  // même texte, il dirait la longueur d'un texte qu'on ne lit pas : on se tait alors.
  const etendue = (!versionActive || versionActive.isDefault) && oeuvre.nb_signes
    ? `${oeuvre.nb_signes.toLocaleString('fr-FR')} signes` : null
  const autresVersions = versions.filter(v => v.idTexte !== versionActive?.idTexte)
  const enLigne = anneeEnLigne(oeuvre.date_mise_en_ligne)

  const aEdition = !!(traducteur || versionActive?.editionDescription || oeuvre.editeur || oeuvre.ville
    || oeuvre.date_publication || oeuvre.collection || sourceUrl
    || oeuvre.commentaire_traduction?.trim())
  // Les deux notes éditoriales parlent de l'ŒUVRE, non de l'édition : elles vivent
  // dans la colonne de droite, sous « L'œuvre ». La substance d'abord, les points de
  // détail ensuite, sous leur propre titre.
  const noteComplete = oeuvre.note_editoriale_complete?.trim() || null
  const noteComplement = oeuvre.note_editoriale_complement?.trim() || null
  const aOeuvre = !!(oeuvre.titre_original || (oeuvre.genres && oeuvre.genres.length) || noteComplete || noteComplement)
  const aSite = !!(enLigne || etendue || autresVersions.length || aTexteOriginal)
  const aColonnes = aEdition && (aOeuvre || aSite)

  const colonneDroite = (
    <>
      {aOeuvre && (
        <section>
          <TitreSection>L’œuvre</TitreSection>
          <RangeeEmpilee c="Titre original" italique>{oeuvre.titre_original}</RangeeEmpilee>
          <RangeeEmpilee c={`Genre${(oeuvre.genres?.length ?? 0) > 1 ? 's' : ''}`}>
            {oeuvre.genres?.length ? oeuvre.genres.join(', ') : null}
          </RangeeEmpilee>
          {/* Ce que l'œuvre EST : son intérêt, sa substance (note_editoriale_complete). */}
          {noteComplete && (
            <div className="fiche-edition-prose" style={{ marginTop: '8px' }}>{rendreTexteEnrichi(noteComplete)}</div>
          )}
        </section>
      )}
      {/* Les points de détail de l'œuvre parcourue (note_editoriale_complement) : un
          chapitre déplacé ou refondu, une attribution discutée, une transmission
          lacunaire. Rubrique à part : on la cherche quand quelque chose étonne. */}
      {noteComplement && (
        <section>
          <TitreSection>Notes éditoriales</TitreSection>
          <div className="fiche-edition-prose">{rendreTexteEnrichi(noteComplement)}</div>
        </section>
      )}
      {aSite && (
        <section>
          <TitreSection>Sur ce site</TitreSection>
          <RangeeEmpilee c="Édition en ligne">{enLigne}</RangeeEmpilee>
          <RangeeEmpilee c="Étendue">{etendue}</RangeeEmpilee>
          <RangeeEmpilee c="Lecture">{aTexteOriginal ? 'Texte original en regard' : null}</RangeeEmpilee>
          {/* Les autres éditions du même texte se choisissent dans le volet de lecture ;
              la fiche dit seulement qu'elles existent, et lesquelles. */}
          <RangeeEmpilee c={`Autre${autresVersions.length > 1 ? 's' : ''} édition${autresVersions.length > 1 ? 's' : ''}`}>
            {autresVersions.length ? autresVersions.map(v => (
              <span key={v.idTexte} style={{ display: 'block' }}>{libelleVersionComplet(v)}</span>
            )) : null}
          </RangeeEmpilee>
        </section>
      )}
    </>
  )

  return (
    <>
      {/* En-tête : le portrait de l'auteur dans le cadre de la fiche d'auteur, puis le
          titre de l'œuvre, son sous-titre, ses auteurs et la ligne de repères. */}
      <header style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '16px' }}>
        {auteurs.length > 0 && (
          <PortraitAuteur idAuteur={auteurs[0].id_auteur} nom={auteurs[0].nom} photoPosition={photoPosition} />
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cs-vert)', margin: '0 0 5px', textTransform: 'uppercase' }}>À propos de cette édition</p>
          <h2 id="fiche-edition-titre" style={{ fontFamily: SERIF, fontSize: '1.4375rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.12 }}>
            {rendreTexteEnrichi(titre)}
          </h2>
          {oeuvre.sous_titre && (
            <p style={{ fontFamily: SERIF, fontSize: '0.78125rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', margin: '2px 0 0', lineHeight: 1.3 }}>
              {rendreTexteEnrichi(oeuvre.sous_titre)}
            </p>
          )}
          {/* Chaque auteur ouvre sa fiche ; une œuvre signée à deux les donne tous. */}
          <p style={{ fontFamily: SERIF, fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: '4px 0 0', lineHeight: 1.3 }}>
            {auteurs.length > 0 ? auteurs.map((a, i) => (
              <Fragment key={a.id_auteur}>
                {i > 0 && <span>{separateurAuteurs(i, auteurs.length)}</span>}
                <button onClick={() => onOuvrirAuteur(a.id_auteur)} title="Voir la fiche de l’auteur"
                  style={{ font: 'inherit', color: 'var(--cs-vert)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', textUnderlineOffset: '2px' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'currentcolor')}
                  onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}>{a.nom}</button>
              </Fragment>
            )) : auteurNom}
          </p>
          {reperes && (
            <p style={{ fontFamily: SANS, fontSize: '0.59375rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '8px 0 0', lineHeight: 1.4 }}>
              {rendreSiecles(reperes)}
            </p>
          )}
        </div>
      </header>

      {/* Deux colonnes : à gauche l'édition qu'on lit, à droite ce qui la documente.
          Elles ne paraissent que s'il y a de quoi remplir les deux ; sinon ce qui reste
          prend toute la mesure plutôt que de laisser une colonne vide à côté de lui. */}
      <div className="fiche-edition-grille" style={{ display: 'grid', gridTemplateColumns: aColonnes ? 'minmax(0, 1.35fr) minmax(0, 1fr)' : '1fr', gap: '26px', alignItems: 'start' }}>
        {aEdition && (
          <div className="fiche-edition-colonne" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, borderRight: aColonnes ? '1px solid var(--cs-fond-doux)' : 'none', paddingRight: aColonnes ? '24px' : 0 }}>
            <section>
              <TitreSection>Édition de référence</TitreSection>
              {/* ⛔ Pas de dépli ici, à la différence de la fiche de traduction : ces
                  rangées SONT le sujet d'une fiche qui s'appelle « À propos de cette
                  édition », et l'on ne range pas derrière une flèche ce qu'on est venu
                  chercher. */}
              <LigneTech c="Traducteur">
                {traducteur ? `${traducteur}${oeuvre.trad_date ? ` (${formaterDateHistorique(oeuvre.trad_date)})` : ''}` : null}
              </LigneTech>
              <LigneTech c="Édition">{versionActive?.editionDescription}</LigneTech>
              {/* Éditeur, lieu et année sur trois lignes distinctes, comme dans la fiche
                  de traduction : une ligne « Publication » les recollait en une chaîne
                  où l'on ne savait plus lequel des trois manquait. */}
              <LigneTech c="Éditeur">{formaterEditeur(oeuvre.editeur) || null}</LigneTech>
              <LigneTech c="Lieu">{oeuvre.ville}</LigneTech>
              <LigneTech c="Année">{formaterDateHistorique(oeuvre.date_publication) || null}</LigneTech>
              <LigneTech c="Collection">{oeuvre.collection}</LigneTech>
              <LigneTech c="Source"><Consulter url={sourceUrl} libelle="Consulter la source" /></LigneTech>
            </section>

            {/* Commentaire public de l'édition : la même prose qu'au frontispice, à sa
                place ici, sous les rangées qu'elle explique. */}
            {oeuvre.commentaire_traduction?.trim() && (
              <section>
                <TitreSection>Cette édition</TitreSection>
                <p className="fiche-edition-prose">{sansPointFinal(oeuvre.commentaire_traduction)}</p>
              </section>
            )}

          </div>
        )}
        {aColonnes
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>{colonneDroite}</div>
          : colonneDroite}
      </div>

      <style>{STYLES_FICHE}</style>
    </>
  )
}

export default function FicheEdition({ donnees, onOuvrirAuteur, onFermer }: {
  donnees: DonneesEdition
  onOuvrirAuteur: (idAuteur: string) => void
  onFermer: () => void
}) {
  const [photoPosition, setPhotoPosition] = useState<unknown>(null)
  const idPortrait = donnees.auteurs[0]?.id_auteur ?? null

  // Le CADRAGE du portrait est la seule chose que la page de lecture n'a pas : elle
  // connaît le nom et l'identifiant de ses auteurs, jamais leur `photo_position`.
  useEffect(() => {
    if (!idPortrait) return
    let annule = false
    supabase.from('auteurs').select('photo_position').eq('id_auteur', idPortrait).maybeSingle()
      .then(({ data }) => { if (!annule) setPhotoPosition((data as { photo_position?: unknown } | null)?.photo_position ?? null) })
    return () => { annule = true }
  }, [idPortrait])

  // Échap ferme ; le défilement de fond est gelé tant que la fenêtre est ouverte.
  // ⚠️ C'est le CONTENU de la boîte qui défile, jamais le calque : sur un écran court,
  // une boîte qui remonte se fait couper au ras de la barre de navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    const prec = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prec }
  }, [onFermer])

  if (typeof document === 'undefined') return null

  return createPortal(
    /* ⛔ Le calque part de HAUTEUR_NAVBAR, jamais d'un nombre de pixels : la barre
       mesure 56 px à la racine 16 et 77 à la racine 22, si bien qu'un `top: 48` faisait
       remonter le voile DERRIÈRE elle sur un grand écran (charte, § Responsive). */
    <div onClick={onFermer} className="fiche-edition-calque"
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(30,26,20,0.42)', zIndex: Z_FICHE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflow: 'hidden' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="fiche-edition-titre" onClick={e => e.stopPropagation()} className="fiche-edition-cadre"
        style={{ position: 'relative', width: '100%', maxWidth: '52rem', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--cs-fond)', borderRadius: '12px', border: '1px solid var(--cs-bord-clair)', boxShadow: 'var(--cs-ombre-modale)', padding: '30px 34px 28px' }}>
        <button onClick={onFermer} aria-label="Fermer" title="Fermer"
          style={{ position: 'sticky', float: 'right', top: '0', marginRight: '-6px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        <ContenuFicheEdition donnees={donnees} photoPosition={photoPosition} onOuvrirAuteur={onOuvrirAuteur} />
      </div>
    </div>,
    document.body,
  )
}
