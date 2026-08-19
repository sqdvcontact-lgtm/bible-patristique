'use client'

import { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { supabase } from '@/app/lib/supabase'
import { formaterSieclesHTML } from '@/app/oeuvre/[id]/texteEnrichi'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

type Traduction = {
  trad_id: string; nom: string; auteur: string | null; dates: string | null;
  bio_courte: string | null; date_publication: string | null;
  confession: string | null; langue: string | null;
  commentaire_editorial: string | null; ordre: number;
  photo: string | null;
  import_maj_le: string | null;
  photo_position: {
    bandeau:  { x: number; y: number; scale: number }
    lateral:  { x: number; y: number; scale: number }
  } | null;
}

function useImageLuminance(url: string | null): boolean | null {
  const [estSombre, setEstSombre] = useState<boolean | null>(null)
  useEffect(() => {
    if (!url) { setEstSombre(null); return }
    let annule = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (annule) return
      try {
        const canvas = document.createElement('canvas')
        const sw = Math.round(Math.min(img.naturalWidth, 400) * 0.45)
        const sh = Math.round(Math.min(img.naturalHeight, 300) * 0.65)
        canvas.width = sw; canvas.height = sh
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, sw * (img.naturalWidth / Math.min(img.naturalWidth, 400)), sh * (img.naturalHeight / Math.min(img.naturalHeight, 300)), 0, 0, sw, sh)
        const { data } = ctx.getImageData(0, 0, sw, sh)
        let lum = 0
        const n = sw * sh
        for (let i = 0; i < data.length; i += 4) {
          lum += 0.2126 * (data[i] / 255) + 0.7152 * (data[i + 1] / 255) + 0.0722 * (data[i + 2] / 255)
        }
        setEstSombre(lum / n < 0.55)
      } catch { setEstSombre(null) }
    }
    img.onerror = () => { if (!annule) setEstSombre(null) }
    img.src = url
    return () => { annule = true }
  }, [url])
  return estSombre
}

