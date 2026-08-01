'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Siecle } from '@/app/lib/siecles'
import { useEstMobile } from '@/app/lib/useEstMobile'

// ── Types ──────────────────────────────────────────────────────────────
type Evenement = {
  id: string; date_debut: number | null; date_fin: number | null; date_exacte: string | null
  qualification_date: string | null; titre: string; notice: string | null; lieu: string | null
  importance_generale: string | null; genre_id: string | null
}
type Genre = { id: string; nom: string; famille: string }
type Vue = 'condense' | 'developpe' | 'echelle'

// ── Palette (sobre, désaturée, légèrement ancienne) ─────────────────────
const FOND = '#f4f0eb'
const TEXTE = '#1f1b18'
const TEXTE2 = '#7a746d'
const BORD = '#ddd4ca'
const SEP = '#ece6db'      // filet de séparation, très clair
// Familles : auteurs et textes dans les verts (mais distincts), Église dorée,
// pouvoirs en brique, contexte en prune grisée.
const COUL_FAMILLE: Record<string, string> = {
  'Vie des auteurs': '#4f7f78',              // vert bleuté doux
  'Textes et doctrine': '#6d7d43',           // vert olive / sauge
  'Église et vie religieuse': '#c79a3a',     // doré / ocre
  'Pouvoirs, conflits et ruptures': '#b54d3f', // brique / terre cuite
  'Culture et contexte': '#746187',          // prune grisée
}
const coulFamille = (f?: string) => (f && COUL_FAMILLE[f]) || '#8a8278'
const siecleDe = (annee: number | null): number | null =>
  annee == null ? null : (annee > 0 ? Math.ceil(annee / 100) : -Math.ceil(-annee / 100))

const anBref = (n: number) => (n < 0 ? `${-n} av. J.-C.` : String(n))
const anneesBref = (e: Evenement): string => {
  if (e.date_debut == null) return ''
  if (e.date_fin != null && e.date_fin !== e.date_debut) return `${anBref(e.date_debut)}–${anBref(e.date_fin)}`
  return anBref(e.date_debut)
}

const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

