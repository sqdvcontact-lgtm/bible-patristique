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
import { rendreDate } from '@/app/lib/datesAffichage'
import { sansPointFinal } from '@/app/lib/titres'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type OeuvreResumee = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  trad_auteur: string | null; editeur: string | null
  ville: string | null; date_publication: string | null; langue: string | null; note?: string | null
  date_composition: string | null; date_approx: string | null; composition_debut_annee: number | null
}
type AuteurPhotoPos = { x: number; y: number; scale: number; scaleX?: number; scaleY?: number }
type Auteur = {
  id_auteur: string; nom: string; nom_original: string | null
  titre: string | null; dates: string | null; siecle: number | null
  traditions: string[] | null; note_biographique: string | null
  note_theologique: string | null; langue_principale: string | null
  chronologie: string | null; anecdotes: string | null; influence: string | null
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
  return <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontWeight: 'normal', fontSize: '0.84375rem', color: '#3d6b4f', margin: '0 0 5px', textAlign: centre ? 'center' : 'left' }}>{children}</h3>
}

// Chronologie : « année | événement », serrée.
function Chronologie({ texte }: { texte: string }) {
  const evenements = texte.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    // Séparateur année/événement : « | » ou tabulation (sans ambiguïté), ou bien
    // « — / – / : » MAIS uniquement entourés d'espaces — sinon un tiret de fourchette
    // (« 843–850 », sans espaces) serait pris pour le séparateur et couperait la date.
    const m = l.match(/^(.*?)\s*[|\t]\s*(.+)$/) || l.match(/^(.*?)\s+[—–:]\s+(.+)$/)
    return m ? { annee: m[1].trim(), evenement: m[2].trim() } : { annee: '', evenement: l }
  })
    // On n'autorise dans la chronologie que les dates concrètes (année chiffrée) :
    // les dates vagues sans chiffre (« Milieu du IXe siècle ») sont exclues.
    .filter(e => /\d/.test(e.annee))
  if (!evenements.length) return null
  // La colonne des années se dimensionne sur la PLUS LARGE (max-content), et non
  // plus à 46px fixes : « Vers 395-396 » ou « 413-426 » débordaient et chevauchaient
  // le texte. `ul` en grille + `li` en `display:contents` pour que toutes les lignes
  // partagent les mêmes colonnes (années alignées, gouttière constante).
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '9px', rowGap: '4px', alignItems: 'baseline' }}>
      {evenements.map((e, i) => (
        <li key={i} style={{ display: 'contents' }}>
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: '#b7a06a', textAlign: 'right', whiteSpace: 'nowrap' }}>{rendreDate(e.annee)}</span>
          <span style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.6875rem', color: '#3a3530', lineHeight: 1.38 }}>{e.evenement}</span>
        </li>
      ))}
    </ul>
  )
}

// ── Frise agregee de l'auteur ──────────────────────────────────────────────────
// Trois brins, distingues par la couleur du point : Vie (le parcours de l'auteur),
// Oeuvres (compositions), Contexte (arriere-plan ecclesial et politique). La categorie
// derive de nature_lien de l'association ; portee sert de repli.
type EvtFrise = {
  id: string; date_debut: number | null; date_fin: number | null; date_exacte: string | null
  qualification_date: string | null; titre: string; notice: string | null
  portee: string | null; importance_generale: string | null; genre: string | null; famille: string | null
}
type EvtAssoc = {
  nature_lien: string | null; pertinence: string | null
  titre_personnalise: string | null; ordre_force: number | null; ev: EvtFrise
}

// Vie = vert foncé (l'auteur), Œuvres = vert clair (ses écrits), Contexte = doré.
const COUL_CAT: Record<string, string> = { vie: '#3d6b4f', oeuvres: '#83a06a', contexte: '#c19a3e' }

function categorieEvt(nature: string | null, portee: string | null): 'vie' | 'oeuvres' | 'contexte' {
  const n = (nature || '').toLowerCase()
  if (n === 'bibliographique') return 'oeuvres'
  if (n === 'direct') return 'vie'
  if (!n) {
    if (portee === 'bibliographique') return 'oeuvres'
    if (portee === 'biographique') return 'vie'
  }
  return 'contexte'
}

