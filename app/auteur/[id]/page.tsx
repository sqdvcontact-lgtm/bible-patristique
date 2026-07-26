'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { rendreSiecles } from '@/app/lib/siecles'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

type OeuvreResumee = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  trad_auteur: string | null; editeur: string | null
  ville: string | null; date_publication: string | null; langue: string | null; note?: string | null
}

type AuteurPhotoPos = { x: number; y: number; scale: number; scaleX?: number; scaleY?: number }
type AuteurPhotoPositions = { carte: AuteurPhotoPos; fiche: AuteurPhotoPos }
type Auteur = {
  id_auteur: string; nom: string; nom_original: string | null
  titre: string | null; dates: string | null; siecle: number | null
  traditions: string[] | null; note_biographique: string | null
  note_theologique: string | null; langue_principale: string | null
  chronologie: string | null; anecdotes: string | null; influence: string | null
  photo_position?: AuteurPhotoPositions | null
  oeuvres: OeuvreResumee[]
}

const POS_AUTEUR_CARTE: AuteurPhotoPos = { x: 50, y: 14, scale: 1, scaleX: 1, scaleY: 1 }
const POS_AUTEUR_FICHE: AuteurPhotoPos = { x: 50, y: 24, scale: 1, scaleX: 1, scaleY: 1 }

function normaliserPhotoPos(pos: Partial<AuteurPhotoPos> | null | undefined, defaut: AuteurPhotoPos): AuteurPhotoPos {
  return {
    x: typeof pos?.x === 'number' ? pos.x : defaut.x,
    y: typeof pos?.y === 'number' ? pos.y : defaut.y,
    scale: typeof pos?.scale === 'number' ? pos.scale : defaut.scale,
    scaleX: typeof pos?.scaleX === 'number' ? pos.scaleX : defaut.scaleX,
    scaleY: typeof pos?.scaleY === 'number' ? pos.scaleY : defaut.scaleY,
  }
}

function parseAuteurPhotoPositions(raw: Auteur['photo_position']): AuteurPhotoPositions {
  const r = raw as any
  if (!r) return { carte: { ...POS_AUTEUR_CARTE }, fiche: { ...POS_AUTEUR_FICHE } }
  if (typeof r.x === 'number') {
    const plat = normaliserPhotoPos(r, POS_AUTEUR_CARTE)
    return { carte: plat, fiche: { ...plat } }
  }
  return {
    carte: normaliserPhotoPos(r.carte, POS_AUTEUR_CARTE),
    fiche: normaliserPhotoPos(r.fiche, POS_AUTEUR_FICHE),
  }
}

