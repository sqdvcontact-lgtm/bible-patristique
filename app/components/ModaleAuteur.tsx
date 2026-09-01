'use client'

// ── Fiche auteur EN FENÊTRE ────────────────────────────────────────────────────
// Ce n'est plus une page mais une fenêtre modale, ouvrable depuis plusieurs endroits
// (Bibliothèque, résultats de recherche…). Elle se ferme d'un clic sur la croix ou hors
// du cadre (ou par Échap). Le contenu est condensé : interlignes serrés, deux colonnes
// (à gauche la vie, à droite la chronologie), liste d'œuvres compacte incluant les œuvres
// répertoriées mais non encore présentes.

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { espacerIntervallesHistoriques, formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { libelleLangue } from '@/app/lib/langues'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { rendreSiecles } from '@/app/lib/siecles'
import { CADRES_PORTRAIT } from '@/app/lib/photoAuteur'
import { type RangChrono, coulType, LIB_TYPE, estUrl } from '@/app/lib/frise'
import { rendreMarquesNote } from '@/app/lib/texteEnrichiEssai'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import HistoricalDate from '@/app/components/HistoricalDate'
import { chargerAuteursParOeuvre, libelleAuteurs, type AuteurOeuvre } from '@/app/lib/auteursOeuvre'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type OeuvreResumee = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  trad_auteur: string | null; editeur: string | null
  ville: string | null; note?: string | null
  date_composition_affichage_courte: string | null
  date_composition_precision_affichage: string | null
  composition_debut_annee: number | null
  auteurs?: AuteurOeuvre[]
}
type AuteurPhotoPos = { x: number; y: number; scale: number; scaleX?: number; scaleY?: number }
type Auteur = {
  id_auteur: string; nom: string; nom_original: string | null
  titre: string | null; dates: string | null; siecle: number | null
  traditions: string[] | null; note_biographique: string | null
  note_theologique: string | null; langue_principale: string | null
  anecdotes: string | null; influence: string | null
  photo_position?: unknown
  oeuvres: OeuvreResumee[]
}

const POS_DEFAUT: AuteurPhotoPos = { x: 50, y: 24, scale: 1, scaleX: 1, scaleY: 1 }

/** Les auteurs d'une œuvre écrite à plusieurs, en mention discrète après le titre.
 *  Rien pour une œuvre à auteur unique : la fiche répéterait son propre nom. */