function BandeauTraduction({ t, estOuvert, onToggle }: {
  t: Traduction; estOuvert: boolean; onToggle: () => void
}) {
  const estSombre = useImageLuminance(t.photo ?? null)
  const meta = [t.langue, t.date_publication].filter(Boolean).join(' · ')

  const fondSombre = estSombre !== false
  const couleurTexte = t.photo ? (fondSombre ? 'var(--cs-fond)' : '#18130f') : 'var(--cs-encre-fonce)'
  const couleurMeta  = t.photo ? (fondSombre ? 'rgba(242,239,232,0.72)' : 'rgba(24,19,15,0.58)') : 'var(--cs-texte-second)'
  const couleurChevron = t.photo ? (fondSombre ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.4)') : 'var(--cs-bord)'

  const ombreForte = fondSombre
    ? '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.65), 0 4px 20px rgba(0,0,0,0.35)'
    : '0 1px 2px rgba(255,255,255,0.95), 0 2px 8px rgba(255,255,255,0.75), 0 4px 16px rgba(255,255,255,0.4)'
  const ombreTexte = t.photo ? ombreForte : 'none'

  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0', minHeight: t.photo ? '92px' : undefined,
        background: t.photo ? 'transparent' : estOuvert ? 'rgba(var(--cs-vert-rgb),0.04)' : 'var(--cs-surface)',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s', overflow: 'hidden',
      }}
    >
      {t.photo && (() => {
        const p = t.photo_position?.bandeau
        const px = p?.x ?? 50; const py = p?.y ?? 20; const ps = p?.scale ?? 1
        return (
          <img src={t.photo} alt="" aria-hidden="true" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: `${px}% ${py}%`, display: 'block',
            transform: `scale(${ps})`, transformOrigin: `${px}% ${py}%`,
            filter: estOuvert ? 'brightness(0.78)' : 'brightness(0.9)',
            transition: 'filter 0.2s',
          }} />
        )
      })()}

      {t.photo && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: fondSombre
            ? 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)'
            : 'linear-gradient(to right, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 55%, transparent 100%)',
          transition: 'background 0.2s',
        }} />
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, minWidth: 0,
        padding: t.photo ? '18px 14px 18px 20px' : '14px 18px',
      }}>
        <h2 style={{
          fontFamily: "var(--font-source-serif), Georgia, serif",
          fontSize: '1.0625rem', fontWeight: 'normal',
          color: couleurTexte, margin: 0, lineHeight: 1.25,
          textShadow: ombreTexte,
          transition: 'color 0.2s, text-shadow 0.2s',
        }}>
          {t.nom}
        </h2>
        {meta && (
          <span style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: '0.6875rem', fontStyle: 'italic',
            color: couleurMeta, letterSpacing: '0.02em',
            display: 'block', marginTop: '4px',
            textShadow: ombreTexte,
            transition: 'color 0.2s',
          }}>
            {meta}
          </span>
        )}
        {t.import_maj_le && (
          <span style={{
            fontSize: '0.625rem', fontStyle: 'italic',
            color: t.photo ? (fondSombre ? 'rgba(242,239,232,0.48)' : 'rgba(24,19,15,0.38)') : 'var(--cs-texte-faible)',
            display: 'block', marginTop: '3px',
            textShadow: t.photo ? ombreTexte : 'none',
            transition: 'color 0.2s',
          }}>
            Mis à jour le {new Date(t.import_maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>

      <span style={{
        position: 'relative', zIndex: 1, fontSize: '0.625rem', flexShrink: 0,
        marginRight: '18px', color: couleurChevron,
        textShadow: t.photo ? ombreTexte : 'none',
        display: 'inline-block', transition: 'transform 0.18s, color 0.2s',
        transform: estOuvert ? 'rotate(180deg)' : 'none',
      }}>▼</span>
    </button>
  )
}

function normaliserContenu(texte: string): string {
  if (!texte) return ''
  let html: string
  if (/^\s*<(p|h[1-6]|div|ul|ol|blockquote)[\s>]/i.test(texte)) {
    html = texte
  } else {
    const pStyle = 'color:var(--cs-texte-fort);font-size:0.84375rem;line-height:1.78;margin:0 0 12px;text-decoration:none'
    html = texte
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `<p style="${pStyle}">${l}</p>`)
      .join('')
  }
  // Assaini avant injection : `commentaire_editorial` est du HTML éditorial, mais on
  // le passe par DOMPurify (comme NavLivres) pour ne jamais rendre de script/handler.
  return DOMPurify.sanitize(formaterSieclesHTML(html))
}

export default function AllerPlusLoinClient() {
  const [traductions, setTraductions] = useState<Traduction[]>([])
  const [ouvert, setOuvert] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('traductions').select('*')
      .not('schema_numerotation', 'is', null)
      .order('ordre', { ascending: true })
      .then(({ data }) => setTraductions(data ?? []))
  }, [])

  // Lien profond vers une traduction précise (#TR0002), notamment depuis la recherche rapide.
  useEffect(() => {
    if (traductions.length === 0) return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    setOuvert(hash)
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [traductions])

  return (
    <main style={{
      background: 'var(--cs-fond)',
      // AUCUN paddingTop ici. Le décalage sous la navbar fixe est posé UNE SEULE fois
      // pour tout le site, par #cs-corps dans app/layout.tsx. Le répéter le comptait
      // deux fois : 107px entre la barre et le titre au lieu de 38.
      minHeight: 'calc(100vh - 3.5rem)',
    }}>
      <div style={{ maxWidth: '45rem', margin: '0 auto', padding: '22px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <h1 style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE,
            color: ENCRE_TITRE, lineHeight: 1.15, marginBottom: '8px',
          }}>
            Les traductions
          </h1>
          <div style={{ width: '36px', height: '1px', background: 'var(--cs-bord)', margin: '0 auto 12px' }} />
        </div>
      </div>

      <div style={{ maxWidth: '42.5rem', margin: '0 auto', padding: '10px 24px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {traductions.map((t) => {
            const estOuvert = ouvert === t.trad_id
            return (
              <div key={t.trad_id} id={t.trad_id} style={{
                scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)`,
                border: '1px solid var(--cs-bord)', borderRadius: '8px',
                overflow: 'hidden', background: 'var(--cs-surface)',
              }}>
                <BandeauTraduction t={t} estOuvert={estOuvert} onToggle={() => setOuvert(prev => prev === t.trad_id ? null : t.trad_id)} />

                {estOuvert && (
                  <div style={{ borderTop: '1px solid var(--cs-fond-doux)', display: 'flex', alignItems: 'stretch' }}>
                    {t.photo && (
                      <div className="trad-fiche-portrait" style={{
                        // ⚠️ La largeur était figée à 8.75rem (140 px) avec `flexShrink: 0`, donc
                        // insensible à l'écran. Sur un téléphone de 375 px, la carte dispose de
                        // 327 px : le portrait en prenait 141, et il restait 144 px de texte
                        // JUSTIFIÉ, soit dix-sept signes par ligne. Le portrait mangeait la fiche.
                        // ⛔ Sous 700 px, cette colonne DISPARAÎT (règle `.trad-fiche-portrait`
                        // dans globals.css, à côté de celle de la carte d'auteur, qui répond au
                        // même défaut). Décision de l'auteur : elle perturbait la lecture, et le
                        // portrait paraît DÉJÀ en bandeau au-dessus de la fiche — sur un téléphone,
                        // cette colonne était un rappel, pas une découverte.
                        // Entre 700 px et le bureau, la largeur suit l'écran et retrouve ses 140 px.
                        width: 'clamp(4rem, 20vw, 8.75rem)', flexShrink: 0,
                        borderRight: '1px solid var(--cs-fond-doux)',
                        overflow: 'hidden',
                      }}>
                        <img src={t.photo} alt="" aria-hidden="true"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${t.photo_position?.lateral?.x ?? 50}% ${t.photo_position?.lateral?.y ?? 20}%`, transform: `scale(${t.photo_position?.lateral?.scale ?? 1})`, transformOrigin: `${t.photo_position?.lateral?.x ?? 50}% ${t.photo_position?.lateral?.y ?? 20}%`, display: 'block' }} />
                      </div>
                    )}
                    {/* Les marges internes suivent aussi : 40 px de blanc pris sur une colonne
                        de 184 px, c'était près du quart de la place restante. */}
                    <div className="trad-fiche-texte" style={{ flex: 1, minWidth: 0, padding: '18px clamp(12px, 4vw, 20px) 22px' }}>
                      {t.bio_courte && (
                        <p style={{
                          fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.65,
                          margin: '0 0 12px', fontStyle: 'italic',
                          textAlign: 'justify', hyphens: 'auto',
                        }}>
                          {t.bio_courte}
                        </p>
                      )}
                      {t.commentaire_editorial && (
                        <div
                          className="trad-article"
                          style={{ color: 'var(--cs-texte-fort)', fontSize: '0.84375rem', lineHeight: 1.65, textAlign: 'justify', hyphens: 'auto' }}
                          dangerouslySetInnerHTML={{ __html: normaliserContenu(t.commentaire_editorial) }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