function stylePhotoAuteur(pos: AuteurPhotoPos): CSSProperties {
  return {
    objectFit: 'cover',
    objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale}) scaleX(${pos.scaleX ?? 1}) scaleY(${pos.scaleY ?? 1})`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
  }
}

// Ornement de séparation, répété systématiquement entre les sections.
function Fleuron() {
  return <div aria-hidden style={{ textAlign: 'center', color: '#b7a06a', fontSize: '16px', letterSpacing: '0.35em', margin: '22px 0 18px' }}>❧</div>
}
// Titre de section : sérif, italique, discret — le corps du texte, lui, sera en sans.
function TitreSection({ children }: { children: ReactNode }) {
  return <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontWeight: 'normal', fontSize: '15px', color: '#3d6b4f', margin: '0 0 9px' }}>{children}</h2>
}

// Chronologie : une ligne par événement, « année | événement » (ou « année — événement »).
function Chronologie({ texte }: { texte: string }) {
  const evenements = texte.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(.*?)\s*(?:\||—|–|\t|:)\s*(.+)$/)
    return m ? { annee: m[1].trim(), evenement: m[2].trim() } : { annee: '', evenement: l }
  })
  if (evenements.length === 0) return null
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {evenements.map((e, i) => (
        <li key={i} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '12px', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '12.5px', color: '#b7a06a', textAlign: 'right', whiteSpace: 'nowrap' }}>{e.annee}</span>
          <span style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '12px', color: '#3a3530', lineHeight: 1.5 }}>{e.evenement}</span>
        </li>
      ))}
    </ul>
  )
}

// (la table des chiffres romains vivait ici en double : voir app/lib/siecles.tsx)

export default function PageAuteur() {
  const params = useParams()
  const id = params.id as string
  const [auteur, setAuteur] = useState<Auteur | null>(null)
  const [erreur, setErreur] = useState(false)
  const [photoOk, setPhotoOk] = useState(true)
  const [photoVersion, setPhotoVersion] = useState(0)

  useEffect(() => {
    if (!id) return
    setPhotoOk(true)
    setPhotoVersion(Date.now())
    supabase
      .from('auteurs')
      .select(`id_auteur, nom, nom_original, titre, dates, siecle, traditions, photo_position,
        note_biographique, note_theologique, langue_principale, chronologie, anecdotes, influence,
        oeuvres ( id_oeuvre, titre, sous_titre, trad_auteur, editeur, ville, date_publication, langue, note )`)
      .eq('id_auteur', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setErreur(true); return }
        setAuteur({ ...(data as Auteur), oeuvres: ((data as Auteur).oeuvres ?? []).filter(estOeuvrePubliee) })
      })
  }, [id])

  if (erreur) return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '18px', color: '#b0a89e', marginBottom: '8px' }}>Auteur introuvable</p>
        <Link href="/bibliotheque" style={{ fontSize: '12px', color: '#3d6b4f', textDecoration: 'none' }}>← Bibliothèque</Link>
      </div>
    </main>
  )

  if (!auteur) return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '13px', color: '#b0a89e', fontStyle: 'italic' }}>Chargement…</p>
    </main>
  )

  const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/auteurs/${id}.jpg${photoVersion ? `?v=${photoVersion}` : ''}`
  const photoPos = parseAuteurPhotoPositions(auteur.photo_position).fiche
  const datesAuteur = formaterDateHistorique(auteur.dates)

  const initiales = auteur.nom.split(/\s+/).map(m => m[0]).filter(Boolean).slice(0, 2).join('')
  // Ligne de contexte : dates · langue · traditions (sans « siècle » générique).
  const meta = rendreSiecles([datesAuteur, auteur.langue_principale, ...(auteur.traditions ?? [])].filter(Boolean).join(' · '))

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', padding: '44px 20px 64px', display: 'flex', justifyContent: 'center' }}>
      <article style={{ width: '100%', maxWidth: '540px' }}>

        {/* En-tête : l'illustration prend le devant */}
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '160px', height: '200px', padding: '6px', background: '#fff', border: '1px solid #ddd5c4', boxShadow: '0 3px 16px rgba(60,50,30,0.12)', marginBottom: '18px' }}>
            <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#ede9e2', border: '1px solid #e7e1d6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {photoOk ? (
                <img src={photoUrl} alt={auteur.nom} onError={() => setPhotoOk(false)}
                  style={{ width: '100%', height: '100%', display: 'block', ...stylePhotoAuteur(photoPos) }} />
              ) : (
                <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '46px', color: '#c3b48c', fontStyle: 'italic', userSelect: 'none' }}>{initiales}</span>
              )}
            </div>
          </div>
          {/* Nom générique, sans le titre (« saint », « abbé »…). */}
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '27px', fontWeight: 'normal', color: '#1e2e24', margin: 0, lineHeight: 1.15 }}>
            {auteur.nom}
          </h1>
          {auteur.nom_original && (
            <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '13px', color: '#9a8a6e', fontStyle: 'italic', margin: '3px 0 0' }}>{auteur.nom_original}</p>
          )}
          {meta && (
            <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a8a094', margin: '10px 0 0' }}>{meta}</p>
          )}
        </header>

        {/* Un seul fleuron d'ouverture (les sections suivantes se séparent par l'espace). */}
        <Fleuron />

        {auteur.note_biographique && (
          <section>
            <TitreSection>Vie</TitreSection>
            <p className="auteur-prose">{rendreSiecles(auteur.note_biographique)}</p>
          </section>
        )}

        {auteur.chronologie && auteur.chronologie.trim() && (
          <section style={{ marginTop: '24px' }}>
            <TitreSection>Chronologie</TitreSection>
            <Chronologie texte={auteur.chronologie} />
          </section>
        )}

        {auteur.anecdotes && auteur.anecdotes.trim() && (
          <section style={{ marginTop: '20px' }}>
            <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontSize: '12.5px', color: '#6b6560', lineHeight: 1.7, margin: 0, paddingLeft: '14px', borderLeft: '2px solid #ddd0b0' }}>
              {rendreSiecles(auteur.anecdotes)}
            </p>
          </section>
        )}

        {auteur.note_theologique && (
          <section style={{ marginTop: '24px' }}>
            <TitreSection>Pensée</TitreSection>
            <p className="auteur-prose">{rendreSiecles(auteur.note_theologique)}</p>
          </section>
        )}

        {auteur.influence && auteur.influence.trim() && (
          <section style={{ marginTop: '24px' }}>
            <TitreSection>Postérité</TitreSection>
            <p className="auteur-prose">{rendreSiecles(auteur.influence)}</p>
          </section>
        )}

        {auteur.oeuvres.length > 0 && (
          <>
            {/* Fleuron conservé ici : il détache nettement la liste d'œuvres du reste. */}
            <Fleuron />
            <section>
              <TitreSection>Œuvres</TitreSection>
              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column' }}>
                {auteur.oeuvres.map((o, i) => (
                  <li key={o.id_oeuvre} style={{ borderTop: i > 0 ? '1px solid #ece7de' : 'none' }}>
                    <Link href={`/oeuvre/${o.id_oeuvre}`} className="auteur-oeuvre">
                      <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '14px', color: '#2a3d30' }}>{o.titre}</span>
                      {o.sous_titre && <span style={{ fontSize: '11.5px', color: '#9a8a6e', fontStyle: 'italic' }}> — {o.sous_titre}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* Cul-de-lampe floral de clôture, centré. `mix-blend-mode: multiply` fait
            disparaître le fond blanc de l'image dans le parchemin (plus de rectangle). */}
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <img src="/ornements/cul-de-lampe-fleurs.png" alt="" aria-hidden width={210}
            style={{ display: 'inline-block', maxWidth: '80%', height: 'auto', opacity: 0.82, mixBlendMode: 'multiply' }} />
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <Link href="/bibliotheque" style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '11px', color: '#9a958d', textDecoration: 'none' }}>← Bibliothèque patristique</Link>
        </div>

        <style>{`
          .auteur-prose {
            font-family: var(--font-source-sans), Arial, sans-serif;
            font-size: 12.5px; line-height: 1.68; color: #3a3530;
            text-align: justify; hyphens: auto; margin: 0;
          }
          .auteur-oeuvre { display: block; padding: 8px 10px; margin: 0 -10px; border-radius: 5px; text-decoration: none; transition: background 0.12s; }
          .auteur-oeuvre:hover { background: rgba(61,107,79,0.06); }
        `}</style>
      </article>
    </main>
  )
}
