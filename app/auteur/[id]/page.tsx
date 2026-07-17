'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'

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

const lbl: React.CSSProperties = {
  fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em',
  textTransform: 'uppercase', color: '#9a958d', display: 'block', marginBottom: '10px',
}

function enChiffresRomains(n: number): string {
  const table: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  let res = ''
  for (const [v, s] of table) { while (n >= v) { res += s; n -= v } }
  return res
}

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
        note_biographique, note_theologique, langue_principale,
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
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#b0a89e', marginBottom: '8px' }}>Auteur introuvable</p>
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
  const siecleLabel = auteur.siecle ? `${enChiffresRomains(auteur.siecle)}e siècle` : null
  const datesAuteur = formaterDateHistorique(auteur.dates)

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', padding: '48px 20px 80px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* En-tête */}
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: '28px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {photoOk && (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #e4dfd8', background: '#ede9e2' }}>
              <img
                src={photoUrl}
                alt={auteur.nom}
                onError={() => setPhotoOk(false)}
                style={{ width: '100%', height: '100%', display: 'block', ...stylePhotoAuteur(photoPos) }}
              />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 'normal', color: '#2a3d30', margin: '0 0 4px' }}>
              {auteur.titre ? `${auteur.titre} ` : ''}{auteur.nom}
            </h1>
            {auteur.nom_original && (
              <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', margin: '0 0 6px' }}>{auteur.nom_original}</p>
            )}
            <p style={{ fontSize: '11.5px', color: '#b0a89e', margin: 0 }}>
              {[datesAuteur, siecleLabel, auteur.langue_principale].filter(Boolean).join(' · ')}
            </p>
            {auteur.traditions && auteur.traditions.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                {auteur.traditions.map(t => (
                  <span key={t} style={{ fontSize: '9.5px', color: '#6b6560', background: '#f0ece6', borderRadius: '3px', padding: '2px 7px', fontWeight: 500, textTransform: 'capitalize' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Biographie */}
        {auteur.note_biographique && (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: '22px 24px' }}>
            <span style={lbl}>Biographie</span>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#3a3530', lineHeight: 1.72, margin: 0 }}>
              {auteur.note_biographique}
            </p>
          </div>
        )}

        {/* Théologie */}
        {auteur.note_theologique && (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: '22px 24px' }}>
            <span style={lbl}>Pensée théologique</span>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#3a3530', lineHeight: 1.72, margin: 0 }}>
              {auteur.note_theologique}
            </p>
          </div>
        )}

        {/* Œuvres */}
        {auteur.oeuvres.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: '22px 24px' }}>
            <span style={lbl}>Œuvres disponibles ({auteur.oeuvres.length})</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {auteur.oeuvres.map(o => (
                <Link key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`}
                  style={{ display: 'block', padding: '10px 14px', border: '1px solid #ede9e2', borderRadius: '7px', textDecoration: 'none', transition: 'border-color 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#3d6b4f')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#ede9e2')}>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '13.5px', color: '#2a3d30', margin: o.sous_titre ? '0 0 2px' : 0 }}>{o.titre}</p>
                  {o.sous_titre && (
                    <p style={{ fontSize: '11.5px', color: '#6b6560', fontStyle: 'italic', margin: '0 0 4px' }}>{o.sous_titre}</p>
                  )}
                  {(o.trad_auteur || o.editeur || o.date_publication) && (
                    <p style={{ fontSize: '10.5px', color: '#b0a89e', margin: 0 }}>
                      {[o.trad_auteur ? `trad. ${o.trad_auteur}` : null, o.editeur, formaterDateHistorique(o.date_publication)].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/bibliotheque" style={{ fontSize: '12px', color: '#9a958d', textDecoration: 'none', textAlign: 'center', paddingTop: '4px' }}>
          ← Bibliothèque patristique
        </Link>

      </div>
    </main>
  )
}
