'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import IconeChevron from '@/app/components/IconeChevron'
import IconeDrapeau from '@/app/components/IconeDrapeau'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { libelleTrad, formaterEditeur } from '@/app/oeuvre/[id]/PageTitre'
import { useEditeursCharges } from '@/app/lib/editeurs'
import { rendreSiecles, EmpanSiecles } from '@/app/lib/siecles'
import ModaleAuteur from '@/app/components/ModaleAuteur'
import ModalSignalement from '@/app/components/ModalSignalement'
import { useCompte } from '@/app/lib/contexteCompte'
import HistoricalDate from '@/app/components/HistoricalDate'

type Oeuvre = {
  id_oeuvre: string; id_auteur: string; titre: string; sous_titre: string | null
  titre_original: string | null; trad_auteur: string | null
  editeur: string | null; ville: string | null
  date_publication_affichage_courte: string | null
  date_publication_precision_affichage: string | null
  genre: string | null; note?: string | null; langue_originale?: string | null
}
type AuteurPhotoPos = { x: number; y: number; scale: number; scaleX?: number; scaleY?: number }
type AuteurPhotoPositions = { carte: AuteurPhotoPos; fiche: AuteurPhotoPos }
type Auteur = {
  id_auteur: string; nom: string; nom_original?: string | null; titre?: string | null
  dates: string | null; date_naissance?: string | null; date_mort?: string | null
  siecle: string | null; langue_principale?: string | null
  traditions?: string[] | null
  note?: string | null; note_biographique?: string | null; note_theologique?: string | null
  photo_position?: AuteurPhotoPositions | null
  imageUrl: string
  oeuvres: Oeuvre[]
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

function stylePhotoAuteur(pos: AuteurPhotoPos): React.CSSProperties {
  return {
    objectFit: 'cover',
    objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale})`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
  }
}

function sansAccents(s: string): string { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }

// Clé de tri alphabétique d'un titre : on retire l'article ou le déterminant de tête
// (« Le », « La », « Les », « L' », « Un », « Une », « De », « Des », « Du », « D' »…),
// pour que « La Cité de Dieu » se range à « C » et non à « L ».
const ARTICLE_TETE = /^(l['’]|d['’]|le |la |les |un |une |des |du |de |au |aux )/;
function cleTriTitre(titre: string): string {
  return sansAccents(titre.trim()).replace(ARTICLE_TETE, '').trim();
}
function comparerTitres(a: string, b: string): number {
  return cleTriTitre(a).localeCompare(cleTriTitre(b), 'fr') || a.localeCompare(b, 'fr');
}

// Numéro de siècle à partir de la chaîne stockée (« IVe », « 4 », « IVe-Ve »… → 4).
const ROMAINS_SIECLE: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13,
};
function siecleEnNombre(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  const rom = t.match(/^[ivx]+/);
  if (rom && ROMAINS_SIECLE[rom[0]] != null) return ROMAINS_SIECLE[rom[0]];
  const ar = t.match(/\d+/);
  return ar ? parseInt(ar[0]) : null;
}

function extraireAnnee(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.match(/\d+/)
  return m ? parseInt(m[0]) : null
}

const CHIFFRES_FR = ['une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt']
function enLettres(n: number): string { return n >= 1 && n <= 20 ? CHIFFRES_FR[n - 1] : String(n) }

// ── Bandeau auteur ────────────────────────────────────────────────────────────
function PanneauAuteur({ auteur, recherche, favorisOeuvres, toggleFavoriOeuvre, onOuvrirAuteur, originaux, ouvertParDefaut = false, compact = false }: {
  auteur: Auteur; recherche: string
  favorisOeuvres: Set<string>; toggleFavoriOeuvre: (id: string) => void
  onOuvrirAuteur: (id: string) => void
  originaux?: Set<string>
  ouvertParDefaut?: boolean
  compact?: boolean
}) {
  const q = sansAccents(recherche.trim())
  const oeuvresTriees = useMemo(
    () => [...auteur.oeuvres].sort((a, b) => comparerTitres(a.titre, b.titre)),
    [auteur.oeuvres]
  )
  const oeuvreCorrespondante = q ? oeuvresTriees.find(o => sansAccents(o.titre).includes(q)) : null
  const [ouvert, setOuvert] = useState(ouvertParDefaut)
  const [imgErreur, setImgErreur] = useState(false)
  const listeOuverte = ouvert || !!oeuvreCorrespondante
  const nb = auteur.oeuvres.length
  const nbMot = enLettres(nb)
  const photoPos = parseAuteurPhotoPositions(auteur.photo_position).carte
  const datesAuteur = auteur.dates

  // Notice trop longue pour la zone fixe : on le détecte pour proposer un renvoi
  // « Ouvrir la page auteur » à la suite des points de suspension.
  const proseRef = useRef<HTMLDivElement>(null)
  const [tronque, setTronque] = useState(false)
  useEffect(() => {
    const el = proseRef.current
    if (!el) return
    const mesurer = () => setTronque(el.scrollHeight > el.clientHeight + 1)
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(el)
    return () => ro.disconnect()
  }, [auteur.note_biographique, auteur.note, auteur.note_theologique])

  return (
    <div
      style={{ background: 'var(--cs-surface)', borderRadius: '8px', border: '1px solid var(--cs-bord-clair)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 0.22s ease, background-color 0.22s ease, transform 0.22s ease' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#a9c9b6'; e.currentTarget.style.backgroundColor = '#f8fbf9'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cs-bord-clair)'; e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.transform = 'none' }}>

      {/* Hauteur d'en-tête CONSTANTE pour toutes les cartes (notice longue rognée) :
          la liste dépliée s'ajoute ensuite en dessous, hors de ce bloc. */}
      <div className="bib-carte-haut" style={{ display: 'flex', ...(compact ? {} : { height: '200px', overflow: 'hidden' }) }}>
        {!compact && (
          <div className="bib-photo" style={{ width: '7.5rem', flexShrink: 0, background: 'var(--cs-fond-doux)', position: 'relative', minHeight: '170px', overflow: 'hidden' }}>
            {!imgErreur && (
              <Image src={auteur.imageUrl} alt={auteur.nom} fill sizes="240px" unoptimized
                onError={() => setImgErreur(true)}
                style={{ ...stylePhotoAuteur(photoPos), imageRendering: 'auto' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
              <svg width="36" height="44" viewBox="0 0 40 48" fill="none" opacity={imgErreur ? 0.2 : 0}>
                <circle cx="20" cy="14" r="9" stroke="#2a3d30" strokeWidth="1.5" fill="none"/>
                <path d="M2 46 Q4 28 20 24 Q36 28 38 46" stroke="#2a3d30" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: compact ? '6px 12px' : '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: compact ? '2px' : '6px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
              <h2 onClick={() => onOuvrirAuteur(auteur.id_auteur)} title="Voir la fiche de l’auteur"
                style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: '0.875rem', fontWeight: 600, color: 'var(--cs-vert)', letterSpacing: '0.03em', textTransform: 'uppercase', margin: 0, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.textUnderlineOffset = '2px' }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
                {auteur.nom}
              </h2>
              <button onClick={() => onOuvrirAuteur(auteur.id_auteur)} title="Voir la fiche de l’auteur"
                style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '17px', height: '17px', borderRadius: '50%', border: '1px solid #cfe0d5', background: 'transparent', color: 'var(--cs-vert)', cursor: 'pointer', padding: 0, transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--cs-vert)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cs-vert)' }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M3.5 3h5.5v5.5M9 3L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            {!compact && datesAuteur && (
              <p style={{ fontSize: '0.71875rem', color: '#9a8a70', margin: '1px 0 0', fontFamily: 'var(--font-source-serif), Georgia, serif', letterSpacing: '0.01em' }}>
                <HistoricalDate value={datesAuteur} variant="long" />
              </p>
            )}
          </div>

          {!compact && (auteur.note_biographique || auteur.note || auteur.note_theologique) && (
            // Conteneur BLOC (surtout pas flex : un parent flex « blockifie » l'enfant et
            // convertit `display:-webkit-box` en `flow-root`, ce qui désactive line-clamp).
            <div>
              {/* Notice bornée à trois lignes par `-webkit-line-clamp` : quand le texte
                  déborde, un « … » est ajouté AU POINT DE COUPE (collé au texte, en
                  remplacement de la ponctuation finale). La biographie (italique) et la
                  note théologique (romain) s'écoulent d'un seul tenant. */}
              <div ref={proseRef} style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--cs-texte)', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
                {(auteur.note_biographique || auteur.note) && (
                  <span style={{ fontStyle: 'italic' }}>{rendreSiecles(auteur.note_biographique || auteur.note)}</span>
                )}
                {auteur.note_theologique && (
                  <>{(auteur.note_biographique || auteur.note) ? ' ' : null}<span>{rendreSiecles(auteur.note_theologique)}</span></>
                )}
              </div>
            </div>
          )}

          {/* Même ligne : « N œuvres disponibles » à gauche, « Ouvrir la page auteur »
              (si la notice est tronquée) à droite. */}
          <div style={{ marginTop: 'auto', paddingTop: compact ? '2px' : '6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
            <button onClick={() => setOuvert(!ouvert)}
              style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'baseline', gap: '4px', lineHeight: 1 }}>
              <span style={{ fontSize: '0.5rem' }}>{listeOuverte ? '▲' : '▼'}</span>
              <span>{nbMot.charAt(0).toUpperCase() + nbMot.slice(1)} œuvre{nb > 1 ? 's' : ''} disponible{nb > 1 ? 's' : ''}</span>
            </button>
            {!compact && tronque && (
              <button onClick={() => onOuvrirAuteur(auteur.id_auteur)} title="Ouvrir la page de l’auteur"
                style={{ flexShrink: 0, fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', lineHeight: 1 }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.textUnderlineOffset = '2px' }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
                Ouvrir la page auteur
              </button>
            )}
          </div>
        </div>
      </div>

      {listeOuverte && (
        <div style={{ borderTop: '1px solid var(--cs-fond-doux)', padding: '8px 0 12px' }}>
          <style>{`
            .bib-ligne { display: flex; align-items: stretch; transition: background-color 0.18s ease; }
            .bib-ligne:hover:not(.bib-correspond) { background-color: rgba(var(--cs-vert-rgb),0.055); }
            .bib-correspond { background: rgba(var(--cs-vert-rgb),0.07); }
            .bib-lire {
              display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
              font-size:0.625rem; font-style: italic; letter-spacing: 0.03em; color: var(--cs-vert);
              font-family: var(--font-source-serif), Georgia, serif;
              opacity: 0; transform: translateX(4px); transition: opacity 0.22s ease, transform 0.22s ease;
              white-space: nowrap; pointer-events: none;
            }
            .bib-ligne:hover .bib-lire, .bib-correspond .bib-lire { opacity: 0.72; transform: translateX(0); }
            .bib-fleche { transition: transform 0.22s ease; }
            .bib-ligne:hover .bib-fleche, .bib-correspond .bib-fleche { transform: translateX(3px); }
          `}</style>
          {/* UNE ligne par œuvre (titre), UNE sous-ligne cliquable par traduction : chaque
              traduction mène à sa propre édition. Aujourd'hui une œuvre = une traduction ;
              la structure accueille les éditions multiples à venir. */}
          {(() => {
            const oeuvresParTitre: { titre: string; versions: Oeuvre[] }[] = []
            for (const o of oeuvresTriees) {
              const dernier = oeuvresParTitre[oeuvresParTitre.length - 1]
              if (dernier && sansAccents(dernier.titre) === sansAccents(o.titre)) dernier.versions.push(o)
              else oeuvresParTitre.push({ titre: o.titre, versions: [o] })
            }
            return oeuvresParTitre.map((grp, idx) => {
              const correspond = !!oeuvreCorrespondante && grp.versions.some(v => v.id_oeuvre === oeuvreCorrespondante.id_oeuvre)
              return (
                <div key={grp.versions[0].id_oeuvre}
                  className={`bib-oeuvre${correspond ? ' bib-correspond' : ''}`}
                  style={{ borderTop: idx > 0 ? '1px solid #f3efe9' : 'none', borderLeft: correspond ? '3px solid var(--cs-vert)' : '3px solid transparent', padding: '4px 0 5px' }}>
                  <span style={{ display: 'block', fontSize: '0.8125rem', fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', color: correspond ? '#2a4d35' : 'var(--cs-encre)', fontWeight: correspond ? 600 : 400, lineHeight: 1.3, padding: '0 18px 0 20px' }}>{grp.titre}</span>
                  {grp.versions.map(o => {
                    const editionTexte = [o.editeur, o.ville].filter(Boolean).join(', ')
                    const datePublication = o.date_publication_affichage_courte
                    const aEdition = !!(editionTexte || datePublication)
                    const edition = <>{editionTexte}{editionTexte && datePublication ? ', ' : null}{datePublication && <span title={o.date_publication_precision_affichage ?? undefined}><HistoricalDate value={datePublication} variant="short" /></span>}</>
                    const trad = o.trad_auteur ? libelleTrad(o.trad_auteur) : ''
                    const libelle = trad || (aEdition ? edition : 'Édition')
                    // Texte original parallèle (latin/grec) disponible pour cette édition :
                    // on propose une sous-ligne menant à l'œuvre en mode « texte original ».
                    const aOriginal = !!originaux?.has(o.id_oeuvre)
                    const langueOrig = o.langue_originale === 'Grec' ? 'grec' : 'latin'
                    return (
                      <React.Fragment key={o.id_oeuvre}>
                      {aOriginal && (
                        // Le texte original est placé EN TÊTE (avant la traduction). Sa cale à
                        // gauche reproduit EXACTEMENT la colonne du favori (retrait 20px + étoile
                        // de 16px de large) pour aligner « Texte… » sur « Traduction… ».
                        <div className="bib-ligne" style={{ marginTop: '5px', alignItems: 'center' }}>
                          <div aria-hidden style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingLeft: '20px' }}>
                            <span style={{ display: 'block', width: '16px', height: '12px' }} />
                          </div>
                          <Link href={`/oeuvre/${o.id_oeuvre}?mt=la`}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '3px 12px 3px 9px', textDecoration: 'none' }}>
                            <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.71875rem', color: '#4a4038', fontWeight: 500 }}>Texte original {langueOrig}</span>
                              {o.titre_original && <span style={{ fontSize: '0.625rem', color: '#a59c90', fontStyle: 'italic' }}>{o.titre_original}</span>}
                            </span>
                            <span className="bib-lire">
                              Lire
                              <span className="bib-fleche" style={{ display: 'inline-flex' }}><IconeChevron dir="right" size={11} strokeWidth={1.4} /></span>
                            </span>
                          </Link>
                        </div>
                      )}
                      {/* Écart intra-paire resserré : la traduction se colle à son texte
                          original (1px), tandis que la marge de 5px au-dessus de la ligne
                          originale continue de séparer les œuvres entre elles. */}
                      <div className="bib-ligne" style={{ marginTop: '1px', alignItems: 'center' }}>
                        {/* Favori en tête de ligne, en guise de puce, à gauche de la traduction. */}
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingLeft: '20px' }}>
                          <EtoileFavori actif={favorisOeuvres.has(o.id_oeuvre)} onToggle={() => toggleFavoriOeuvre(o.id_oeuvre)} size={12} />
                        </div>
                        <Link href={`/oeuvre/${o.id_oeuvre}`}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '3px 12px 3px 9px', textDecoration: 'none' }}>
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.71875rem', color: '#4a4038', fontWeight: 500 }}>{libelle}</span>
                            {trad && aEdition && <span style={{ fontSize: '0.625rem', color: '#a59c90' }}>{edition}</span>}
                            {!trad && !aEdition && <span style={{ fontSize: '0.625rem', color: '#c4bcb0', fontStyle: 'italic' }}>Certaines données manquent.</span>}
                          </span>
                          <span className="bib-lire">
                            Lire
                            <svg className="bib-fleche" width="17" height="9" viewBox="0 0 18 9" fill="none" aria-hidden="true"><path d="M0.5 4.5h15.5M12 1l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        </Link>
                      </div>
                      </React.Fragment>
                    )
                  })}
                </div>
              )
            })
          })()}
        </div>
      )}
    </div>
  )
}

// ── Filtres ───────────────────────────────────────────────────────────────────
type Periode = { jsx: React.ReactNode; min: number; max: number }
const PERIODES: Periode[] = [
  { jsx: <EmpanSiecles de={1} a={2} />, min: 1, max: 2 },
  { jsx: <EmpanSiecles de={3} a={4} />, min: 3, max: 4 },
  { jsx: <EmpanSiecles de={5} a={6} />, min: 5, max: 6 },
  { jsx: <EmpanSiecles de={7} a={9} />, min: 7, max: 9 },
  { jsx: <EmpanSiecles de={10} a={13} />, min: 10, max: 13 },
]
const LANGUES = ['Grec', 'Latin', 'Syriaque', 'Copte', 'Arménien']
const GENRES = ['Apologétique', 'Catéchèse', 'Théologie', 'Traité', 'Homélie', 'Commentaire', 'Lettre']

type ChipTheme = { bg: string; border: string; color: string; bgActif: string; borderActif: string }
const THEMES: Record<string, ChipTheme> = {
  periode: { bg: 'rgba(139,107,60,0.07)',  border: 'rgba(139,107,60,0.22)', color: '#7a6a50', bgActif: '#7a6040', borderActif: '#7a6040' },
  langue:  { bg: 'rgba(61,90,107,0.07)',   border: 'rgba(61,90,107,0.22)', color: '#4a6070', bgActif: '#3d5a6b', borderActif: '#3d5a6b' },
  genre:   { bg: 'rgba(var(--cs-vert-rgb),0.07)',   border: 'rgba(var(--cs-vert-rgb),0.22)', color: '#3d6040', bgActif: 'var(--cs-vert)', borderActif: 'var(--cs-vert)' },
}

function Chip({ actif, onClick, children, theme = 'genre' }: { actif: boolean; onClick: () => void; children: React.ReactNode; theme?: string }) {
  const t = THEMES[theme] ?? THEMES.genre
  return (
    <button onClick={onClick} style={{
      padding: '2px 9px', borderRadius: '3px', fontSize: '0.6875rem',
      border: `1px solid ${actif ? t.borderActif : t.border}`,
      background: actif ? t.bgActif : t.bg,
      color: actif ? '#fff' : t.color,
      cursor: 'pointer', fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic',
      transition: 'all 0.12s', whiteSpace: 'nowrap', lineHeight: 1.4,
    }}>
      {children}
    </button>
  )
}

function LigneFiltres({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
      <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em', textIndent: '0.2em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', textAlign: 'center' }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>{children}</div>
    </div>
  )
}

// ── Catalogue des œuvres non disponibles ─────────────────────────────────────
type NoticeCompacte = {
  id: number
  auteur: string
  id_oeuvre_stable: string | null
  titre_stable: string
  titre_original: string | null
  titre_edition: string | null
  traducteur: string | null
  editeur: string | null
  date_edition_affichage_courte: string | null
  date_edition_precision_affichage: string | null
  siecle_edition_affichage: string | null
  domaine_public: string | null
  langue_originale: string | null
  verifie: boolean | null
  verifie_admin: boolean | null
}

function cleOeuvreCatalogue(n: NoticeCompacte) {
  // Regroupement d'AFFICHAGE, données brutes intactes (charte : résolution à l'affichage).
  // Les notices « Notice générique — doublon de V20-NNNNN » (stubs d'import à titres variants :
  // « De la foi en la Trinité » / « … en la sainte Trinité ») désignent la MÊME édition source :
  // on les fond sous le code V20 commun au lieu de leurs id_oeuvre_stable distincts, sans jamais
  // toucher aux données validées.
  const code = n.titre_edition?.match(/V20-(\d+)/)?.[1]
  if (code) return `${n.auteur}__V20-${code}`
  return `${n.auteur}__${n.id_oeuvre_stable || n.titre_stable}`
}

function titreDeclineCatalogue(n: NoticeCompacte) {
  return n.titre_edition || n.titre_original || n.titre_stable
}

/** Gabarit commun aux pictogrammes d'action d'une ligne du catalogue : même
 *  case, même centrage, même taille de tracé. */
const BOUTON_ICONE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '22px', height: '22px', padding: 0,
  background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
}

// ── Panneau auteur catalogue (tons gris/mordorés) ────────────────────────────
type GroupeCatalogue = { cle: string; titreStable: string; notices: NoticeCompacte[] }

// Signalement d'une traduction du catalogue : même fenêtre partagée que partout ailleurs,
// message libre, atterrit dans l'onglet Modération (via /api/signalements + `reference`).
function BoutonSignalerNotice({ reference, texte }: { reference: string; texte?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const { exigerCompte } = useCompte()
  const envoyer = async (message: string, importance?: string) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    const res = await fetch('/api/signalements', {
      method: 'POST', headers,
      body: JSON.stringify({ reference, message, importance, url_source: typeof window !== 'undefined' ? window.location.href : null }),
    })
    if (!res.ok) throw new Error('échec du signalement')
  }
  return (
    <>
      <button onClick={e => { e.stopPropagation(); if (exigerCompte('signaler une erreur')) setOuvert(true) }} title="Signaler une erreur sur cette traduction"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '7px', color: '#c4b8a4', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#b0442a')}
        onMouseLeave={e => (e.currentTarget.style.color = '#c4b8a4')}><IconeDrapeau /></button>
      {ouvert && <ModalSignalement titre={reference} texteObjet={texte} avecNiveauImportance onClose={() => setOuvert(false)} onEnvoyer={envoyer} />}
    </>
  )
}

function PanneauCatalogue({ nomAuteur, groupes, votes, mesVotes, userId, onVoter, onProposer }: {
  nomAuteur: string
  groupes: GroupeCatalogue[]
  votes: Record<number, number>
  mesVotes: Set<number>
  userId: string | null
  onVoter: (notices: NoticeCompacte[]) => void
  onProposer: (nomAuteur: string, titre: string) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const nb = groupes.length
  const nbMot = enLettres(nb)

  const totalVotes = (ns: NoticeCompacte[]) => ns.reduce((s, n) => s + (votes[n.id] ?? 0), 0)
  const aVote = (ns: NoticeCompacte[]) => ns.some(n => mesVotes.has(n.id))

  // Initiale(s) de l'auteur pour le placeholder
  const initiale = nomAuteur.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')

  return (
    <div
      style={{ background: 'var(--cs-fond-clair)', borderRadius: '8px', border: '1px solid var(--cs-bord)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 0.22s ease, background-color 0.22s ease, transform 0.22s ease' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#d6bd84'; e.currentTarget.style.backgroundColor = '#fdfaf2'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cs-bord)'; e.currentTarget.style.backgroundColor = 'var(--cs-fond-clair)'; e.currentTarget.style.transform = 'none' }}>

      {/* En-tête auteur */}
      <div style={{ display: 'flex' }}>
        {/* Zone initiales */}
        <div style={{ width: '64px', flexShrink: 0, background: '#e8e2d6', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '58px' }}>
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', letterSpacing: '0.04em', userSelect: 'none' }}>{initiale}</span>
        </div>

        {/* Infos auteur + bouton */}
        <div style={{ flex: 1, padding: '9px 16px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1px' }}>
          <h2 style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: '#4a4030', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            {nomAuteur}
          </h2>

          <button onClick={() => setOuvert(!ouvert)}
            style={{ fontSize: '0.65625rem', color: '#8a7a5a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
            <span style={{ fontSize: '0.5rem' }}>{ouvert ? '▲' : '▼'}</span>
            {nbMot.charAt(0).toUpperCase() + nbMot.slice(1)} œuvre{nb > 1 ? 's' : ''} répertoriée{nb > 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Liste des œuvres déployée */}
      {ouvert && (
        <div style={{ borderTop: '1px solid #e4dcd0', padding: '6px 0 10px' }}>
          <style>{`
            .cat-ligne { display: flex; align-items: flex-start; padding: 8px 14px 8px 20px; transition: background-color 0.18s ease; gap: 10px; }
            .cat-ligne:hover { background-color: rgba(139,107,60,0.05); }
          `}</style>
          {groupes.map((groupe, idx) => {
            const aVoté = aVote(groupe.notices)
            const nbVotes = totalVotes(groupe.notices)
            // La langue originale ne s'affiche plus : sur un catalogue de
            // traductions françaises, elle ne renseigne pas le lecteur et
            // ouvrait une colonne vide une ligne sur deux.
            // Trois états : vérifié par l'admin (contrôle humain), pré-contrôle
            // automatique (IA) — que l'on signale SANS le présenter comme vérifié —,
            // ou rien du tout.
            const verifieAdmin = groupe.notices.every(n => n.verifie_admin)
            const precontroleIA = !verifieAdmin && groupe.notices.every(n => n.verifie)
            const [icone, libelle, couleur] = verifieAdmin
              ? ['✓', 'Données vérifiées', '#7a8a6a']
              : precontroleIA
              // Ocre franc : la référence n'est pas fautive, mais elle n'est pas
              // encore garantie. Le gris-taupe précédent se lisait comme une
              // mention passive ; l'ocre retient l'œil sans crier à l'erreur.
              ? ['✦', 'Référence en cours de vérification', '#b07d1e']
              : ['✦', 'Non vérifié', '#c09050']
            return (
              <div key={groupe.cle}
                className="cat-ligne"
                style={{ borderTop: idx > 0 ? '1px solid #eee8de' : 'none' }}>
                {/* Titre + éditions */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.8125rem', fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', color: 'var(--cs-texte)', lineHeight: 1.35 }}>{groupe.titreStable}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
                    {groupe.notices.map(n => {
                      // Une phrase, pas une suite d'abréviations : même modèle
                      // que la page de titre de l'œuvre — « Traduction par A et
                      // B, éditeur, année ». Les virgules suffisent à séparer.
                      const dateEdition = n.date_edition_affichage_courte ?? n.siecle_edition_affichage
                      const metaAvantDate = [
                        libelleTrad(n.traducteur),
                        formaterEditeur(n.editeur),
                      ].filter(Boolean).join(', ')
                      const meta = [metaAvantDate, dateEdition].filter(Boolean).join(', ')
                      const dp = n.domaine_public?.includes('oui')
                      return (
                        <span key={n.id} style={{ fontSize: '0.65625rem', color: '#a09080', lineHeight: 1.4 }}>
                          {meta ? <>{metaAvantDate}{metaAvantDate && dateEdition ? ', ' : null}{dateEdition && <span title={n.date_edition_precision_affichage ?? undefined}><HistoricalDate value={dateEdition} variant="short" /></span>}</> : titreDeclineCatalogue(n)}
                          {dp && <span title="Domaine public — œuvre libre de droits" style={{ marginLeft: '5px', fontSize: '0.5625rem', color: '#7a8a6a', fontWeight: 700, letterSpacing: '0.04em', cursor: 'help' }}>DP</span>}
                          <BoutonSignalerNotice reference={`${nomAuteur} — ${groupe.titreStable}`} texte={meta || titreDeclineCatalogue(n)} />
                        </span>
                      )
                    })}
                  </div>
                  {/* Vérification des données */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '1px', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: couleur }}>
                    <span style={{ fontSize: '0.5625rem' }}>{icone}</span>
                    {libelle}
                  </span>
                </div>
                {/* Actions : proposer + vote.
                    Les deux pictogrammes occupent la même case de 22 px et sont
                    tracés au même gabarit (viewBox 16, trait 1.4) : le « + » en
                    SVG et le cœur en caractère typographique ne s'alignaient pas
                    — le glyphe porte ses propres chasse et hauteur d'œil, si
                    bien qu'il pendait sous le « + » et paraissait plus gros. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  <button
                    onClick={() => onProposer(nomAuteur, groupe.titreStable)}
                    title="Proposer cette œuvre à l'équipe éditoriale"
                    style={{ ...BOUTON_ICONE, color: '#b8a888' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#8a6a30')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#b8a888')}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onVoter(groupe.notices)}
                    title={userId ? (aVoté ? 'Retirer mon vote' : 'Je veux cette œuvre') : 'Connectez-vous pour voter'}
                    style={{ ...BOUTON_ICONE, width: 'auto', gap: '2px', cursor: userId ? 'pointer' : 'default', color: aVoté ? '#b87a30' : '#c4b8a4' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"
                      fill={aVoté ? 'currentColor' : 'none'}>
                      <path d="M8 13.5S2.5 9.8 2.5 6.3A2.9 2.9 0 0 1 8 5a2.9 2.9 0 0 1 5.5 1.3c0 3.5-5.5 7.2-5.5 7.2z"
                        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ minWidth: '10px', textAlign: 'left', fontSize: '0.6875rem' }}>{nbVotes > 0 ? nbVotes : ''}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Modale « proposer cette œuvre » (pré-remplie, avec commentaire) ───────────
// La proposition depuis une œuvre du catalogue ouvre le MÊME formulaire que l'onglet
// « Proposer une œuvre », simplement pré-rempli avec l'auteur et le titre de la notice.
function ModaleProposerOeuvre({ auteur, titre, onClose }: {
  auteur: string; titre: string; onClose: () => void
}) {
  // Une saisie en cours ne doit pas se perdre sur un clic hors de la fenêtre (ou un Échap).
  // On détecte toute frappe via un `onInput` posé sur le contenu : c'est fiable même pour
  // les champs Auteur/Titre à autocomplétion, qui ne mettent `form` à jour qu'une fois une
  // suggestion choisie (une simple comparaison de `form` laissait passer la frappe).
  const toucheRef = useRef(false)
  const modifieRef = useRef(false)
  const [demandeFermeture, setDemandeFermeture] = useState(false)

  const tenterFermer = useCallback(() => {
    if (toucheRef.current || modifieRef.current) { setDemandeFermeture(true); return }
    onClose()
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Échap referme d'abord la demande de confirmation si elle est ouverte
      // (on reste alors dans le formulaire) ; sinon il tente de fermer la fenêtre.
      setDemandeFermeture(ouvert => { if (ouvert) return false; tenterFermer(); return ouvert })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [tenterFermer])

  return (
    <div onMouseDown={tenterFermer}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(30,26,20,0.42)', display: 'flex', padding: '20px', overflowY: 'auto' }}>
      <div onMouseDown={e => e.stopPropagation()} onInput={() => { toucheRef.current = true }}
        style={{ margin: 'auto', background: 'var(--cs-fond)', borderRadius: '10px', border: '1px solid var(--cs-bord)', width: '100%', maxWidth: '41.25rem', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px 12px', borderBottom: '1px solid #e4dcd0' }}>
          <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', color: 'var(--cs-texte)', margin: 0 }}>{(auteur || titre) ? 'Proposer cette œuvre' : 'Proposer une œuvre'}</h3>
          <button onClick={tenterFermer} aria-label="Fermer" style={{ fontSize: '1rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '0 22px' }}>
          <OngletProposer valeursInitiales={{ auteur_nom: auteur, titre }} onDirtyChange={d => { modifieRef.current = d }} />
        </div>
      </div>

      {/* Panneau de validation avant fermeture — s'affiche par-dessus la fenêtre dès
          qu'une saisie est en cours, pour éviter une perte accidentelle. */}
      {demandeFermeture && (
        <div onMouseDown={e => { e.stopPropagation(); setDemandeFermeture(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(30,26,20,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onMouseDown={e => e.stopPropagation()}
            style={{ background: 'var(--cs-surface)', borderRadius: '10px', border: '1px solid #e4dcd0', width: '100%', maxWidth: '23.75rem', padding: '20px 22px', boxShadow: '0 12px 40px rgba(0,0,0,0.24)' }}>
            <h4 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: 'var(--cs-texte)', margin: '0 0 8px' }}>Fermer sans enregistrer ?</h4>
            <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 18px' }}>
              Les informations que vous avez saisies seront perdues.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '9px' }}>
              <button onClick={() => setDemandeFermeture(false)}
                style={{ fontSize: '0.75rem', padding: '7px 14px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)', cursor: 'pointer' }}>
                Continuer l’édition
              </button>
              <button onClick={onClose}
                style={{ fontSize: '0.75rem', padding: '7px 14px', borderRadius: '5px', border: 'none', background: 'var(--cs-danger)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                Fermer sans enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionCatalogueManquant({ auteurs }: { auteurs: Auteur[] }) {
  // Croisement des formes de nom : la recherche sur un auteur du catalogue doit répondre
  // aussi bien à sa forme moderne qu'ancienne/originale. On indexe, pour chaque forme
  // rencontrée dans `auteurs` (nom + nom_original), l'ensemble des formes de cet auteur.
  // C'est une simple Map bâtie une fois — négligeable pour le moteur de recherche.
  const nomFormes = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of auteurs) {
      const formes = [a.nom, a.nom_original].filter(Boolean) as string[]
      const combine = formes.map(f => sansAccents(f)).join(' ')
      for (const f of formes) m.set(sansAccents(f), combine)
    }
    return m
  }, [auteurs])
  const [notices, setNotices] = useState<NoticeCompacte[]>([])
  const [chargement, setChargement] = useState(false)
  const [chargé, setChargé] = useState(false)
  const [votes, setVotes] = useState<Record<number, number>>({})
  const [mesVotes, setMesVotes] = useState<Set<number>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(0)
  const [proposition, setProposition] = useState<{ auteur: string; titre: string } | null>(null)

  const PAR_PAGE = 50

  const charger = async () => {
    if (chargé) return
    setChargement(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user.id ?? null)

      // Chargement complet : PostgREST plafonne à 1000 lignes par requête, on pagine.
      // (Sans cela, la liste s'arrêtait vers « Augustin ».)
      const data: NoticeCompacte[] = []
      for (let de = 0; ; de += 1000) {
        const { data: page } = await supabase
          .from('v_catalogue_notices_dates')
          .select('id, auteur, id_oeuvre_stable, titre_stable, titre_original, titre_edition, traducteur, editeur, date_edition_affichage_courte, date_edition_precision_affichage, siecle_edition_affichage, domaine_public, langue_originale, verifie, verifie_admin')
          .eq('presence_sur_le_site', false)
          .eq('refuse_admin', false)
          .order('auteur')
          .order('titre_stable')
          .order('id')
          .range(de, de + 999)
        if (!page?.length) break
        data.push(...page)
        if (page.length < 1000) break
      }

      if (data.length) {
        setNotices(data)
        const ids = data.map((n: NoticeCompacte) => n.id)
        if (ids.length > 0) {
          const { data: voteData } = await supabase.from('catalogue_votes').select('id_notice, user_id').in('id_notice', ids)
          if (voteData) {
            const counts: Record<number, number> = {}
            const miens = new Set<number>()
            for (const v of voteData) {
              counts[v.id_notice] = (counts[v.id_notice] ?? 0) + 1
              if (session?.user.id && v.user_id === session.user.id) miens.add(v.id_notice)
            }
            setVotes(counts)
            setMesVotes(miens)
          }
        }
      }
      setChargé(true)
    } finally { setChargement(false) }
  }

  useEffect(() => { void charger() }, [])

  const voter = async (idNotice: number) => {
    if (!userId) return
    const avait = mesVotes.has(idNotice)
    setMesVotes(prev => { const s = new Set(prev); avait ? s.delete(idNotice) : s.add(idNotice); return s })
    setVotes(prev => ({ ...prev, [idNotice]: Math.max(0, (prev[idNotice] ?? 0) + (avait ? -1 : 1)) }))
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    await fetch('/api/catalogue/votes', { method: avait ? 'DELETE' : 'POST', headers, body: JSON.stringify({ id_notice: idNotice }) })
  }

  const voterGroupe = async (ns: NoticeCompacte[]) => {
    const cible = ns.find(n => mesVotes.has(n.id)) ?? ns[0]
    if (cible) await voter(cible.id)
  }

  // Grouper par auteur, puis par œuvre stabilisée
  const groupes = new Map<string, { cle: string; auteur: string; titreStable: string; notices: NoticeCompacte[] }>()
  for (const n of notices) {
    const cle = cleOeuvreCatalogue(n)
    const groupe = groupes.get(cle) ?? { cle, auteur: n.auteur, titreStable: n.titre_stable, notices: [] }
    groupe.notices.push(n)
    groupes.set(cle, groupe)
  }
  const parAuteur: Record<string, GroupeCatalogue[]> = {}
  for (const groupe of groupes.values()) {
    if (!parAuteur[groupe.auteur]) parAuteur[groupe.auteur] = []
    groupe.notices.sort((a, b) =>
      String(a.date_edition_affichage_courte ?? a.siecle_edition_affichage ?? '').localeCompare(String(b.date_edition_affichage_courte ?? b.siecle_edition_affichage ?? ''), 'fr') ||
      titreDeclineCatalogue(a).localeCompare(titreDeclineCatalogue(b), 'fr')
    )
    parAuteur[groupe.auteur].push({ cle: groupe.cle, titreStable: groupe.titreStable, notices: groupe.notices })
  }
  for (const gs of Object.values(parAuteur)) {
    gs.sort((a, b) => a.titreStable.localeCompare(b.titreStable, 'fr'))
  }

  const auteursTriésTous = Object.keys(parAuteur).sort((a, b) => a.localeCompare(b, 'fr'))

  // Recherche (auteur ou titre d'œuvre), identique à la bibliothèque.
  const q = sansAccents(recherche.trim())
  // Recherche restreinte AUX SEULS noms d'auteur (toutes formes, via le croisement) et aux
  // titres d'œuvres — rien d'autre (ni traducteur, ni éditeur…).
  const auteursTriés = q
    ? auteursTriésTous.filter(nom => {
        const formes = `${sansAccents(nom)} ${nomFormes.get(sansAccents(nom)) ?? ''}`
        return formes.includes(q) || parAuteur[nom].some(g => sansAccents(g.titreStable).includes(q))
      })
    : auteursTriésTous

  const nbPages = Math.max(1, Math.ceil(auteursTriés.length / PAR_PAGE))
  const pageActive = Math.min(page, nbPages - 1)
  const auteursPage = auteursTriés.slice(pageActive * PAR_PAGE, pageActive * PAR_PAGE + PAR_PAGE)

  // La recherche remet à la première page.
  useEffect(() => { setPage(0) }, [recherche])

  // Changement de page sans saut : on conserve la position de défilement.
  const changerPage = (delta: number) => {
    const y = window.scrollY
    setPage(p => Math.max(0, Math.min(nbPages - 1, p + delta)))
    requestAnimationFrame(() => window.scrollTo({ top: y }))
  }

  return (
    <div>
      {/* « Proposer une œuvre » à gauche, face à la barre de recherche (centrée), et
          ouvrant une fenêtre plutôt que de basculer d'onglet. */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', minHeight: '40px' }}>
        <button onClick={() => setProposition({ auteur: '', titre: '' })}
          style={{ position: 'absolute', left: 0, fontSize: '0.6875rem', color: '#7a6a48', background: 'rgba(139,107,60,0.08)', border: '1px solid rgba(139,107,60,0.22)', borderRadius: '5px', cursor: 'pointer', padding: '7px 12px' }}>
          Proposer une œuvre
        </button>
        {/* Recherche — identique en placement et en forme à l'onglet Bibliothèque */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '21.25rem' }}>
          <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher un auteur ou une œuvre"
            style={{ width: '100%', fontSize: '0.8125rem', padding: '9px 14px 9px 38px', border: '1px solid var(--cs-bord)', borderRadius: '6px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }} />
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
            <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {chargement ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>Chargement…</p>
      ) : auteursTriés.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
          Aucun auteur ne correspond à ces critères.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {auteursPage.map(nomAuteur => (
              <PanneauCatalogue
                key={nomAuteur}
                nomAuteur={nomAuteur}
                groupes={parAuteur[nomAuteur]}
                votes={votes}
                mesVotes={mesVotes}
                userId={userId}
                onVoter={voterGroupe}
                onProposer={(a, t) => setProposition({ auteur: a, titre: t })}
              />
            ))}
          </div>

          {nbPages > 1 && (
            <>
              {/* Flèches fixes, toujours visibles à l'écran */}
              <button onClick={() => changerPage(-1)} disabled={pageActive === 0}
                aria-label="Page précédente"
                style={{ position: 'fixed', left: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 40,
                  width: '42px', height: '42px', borderRadius: '50%', border: '1px solid var(--cs-bord)',
                  background: 'var(--cs-surface)', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', cursor: pageActive === 0 ? 'default' : 'pointer',
                  opacity: pageActive === 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a48' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={() => changerPage(1)} disabled={pageActive >= nbPages - 1}
                aria-label="Page suivante"
                style={{ position: 'fixed', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 40,
                  width: '42px', height: '42px', borderRadius: '50%', border: '1px solid var(--cs-bord)',
                  background: 'var(--cs-surface)', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', cursor: pageActive >= nbPages - 1 ? 'default' : 'pointer',
                  opacity: pageActive >= nbPages - 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a48' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>

              {/* Pagination en pied : flèches ‹ › encadrant l'indicateur de page. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '22px' }}>
                <button onClick={() => changerPage(-1)} disabled={pageActive === 0} aria-label="Page précédente"
                  style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', cursor: pageActive === 0 ? 'default' : 'pointer', opacity: pageActive === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a48', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <span style={{ fontSize: '0.6875rem', color: '#a09484', fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                  Page {pageActive + 1} sur {nbPages}
                </span>
                <button onClick={() => changerPage(1)} disabled={pageActive >= nbPages - 1} aria-label="Page suivante"
                  style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', cursor: pageActive >= nbPages - 1 ? 'default' : 'pointer', opacity: pageActive >= nbPages - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a48', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </>
          )}
        </>
      )}

      {proposition && (
        <ModaleProposerOeuvre
          auteur={proposition.auteur}
          titre={proposition.titre}
          onClose={() => setProposition(null)}
        />
      )}
    </div>
  )
}

// ── Onglet Proposer ───────────────────────────────────────────────────────────
const CHAMP_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontSize: '0.8125rem', padding: '8px 11px',
  border: '1px solid var(--cs-bord)', borderRadius: '5px', background: 'var(--cs-fond-clair)',
  color: 'var(--cs-texte-fort)', outline: 'none', fontFamily: 'var(--font-source-serif), Georgia, serif',
}

/* ── Autocomplétion auteur ──────────────────────────────────────────────── */
function ComboAuteur({ value, onChange, onAuteurId }: {
  value: string
  onChange: (v: string) => void
  onAuteurId: (id: string | null) => void
}) {
  const [saisie, setSaisie] = useState(value)
  const [suggestions, setSuggestions] = useState<{ nom: string; id_auteur: string }[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [libre, setLibre] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (libre || saisie.trim().length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('auteurs').select('id_auteur, nom').ilike('nom', `%${saisie.trim()}%`).order('nom').limit(12)
      setSuggestions(data ?? [])
      setOuvert(true)
    }, 220)
    return () => clearTimeout(t)
  }, [saisie, libre])

  function choisir(nom: string, id: string) {
    setSaisie(nom); onChange(nom); onAuteurId(id)
    setSuggestions([]); setOuvert(false); setLibre(false)
  }

  function choisirAutre() {
    setSaisie(''); onChange(''); onAuteurId(null)
    setSuggestions([]); setOuvert(false); setLibre(true)
  }

  if (libre) return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input autoFocus value={saisie} onChange={e => { setSaisie(e.target.value); onChange(e.target.value) }}
        placeholder="Nom de l'auteur" style={CHAMP_STYLE} />
      <button type="button" onClick={() => { setLibre(false); setSaisie(''); onChange(''); onAuteurId(null) }}
        style={{ fontSize: '0.6875rem', padding: '6px 10px', border: '1px solid var(--cs-bord)', borderRadius: '5px', background: 'var(--cs-fond-clair)', color: '#8a7f74', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        ← Catalogue
      </button>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={saisie} onChange={e => { setSaisie(e.target.value); onChange(''); onAuteurId(null) }}
        onFocus={() => saisie.trim().length >= 2 && setOuvert(true)}
        placeholder="Commencez à taper…" style={CHAMP_STYLE} autoComplete="off" />
      {ouvert && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '5px', boxShadow: '0 4px 12px rgba(0,0,0,.1)', marginTop: '2px', maxHeight: '220px', overflowY: 'auto' }}>
          {suggestions.map(s => (
            <div key={s.id_auteur} onMouseDown={() => choisir(s.nom, s.id_auteur)}
              style={{ padding: '8px 12px', fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', cursor: 'pointer', fontFamily: 'var(--font-source-serif), Georgia, serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              {s.nom}
            </div>
          ))}
          <div onMouseDown={choisirAutre}
            style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#8a7f74', cursor: 'pointer', borderTop: suggestions.length ? '1px solid var(--cs-fond-doux)' : 'none', fontStyle: 'italic' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            Autre auteur (saisie libre)
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Autocomplétion titre ───────────────────────────────────────────────── */
function ComboTitre({ value, onChange, auteurNom }: {
  value: string
  onChange: (v: string) => void
  auteurNom: string
}) {
  const [saisie, setSaisie] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [libre, setLibre] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (libre || saisie.trim().length < 2) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      let q = supabase.from('catalogue_notices').select('titre_stable').ilike('titre_stable', `%${saisie.trim()}%`).not('titre_stable', 'is', null)
      if (auteurNom.trim().length >= 2) q = q.ilike('auteur', `%${auteurNom.trim()}%`)
      const { data } = await q.order('titre_stable').limit(12)
      const titres = [...new Set((data ?? []).map(d => d.titre_stable as string).filter(Boolean))]
      setSuggestions(titres)
      setOuvert(true)
    }, 220)
    return () => clearTimeout(t)
  }, [saisie, auteurNom, libre])

  function choisir(titre: string) {
    setSaisie(titre); onChange(titre)
    setSuggestions([]); setOuvert(false); setLibre(false)
  }

  function choisirAutre() {
    setSaisie(''); onChange(''); setSuggestions([]); setOuvert(false); setLibre(true)
  }

  if (libre) return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input autoFocus value={saisie} onChange={e => { setSaisie(e.target.value); onChange(e.target.value) }}
        placeholder="Titre de l'œuvre" style={CHAMP_STYLE} />
      <button type="button" onClick={() => { setLibre(false); setSaisie(''); onChange('') }}
        style={{ fontSize: '0.6875rem', padding: '6px 10px', border: '1px solid var(--cs-bord)', borderRadius: '5px', background: 'var(--cs-fond-clair)', color: '#8a7f74', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        ← Catalogue
      </button>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={saisie} onChange={e => { setSaisie(e.target.value); onChange('') }}
        onFocus={() => saisie.trim().length >= 2 && setOuvert(true)}
        placeholder="Commencez à taper…" style={CHAMP_STYLE} autoComplete="off" />
      {ouvert && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '5px', boxShadow: '0 4px 12px rgba(0,0,0,.1)', marginTop: '2px', maxHeight: '220px', overflowY: 'auto' }}>
          {suggestions.map((titre, i) => (
            <div key={i} onMouseDown={() => choisir(titre)}
              style={{ padding: '8px 12px', fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', cursor: 'pointer', fontFamily: 'var(--font-source-serif), Georgia, serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              {titre}
            </div>
          ))}
          <div onMouseDown={choisirAutre}
            style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#8a7f74', cursor: 'pointer', borderTop: suggestions.length ? '1px solid var(--cs-fond-doux)' : 'none', fontStyle: 'italic' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            Autre titre (saisie libre)
          </div>
        </div>
      )}
    </div>
  )
}

type FormProposition = {
  auteur_nom: string; titre: string; traducteur: string; editeur: string
  collection: string; ville: string; date_publication: string; siecle: string
  langue: string; note: string; texte: string
}

function OngletProposer({ valeursInitiales, onDirtyChange }: {
  valeursInitiales?: Partial<FormProposition>
  onDirtyChange?: (dirty: boolean) => void
} = {}) {
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'ok' | 'erreur' | 'limite'>('idle')
  const [messageErreur, setMessageErreur] = useState<string | null>(null)
  const [afficherNom, setAfficherNom] = useState(false)
  const [droitsGarantis, setDroitsGarantis] = useState(false)
  const [quotaRestant, setQuotaRestant] = useState<number | null>(null)
  const [auteurId, setAuteurId] = useState<string | null>(null)
  const valeursDepart = useRef<FormProposition>({
    auteur_nom: '', titre: '', traducteur: '', editeur: '',
    collection: '', ville: '', date_publication: '', siecle: '', langue: '', note: '', texte: '',
    ...valeursInitiales,
  })
  const [form, setForm] = useState<FormProposition>(valeursDepart.current)

  // Le parent (fenêtre modale) est prévenu dès que la saisie diffère de son point de
  // départ : il pourra demander confirmation avant de fermer et éviter une perte
  // accidentelle. Une proposition envoyée (statut « ok ») n'est plus « en cours ».
  useEffect(() => {
    if (!onDirtyChange) return
    const modifie = statut !== 'ok' && (
      JSON.stringify(form) !== JSON.stringify(valeursDepart.current) || droitsGarantis || afficherNom
    )
    onDirtyChange(modifie)
  }, [form, droitsGarantis, afficherNom, statut, onDirtyChange])

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      setConnecte(!!session)
      setToken(session?.access_token ?? null)
      if (session?.access_token) {
        fetch('/api/propositions', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json()).then(d => setQuotaRestant(d.restantes ?? null)).catch(() => {})
      }
    })
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const envoyer = async () => {
    if (!token || !form.auteur_nom.trim() || !form.titre.trim() || !form.texte.trim() || !droitsGarantis) return
    if (quotaRestant !== null && quotaRestant <= 0) { setStatut('limite'); return }
    setStatut('envoi')
    const res = await fetch('/api/propositions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, afficher_nom: afficherNom }),
    })
    const json = await res.json()
    if (!res.ok) {
      if (res.status === 429) { setStatut('limite'); setMessageErreur(json.error ?? null); return }
      setStatut('erreur'); setMessageErreur(json.error ?? null); return
    }
    setStatut('ok')
    if (typeof json.restantes === 'number') setQuotaRestant(json.restantes)
    setForm({ auteur_nom: '', titre: '', traducteur: '', editeur: '', collection: '', ville: '', date_publication: '', siecle: '', langue: '', note: '', texte: '' })
    setAuteurId(null); setDroitsGarantis(false); setAfficherNom(false)
  }

  if (connecte === null) return null

  if (!connecte) return (
    <div style={{ maxWidth: '32.5rem', margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
      <svg width="38" height="38" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '16px', opacity: 0.35 }}>
        <circle cx="20" cy="14" r="7" stroke="#2a3d30" strokeWidth="1.4" fill="none"/>
        <path d="M4 38 Q6 24 20 20 Q34 24 36 38" stroke="#2a3d30" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      </svg>
      <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: '#3d4a40', marginBottom: '6px' }}>Connexion requise</p>
      <p style={{ fontSize: '0.78125rem', color: '#8a8278', lineHeight: 1.65, marginBottom: '22px' }}>
        Seuls les membres de Corpus Scriptura peuvent proposer un texte.<br/>Connectez-vous pour contribuer à la bibliothèque.
      </p>
      <a href="/chantier" style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--cs-vert)', color: '#fff', borderRadius: '6px', fontSize: '0.8125rem', textDecoration: 'none', fontWeight: 500 }}>
        Se connecter
      </a>
    </div>
  )

  if (statut === 'limite') return (
    <div style={{ maxWidth: '32.5rem', margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
      <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', color: '#9a5a2a', marginBottom: '8px' }}>Limite journalière atteinte</p>
      <p style={{ fontSize: '0.78125rem', color: '#8a8278', lineHeight: 1.65, marginBottom: '24px' }}>
        {messageErreur ?? 'Vous avez atteint le nombre maximum de propositions pour aujourd\'hui. Revenez demain.'}
      </p>
    </div>
  )

  if (statut === 'ok') return (
    <div style={{ maxWidth: '32.5rem', margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(var(--cs-vert-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 7-8" stroke="#3d6b4f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', color: 'var(--cs-encre)', marginBottom: '8px' }}>Proposition envoyée</p>
      <p style={{ fontSize: '0.78125rem', color: '#8a8278', lineHeight: 1.65, marginBottom: '24px' }}>
        Merci pour votre contribution. L'équipe éditoriale examinera votre proposition.
      </p>
      <button onClick={() => setStatut('idle')} style={{ fontSize: '0.78125rem', color: 'var(--cs-vert)', background: 'none', border: '1px solid var(--cs-vert)', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer' }}>
        Proposer une autre œuvre
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: '38.75rem', margin: '0 auto', padding: '8px 0 80px' }}>
      <div style={{ background: 'rgba(var(--cs-vert-rgb),0.06)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)', borderRadius: '8px', padding: '14px 18px', marginBottom: '28px' }}>
        <p style={{ fontSize: '0.78125rem', color: '#3a5040', lineHeight: 1.65, margin: 0 }}>
          Vous souhaitez enrichir la bibliothèque patristique ? Proposez un texte <strong>libre de droits</strong> (auteur décédé depuis plus de 70 ans, ou traduction ancienne dans le domaine public).
          Fournissez de préférence un texte propre, déjà structuré. L'équipe éditoriale vous contactera si nécessaire.
        </p>
        {quotaRestant !== null && (
          <p style={{ fontSize: '0.6875rem', color: quotaRestant === 0 ? 'var(--cs-danger)' : '#6a8c78', margin: '10px 0 0', borderTop: '1px solid rgba(var(--cs-vert-rgb),0.15)', paddingTop: '10px' }}>
            {quotaRestant === 0
              ? 'Vous avez atteint votre limite de propositions pour aujourd\'hui.'
              : `${quotaRestant} proposition${quotaRestant > 1 ? 's' : ''} restante${quotaRestant > 1 ? 's' : ''} aujourd'hui.`}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Auteur + titre */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>
              Auteur patristique <span style={{ color: 'var(--cs-danger)' }}>*</span>
            </label>
            <ComboAuteur value={form.auteur_nom}
              onChange={v => setForm(prev => ({ ...prev, auteur_nom: v }))}
              onAuteurId={id => setAuteurId(id)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>
              Titre de l'œuvre <span style={{ color: 'var(--cs-danger)' }}>*</span>
            </label>
            <ComboTitre value={form.titre}
              onChange={v => setForm(prev => ({ ...prev, titre: v }))}
              auteurNom={form.auteur_nom} />
          </div>
        </div>

        {/* Traducteur + éditeur */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>Traducteur</label>
            <input value={form.traducteur} onChange={set('traducteur')} placeholder="ex. Louis de Mondalon" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>Éditeur</label>
            <input value={form.editeur} onChange={set('editeur')} placeholder="ex. Desclée de Brouwer" style={CHAMP_STYLE} />
          </div>
        </div>

        {/* Collection + ville + date */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>Collection</label>
            <input value={form.collection} onChange={set('collection')} placeholder="ex. Sources chrétiennes" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>Ville</label>
            <input value={form.ville} onChange={set('ville')} placeholder="ex. Paris" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>Date de publication</label>
            <input value={form.date_publication} onChange={set('date_publication')} placeholder="ex. 1924" style={CHAMP_STYLE} />
          </div>
        </div>

        {/* Siècle + langue */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>Siècle de l'auteur</label>
            <input value={form.siecle} onChange={set('siecle')} placeholder="ex. IVe" style={CHAMP_STYLE} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>Langue originale</label>
            <select value={form.langue} onChange={set('langue')} style={CHAMP_STYLE}>
              <option value="">— sélectionner —</option>
              {['Grec', 'Latin', 'Syriaque', 'Copte', 'Arménien', 'Autre'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>
            Note (source, droits, contexte)
          </label>
          <textarea value={form.note} onChange={set('note')} rows={3}
            placeholder="Précisez la source du texte, confirmez qu'il est dans le domaine public, ou toute remarque utile à l'équipe éditoriale."
            style={{ ...CHAMP_STYLE, resize: 'vertical', lineHeight: 1.6 }} />
        </div>

        {/* Texte */}
        <div>
          <label style={{ display: 'block', fontSize: '0.65625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '5px' }}>
            Texte complet
          </label>
          <textarea value={form.texte} onChange={set('texte')} rows={18}
            placeholder="Collez ici le texte intégral de l'œuvre. Un texte structuré avec des titres de chapitres est préférable."
            style={{ ...CHAMP_STYLE, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '0.75rem', resize: 'vertical', lineHeight: 1.65 }} />
          {form.texte && (
            <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', marginTop: '4px' }}>
              {form.texte.length.toLocaleString('fr-FR')} caractères
            </p>
          )}
        </div>

        {/* Garantie droits */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '12px 14px', background: 'rgba(var(--cs-vert-rgb),0.05)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)', borderRadius: '6px' }}>
          <input type="checkbox" checked={droitsGarantis} onChange={e => setDroitsGarantis(e.target.checked)}
            style={{ marginTop: '2px', accentColor: 'var(--cs-vert)', flexShrink: 0, width: '14px', height: '14px' }} />
          <span style={{ fontSize: '0.75rem', color: '#3a5040', lineHeight: 1.6 }}>
            <strong>J'atteste</strong> que cette traduction est <strong>libre de droits</strong> (auteur décédé depuis plus de 70 ans ou édition dans le domaine public) et que le texte n'a pas été dénaturé.
          </span>
        </label>

        {/* Afficher le nom */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={afficherNom} onChange={e => setAfficherNom(e.target.checked)}
            style={{ accentColor: 'var(--cs-vert)', width: '14px', height: '14px' }} />
          <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)' }}>
            Faire apparaître mon nom ou pseudo comme apporteur de cette contribution
          </span>
        </label>

        <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0 }}>
          Les contributions acceptées rapportent des points à leur apporteur et sont visibles dans votre profil.
        </p>

        {statut === 'erreur' && (
          <p style={{ fontSize: '0.75rem', color: 'var(--cs-danger)', margin: 0 }}>Une erreur est survenue. Veuillez réessayer.</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {(() => {
            const pret = !!form.auteur_nom.trim() && !!form.titre.trim() && !!form.texte.trim() && droitsGarantis
            return (
              <button onClick={envoyer} disabled={statut === 'envoi' || !pret}
                style={{ padding: '10px 28px', background: 'var(--cs-vert)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500, cursor: pret ? 'pointer' : 'default', opacity: pret ? 1 : 0.45, transition: 'opacity 0.15s' }}>
                {statut === 'envoi' ? 'Envoi…' : 'Envoyer la proposition'}
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
type Onglet = 'bibliotheque' | 'favoris' | 'catalogue' | 'proposer'

function OngletFavoris({ auteurs, favorisOeuvres, favorisPret, toggleFavoriOeuvre, onOuvrirAuteur, originaux }: {
  auteurs: Auteur[]
  favorisOeuvres: Set<string>
  favorisPret: boolean
  toggleFavoriOeuvre: (id: string) => void
  onOuvrirAuteur: (id: string) => void
  originaux?: Set<string>
}) {
  const oeuvresFavorites = useMemo(() => {
    const lignes: { oeuvre: Oeuvre; auteur: Auteur }[] = []
    for (const a of auteurs) {
      for (const o of a.oeuvres) {
        if (favorisOeuvres.has(o.id_oeuvre)) lignes.push({ oeuvre: o, auteur: a })
      }
    }
    return lignes.sort((a, b) => a.auteur.nom.localeCompare(b.auteur.nom, 'fr') || a.oeuvre.titre.localeCompare(b.oeuvre.titre, 'fr'))
  }, [auteurs, favorisOeuvres])

  // Regroupement par auteur : un auteur (avec ses seules œuvres favorites) par carte,
  // pour reprendre la présentation de l'onglet Bibliothèque (PanneauAuteur).
  const auteursFavoris = useMemo(() => {
    const parId = new Map<string, Auteur>()
    for (const { oeuvre, auteur } of oeuvresFavorites) {
      const existant = parId.get(auteur.id_auteur)
      if (existant) existant.oeuvres.push(oeuvre)
      else parId.set(auteur.id_auteur, { ...auteur, oeuvres: [oeuvre] })
    }
    return [...parId.values()]
  }, [oeuvresFavorites])

  if (!favorisPret) {
    return <p style={{ textAlign: 'center', fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement des favoris…</p>
  }

  if (oeuvresFavorites.length === 0) {
    return (
      <div style={{ maxWidth: '32.5rem', margin: '0 auto', textAlign: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '22px 24px' }}>
        <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: 'var(--cs-encre)', margin: '0 0 6px' }}>Aucune œuvre favorite</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', lineHeight: 1.6, margin: 0 }}>
          Ajoutez une œuvre à vos favoris depuis sa ligne dans la bibliothèque ou depuis sa page de lecture.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '42.5rem', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="#b88a45" style={{ flexShrink: 0 }}>
          <path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.131L8 10.765l-3.708 1.949.708-4.131-3-2.924 4.146-.603z"/>
        </svg>
        <span style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)' }}>Œuvres favorites</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--cs-bord-clair)' }} />
      </div>
      {/* Présentation reprise de l'onglet Bibliothèque, en version compacte : cartes
          sans photo ni notice, ouvertes par défaut, ne listant que les œuvres favorites. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {auteursFavoris.map(a => (
          <PanneauAuteur key={a.id_auteur} auteur={a} recherche="" favorisOeuvres={favorisOeuvres} toggleFavoriOeuvre={toggleFavoriOeuvre} onOuvrirAuteur={onOuvrirAuteur} originaux={originaux} ouvertParDefaut compact />
        ))}
      </div>
    </div>
  )
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SELECT_AUTEURS = 'id_auteur, nom, nom_original, titre, dates, date_naissance, date_mort, siecle, langue_principale, traditions, note, note_biographique, note_theologique, photo_position'
const SELECT_OEUVRES_DATES = 'id_oeuvre, id_auteur, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication_affichage_courte, date_publication_precision_affichage, genre, note, langue_originale'
// Bucket HORAIRE (identique au serveur, app/bibliotheque/page.tsx) : le paramètre
// ?v= reste stable au sein d'une heure, donc le navigateur met les photos en cache
// au lieu de les retélécharger à chaque montage/refetch (auparavant : bucket à la
// seconde, qui cassait le cache en permanence).
const imageVersionAuteur = () => Math.floor(Date.now() / (3600 * 1000))
const urlImageAuteur = (idAuteur: string, version = imageVersionAuteur()) =>
  `${SUPABASE_URL}/storage/v1/object/public/auteurs/${idAuteur}.jpg?v=${version}`

function normaliserAuteurs(data: any[], oeuvres: Oeuvre[]): Auteur[] {
  const version = imageVersionAuteur()
  const oeuvresParAuteur = new Map<string, Oeuvre[]>()
  for (const oeuvre of oeuvres.filter(estOeuvrePubliee)) {
    const groupe = oeuvresParAuteur.get(oeuvre.id_auteur) ?? []
    groupe.push(oeuvre)
    oeuvresParAuteur.set(oeuvre.id_auteur, groupe)
  }
  return data
    .map(a => ({ ...a, oeuvres: oeuvresParAuteur.get(String(a.id_auteur)) ?? [] }))
    .filter(a => a.oeuvres?.length > 0)
    .map(a => ({ ...a, imageUrl: urlImageAuteur(String(a.id_auteur), version) }))
}

export default function BibliothequeClient({ auteurs: auteursInitiaux, erreurChargement = false }: { auteurs: Auteur[]; erreurChargement?: boolean }) {
  useEditeursCharges()
  const searchParams = useSearchParams()
  const [auteurs, setAuteurs] = useState<Auteur[]>(auteursInitiaux)
  const [onglet, setOnglet] = useState<Onglet>('bibliotheque')
  const { favoris: favorisOeuvres, pret: favorisPret, toggle: toggleFavoriOeuvre } = useFavoris('oeuvre')

  // Œuvres qui disposent d'un texte original parallèle (latin/grec), lisible dans la
  // page de l'œuvre. Sert à proposer le texte original dans la liste des œuvres.
  const [originaux, setOriginaux] = useState<Set<string>>(new Set())
  useEffect(() => {
    supabase.from('v_oeuvres_texte_original').select('id_oeuvre').then(({ data }) => {
      if (data) setOriginaux(new Set((data as { id_oeuvre: string }[]).map(r => r.id_oeuvre)))
    })
  }, [])

  useEffect(() => {
    const version = imageVersionAuteur()
    setAuteurs(prev => prev.map(a => ({ ...a, imageUrl: urlImageAuteur(String(a.id_auteur), version) })))
  }, [])

  const refetch = useCallback(async () => {
    const [auteursResultat, oeuvresResultat] = await Promise.all([
      supabase.from('auteurs').select(SELECT_AUTEURS).order('siecle', { ascending: true, nullsFirst: false }),
      supabase.from('v_oeuvres_dates').select(SELECT_OEUVRES_DATES),
    ])
    if (auteursResultat.data && oeuvresResultat.data) {
      setAuteurs(normaliserAuteurs(auteursResultat.data, oeuvresResultat.data as Oeuvre[]))
    }
  }, [])

  useEffect(() => {
    const channel = supabase.channel('bibliotheque-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auteurs' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oeuvres' }, refetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch])
  const [recherche, setRecherche] = useState(searchParams.get('q') ?? '')
  // Fiche auteur ouverte en fenêtre (plutôt qu'une navigation vers une page dédiée).
  const [auteurModal, setAuteurModal] = useState<string | null>(null)

  // Filtres à facettes, sur le modèle du volet droit de la page Bible : période (siècle),
  // langue et tradition, dépliés depuis un bouton posé à côté de la barre de recherche.
  const [filtresOuverts, setFiltresOuverts] = useState(false)
  const [periodesActives, setPeriodesActives] = useState<Set<number>>(new Set())
  const [languesActives, setLanguesActives] = useState<Set<string>>(new Set())
  const [traditionsActives, setTraditionsActives] = useState<Set<string>>(new Set())
  const basculer = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, v: T) =>
    setter(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s })

  // Facettes réellement présentes dans les données (pas de tag vide).
  const languesDispo = useMemo(
    () => Array.from(new Set(auteurs.map(a => a.langue_principale).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'fr')),
    [auteurs])
  const traditionsDispo = useMemo(
    () => Array.from(new Set(auteurs.flatMap(a => a.traditions ?? []))).sort((a, b) => a.localeCompare(b, 'fr')),
    [auteurs])
  const nbFiltres = periodesActives.size + languesActives.size + traditionsActives.size

  const qNorm = sansAccents(recherche.trim())

  const auteursFiltres = useMemo(() => auteurs
    .filter(a => !qNorm || sansAccents(a.nom).includes(qNorm) || a.oeuvres.some(o => sansAccents(o.titre).includes(qNorm)))
    .filter(a => {
      if (periodesActives.size) {
        const n = siecleEnNombre(a.siecle)
        if (n == null || ![...periodesActives].some(i => n >= PERIODES[i].min && n <= PERIODES[i].max)) return false
      }
      if (languesActives.size && !(a.langue_principale && languesActives.has(a.langue_principale))) return false
      if (traditionsActives.size && !(a.traditions ?? []).some(t => traditionsActives.has(t))) return false
      return true
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  [auteurs, qNorm, periodesActives, languesActives, traditionsActives])

  return (
    <main style={{ background: 'var(--cs-fond)', minHeight: '100vh', paddingTop: '3.5rem' }}>
      {erreurChargement && (
        <div role="alert" style={{ background: 'var(--cs-danger-fond)', borderBottom: '1px solid var(--cs-danger-bord)', color: '#a2564a', fontSize: '0.8125rem', padding: '10px 20px', textAlign: 'center' }}>
          La bibliothèque n’a pas pu être chargée entièrement. Rechargez la page pour réessayer.
        </div>
      )}
      <div style={{ maxWidth: '56.25rem', margin: '0 auto', padding: '22px 32px 40px' }}>

        {/* En-tête : titre, onglets et recherche, avec une même respiration verticale (≈14 px)
            entre chaque strate pour former un bloc au rythme régulier. */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: 'clamp(20px, 3vw, 25px)', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', letterSpacing: '0.01em', margin: 0, lineHeight: 1.1 }}>
            Bibliothèque
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--cs-bord)', marginBottom: '14px' }}>
          {([['bibliotheque', 'Bibliothèque'], ['favoris', 'Favoris'], ['catalogue', 'Catalogue des traductions']] as [Onglet, string][]).map(([key, label], idx) => (
            <React.Fragment key={key}>
              {idx > 0 && (
                <span style={{ width: '1px', background: '#e0d8ce', alignSelf: 'center', height: '14px', flexShrink: 0 }} />
              )}
              <button onClick={() => setOnglet(key)} style={{
                flex: 1, padding: '8px 8px', fontSize: '0.75rem', fontFamily: 'var(--font-source-serif), Georgia, serif',
                textAlign: 'center',
                background: 'none', border: 'none', borderBottom: onglet === key ? '2px solid var(--cs-vert)' : '2px solid transparent',
                color: onglet === key ? 'var(--cs-vert)' : '#8a8278', cursor: 'pointer',
                fontWeight: onglet === key ? 600 : 400, marginBottom: '-1px',
                transition: 'color 0.15s',
              }}>
                {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Contenu onglet Bibliothèque */}
        {onglet === 'bibliotheque' && (
          <>
            {/* Recherche + bouton Filtres, côte à côte. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto 12px', maxWidth: '30rem' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '21.25rem' }}>
                <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
                  placeholder="Rechercher un auteur ou une œuvre"
                  style={{ width: '100%', fontSize: '0.78125rem', padding: '7px 14px 7px 36px', border: '1px solid var(--cs-bord)', borderRadius: '6px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }} />
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                  <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
                  <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <button onClick={() => setFiltresOuverts(o => !o)} aria-expanded={filtresOuverts}
                style={{ position: 'relative', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78125rem', color: filtresOuverts || nbFiltres > 0 ? 'var(--cs-vert)' : 'var(--cs-texte-second)', background: filtresOuverts ? 'rgba(var(--cs-vert-rgb),0.06)' : '#fff', border: `1px solid ${filtresOuverts || nbFiltres > 0 ? '#a9c9b6' : 'var(--cs-bord)'}`, borderRadius: '6px', cursor: 'pointer', padding: '7px 14px', fontFamily: 'inherit' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1.5 3h11M3.5 7h7M5.5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Filtres
                {nbFiltres > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '15px', height: '15px', padding: '0 4px', borderRadius: '999px', background: 'var(--cs-vert)', color: '#fff', fontSize: '0.5625rem', fontWeight: 700, lineHeight: 1 }}>{nbFiltres}</span>
                )}
              </button>
            </div>

            {/* Panneau de filtres à facettes (période · langue · tradition). */}
            {filtresOuverts && (
              <div style={{ maxWidth: '52rem', margin: '0 auto 18px', padding: '16px 20px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <LigneFiltres label="Période">
                  {PERIODES.map((p, i) => (
                    <Chip key={i} theme="periode" actif={periodesActives.has(i)} onClick={() => basculer(setPeriodesActives, i)}>{p.jsx}</Chip>
                  ))}
                </LigneFiltres>
                {languesDispo.length > 0 && (
                  <LigneFiltres label="Langue">
                    {languesDispo.map(l => (
                      <Chip key={l} theme="langue" actif={languesActives.has(l)} onClick={() => basculer(setLanguesActives, l)}>{l}</Chip>
                    ))}
                  </LigneFiltres>
                )}
                {traditionsDispo.length > 0 && (
                  <LigneFiltres label="Tradition">
                    {traditionsDispo.map(t => (
                      <Chip key={t} theme="genre" actif={traditionsActives.has(t)} onClick={() => basculer(setTraditionsActives, t)}>{t}</Chip>
                    ))}
                  </LigneFiltres>
                )}
                {nbFiltres > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '2px' }}>
                    <button onClick={() => { setPeriodesActives(new Set()); setLanguesActives(new Set()); setTraditionsActives(new Set()) }}
                      style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', fontStyle: 'italic', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
                      Effacer les filtres
                    </button>
                  </div>
                )}
              </div>
            )}

            {auteursFiltres.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
                Aucun auteur ne correspond à ces critères.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {auteursFiltres.map(auteur => (
                  <PanneauAuteur key={auteur.id_auteur} auteur={auteur} recherche={recherche} favorisOeuvres={favorisOeuvres} toggleFavoriOeuvre={toggleFavoriOeuvre} onOuvrirAuteur={setAuteurModal} originaux={originaux} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Contenu onglet Favoris */}
        {onglet === 'favoris' && (
          <OngletFavoris
            auteurs={auteurs}
            favorisOeuvres={favorisOeuvres}
            favorisPret={favorisPret}
            toggleFavoriOeuvre={toggleFavoriOeuvre}
            onOuvrirAuteur={setAuteurModal}
            originaux={originaux}
          />
        )}

        {/* Contenu onglet Traductions indisponibles */}
        {onglet === 'catalogue' && <SectionCatalogueManquant auteurs={auteurs} />}

        {/* Contenu onglet Proposer */}
        {onglet === 'proposer' && <OngletProposer />}
      </div>
      <ModaleAuteur id={auteurModal} onClose={() => setAuteurModal(null)} />
    </main>
  )
}