// ── Pictogramme héraldique par famille (monochrome, discret) ─────────────
function IconeFamille({ fam, size = 16, color }: { fam: string; size?: number; color?: string }) {
  const c = color ?? coulFamille(fam)
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (fam) {
    case 'Vie des auteurs': // buste / silhouette
      return <svg {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5.6 19.4c0-3.6 2.9-6.2 6.4-6.2s6.4 2.6 6.4 6.2" /></svg>
    case 'Textes et doctrine': // livre ouvert
      return <svg {...p}><path d="M12 6.6C10 5.3 7.5 4.9 4.9 5.5v12.1c2.6-.6 5.1-.2 7.1 1.1 2-1.3 4.5-1.7 7.1-1.1V5.5C16.5 4.9 14 5.3 12 6.6z" /><path d="M12 6.6v12.1" /></svg>
    case 'Église et vie religieuse': // chapelle surmontée d'une croix
      return <svg {...p}><path d="M12 2.8v3.4" /><path d="M10.3 4.5h3.4" /><path d="M6 20v-8.8l6-3.7 6 3.7V20" /><path d="M10.2 20v-3.1a1.8 1.8 0 0 1 3.6 0V20" /></svg>
    case 'Pouvoirs, conflits et ruptures': // bouclier
      return <svg {...p}><path d="M12 3.2l6.4 2.3v5c0 4.3-2.8 7.1-6.4 8.5-3.6-1.4-6.4-4.2-6.4-8.5v-5z" /></svg>
    case 'Culture et contexte': // temple / colonnade
      return <svg {...p}><path d="M3.8 8.4 12 4.2l8.2 4.2" /><path d="M6.6 8.8v7.8M12 8.8v7.8M17.4 8.8v7.8" /><path d="M4 20h16" /></svg>
    default:
      return <svg {...p}><circle cx="12" cy="12" r="7" /></svg>
  }
}

// ── Réglages du mode « à l'échelle » ─────────────────────────────────────
const PX_PAR_AN = 2.6
const H_ENTETE_ECHELLE = 34
const LARG_GOUTTIERE = 62
const LARG_LANE = 210
const ECART_LANE = 8
const ECART_COL = 18
const BARRE_W = 3
const GAP_TXT = 10
const PAD_BLOC = 4
const GAP_V = 9
const H_BARRE_MIN = 7
const LARG_TEXTE = LARG_LANE - BARRE_W - GAP_TXT - 8
const CHARS_LIGNE = Math.max(8, Math.floor((LARG_TEXTE / 6.0) * 0.62))
const CHARS_LIGNE_GRAS = Math.max(7, Math.floor((LARG_TEXTE / 6.6) * 0.62))
const hauteurTexte = (titre: string, important: boolean) =>
  PAD_BLOC + 13 + Math.max(1, Math.ceil(titre.length / (important ? CHARS_LIGNE_GRAS : CHARS_LIGNE))) * 15.5 + PAD_BLOC

export default function HistoirePage() {
  const mobile = useEstMobile(900)
  const [evs, setEvs] = useState<Evenement[]>([])
  const [genres, setGenres] = useState<Map<string, Genre>>(new Map())
  const [familles, setFamilles] = useState<string[]>([])
  const [chargement, setChargement] = useState(true)

  const [vue, setVue] = useState<Vue>('condense')
  const [fFamilles, setFFamilles] = useState<Set<string>>(new Set())
  const [fGenres, setFGenres] = useState<Set<string>>(new Set())
  const [fLieu, setFLieu] = useState('')
  const [plage, setPlage] = useState<[number, number] | null>(null)

  useEffect(() => {
    (async () => {
      const [er, gr, fr] = await Promise.all([
        supabase.from('evenements')
          .select('id,date_debut,date_fin,date_exacte,qualification_date,titre,notice,lieu,importance_generale,genre_id')
          .eq('portee', 'générale').eq('est_publie', true),
        supabase.from('genres_evenements').select('id,nom,famille_id'),
        supabase.from('familles_evenements').select('id,nom,ordre').order('ordre', { ascending: true, nullsFirst: false }),
      ])
      const famNom = new Map<number, string>((fr.data ?? []).map((f: any) => [f.id, f.nom]))
      const gm = new Map<string, Genre>()
      ;(gr.data ?? []).forEach((g: any) => gm.set(g.id, { id: g.id, nom: g.nom, famille: famNom.get(g.famille_id) ?? '' }))
      setGenres(gm)
      setFamilles((fr.data ?? []).map((f: any) => f.nom))
      setEvs((er.data ?? []) as Evenement[])
      setChargement(false)
    })()
  }, [])

  const familleDe = (e: Evenement) => (e.genre_id ? genres.get(e.genre_id)?.famille ?? '' : '')
  const genreNom = (e: Evenement) => (e.genre_id ? genres.get(e.genre_id)?.nom ?? '' : '')

  const bornes = useMemo(() => {
    const ys = evs.flatMap(e => [e.date_debut, e.date_fin]).filter((n): n is number => n != null)
    if (!ys.length) return { min: 0, max: 1300 }
    return { min: Math.floor(Math.min(...ys) / 100) * 100, max: Math.ceil(Math.max(...ys) / 100) * 100 }
  }, [evs])

  const lieux = useMemo(
    () => Array.from(new Set(evs.map(e => e.lieu).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'fr')),
    [evs])
  const genresDispo = useMemo(() => {
    const pres = new Set<string>()
    evs.forEach(e => { if (!fFamilles.size || fFamilles.has(familleDe(e))) { const n = genreNom(e); if (n) pres.add(n) } })
    return Array.from(pres).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [evs, genres, fFamilles])

  const filtres = useMemo(() => {
    const ok = (e: Evenement) => {
      if (fFamilles.size && !fFamilles.has(familleDe(e))) return false
      if (fGenres.size && !fGenres.has(genreNom(e))) return false
      if (fLieu && e.lieu !== fLieu) return false
      if (plage) {
        if (e.date_debut == null) return false
        const fin = e.date_fin ?? e.date_debut
        if (fin < plage[0] || e.date_debut > plage[1]) return false
      }
      return true
    }
    return evs.filter(ok).sort((a, b) =>
      (a.date_debut ?? 9999) - (b.date_debut ?? 9999) ||
      ((a.date_fin ?? a.date_debut ?? 9999) - (b.date_fin ?? b.date_debut ?? 9999)) ||
      a.titre.localeCompare(b.titre, 'fr'))
  }, [evs, genres, fFamilles, fGenres, fLieu, plage])

  const basculer = <T,>(set: React.Dispatch<React.SetStateAction<Set<T>>>, v: T) =>
    set(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s })

  // ── Colonnes du mode « à l'échelle » ─────────────────────────────────
  const echelle = useMemo(() => {
    const avecDate = filtres.filter(e => e.date_debut != null)
    if (!avecDate.length) return null
    const ys = avecDate.flatMap(e => [e.date_debut!, e.date_fin ?? e.date_debut!])
    const debut = Math.floor(Math.min(...ys) / 100) * 100
    const fin = Math.ceil(Math.max(...ys) / 100) * 100
    let basMax = 0
    const cols = familles
      .filter(f => avecDate.some(e => familleDe(e) === f))
      .map(fam => {
        const items = avecDate.filter(e => familleDe(e) === fam).sort((a, b) => a.date_debut! - b.date_debut!)
        const finCouloir: number[] = []
        const places = items.map(e => {
          const deb = e.date_debut!, ferme = Math.max(e.date_fin ?? deb, deb)
          const top = (deb - debut) * PX_PAR_AN
          const dureeH = (ferme - deb) * PX_PAR_AN
          const occ = Math.max(H_BARRE_MIN, dureeH, hauteurTexte(e.titre, false))
          const bas = top + occ + GAP_V
          if (bas > basMax) basMax = bas
          let c = finCouloir.findIndex(f => f <= top)
          if (c === -1) { c = finCouloir.length; finCouloir.push(bas) } else finCouloir[c] = bas
          return { e, couloir: c, top, dureeH, occ }
        })
        return { fam, places, nbCouloirs: Math.max(1, finCouloir.length) }
      })
    const hauteur = Math.max((fin - debut) * PX_PAR_AN, basMax) + 12
    return { debut, fin, hauteur, cols }
  }, [filtres, familles, genres])

  return (
    <main style={{ background: FOND, minHeight: 'calc(100vh - 3.5rem)' }}>

      {/* Zone à deux volets : le volet gauche va du haut (sous la navbar) jusqu'en
          bas de l'écran, comme les autres pages à volets (modèle Polyglotte). */}
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'stretch', width: '100%' }}>

        {/* ── Volet de gauche : encart de titre, vues, puis filtres ───── */}
        <aside style={{
          flexShrink: 0, width: mobile ? '100%' : '15.5rem',
          position: mobile ? 'static' : 'sticky', top: '3.5rem',
          height: mobile ? 'auto' : 'calc(100vh - 3.5rem)',
          display: 'flex', flexDirection: 'column',
          background: '#fbf8f3', borderRight: mobile ? 'none' : `1px solid ${BORD}`, borderBottom: mobile ? `1px solid ${BORD}` : 'none',
        }}>
          {/* Encart de titre, en tête du volet (modèle Polyglotte). */}
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORD}`, padding: '13px 15px 12px' }}>
            <p style={{ fontFamily: SANS, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b0a088', margin: '0 0 4px' }}>Aller plus loin</p>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: '1.05rem', fontWeight: 600, color: '#3d6b4f', lineHeight: 1.15, letterSpacing: '0.01em' }}>Histoire de l’Église</h1>
          </div>

          {/* Boutons de vue, dans le volet. Séparés d'un fin filet (séparation suggérée). */}
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORD}`, padding: '10px 15px' }}>
            <div style={{ display: 'flex', border: `1px solid ${BORD}`, borderRadius: '999px', overflow: 'hidden' }}>
              {([['Condensé', 'condense'], ['Développé', 'developpe'], ['À l’échelle', 'echelle']] as [string, Vue][]).map(([lib, val], i) => (
                <button key={val} onClick={() => setVue(val)}
                  style={{ flex: 1, fontSize: '0.68rem', padding: '5px 4px', border: 'none', borderLeft: i > 0 ? `1px solid ${BORD}` : 'none', cursor: 'pointer', background: vue === val ? '#3d6b4f' : '#fff', color: vue === val ? '#fff' : '#6b6560', fontFamily: 'inherit', fontWeight: vue === val ? 600 : 400, whiteSpace: 'nowrap' }}>
                  {lib}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres, défilables si besoin. */}
          <div style={{ flex: 1, minHeight: 0, overflowY: mobile ? 'visible' : 'auto', padding: '0 15px 22px' }}>
            <GroupeFiltre label="Période">
              <PlageAnnees min={bornes.min} max={bornes.max} plage={plage} onChange={setPlage} />
            </GroupeFiltre>

            <GroupeFiltre label="Famille">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {familles.map(f => (
                  <BoutonFamille key={f} fam={f} actif={fFamilles.has(f)} onClick={() => basculer(setFFamilles, f)} />
                ))}
              </div>
            </GroupeFiltre>

            {genresDispo.length > 0 && (
              <GroupeFiltre label="Genre">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {genresDispo.map(g => (
                    <LigneGenre key={g} actif={fGenres.has(g)} onClick={() => basculer(setFGenres, g)}>{g}</LigneGenre>
                  ))}
                </div>
              </GroupeFiltre>
            )}

            {lieux.length > 0 && (
              <GroupeFiltre label="Lieu">
                <select value={fLieu} onChange={e => setFLieu(e.target.value)}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '5px', border: `1px solid ${BORD}`, background: '#fff', color: '#3a3530' }}>
                  <option value="">Tous les lieux</option>
                  {lieux.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </GroupeFiltre>
            )}
          </div>
        </aside>

        {/* ── Frise ───────────────────────────────────────────────────── */}
        <section style={{ flex: 1, minWidth: 0, padding: mobile ? '16px 14px 56px' : '16px 32px 64px' }}>
          {/* Colonne de lecture centrée dans la zone de droite (le mode « à l'échelle »,
              large par nature, reste pleine largeur). */}
          <div style={{ maxWidth: vue === 'echelle' ? 'none' : '48rem', margin: '0 auto' }}>

          {/* Légende des familles, discrète, au-dessus de la frise. */}
          {!chargement && familles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', margin: '0 0 16px', paddingBottom: '12px', borderBottom: `1px solid ${SEP}` }}>
              {familles.map(f => (
                <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: TEXTE2 }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: coulFamille(f), flexShrink: 0 }} />
                  {f}
                </span>
              ))}
            </div>
          )}

          {chargement ? (
            <p style={{ fontSize: '0.85rem', color: '#9a958d', fontStyle: 'italic', textAlign: 'center', paddingTop: '20px' }}>Chargement…</p>
          ) : filtres.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#9a958d', fontStyle: 'italic', textAlign: 'center', paddingTop: '20px' }}>Aucun repère pour ces critères.</p>
          ) : vue === 'echelle' ? (
            <FriseEchelle echelle={echelle} />
          ) : (
            <FriseListe items={filtres} developpe={vue === 'developpe'} familleDe={familleDe} mobile={mobile} />
          )}
          </div>
        </section>
      </div>

      <style>{`
        .frise-range { -webkit-appearance: none; appearance: none; position: absolute; top: 0; left: 0; width: 100%; height: 26px; margin: 0; background: transparent; pointer-events: none; }
        .frise-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; pointer-events: auto; width: 15px; height: 15px; border-radius: 50%; background: #fff; border: 2px solid #3d6b4f; box-shadow: 0 1px 3px rgba(40,30,15,0.25); cursor: pointer; margin-top: 0; }
        .frise-range::-moz-range-thumb { pointer-events: auto; width: 15px; height: 15px; border-radius: 50%; background: #fff; border: 2px solid #3d6b4f; box-shadow: 0 1px 3px rgba(40,30,15,0.25); cursor: pointer; }
        .frise-range::-webkit-slider-runnable-track { background: transparent; }
        .frise-range::-moz-range-track { background: transparent; }
        .frise-num { width: 3.6rem; font-family: inherit; font-size: 0.72rem; padding: 3px 5px; border-radius: 5px; border: 1px solid ${BORD}; background: #fff; color: #3a3530; text-align: center; }
        .frise-fam:hover { filter: brightness(0.98); }
        .frise-genre:hover { color: #5a5044 !important; }
      `}</style>
    </main>
  )
}