// Annee(s) compactes pour la colonne de gauche ; la date exacte/notice va en infobulle.
function anneeFrise(e: EvtFrise): string {
  const f = (a: number) => (a < 0 ? `${-a} av. J.-C.` : String(a))
  if (e.date_debut == null) return e.date_exacte || ''
  if (e.date_fin != null && e.date_fin !== e.date_debut) return `${f(e.date_debut)}–${f(e.date_fin)}`
  return f(e.date_debut)
}

// Puce pleine, à la couleur de la catégorie (Vie, Œuvres, Contexte).
function stylePuce(cat: 'vie' | 'oeuvres' | 'contexte') {
  return { background: COUL_CAT[cat], border: '1.5px solid #f7f4ef' }
}

function FriseAuteur({ evenements }: { evenements: EvtAssoc[] }) {
  const [ouverts, setOuverts] = useState<Set<string>>(new Set())
  if (!evenements.length) return null
  const CATS = [
    { cle: 'vie', label: <>Vie</> },
    { cle: 'oeuvres', label: <>&OElig;uvres</> },
    { cle: 'contexte', label: <>Contexte</> },
  ] as const
  const presentes = new Set(evenements.map(a => categorieEvt(a.nature_lien, a.ev.portee)))
  const basculer = (k: string) => setOuverts(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s })
  return (
    <div>
      {/* Legende centree : seulement les brins effectivement presents. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginBottom: '13px', justifyContent: 'center' }}>
        {CATS.filter(c => presentes.has(c.cle)).map(c => (
          <span key={c.cle} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.5625rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a938a' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, ...stylePuce(c.cle) }} />
            {c.label}
          </span>
        ))}
      </div>
      {/* Trois colonnes : date | rail (avec la puce) | intitulé. Le point est aligné
          sur la première ligne — date, point et intitulé sur une même ligne. Un clic
          sur l'intitulé déplie la notice. */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'max-content 16px 1fr', columnGap: '9px', rowGap: 0, alignItems: 'baseline' }}>
        {evenements.map((a, i) => {
          const cat = categorieEvt(a.nature_lien, a.ev.portee)
          const contexte = cat === 'contexte'
          const italique = cat === 'oeuvres' || contexte
          const dernier = i === evenements.length - 1
          const cle = a.ev.id + ':' + i
          const notice = a.ev.notice || a.ev.date_exacte || null
          const ouvert = ouverts.has(cle)
          const pb = dernier && !ouvert ? '0' : '10px'
          return (
            <li key={cle} style={{ display: 'contents' }}>
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: contexte ? '#d2c69f' : '#b7a06a', textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1.18, paddingBottom: pb }}>{anneeFrise(a.ev)}</span>
              {/* Rail + puce. La puce est dimensionnée et positionnée en `em` (relatifs à
                  la taille du titre) : elle suit la police fluide et reste alignée sur la
                  première ligne, quelle que soit l'échelle de l'écran. */}
              <div style={{ position: 'relative', alignSelf: 'stretch', fontSize: '0.6875rem' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', transform: 'translateX(-50%)', background: '#e9e1d0' }} />
                <div style={{ position: 'absolute', left: '50%', top: '0.6em', width: '0.82em', height: '0.82em', borderRadius: '50%', transform: 'translate(-50%, -50%)', boxSizing: 'border-box', ...stylePuce(cat) }} />
              </div>
              <div style={{ paddingBottom: pb, fontSize: '0.6875rem', lineHeight: 1.18 }}>
                <span onClick={notice ? () => basculer(cle) : undefined}
                  style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '1em', lineHeight: 'inherit', color: contexte ? '#8a8278' : '#2a3d30', fontStyle: italique ? 'italic' : 'normal', cursor: notice ? 'pointer' : 'default' }}>
                  {a.titre_personnalise || a.ev.titre}
                </span>
                {ouvert && notice && (
                  <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.6rem', lineHeight: 1.3, letterSpacing: '-0.005em', color: '#8a8278', margin: '3px 0 1px', textAlign: 'justify' }}>{notice}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Contenu({ auteur, onClose, evenements }: { auteur: Auteur; onClose: () => void; evenements: EvtAssoc[] }) {
  const [photoOk, setPhotoOk] = useState(true)
  const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/auteurs/${auteur.id_auteur}.jpg`
  const photoPos = parsePhotoPos(auteur.photo_position)
  const datesAuteur = formaterDateHistorique(auteur.dates)
  const initiales = auteur.nom.split(/\s+/).map(m => m[0]).filter(Boolean).slice(0, 2).join('')
  const meta = rendreSiecles([datesAuteur, auteur.langue_principale, ...(auteur.traditions ?? [])].filter(Boolean).join(' · '))

  // Affichage : la date de COMPOSITION (estimée ou connue), non la date de la
  // traduction. Repli sur date_approx quand date_composition manque.
  const dateCompo = (o: OeuvreResumee) => o.date_composition || o.date_approx || ''
  // Tri par année de composition (croissante). Les œuvres sans date closent la
  // liste, départagées par le titre.
  const anneeTri = (o: OeuvreResumee) => {
    if (o.composition_debut_annee != null) return o.composition_debut_annee
    const m = dateCompo(o).match(/\d{2,4}/)
    return m ? parseInt(m[0], 10) : Infinity
  }
  const parDate = (a: OeuvreResumee, b: OeuvreResumee) =>
    anneeTri(a) - anneeTri(b) || a.titre.localeCompare(b.titre, 'fr')
  const oeuvresPresentes = auteur.oeuvres.filter(estOeuvrePubliee).sort(parDate)
  const oeuvresAbsentes = auteur.oeuvres.filter(o => !estOeuvrePubliee(o)).sort(parDate)
  // Chronologie : la frise agregee (evenements associes) prime ; a defaut, l'ancien
  // texte libre `chronologie` (conserve tant que la frise n'est pas generalisee).
  const aFrise = evenements.length > 0
  const aChrono = aFrise || !!(auteur.chronologie && auteur.chronologie.trim())
  const aColonnes = !!(auteur.note_biographique || auteur.note_theologique || auteur.influence || auteur.anecdotes) && aChrono
  const aOeuvres = oeuvresPresentes.length > 0 || oeuvresAbsentes.length > 0

  const blocChrono = aChrono ? (
    <section>
      <TitreSection centre>Chronologie</TitreSection>
      {aFrise ? <FriseAuteur evenements={evenements} /> : <Chronologie texte={auteur.chronologie!} />}
    </section>
  ) : null

  // Contenu « Œuvres », harmonisé avec la Chronologie (colonne de date à droite, même
  // gouttière, même rythme vertical) : « année · titre » comme « année · événement ».
  const contenuOeuvres = aOeuvres ? (
    <>
      <TitreSection centre>Œuvres</TitreSection>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {oeuvresPresentes.map(o => (
          <li key={o.id_oeuvre}>
            {/* Œuvre disponible : titre en vert, cliquable vers l'œuvre. */}
            <Link href={`/oeuvre/${o.id_oeuvre}`} onClick={onClose} className="auteur-oeuvre"
              style={{ display: 'grid', gridTemplateColumns: '5.25rem 1fr', alignItems: 'baseline', columnGap: '9px' }}>
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: dateCompo(o) ? '#b7a06a' : '#c9c1b4', fontStyle: dateCompo(o) ? 'normal' : 'italic', textAlign: 'right', whiteSpace: 'nowrap' }}>{dateCompo(o) ? rendreDate(dateCompo(o)) : 'Date inconnue'}</span>
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: '#3d6b4f', minWidth: 0, lineHeight: 1.38 }}>{sansPointFinal(o.titre)}</span>
            </Link>
          </li>
        ))}
        {oeuvresAbsentes.map(o => (
          <li key={o.id_oeuvre} className="auteur-oeuvre auteur-oeuvre--absente" title="Œuvre répertoriée, pas encore disponible"
            style={{ display: 'grid', gridTemplateColumns: '5.25rem 1fr', alignItems: 'baseline', columnGap: '9px' }}>
            <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.71875rem', color: dateCompo(o) ? '#cdbe93' : '#d3ccc0', fontStyle: dateCompo(o) ? 'normal' : 'italic', textAlign: 'right', whiteSpace: 'nowrap' }}>{dateCompo(o) ? rendreDate(dateCompo(o)) : 'Date inconnue'}</span>
            <span style={{ minWidth: 0, lineHeight: 1.38 }}>
              {/* Œuvre répertoriée mais pas encore disponible : estompée, non cliquable. */}
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
        </div>
        {/* Colonne de droite : la chronologie (frise), puis — DESSOUS — la liste des
            œuvres, dans le même gabarit. N'existe qu'en présentation deux colonnes. */}
        {aColonnes ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0 }}>
            {blocChrono}
            {contenuOeuvres && <section>{contenuOeuvres}</section>}
          </div>
        ) : (
          blocChrono
        )}
      </div>

      {/* Sans colonne de droite (pas de chronologie), les œuvres restent en pleine largeur
          dessous, séparées par un filet. */}
      {!aColonnes && contenuOeuvres && (
        <section style={{ marginTop: '20px', borderTop: '1px solid #ece7de', paddingTop: '14px' }}>
          {contenuOeuvres}
        </section>
      )}
    </>
  )
}

export default function ModaleAuteur({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [auteur, setAuteur] = useState<Auteur | null>(null)
  const [evenements, setEvenements] = useState<EvtAssoc[]>([])
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!id) { setAuteur(null); setEvenements([]); setErreur(false); return }
    setAuteur(null); setEvenements([]); setErreur(false)
    supabase.from('auteurs')
      .select(`id_auteur, nom, nom_original, titre, dates, siecle, traditions, photo_position,
        note_biographique, note_theologique, langue_principale, chronologie, anecdotes, influence,
        oeuvres ( id_oeuvre, titre, sous_titre, trad_auteur, editeur, ville, date_publication, note, date_composition, date_approx, composition_debut_annee )`)
      .eq('id_auteur', id).maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setErreur(true); return }
        setAuteur(data as Auteur)
      })
    // Frise : evenements associes affiches, joints a la fiche evenement (genre + famille).
    supabase.from('auteurs_evenements')
      .select('nature_lien, pertinence, titre_personnalise, ordre_force, est_affiche, evenements ( id, date_debut, date_fin, date_exacte, qualification_date, titre, notice, portee, importance_generale, est_publie, genres_evenements ( nom, familles_evenements ( nom ) ) )')
      .eq('auteur_id', id).eq('est_affiche', true)
      .then(({ data }) => {
        const rows = (data || []) as any[]
        const liste: EvtAssoc[] = rows
          .map(r => Array.isArray(r.evenements) ? { ...r, evenements: r.evenements[0] } : r)
          .filter(r => r.evenements && r.evenements.est_publie !== false)
          .map(r => {
            const g = Array.isArray(r.evenements.genres_evenements) ? r.evenements.genres_evenements[0] : r.evenements.genres_evenements
            const f = g && (Array.isArray(g.familles_evenements) ? g.familles_evenements[0] : g.familles_evenements)
            return {
              nature_lien: r.nature_lien, pertinence: r.pertinence,
              titre_personnalise: r.titre_personnalise, ordre_force: r.ordre_force,
              ev: {
                id: r.evenements.id, date_debut: r.evenements.date_debut, date_fin: r.evenements.date_fin,
                date_exacte: r.evenements.date_exacte, qualification_date: r.evenements.qualification_date,
                titre: r.evenements.titre, notice: r.evenements.notice, portee: r.evenements.portee,
                importance_generale: r.evenements.importance_generale,
                genre: g?.nom ?? null, famille: f?.nom ?? null,
              },
            }
          })
          .sort((a, b) => {
            const da = a.ev.date_debut ?? 999999, db = b.ev.date_debut ?? 999999
            if (da !== db) return da - db
            const fa = a.ev.date_fin ?? a.ev.date_debut ?? 999999, fb = b.ev.date_fin ?? b.ev.date_debut ?? 999999
            if (fa !== fb) return fa - fb
            return a.ev.titre.localeCompare(b.ev.titre, 'fr')
          })
        setEvenements(liste)
      })
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
        style={{ position: 'relative', width: '100%', maxWidth: '47.5rem', background: '#f7f4ef', borderRadius: '12px', border: '1px solid #e0d8cc', boxShadow: '0 20px 60px rgba(40,30,15,0.30)', padding: '30px 34px 28px', margin: 'auto' }}>
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
          a.auteur-oeuvre:hover { background: rgba(61,107,79,0.06); }
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