function MentionCoAuteurs({ auteurs }: { auteurs?: AuteurOeuvre[] }) {
  if (!auteurs || auteurs.length < 2) return null
  return (
    <span style={{ marginLeft: '7px', fontSize: '0.625rem', color: 'var(--cs-texte-doux)', whiteSpace: 'normal' }}>
      {libelleAuteurs(auteurs)}
    </span>
  )
}
function parsePhotoPos(raw: unknown): AuteurPhotoPos {
  const r = raw as any
  const src = r && typeof r.x === 'number' ? r : r?.fiche
  return {
    x: typeof src?.x === 'number' ? src.x : POS_DEFAUT.x,
    y: typeof src?.y === 'number' ? src.y : POS_DEFAUT.y,
    scale: typeof src?.scale === 'number' ? src.scale : POS_DEFAUT.scale,
    scaleX: typeof src?.scaleX === 'number' ? src.scaleX : POS_DEFAUT.scaleX,
    scaleY: typeof src?.scaleY === 'number' ? src.scaleY : POS_DEFAUT.scaleY,
  }
}
function stylePhoto(pos: AuteurPhotoPos): CSSProperties {
  return {
    objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale}) scaleX(${pos.scaleX ?? 1}) scaleY(${pos.scaleY ?? 1})`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
  }
}

export function TitreSection({ children, centre }: { children: ReactNode; centre?: boolean }) {
  return <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontWeight: 'normal', fontSize: '0.84375rem', color: 'var(--cs-vert)', margin: '0 0 5px', textAlign: centre ? 'center' : 'left' }}>{children}</h3>
}

// ── Les pièces communes aux TROIS fiches ───────────────────────────────────────
// La fiche d'auteur est le modèle : la fiche de traduction (`ModaleTraduction`) et
// la fiche d'édition (`app/oeuvre/[id]/FicheEdition`) sont composées sur elle. Les
// pièces qu'elles partagent vivent donc ICI, et non recopiées dans chacune : le
// portrait sous passe-partout, le titre de section, la rangée « étiquette · valeur »
// et le lien de consultation. Trois copies d'un même cadre finissent toujours par
// diverger, et c'est exactement ce qu'on venait de défaire.

/** Le portrait d'un auteur dans le cadre de la fiche : 6,5 rem × 130 px, passe-partout
 *  de 5 px, ombre posée. Repli sur les initiales quand l'image manque.
 *
 *  ⚠️ On retient l'ADRESSE qui a manqué, et non un booléen : la même fiche peut
 *  changer d'auteur sans être remontée, et un booléen resterait alors à « cassé ». */
export function PortraitAuteur({ idAuteur, nom, photoPosition, flottant }: {
  idAuteur: string; nom: string; photoPosition?: unknown
  /** Le portrait quitte l'en-tête, passe au format portrait, et la prose l'habille.
   *  ⚠️ Sans ce drapeau, la pose ne change PAS : la fiche d'édition emploie le même
   *  composant et n'a aucune prose à faire couler autour. */
  flottant?: boolean
}) {
  const [casse, setCasse] = useState<string | null>(null)
  const url = `${SUPABASE_URL}/storage/v1/object/public/auteurs/${idAuteur}.jpg`
  const initiales = nom.split(/\s+/).map(m => m[0]).filter(Boolean).slice(0, 2).join('')
  // ⚠️ Les mesures du portrait FLOTTANT vivent dans la FEUILLE, non ici : une
  // media-query ne bat pas un style en ligne sans « !important », et le portrait doit
  // se resserrer sur un téléphone, où 128 px ne laisseraient que 183 px à la prose.
  return (
    <div className={flottant ? 'auteur-portrait-flottant' : undefined}
      style={flottant
        ? { padding: '5px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee)' }
        : { width: '6.5rem', height: '130px', flexShrink: 0, padding: '5px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee)' }}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--cs-fond-doux)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {casse !== url ? (
          <img src={url} alt={nom} onError={() => setCasse(url)}
            style={{ width: '100%', height: '100%', display: 'block', ...stylePhoto(parsePhotoPos(photoPosition)) }} />
        ) : (
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '2.125rem', color: 'var(--cs-or-doux)', fontStyle: 'italic' }}>{initiales}</span>
        )}
      </div>
    </div>
  )
}

/** Rangée « étiquette · valeur » des sections documentaires. La colonne d'étiquettes
 *  mesure 8,5 rem : elle porte des intitulés entiers (« Responsable de l'édition »),
 *  et c'est cette mesure qui commande la pleine largeur de ces sections. La classe
 *  `cs-fiche-cle` existe pour que chaque fiche puisse la resserrer sur téléphone. */
const cleTech: CSSProperties = { flexShrink: 0, width: '8.5rem', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', lineHeight: 1.5, paddingTop: '1px' }
export const LigneTech = ({ c, children }: { c: string; children: ReactNode }) => children ? (
  <div style={{ display: 'flex', gap: '12px', padding: '4px 0', borderTop: '1px solid var(--cs-fond)', alignItems: 'baseline' }}>
    <span className="cs-fiche-cle" style={cleTech}>{c}</span><span style={{ flex: 1, fontSize: '0.71875rem', color: 'var(--cs-texte)', lineHeight: 1.45 }}>{children}</span>
  </div>
) : null

/** Lien vers une source extérieure. Rien du tout si l'adresse n'en est pas une. */
export const Consulter = ({ url, libelle }: { url: string | null | undefined; libelle: string }) => (url && estUrl(url))
  ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cs-vert)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{libelle}</a> : null

// ── Frise agrégée de l'auteur ──────────────────────────────────────────────────
// Trois brins, distingués par la couleur du point : Vie (le parcours de l'auteur),
// Œuvre (compositions), Contexte (arrière-plan ecclésial et politique). Le type
// vient de `type_affichage` dans la vue ; il n'est plus déduit ici.

// Puce pleine, à la couleur du type d'événement (Vie, Œuvre, Contexte).
function stylePuce(type: string | null) {
  return { background: coulType(type), border: '1.5px solid var(--cs-fond)' }
}

// Chronologie d'un auteur : une SEULE frise mêlant vie, œuvres et contexte,
// dans l'ordre éditorial de la vue (`ordre_affichage`, jamais recalculé ici).
// Les trois types se distinguent par la puce et une nuance typographique, sans
// blocs colorés qui rompraient l'homogénéité.
export function FriseAuteur({ evenements, sansLegende }: { evenements: RangChrono[]; sansLegende?: boolean }) {
  const [ouverts, setOuverts] = useState<Set<number>>(new Set())
  if (!evenements.length) return null
  const presents = new Set(evenements.map(a => a.type_affichage))
  const brins = ['formation', 'edition', 'reception', 'vie', 'œuvre', 'contexte'].filter(t => presents.has(t))
  const basculer = (k: number) => setOuverts(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s })
  return (
    <div>
      {/* Légende : seulement les brins effectivement présents (auteur OU traduction), et
          jamais quand un seul brin est présent (une légende à une entrée n'apprend rien).
          `sansLegende` la supprime tout à fait (chronologie d'une traduction). */}
      {!sansLegende && brins.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginBottom: '13px', justifyContent: 'flex-start' }}>
          {brins.map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.5625rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)' }}>
              <span aria-hidden style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, ...stylePuce(t) }} />
              {LIB_TYPE[t] ?? t}
            </span>
          ))}
        </div>
      )}
      {/* Trois colonnes : date | rail (avec la puce) | intitulé. Le point est aligné
          sur la première ligne. Un clic sur l'intitulé déplie le détail. */}
      {/* `align-items: start` (et non baseline) : un titre sur deux lignes exposerait, en
          baseline, la ligne de base de sa DERNIÈRE ligne — la date « tombait » alors d'une
          ligne et se désalignait de la puce. En start, date, puce et titre partagent la
          première ligne. */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'max-content 16px 1fr', columnGap: '9px', rowGap: 0, alignItems: 'start' }}>
        {evenements.map((a, i) => {
          const type = a.type_affichage
          const contexte = type === 'contexte'
          // Plus d'italique « par défaut » sur les œuvres : le romain convient, l'italique
          // ne provient que du balisage *…* dans le titre. Le contexte reste en italique.
          const italique = contexte
          const dernier = i === evenements.length - 1
          const cle = a.association_id
          const ouvert = ouverts.has(cle)
          const aDetail = !!a.notice
          const pb = dernier && !ouvert ? '0' : '10px'
          return (
            <li key={cle} style={{ display: 'contents' }}>
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: contexte ? '#d2c69f' : '#b7a06a', textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1.18, paddingBottom: pb }}><HistoricalDate value={a.date_affichage_courte ?? a.date_affichage} variant="short" /></span>
              {/* Rail + puce. La puce est dimensionnée et positionnée en `em` (relatifs à
                  la taille du titre) : elle suit la police fluide et reste alignée sur la
                  première ligne, quelle que soit l'échelle de l'écran. */}
              <div style={{ position: 'relative', alignSelf: 'stretch', fontSize: '0.6875rem' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', transform: 'translateX(-50%)', background: 'var(--cs-bord-clair)' }} />
                <div aria-hidden style={{ position: 'absolute', left: '50%', top: '0.6em', width: '0.82em', height: '0.82em', borderRadius: '50%', transform: 'translate(-50%, -50%)', boxSizing: 'border-box', ...stylePuce(type) }} />
              </div>
              <div style={{ paddingBottom: pb, fontSize: '0.6875rem', lineHeight: 1.18 }}>
                {aDetail ? (
                  <button onClick={() => basculer(cle)} aria-expanded={ouvert}
                    style={{ display: 'inline', textAlign: 'left', background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '1em', lineHeight: 'inherit', color: contexte ? 'var(--cs-texte-gris)' : 'var(--cs-encre)', fontStyle: italique ? 'italic' : 'normal' }}>
                    {rendreMarquesNote(a.titre)}
                  </button>
                ) : (
                  <span style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '1em', lineHeight: 'inherit', color: contexte ? 'var(--cs-texte-gris)' : 'var(--cs-encre)', fontStyle: italique ? 'italic' : 'normal' }}>
                    {rendreMarquesNote(a.titre)}
                  </span>
                )}
                {ouvert && (
                  <div style={{ margin: '3px 0 1px' }}>
                    {a.notice && <DetailChrono>{rendreMarquesNote(a.notice)}</DetailChrono>}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DetailChrono({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.59375rem', lineHeight: 1.3, letterSpacing: '-0.005em', color: 'var(--cs-texte-gris)', margin: '0 0 2px', textAlign: 'justify' }}>
      {label && <span style={{ color: 'var(--cs-texte-faible)' }}>{label} : </span>}{children}
    </p>
  )
}

function Contenu({ auteur, onClose, evenements }: { auteur: Auteur; onClose: () => void; evenements: RangChrono[] }) {
  const datesAuteur = espacerIntervallesHistoriques(formaterDateHistorique(auteur.dates))
  // Dates, langue et traditions sur une même ligne d'étiquettes : la langue y prend
  // donc la capitale, comme le siècle et la tradition qui l'encadrent.
  const meta = rendreSiecles([datesAuteur, libelleLangue(auteur.langue_principale), ...(auteur.traditions ?? [])].filter(Boolean).join(' · '))

  // Affichage : la date courte de composition établie par la vue canonique.
  const dateCompo = (o: OeuvreResumee) => o.date_composition_affichage_courte || ''
  // Tri par année de composition (croissante). Les œuvres sans date closent la
  // liste, départagées par le titre.
  const anneeTri = (o: OeuvreResumee) => {
    if (o.composition_debut_annee != null) return o.composition_debut_annee
    return Infinity
  }
  const parDate = (a: OeuvreResumee, b: OeuvreResumee) =>
    anneeTri(a) - anneeTri(b) || a.titre.localeCompare(b.titre, 'fr')
  const oeuvresPresentes = auteur.oeuvres.filter(estOeuvrePubliee).sort(parDate)
  const oeuvresAbsentes = auteur.oeuvres.filter(o => !estOeuvrePubliee(o)).sort(parDate)
  // La chronologie publique est exclusivement alimentée par la vue normalisée.
  const aChrono = evenements.length > 0
  const aColonnes = !!(auteur.note_biographique || auteur.note_theologique || auteur.influence || auteur.anecdotes) && aChrono
  const aOeuvres = oeuvresPresentes.length > 0 || oeuvresAbsentes.length > 0

  const blocChrono = aChrono ? (
    <section>
      <TitreSection>Chronologie</TitreSection>
      <FriseAuteur evenements={evenements} />
    </section>
  ) : null

  // Contenu « Œuvres », harmonisé avec la Chronologie (colonne de date à droite, même
  // gouttière, même rythme vertical) : « année · titre » comme « année · événement ».
  const contenuOeuvres = aOeuvres ? (
    <>
      {/* Titre aligné à gauche, comme « Vie », « Pensée », « Postérité ». */}
      <TitreSection>Œuvres</TitreSection>
      {/* Grille PARTAGÉE (comme la chronologie) : la colonne des dates prend `max-content`
          — donc la largeur de la date la plus longue, jamais plus — si bien que le bloc se
          cale au maximum à gauche, les titres restent alignés, et une date longue
          (« 1888-1889 ») ne revient jamais à la ligne (`nowrap`). */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '9px', rowGap: '4px', alignItems: 'baseline' }}>
        {oeuvresPresentes.map(o => (
          <li key={o.id_oeuvre} style={{ display: 'contents' }}>
            <span title={o.date_composition_precision_affichage ?? undefined} style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: dateCompo(o) ? '#b7a06a' : '#c9c1b4', fontStyle: dateCompo(o) ? 'normal' : 'italic', textAlign: 'right', whiteSpace: 'nowrap' }}>{dateCompo(o) ? <HistoricalDate value={dateCompo(o)} variant="short" /> : 'Date inconnue'}</span>
            {/* Œuvre disponible : titre en teinte sobre (pas vert), cliquable vers l'œuvre. */}
            <span style={{ minWidth: 0, lineHeight: 1.38 }}>
              <Link href={`/oeuvre/${o.id_oeuvre}`} onClick={onClose} className="auteur-oeuvre"
                style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.38 }}>{o.titre}</Link>
              {/* Œuvre écrite à plusieurs : la fiche dit avec qui, sinon l'auteur
                  paraîtrait la signer seul. */}
              <MentionCoAuteurs auteurs={o.auteurs} />
            </span>
          </li>
        ))}
        {oeuvresAbsentes.map(o => (
          <li key={o.id_oeuvre} style={{ display: 'contents' }}>
            <span title={o.date_composition_precision_affichage ?? undefined} style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: dateCompo(o) ? 'var(--cs-or-doux)' : 'var(--cs-bord)', fontStyle: dateCompo(o) ? 'normal' : 'italic', textAlign: 'right', whiteSpace: 'nowrap' }}>{dateCompo(o) ? <HistoricalDate value={dateCompo(o)} variant="short" /> : 'Date inconnue'}</span>
            {/* Œuvre répertoriée mais pas encore disponible : estompée, non cliquable. */}
            <span className="auteur-oeuvre--absente" title="Œuvre répertoriée, pas encore disponible" style={{ minWidth: 0, lineHeight: 1.38 }}>
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: 'var(--cs-texte-faible)' }}>{o.titre}</span>
              <MentionCoAuteurs auteurs={o.auteurs} />
              <span style={{ marginLeft: '7px', fontSize: '0.53125rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)' }}>répertoriée</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  ) : null

  return (
    <>

      {/* Deux colonnes : à gauche la vie, à droite la chronologie. Repliées en une
          seule colonne sur mobile (voir media-query .auteur-grid). */}
      <div className="auteur-grid" style={{ display: 'grid', gridTemplateColumns: aColonnes ? 'minmax(0, 1.35fr) minmax(0, 1fr)' : '1fr', gap: '26px', alignItems: 'start' }}>
        {/* EN BLOC, non plus en colonne de flex : un flottant n'existe pas dans un
            conteneur flex, ses enfants devenant des elements de flex. C'est la
            condition pour que la prose habille le portrait ; l'ecart entre sections se
            reprend en marge (voir « .auteur-grid-vie > section » plus bas). */}
        <div className="auteur-grid-vie" style={{ borderRight: aColonnes ? '1px solid var(--cs-fond-doux)' : 'none', paddingRight: aColonnes ? '24px' : 0 }}>
          {/* Le portrait ouvre la colonne et FLOTTE : le nom se pose a sa droite, la
              prose de « Vie » vient ensuite et le contourne. Il devait entrer dans le
              MEME flux que le nom — les biographies font quelque six cents signes, et
              laisse dans la seule section « Vie » le texte n'aurait pas eu le temps de
              le contourner avant de finir. */}
          <PortraitAuteur idAuteur={auteur.id_auteur} nom={auteur.nom} photoPosition={auteur.photo_position} flottant />
          <header>
            <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.4375rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.12 }}>{auteur.nom}</h2>
            {auteur.nom_original && <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: '2px 0 0' }}>{auteur.nom_original}</p>}
            {meta && <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.59375rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '8px 0 0' }}>{meta}</p>}
          </header>
          {auteur.note_biographique && <section><TitreSection>Vie</TitreSection><p className="auteur-prose">{rendreEnrichi(auteur.note_biographique)}</p></section>}
          {auteur.anecdotes?.trim() && (
            <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontSize: '0.71875rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, margin: 0, paddingLeft: '11px', borderLeft: '1px solid var(--cs-danger-bord)' }} className="cs-notice-italique auteur-bloc">{rendreEnrichi(auteur.anecdotes)}</p>
          )}
          {auteur.note_theologique && <section><TitreSection>Pensée</TitreSection><p className="auteur-prose">{rendreEnrichi(auteur.note_theologique)}</p></section>}
          {auteur.influence?.trim() && <section><TitreSection>Postérité</TitreSection><p className="auteur-prose">{rendreEnrichi(auteur.influence)}</p></section>}
          {/* Les œuvres closent la colonne de gauche, sous « Postérité ». */}
          {contenuOeuvres && <section>{contenuOeuvres}</section>}
        </div>
        {/* Colonne de droite : la chronologie (frise). N'existe qu'en présentation deux colonnes. */}
        {aColonnes ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0 }}>
            {blocChrono}
          </div>
        ) : (
          blocChrono
        )}
      </div>
    </>
  )
}

export default function ModaleAuteur({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [auteur, setAuteur] = useState<Auteur | null>(null)
  const [evenements, setEvenements] = useState<RangChrono[]>([])
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!id) { setAuteur(null); setEvenements([]); setErreur(false); return }
    setAuteur(null); setEvenements([]); setErreur(false)
    // Les œuvres de l'auteur, CO-SIGNATURES COMPRISES : la liste vient des couples
    // (œuvre, auteur), et non du seul `id_auteur` de l'œuvre, qui n'en porte que
    // le premier. Si cette lecture échoue, on retombe sur l'ancien filtre plutôt
    // que d'afficher une fiche sans œuvre.
    chargerAuteursParOeuvre(supabase).then(auteursParOeuvre => {
      const idsDeLAuteur = Object.entries(auteursParOeuvre)
        .filter(([, auteurs]) => auteurs.some(a => a.id_auteur === id))
        .map(([idOeuvre]) => idOeuvre)
      const COLONNES = 'id_oeuvre, titre, sous_titre, trad_auteur, editeur, ville, note, date_composition_affichage_courte, date_composition_precision_affichage, composition_debut_annee'
      const requeteOeuvres = idsDeLAuteur.length > 0
        ? supabase.from('v_oeuvres_dates').select(COLONNES).in('id_oeuvre', idsDeLAuteur)
        : supabase.from('v_oeuvres_dates').select(COLONNES).eq('id_auteur', id)
      return Promise.all([
        supabase.from('auteurs')
          .select('id_auteur, nom, nom_original, titre, dates, siecle, traditions, photo_position, note_biographique, note_theologique, langue_principale, anecdotes, influence')
          .eq('id_auteur', id).maybeSingle(),
        requeteOeuvres,
        Promise.resolve(auteursParOeuvre),
      ])
    }).then(([auteurResultat, oeuvresResultat, auteursParOeuvre]) => {
      if (auteurResultat.error || oeuvresResultat.error || !auteurResultat.data) { setErreur(true); return }
      const oeuvres = (oeuvresResultat.data ?? []).map(o => ({ ...o, auteurs: auteursParOeuvre[o.id_oeuvre] ?? [] }))
      setAuteur({ ...auteurResultat.data, oeuvres } as Auteur)
    })
    // Frise : la vue porte déjà l'ordre éditorial, la date rédigée, le type et
    // les sources. Les associations masquées en sont exclues à la source.
    supabase.from('v_chronologie_auteurs_dates').select('*')
      .eq('auteur_id', id).order('ordre_affichage')
      .then(({ data }) => setEvenements((data ?? []) as RangChrono[]))
  }, [id])

  // Échap ferme ; le défilement de fond est gelé tant que la fenêtre est ouverte.
  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [id, onClose])

  if (!id || typeof document === 'undefined') return null

  return createPortal(
    <div onClick={onClose} className="auteur-modale-overlay"
      /* La fenêtre commence SOUS la navbar (fixe), et le calque NE DÉFILE PAS.
         ⚠️ Il défilait auparavant : sur un écran court, la boîte remontait et se
         faisait couper net au ras de la barre, sans marge, ce qui donnait
         l'impression qu'elle passait dessous. C'est le CONTENU de la boîte qui
         défile désormais ; la boîte, elle, garde toujours sa marge en haut comme
         en bas, quelle que soit la hauteur de l'écran. */
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(30,26,20,0.42)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflow: 'hidden' }}>
      <div onClick={e => e.stopPropagation()} className="auteur-modale-inner"
        style={{ position: 'relative', width: '100%', maxWidth: '52rem', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--cs-fond)', borderRadius: '12px', border: '1px solid var(--cs-bord-clair)', boxShadow: 'var(--cs-ombre-modale)', padding: '30px 34px 28px' }}>
        <button onClick={onClose} aria-label="Fermer" title="Fermer"
          style={{ position: 'sticky', float: 'right', top: '0', marginRight: '-6px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        {erreur ? (
          <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', color: 'var(--cs-texte-faible)', textAlign: 'center', margin: '30px 0' }}>Auteur introuvable</p>
        ) : !auteur ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', textAlign: 'center', margin: '30px 0' }}>Chargement…</p>
        ) : (
          <Contenu auteur={auteur} onClose={onClose} evenements={evenements} />
        )}

        <style>{`
          .auteur-prose { font-family: var(--font-source-sans), Arial, sans-serif; font-size:0.75rem; line-height: 1.5; color: var(--cs-texte); text-align: justify; hyphens: auto; margin: 0; }
          /* L'ecart entre sections, que la colonne portait en « gap » du temps ou elle
             etait un flex. Pas sur l'en-tete, qui suit le portrait flottant : il doit
             ouvrir la colonne a sa hauteur. */
          .auteur-grid-vie > section, .auteur-grid-vie > .auteur-bloc { margin-top: 14px; }
          /* Les oeuvres ferment la colonne et reprennent la PLEINE mesure, quoi qu'il
             reste du portrait au-dessus : sans cela, une fiche a courte biographie les
             rentrerait de cent trente pixels. */
          .auteur-grid-vie > section:last-child { clear: left; }
          /* ⛔ LES MESURES VIENNENT DU REGISTRE, elles ne sont pas écrites ici. C'est
             « CADRES_PORTRAIT » (app/lib/photoAuteur.ts) qui les porte, et l'écran de
             cadrage de l'administration compose ses aperçus avec les mêmes : recopier
             le nombre ici, c'est faire mentir l'aperçu au premier réglage.
             128 × 200, soit un rapport de 0,64 : un vrai format portrait, là où les
             104 × 130 d'avant tenaient du timbre. Mesures POSÉES et non calculées :
             c'est un cadre de chrome, non une mesure de lecture (charte, § Responsive). */
          .auteur-portrait-flottant { width: ${CADRES_PORTRAIT.fiche.largeur}; height: ${CADRES_PORTRAIT.fiche.hauteur}; float: left; margin: 2px 18px 10px 0; }
          .auteur-oeuvre { display: block; padding: 1px 8px; margin: 0 -8px; border-radius: 4px; text-decoration: none; transition: background 0.12s; }
          a.auteur-oeuvre:hover { background: rgba(var(--cs-vert-rgb),0.06); }
          .auteur-oeuvre--absente { cursor: default; }
          /* Mobile : tout sur une seule colonne, cadre resserré. */
          @media (max-width: 640px) {
            .auteur-modale-overlay { padding: 14px 8px !important; }
            .auteur-modale-inner { padding: 22px 15px 20px !important; border-radius: 8px !important; }
            .auteur-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
            .auteur-grid-vie { border-right: none !important; padding-right: 0 !important; }
            /* ⚠️ Le portrait se resserre : à 375 px le cadre intérieur fait 329 px, et
               un flottant de 128 ne laisserait que 183 px à la prose. À 104, elle en
               garde 211.
               ⛔ Ces deux mesures-là ne vont PAS au registre, et c'est délibéré : le
               registre décrit le cadre de RÉFÉRENCE, celui sur lequel on règle un
               cadrage. On ne cadre pas un portrait sur un téléphone. */
            .auteur-portrait-flottant { width: 104px; height: 160px; margin-right: 14px; }
          }
        `}</style>
      </div>
    </div>,
    document.body
  )
}