// ── Vue en liste : axe vertical + point coloré, date, famille, titre ─────
function FriseListe({ items, developpe, familleDe, mobile }: {
  items: Evenement[]; developpe: boolean; familleDe: (e: Evenement) => string; mobile: boolean
}) {
  const padY = developpe ? 11 : 7
  const cols = mobile ? '4.5rem 1fr' : '4.75rem 10.5rem 1fr'
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: cols, columnGap: mobile ? '14px' : '18px', rowGap: 0, alignItems: 'baseline' }}>
      {items.map((e, i) => {
        const fam = familleDe(e); const c = coulFamille(fam)
        const bt = i === 0 ? 'none' : `1px solid ${SEP}`
        return (
          <li key={e.id} style={{ display: 'contents' }}>
            {/* Date : couleur unique (or discret) */}
            <span style={{ paddingTop: `${padY}px`, paddingBottom: `${padY}px`, borderTop: bt, fontFamily: SERIF, fontSize: '0.78rem', color: '#b7a06a', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {anneesBref(e)}
            </span>
            {/* Famille (couleur pleine, petites capitales) */}
            {!mobile && (
              <span style={{ paddingTop: `${padY + 2}px`, paddingBottom: `${padY}px`, borderTop: bt, fontFamily: SANS, fontSize: '0.53rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: c, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                {fam}
              </span>
            )}
            {/* Titre (texte sombre neutre) */}
            <div style={{ paddingTop: `${padY}px`, paddingBottom: `${padY}px`, borderTop: bt, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: SERIF, fontSize: '0.9rem', color: TEXTE, lineHeight: 1.35 }}>{e.titre}</span>
                {mobile && fam && (
                  <span style={{ fontFamily: SANS, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: c }}>{fam}</span>
                )}
              </div>
              {developpe && e.notice && (
                <p style={{ fontFamily: SERIF, fontSize: '0.78rem', color: '#5a5450', lineHeight: 1.55, margin: '4px 0 0', textAlign: 'justify' }}>{e.notice}</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ── Vue « à l'échelle » : colonnes par famille, barre ∝ durée, texte entier ──
type PlaceEchelle = { e: Evenement; couloir: number; top: number; dureeH: number; occ: number }
type ColEchelle = { fam: string; places: PlaceEchelle[]; nbCouloirs: number }
function FriseEchelle({ echelle }: {
  echelle: { debut: number; fin: number; hauteur: number; cols: ColEchelle[] } | null
}) {
  if (!echelle) return null
  const { debut, hauteur, cols } = echelle
  const largCol = (c: ColEchelle) => c.nbCouloirs * LARG_LANE + (c.nbCouloirs - 1) * ECART_LANE
  const xCol: number[] = []
  let x = LARG_GOUTTIERE
  cols.forEach(c => { xCol.push(x); x += largCol(c) + ECART_COL })
  const largTotale = x - ECART_COL + 8
  const bornesSiecles: number[] = []
  for (let b = debut; b <= echelle.fin; b += 100) bornesSiecles.push(b)

  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${BORD}`, borderRadius: '10px', background: '#fdfbf7' }}>
      <div style={{ position: 'relative', width: largTotale, height: H_ENTETE_ECHELLE + hauteur, minWidth: '100%' }}>

        {cols.map((c, i) => (
          <div key={c.fam} style={{
            position: 'absolute', top: 0, left: xCol[i], width: largCol(c), height: H_ENTETE_ECHELLE,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center',
            borderBottom: `1.5px solid ${coulFamille(c.fam)}44`, padding: '0 8px', boxSizing: 'border-box',
          }}>
            <IconeFamille fam={c.fam} size={13} />
            <span style={{ fontFamily: SANS, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: coulFamille(c.fam), lineHeight: 1.25 }}>{c.fam}</span>
          </div>
        ))}

        <div style={{ position: 'absolute', top: H_ENTETE_ECHELLE, left: 0, right: 0, height: hauteur }}>
          {bornesSiecles.map(b => {
            const y = (b - debut) * PX_PAR_AN
            const s = siecleDe(b + 1)
            return (
              <React.Fragment key={b}>
                <div style={{ position: 'absolute', top: y, left: LARG_GOUTTIERE - 6, width: largTotale - LARG_GOUTTIERE + 6, borderTop: `1px solid ${SEP}` }} />
                {b < echelle.fin && s != null && (
                  <div style={{ position: 'absolute', top: y + 5, left: 0, width: LARG_GOUTTIERE - 12, textAlign: 'right', fontFamily: SERIF, fontSize: '0.72rem', color: '#c3b48c' }}>
                    <Siecle n={s} />
                  </div>
                )}
              </React.Fragment>
            )
          })}

          {cols.map((c, i) => {
            const teinte = coulFamille(c.fam)
            return c.places.map(({ e, couloir, top, dureeH, occ }) => {
              const gauche = xCol[i] + couloir * (LARG_LANE + ECART_LANE)
              return (
                <div key={e.id}
                  title={`${anneesBref(e)} · ${e.titre}${e.notice ? '\n\n' + e.notice : ''}`}
                  style={{ position: 'absolute', top, left: gauche, width: LARG_LANE, height: occ }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, width: BARRE_W, height: Math.max(H_BARRE_MIN, dureeH), background: teinte, opacity: 0.9, borderRadius: '2px' }} />
                  <div style={{ paddingLeft: BARRE_W + GAP_TXT, paddingTop: PAD_BLOC }}>
                    <div style={{ fontFamily: SERIF, fontSize: '0.62rem', color: teinte, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{anneesBref(e)}</div>
                    <div style={{ fontFamily: SERIF, fontSize: '0.72rem', color: TEXTE, lineHeight: 1.28, marginTop: '1px' }}>{e.titre}</div>
                  </div>
                </div>
              )
            })
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sélecteur d'années gradué (de… à…, saisissable) ──────────────────────
function PlageAnnees({ min, max, plage, onChange }: {
  min: number; max: number; plage: [number, number] | null; onChange: (p: [number, number] | null) => void
}) {
  const PAS = 10
  const de = plage ? plage[0] : min
  const a = plage ? plage[1] : max
  const pct = (v: number) => (max > min ? ((v - min) / (max - min)) * 100 : 0)
  const publier = (d: number, f: number) => {
    d = Math.max(min, Math.min(d, max)); f = Math.max(min, Math.min(f, max))
    if (d > f) [d, f] = [f, d]
    onChange(d <= min && f >= max ? null : [d, f])
  }
  const sDe = siecleDe(de + 1), sA = siecleDe(a)
  return (
    <div>
      <div style={{ fontFamily: SERIF, fontSize: '0.74rem', color: '#6b6560', marginBottom: '7px' }}>
        {sDe != null && sA != null ? (
          sDe === sA ? <Siecle n={sDe} /> : <><Siecle n={sDe} />{' – '}<Siecle n={sA} /></>
        ) : '—'}
      </div>
      <div style={{ position: 'relative', height: '26px' }}>
        <div style={{ position: 'absolute', top: '11px', left: 0, right: 0, height: '4px', background: '#e9e1d0', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', top: '11px', height: '4px', background: '#3d6b4f', borderRadius: '2px', left: `${pct(de)}%`, right: `${100 - pct(a)}%` }} />
        <input type="range" className="frise-range" min={min} max={max} step={PAS} value={de}
          onChange={e => publier(Math.min(+e.target.value, a - PAS), a)} aria-label="Année de début" />
        <input type="range" className="frise-range" min={min} max={max} step={PAS} value={a}
          onChange={e => publier(de, Math.max(+e.target.value, de + PAS))} aria-label="Année de fin" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', color: TEXTE2 }}>
        <span>De</span>
        <input type="number" className="frise-num" defaultValue={de} key={`d${de}`}
          onBlur={e => publier(+e.target.value, a)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
        <span>à</span>
        <input type="number" className="frise-num" defaultValue={a} key={`a${a}`}
          onBlur={e => publier(de, +e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
      </div>
    </div>
  )
}

// ── Composants de filtre ─────────────────────────────────────────────────
function GroupeFiltre({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '13px', paddingTop: '13px', borderTop: `1px solid ${SEP}` }}>
      <div style={{ fontFamily: SANS, fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b7ad9e', marginBottom: '8px' }}>{label}</div>
      {children}
    </div>
  )
}

// Bouton de famille : icône héraldique + libellé, couleur de la famille, fond très pâle.
function BoutonFamille({ fam, actif, onClick }: { fam: string; actif: boolean; onClick: () => void }) {
  const c = coulFamille(fam)
  return (
    <button onClick={onClick} className="frise-fam" style={{
      display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left',
      padding: '6px 9px', borderRadius: '6px', cursor: 'pointer',
      border: `1px solid ${actif ? c : `${c}40`}`,
      background: actif ? `${c}22` : `${c}0d`,
      transition: 'background 0.12s, border-color 0.12s',
    }}>
      <IconeFamille fam={fam} color={c} size={16} />
      <span style={{ fontFamily: SERIF, fontSize: '0.79rem', color: c, fontWeight: actif ? 600 : 500, lineHeight: 1.25 }}>{fam}</span>
    </button>
  )
}

// Genre : liste sobre, sans bulle ni italique. L'actif se marque d'un mince
// filet vert à gauche et d'une teinte verte — discret, mais net.
function LigneGenre({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="frise-genre" style={{
      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'none', border: 'none', borderLeft: `2px solid ${actif ? '#3d6b4f' : 'transparent'}`,
      padding: '2px 0 2px 9px', margin: 0,
      fontFamily: SERIF, fontSize: '0.76rem', lineHeight: 1.35,
      color: actif ? '#3d6b4f' : '#8a8278', fontWeight: actif ? 600 : 400,
      transition: 'color 0.12s, border-color 0.12s',
    }}>{children}</button>
  )
}
