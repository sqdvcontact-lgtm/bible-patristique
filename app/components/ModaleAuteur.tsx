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
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { rendreSiecles } from '@/app/lib/siecles'
import { sansPointFinal } from '@/app/lib/titres'
import { type RangChrono, coulType, LIB_TYPE } from '@/app/lib/frise'
import { rendreMarquesNote } from '@/app/lib/texteEnrichiEssai'
import HistoricalDate from '@/app/components/HistoricalDate'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type OeuvreResumee = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  trad_auteur: string | null; editeur: string | null
  ville: string | null; note?: string | null
  date_composition_affichage_courte: string | null
  date_composition_precision_affichage: string | null
  composition_debut_annee: number | null
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

function TitreSection({ children, centre }: { children: ReactNode; centre?: boolean }) {
  return <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontWeight: 'normal', fontSize: '0.84375rem', color: 'var(--cs-vert)', margin: '0 0 5px', textAlign: centre ? 'center' : 'left' }}>{children}</h3>
}

// ── Frise agrégée de l'auteur ──────────────────────────────────────────────────
// Trois brins, distingués par la couleur du point : Vie (le parcours de l'auteur),
// Œuvre (compositions), Contexte (arrière-plan ecclésial et politique). Le type
// vient de `type_affichage` dans la vue ; il n'est plus déduit ici.

// Puce pleine, à la couleur du type d'événement (Vie, Œuvre, Contexte).
function stylePuce(type: string | null) {
  return { background: coulType(type), border: '1.5px solid #f7f4ef' }
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginBottom: '13px', justifyContent: 'center' }}>
          {brins.map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.5625rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a938a' }}>
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
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: contexte ? '#d2c69f' : '#b7a06a', textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1.18, paddingBottom: pb }}><HistoricalDate value={a.date_affichage_courte} variant="short" /></span>
              {/* Rail + puce. La puce est dimensionnée et positionnée en `em` (relatifs à
                  la taille du titre) : elle suit la police fluide et reste alignée sur la
                  première ligne, quelle que soit l'échelle de l'écran. */}
              <div style={{ position: 'relative', alignSelf: 'stretch', fontSize: '0.6875rem' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', transform: 'translateX(-50%)', background: '#e9e1d0' }} />
                <div aria-hidden style={{ position: 'absolute', left: '50%', top: '0.6em', width: '0.82em', height: '0.82em', borderRadius: '50%', transform: 'translate(-50%, -50%)', boxSizing: 'border-box', ...stylePuce(type) }} />
              </div>
              <div style={{ paddingBottom: pb, fontSize: '0.6875rem', lineHeight: 1.18 }}>
                {aDetail ? (
                  <button onClick={() => basculer(cle)} aria-expanded={ouvert}
                    style={{ display: 'inline', textAlign: 'left', background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '1em', lineHeight: 'inherit', color: contexte ? '#8a8278' : '#2a3d30', fontStyle: italique ? 'italic' : 'normal' }}>
                    {rendreMarquesNote(a.titre)}
                  </button>
                ) : (
                  <span style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '1em', lineHeight: 'inherit', color: contexte ? '#8a8278' : '#2a3d30', fontStyle: italique ? 'italic' : 'normal' }}>
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
    <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.6rem', lineHeight: 1.3, letterSpacing: '-0.005em', color: '#8a8278', margin: '0 0 2px', textAlign: 'justify' }}>
      {label && <span style={{ color: '#a89f94' }}>{label} : </span>}{children}
    </p>
  )
}

function Contenu({ auteur, onClose, evenements }: { auteur: Auteur; onClose: () => void; evenements: RangChrono[] }) {
  const [photoOk, setPhotoOk] = useState(true)
  const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/auteurs/${auteur.id_auteur}.jpg`
  const photoPos = parsePhotoPos(auteur.photo_position)
  const datesAuteur = formaterDateHistorique(auteur.dates)
  const initiales = auteur.nom.split(/\s+/).map(m => m[0]).filter(Boolean).slice(0, 2).join('')
  const meta = rendreSiecles([datesAuteur, auteur.langue_principale, ...(auteur.traditions ?? [])].filter(Boolean).join(' · '))

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
      <TitreSection centre>Chronologie</TitreSection>
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
            <Link href={`/oeuvre/${o.id_oeuvre}`} onClick={onClose} className="auteur-oeuvre"
              style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: '#3a3530', minWidth: 0, lineHeight: 1.38 }}>{sansPointFinal(o.titre)}</Link>
          </li>
        ))}
        {oeuvresAbsentes.map(o => (
          <li key={o.id_oeuvre} style={{ display: 'contents' }}>
            <span title={o.date_composition_precision_affichage ?? undefined} style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: dateCompo(o) ? '#cdbe93' : '#d3ccc0', fontStyle: dateCompo(o) ? 'normal' : 'italic', textAlign: 'right', whiteSpace: 'nowrap' }}>{dateCompo(o) ? <HistoricalDate value={dateCompo(o)} variant="short" /> : 'Date inconnue'}</span>
            {/* Œuvre répertoriée mais pas encore disponible : estompée, non cliquable. */}
            <span className="auteur-oeuvre--absente" title="Œuvre répertoriée, pas encore disponible" style={{ minWidth: 0, lineHeight: 1.38 }}>
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: '#a8a29a' }}>{sansPointFinal(o.titre)}</span>
              <span style={{ marginLeft: '7px', fontSize: '0.53125rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#b7ad9a' }}>répertoriée</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  ) : null

  return (
    <>
      {/* En-tête : portrait, nom, contexte */}
      <header style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ width: '6.5rem', height: '130px', flexShrink: 0, padding: '5px', background: '#fff', border: '1px solid #ddd5c4', boxShadow: '0 2px 10px rgba(60,50,30,0.10)' }}>
          <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#ede9e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photoOk ? (
              <img src={photoUrl} alt={auteur.nom} onError={() => setPhotoOk(false)}
                style={{ width: '100%', height: '100%', display: 'block', ...stylePhoto(photoPos) }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '2.125rem', color: '#c3b48c', fontStyle: 'italic' }}>{initiales}</span>
            )}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.4375rem', fontWeight: 'normal', color: '#1e2e24', margin: 0, lineHeight: 1.12 }}>{auteur.nom}</h2>
          {auteur.nom_original && <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: '#9a8a6e', fontStyle: 'italic', margin: '2px 0 0' }}>{auteur.nom_original}</p>}
          {meta && <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.59375rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a8a094', margin: '8px 0 0' }}>{meta}</p>}
        </div>
      </header>

      {/* Deux colonnes : à gauche la vie, à droite la chronologie. Repliées en une
          seule colonne sur mobile (voir media-query .auteur-grid). */}
      <div className="auteur-grid" style={{ display: 'grid', gridTemplateColumns: aColonnes ? 'minmax(0, 1.35fr) minmax(0, 1fr)' : '1fr', gap: '26px', alignItems: 'start' }}>
        <div className="auteur-grid-vie" style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderRight: aColonnes ? '1px solid #ece7de' : 'none', paddingRight: aColonnes ? '24px' : 0 }}>
          {auteur.note_biographique && <section><TitreSection>Vie</TitreSection><p className="auteur-prose">{rendreSiecles(auteur.note_biographique)}</p></section>}
          {auteur.anecdotes?.trim() && (
            <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontSize: '0.71875rem', color: '#6b6560', lineHeight: 1.5, margin: 0, paddingLeft: '11px', borderLeft: '1px solid #ddd0b0' }}>{rendreSiecles(auteur.anecdotes)}</p>
          )}
          {auteur.note_theologique && <section><TitreSection>Pensée</TitreSection><p className="auteur-prose">{rendreSiecles(auteur.note_theologique)}</p></section>}
          {auteur.influence?.trim() && <section><TitreSection>Postérité</TitreSection><p className="auteur-prose">{rendreSiecles(auteur.influence)}</p></section>}
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
    Promise.all([
      supabase.from('auteurs')
        .select('id_auteur, nom, nom_original, titre, dates, siecle, traditions, photo_position, note_biographique, note_theologique, langue_principale, anecdotes, influence')
        .eq('id_auteur', id).maybeSingle(),
      supabase.from('v_oeuvres_dates')
        .select('id_oeuvre, titre, sous_titre, trad_auteur, editeur, ville, note, date_composition_affichage_courte, date_composition_precision_affichage, composition_debut_annee')
        .eq('id_auteur', id),
    ]).then(([auteurResultat, oeuvresResultat]) => {
      if (auteurResultat.error || oeuvresResultat.error || !auteurResultat.data) { setErreur(true); return }
      setAuteur({ ...auteurResultat.data, oeuvres: oeuvresResultat.data ?? [] } as Auteur)
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,20,0.42)', zIndex: 2100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} className="auteur-modale-inner"
        style={{ position: 'relative', width: '100%', maxWidth: '52rem', background: '#f7f4ef', borderRadius: '12px', border: '1px solid #e0d8cc', boxShadow: '0 20px 60px rgba(40,30,15,0.30)', padding: '30px 34px 28px', margin: 'auto' }}>
        <button onClick={onClose} aria-label="Fermer" title="Fermer"
          style={{ position: 'absolute', top: '12px', right: '14px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid #e0d8cc', background: '#fff', color: '#9a958d', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        {erreur ? (
          <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', color: '#b0a89e', textAlign: 'center', margin: '30px 0' }}>Auteur introuvable</p>
        ) : !auteur ? (
          <p style={{ fontSize: '0.8125rem', color: '#b0a89e', fontStyle: 'italic', textAlign: 'center', margin: '30px 0' }}>Chargement…</p>
        ) : (
          <Contenu auteur={auteur} onClose={onClose} evenements={evenements} />
        )}

        <style>{`
          .auteur-prose { font-family: var(--font-source-sans), Arial, sans-serif; font-size:0.75rem; line-height: 1.5; color: #3a3530; text-align: justify; hyphens: auto; margin: 0; }
          .auteur-oeuvre { display: block; padding: 1px 8px; margin: 0 -8px; border-radius: 4px; text-decoration: none; transition: background 0.12s; }
          a.auteur-oeuvre:hover { background: rgba(var(--cs-vert-rgb),0.06); }
          .auteur-oeuvre--absente { cursor: default; }
          /* Mobile : tout sur une seule colonne, cadre resserré. */
          @media (max-width: 640px) {
            .auteur-modale-overlay { padding: 14px 8px !important; }
            .auteur-modale-inner { padding: 22px 15px 20px !important; border-radius: 10px !important; }
            .auteur-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
            .auteur-grid-vie { border-right: none !important; padding-right: 0 !important; }
          }
        `}</style>
      </div>
    </div>,
    document.body
  )
}
