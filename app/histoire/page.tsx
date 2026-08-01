'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Siecle } from '@/app/lib/siecles'
import { useEstMobile } from '@/app/lib/useEstMobile'
import {
  type RangFrise, type Densite, DENSITES, coulFamille, passeDensite,
  poidsTitre, taillePuce, libelleSource, estUrl, siecleDe,
} from '@/app/lib/frise'

// Frise générale de l'histoire de l'Église.
// Source unique : la vue `v_frise_generale`, triée par `ordre_affichage`.
// L'ordre est éditorial : il ne doit jamais être recalculé ici. Les dates sont
// affichées telles que rédigées (`date_affichage`), avec leurs nuances.

const FOND = '#f4f0eb'
const TEXTE = '#1f1b18'
const TEXTE2 = '#7a746d'
const BORD = '#ddd4ca'
const SEP = '#ece6db'
const VERT = '#3d6b4f'
const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

type Filtres = {
  familles: Set<string>
  genres: Set<string>
  zones: Set<string>
  pays: string
  sDe: number | null
  sA: number | null
}
const FILTRES_VIDES: Filtres = {
  familles: new Set(), genres: new Set(), zones: new Set(), pays: '', sDe: null, sA: null,
}
const aucunFiltre = (f: Filtres) =>
  !f.familles.size && !f.genres.size && !f.zones.size && !f.pays && f.sDe == null && f.sA == null

export default function HistoirePage() {
  const mobile = useEstMobile(900)
  const [evs, setEvs] = useState<RangFrise[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [densite, setDensite] = useState<Densite>('etendu')
  const [f, setF] = useState<Filtres>(FILTRES_VIDES)
  const [panneauOuvert, setPanneauOuvert] = useState(false)
  const initUrlFaite = useRef(false)

  useEffect(() => {
    supabase.from('v_frise_generale').select('*').order('ordre_affichage')
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setEvs((data ?? []) as RangFrise[])
        setChargement(false)
      })
  }, [])

  // ── État repris de l'URL au premier rendu, puis reflété dans l'URL ────────
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const liste = (c: string) => new Set((p.get(c) || '').split('|').filter(Boolean))
    const nb = (c: string) => (p.get(c) ? Number(p.get(c)) : null)
    const d = p.get('densite')
    if (d === 'essentiel' || d === 'etendu' || d === 'complet') setDensite(d)
    setF({
      familles: liste('famille'), genres: liste('genre'), zones: liste('zone'),
      pays: p.get('pays') || '', sDe: nb('de'), sA: nb('a'),
    })
    initUrlFaite.current = true
  }, [])

  useEffect(() => {
    if (!initUrlFaite.current) return
    const p = new URLSearchParams()
    if (f.familles.size) p.set('famille', [...f.familles].join('|'))
    if (f.genres.size) p.set('genre', [...f.genres].join('|'))
    if (f.zones.size) p.set('zone', [...f.zones].join('|'))
    if (f.pays) p.set('pays', f.pays)
    if (f.sDe != null) p.set('de', String(f.sDe))
    if (f.sA != null) p.set('a', String(f.sA))
    if (densite !== 'etendu') p.set('densite', densite)
    const q = p.toString()
    window.history.replaceState(null, '', q ? `?${q}${window.location.hash}` : window.location.pathname + window.location.hash)
  }, [f, densite])

  // ── Répertoires pour les filtres, tirés de la réponse de la vue ──────────
  const rep = useMemo(() => {
    const familles = new Map<string, number>()
    const zones = new Set<string>()
    const pays = new Set<string>()
    const siecles = new Set<number>()
    evs.forEach(e => {
      if (e.famille) familles.set(e.famille, e.famille_id ?? 999)
      if (e.zone_geographique) zones.add(e.zone_geographique)
      ;(e.pays_filtres ?? []).forEach(p => pays.add(p))
      const s = siecleDe(e.date_debut)
      if (s != null) siecles.add(s)
    })
    return {
      familles: [...familles.keys()].sort((a, b) => (familles.get(a)! - familles.get(b)!) || a.localeCompare(b, 'fr')),
      zones: [...zones].sort((a, b) => a.localeCompare(b, 'fr')),
      pays: [...pays].sort((a, b) => a.localeCompare(b, 'fr')),
      siecles: [...siecles].sort((a, b) => a - b),
    }
  }, [evs])

  // Les genres proposés suivent la famille choisie.
  const genresDispo = useMemo(() => {
    const s = new Set<string>()
    evs.forEach(e => {
      if (f.familles.size && !(e.famille && f.familles.has(e.famille))) return
      if (e.genre) s.add(e.genre)
    })
    return [...s].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [evs, f.familles])

  // ── Application des filtres. L'ordre de la vue est conservé tel quel. ─────
  const visibles = useMemo(() => evs.filter(e => {
    if (!passeDensite(e.importance_code, densite)) return false
    if (f.familles.size && !(e.famille && f.familles.has(e.famille))) return false
    if (f.genres.size && !(e.genre && f.genres.has(e.genre))) return false
    if (f.zones.size && !(e.zone_geographique && f.zones.has(e.zone_geographique))) return false
    // Pays MODERNE : uniquement `pays_filtres`. Le champ `pays` est historique.
    if (f.pays && !(e.pays_filtres ?? []).includes(f.pays)) return false
    if (f.sDe != null || f.sA != null) {
      const s = siecleDe(e.date_debut)
      if (s == null) return false
      if (f.sDe != null && s < f.sDe) return false
      if (f.sA != null && s > f.sA) return false
    }
    return true
  }), [evs, densite, f])

  const basculer = useCallback((cle: 'familles' | 'genres' | 'zones', v: string) => {
    setF(prev => {
      const s = new Set(prev[cle])
      s.has(v) ? s.delete(v) : s.add(v)
      return { ...prev, [cle]: s }
    })
  }, [])

  const reinitialiser = () => setF(FILTRES_VIDES)

  // Ancre : si l'URL désigne un événement, on l'amène en vue une fois chargé.
  useEffect(() => {
    if (chargement || !visibles.length) return
    const cible = window.location.hash.slice(1)
    if (!cible) return
    const n = document.getElementById(cible)
    if (n) n.scrollIntoView({ block: 'center' })
  }, [chargement, visibles.length])

  const filtresActifs = !aucunFiltre(f)

  const contenuFiltres = (
    <>
      <GroupeFiltre label="Densité">
        <div style={{ display: 'flex', border: `1px solid ${BORD}`, borderRadius: '999px', overflow: 'hidden' }} role="group" aria-label="Densité de la frise">
          {DENSITES.map((d, i) => (
            <button key={d.cle} onClick={() => setDensite(d.cle)} aria-pressed={densite === d.cle}
              style={{
                flex: 1, fontSize: '0.68rem', padding: '5px 4px', border: 'none',
                borderLeft: i > 0 ? `1px solid ${BORD}` : 'none', cursor: 'pointer',
                background: densite === d.cle ? VERT : '#fff', color: densite === d.cle ? '#fff' : '#6b6560',
                fontFamily: 'inherit', fontWeight: densite === d.cle ? 600 : 400, whiteSpace: 'nowrap',
              }}>
              {d.label}
            </button>
          ))}
        </div>
      </GroupeFiltre>

      {rep.siecles.length > 1 && (
        <GroupeFiltre label="Période">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.72rem', color: TEXTE2 }}>
            <label htmlFor="frise-de" style={{ flexShrink: 0 }}>Du</label>
            <SelectSiecle id="frise-de" valeur={f.sDe} siecles={rep.siecles} tout="Début"
              onChange={v => setF(p => ({ ...p, sDe: v }))} />
            <label htmlFor="frise-a" style={{ flexShrink: 0 }}>au</label>
            <SelectSiecle id="frise-a" valeur={f.sA} siecles={rep.siecles} tout="Fin"
              onChange={v => setF(p => ({ ...p, sA: v }))} />
          </div>
        </GroupeFiltre>
      )}

      <GroupeFiltre label="Famille">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {rep.familles.map(nom => (
            <BoutonFamille key={nom} fam={nom} actif={f.familles.has(nom)} onClick={() => basculer('familles', nom)} />
          ))}
        </div>
      </GroupeFiltre>

      {genresDispo.length > 0 && (
        <GroupeFiltre label="Genre">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {genresDispo.map(g => (
              <LigneCase key={g} actif={f.genres.has(g)} onClick={() => basculer('genres', g)}>{g}</LigneCase>
            ))}
          </div>
        </GroupeFiltre>
      )}

      {rep.zones.length > 0 && (
        <GroupeFiltre label="Zone géographique">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {rep.zones.map(z => (
              <LigneCase key={z} actif={f.zones.has(z)} onClick={() => basculer('zones', z)}>{z}</LigneCase>
            ))}
          </div>
        </GroupeFiltre>
      )}

      {rep.pays.length > 0 && (
        <GroupeFiltre label="Pays actuel">
          <select value={f.pays} onChange={e => setF(p => ({ ...p, pays: e.target.value }))}
            aria-label="Filtrer par pays actuel"
            style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '5px', border: `1px solid ${BORD}`, background: '#fff', color: '#3a3530' }}>
            <option value="">Tous les pays</option>
            {rep.pays.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <p style={{ margin: '6px 0 0', fontSize: '0.62rem', lineHeight: 1.4, color: '#a39a8e', fontStyle: 'italic' }}>
            Territoire actuel du lieu. La désignation historique reste affichée sur l’événement.
          </p>
        </GroupeFiltre>
      )}

      {filtresActifs && (
        <button onClick={reinitialiser}
          style={{ marginTop: '14px', width: '100%', padding: '6px 9px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${BORD}`, background: '#fff', color: '#6b6560', fontFamily: SERIF, fontSize: '0.76rem' }}>
          Réinitialiser les filtres
        </button>
      )}
    </>
  )

  return (
    <main style={{ background: FOND, minHeight: 'calc(100vh - 3.5rem)' }}>
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'stretch', width: '100%' }}>

        {/* ── Volet des filtres. Sur mobile, un panneau repliable. ───────── */}
        <aside style={{
          flexShrink: 0, width: mobile ? '100%' : '15.5rem',
          position: mobile ? 'static' : 'sticky', top: '3.5rem',
          height: mobile ? 'auto' : 'calc(100vh - 3.5rem)',
          display: 'flex', flexDirection: 'column',
          background: '#fbf8f3',
          borderRight: mobile ? 'none' : `1px solid ${BORD}`,
          borderBottom: mobile ? `1px solid ${BORD}` : 'none',
        }}>
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORD}`, padding: '13px 15px 12px' }}>
            <p style={{ fontFamily: SANS, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b0a088', margin: '0 0 4px' }}>Aller plus loin</p>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: '1.05rem', fontWeight: 600, color: VERT, lineHeight: 1.15, letterSpacing: '0.01em' }}>Histoire de l’Église</h1>
          </div>

          {mobile ? (
            <>
              <button onClick={() => setPanneauOuvert(o => !o)} aria-expanded={panneauOuvert} aria-controls="frise-filtres"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 15px', border: 'none', borderBottom: panneauOuvert ? `1px solid ${SEP}` : 'none', background: 'transparent', cursor: 'pointer', fontFamily: SERIF, fontSize: '0.8rem', color: '#5a5044' }}>
                <span>Filtres et densité{filtresActifs ? ' (actifs)' : ''}</span>
                <span aria-hidden style={{ color: TEXTE2, fontSize: '0.7rem' }}>{panneauOuvert ? '▲' : '▼'}</span>
              </button>
              {panneauOuvert && <div id="frise-filtres" style={{ padding: '0 15px 18px' }}>{contenuFiltres}</div>}
            </>
          ) : (
            <div id="frise-filtres" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 15px 22px' }}>
              {contenuFiltres}
            </div>
          )}
        </aside>

        {/* ── Frise ──────────────────────────────────────────────────────── */}
        <section style={{ flex: 1, minWidth: 0, padding: mobile ? '16px 14px 56px' : '16px 32px 64px' }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>

            {!chargement && !erreur && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', margin: '0 0 16px', paddingBottom: '12px', borderBottom: `1px solid ${SEP}` }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
                  {rep.familles.map(nom => (
                    <span key={nom} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: TEXTE2 }}>
                      <span aria-hidden style={{ width: '9px', height: '9px', borderRadius: '50%', background: coulFamille(nom), flexShrink: 0 }} />
                      {nom}
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: '0.68rem', color: '#a39a8e', whiteSpace: 'nowrap' }} aria-live="polite">
                  {visibles.length} repère{visibles.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {chargement ? (
              <p style={{ fontSize: '0.85rem', color: '#9a958d', fontStyle: 'italic', textAlign: 'center', paddingTop: '20px' }}>Chargement…</p>
            ) : erreur ? (
              <p style={{ fontSize: '0.85rem', color: '#a2564a', textAlign: 'center', paddingTop: '20px' }}>
                La frise n’a pas pu être chargée. {erreur}
              </p>
            ) : visibles.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '20px' }}>
                <p style={{ fontSize: '0.85rem', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>
                  Aucun événement ne correspond aux filtres retenus.
                </p>
                {filtresActifs && (
                  <button onClick={reinitialiser}
                    style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${BORD}`, background: '#fff', color: '#6b6560', fontFamily: SERIF, fontSize: '0.78rem' }}>
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <ListeFrise items={visibles} mobile={mobile} />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

// ── Liste verticale : repères de siècle, puis une carte par événement ──────
function ListeFrise({ items, mobile }: { items: RangFrise[]; mobile: boolean }) {
  // Les repères de siècle sont des éléments d'interface, pas des événements.
  const lignes: React.ReactNode[] = []
  let siecleCourant: number | null = null

  items.forEach((e, i) => {
    const s = siecleDe(e.date_debut)
    if (s != null && s !== siecleCourant) {
      siecleCourant = s
      lignes.push(
        <li key={`s${s}`} style={{ listStyle: 'none', margin: i === 0 ? '0 0 10px' : '22px 0 10px' }}>
          <h2 style={{
            margin: 0, display: 'flex', alignItems: 'center', gap: '10px',
            fontFamily: SERIF, fontSize: '0.78rem', fontWeight: 600, color: '#b7a06a',
            letterSpacing: '0.04em',
          }}>
            <Siecle n={s} />
            <span aria-hidden style={{ flex: 1, height: '1px', background: SEP }} />
          </h2>
        </li>,
      )
    }
    lignes.push(<CarteEvenement key={e.id} e={e} mobile={mobile} />)
  })

  return <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{lignes}</ul>
}

// ── Carte : compacte par défaut, dépliable sans déplacer la page ───────────
function CarteEvenement({ e, mobile }: { e: RangFrise; mobile: boolean }) {
  const [ouvert, setOuvert] = useState(false)
  const c = coulFamille(e.famille)
  const idCarte = `d-${e.id}`

  // Sur écran large la notice est lisible sans ouverture ; sur mobile elle est
  // ramenée à quelques lignes, le dépliage donne la suite.
  const noticeCourte = !mobile || ouvert || !e.notice
    ? e.notice
    : e.notice.length > 150 ? e.notice.slice(0, 150).replace(/\s+\S*$/, '') + '…' : e.notice
  const noticeTronquee = mobile && !ouvert && !!e.notice && e.notice.length > 150

  return (
    <li id={e.id} style={{ listStyle: 'none', scrollMarginTop: '4rem' }}>
      <article style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '5.5rem 1fr',
        columnGap: '16px',
        padding: '11px 0',
        borderTop: `1px solid ${SEP}`,
      }}>
        {/* Date : distincte, mais moins appuyée que le titre. */}
        <div style={{
          fontFamily: SERIF, fontSize: '0.76rem', color: '#b7a06a',
          textAlign: mobile ? 'left' : 'right', lineHeight: 1.35,
          fontVariantNumeric: 'tabular-nums', marginBottom: mobile ? '2px' : 0,
        }}>
          {e.date_affichage}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span aria-hidden style={{
              flexShrink: 0, width: taillePuce(e.importance_code), height: taillePuce(e.importance_code),
              borderRadius: '50%', background: c, transform: 'translateY(-0.1em)',
            }} />
            <h3 style={{
              margin: 0, fontFamily: SERIF, fontSize: '0.92rem', lineHeight: 1.35,
              color: TEXTE, fontWeight: poidsTitre(e.importance_code),
            }}>
              {e.titre}
            </h3>
          </div>

          {noticeCourte && (
            <p style={{ fontFamily: SERIF, fontSize: '0.78rem', color: '#5a5450', lineHeight: 1.55, margin: '4px 0 0', textAlign: 'justify' }}>
              {noticeCourte}
            </p>
          )}

          {e.lieu && (
            <p style={{ margin: '4px 0 0', fontFamily: SANS, fontSize: '0.68rem', color: TEXTE2 }}>{e.lieu}</p>
          )}

          {/* Famille et genre : métadonnées discrètes, sous le titre. */}
          {(e.famille || e.genre) && (
            <p style={{ margin: '4px 0 0', fontFamily: SANS, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: c }}>
              {[e.famille, e.genre].filter(Boolean).join(' · ')}
            </p>
          )}

          <div style={{ marginTop: '5px' }}>
            <button onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} aria-controls={idCarte}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: SANS, fontSize: '0.63rem', color: '#9a938a', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              {ouvert ? 'Réduire' : noticeTronquee ? 'Lire la suite et les sources' : 'Sources et détail'}
            </button>
          </div>

          {ouvert && (
            <div id={idCarte} style={{ marginTop: '7px', paddingLeft: '10px', borderLeft: `2px solid ${SEP}` }}>
              <Geographie e={e} />
              {e.note_datation && <LigneDetail label="Précision sur la date">{e.note_datation}</LigneDetail>}
              <Sources principale={e.source_principale} secondaire={e.source_secondaire} />
            </div>
          )}
        </div>
      </article>
    </li>
  )
}

// Géographie détaillée. Les lignes vides ne sont jamais affichées.
function Geographie({ e }: { e: { lieu: string | null; pays: string | null; zone_geographique: string | null } }) {
  const lignes: [string, string][] = []
  if (e.lieu) lignes.push(['Lieu', e.lieu])
  if (e.pays) lignes.push(['Espace historique', e.pays])
  if (e.zone_geographique) lignes.push(['Zone', e.zone_geographique])
  if (!lignes.length) return null
  return <>{lignes.map(([l, v]) => <LigneDetail key={l} label={l}>{v}</LigneDetail>)}</>
}

function Sources({ principale, secondaire, lien }: { principale: string | null; secondaire: string | null; lien?: string | null }) {
  if (!principale && !secondaire && !lien) return null
  return (
    <>
      {principale && <LigneDetail label="Source de l’événement"><Lien valeur={principale} /></LigneDetail>}
      {secondaire && <LigneDetail label="Source secondaire"><Lien valeur={secondaire} /></LigneDetail>}
      {lien && <LigneDetail label="Source du rattachement à l’auteur"><Lien valeur={lien} /></LigneDetail>}
    </>
  )
}

// Jamais d'URL brute : un libellé de domaine, ouvert dans un nouvel onglet.
function Lien({ valeur }: { valeur: string }) {
  const lib = libelleSource(valeur)
  if (!estUrl(valeur)) return <>{lib}</>
  return (
    <a href={valeur} target="_blank" rel="noopener noreferrer" style={{ color: VERT, textUnderlineOffset: '2px' }}>
      {lib}
    </a>
  )
}

function LigneDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 3px', fontFamily: SANS, fontSize: '0.66rem', lineHeight: 1.5, color: '#6b6560' }}>
      <span style={{ color: '#a39a8e' }}>{label} : </span>{children}
    </p>
  )
}

// ── Commandes de filtre ───────────────────────────────────────────────────
function SelectSiecle({ id, valeur, siecles, tout, onChange }: {
  id: string; valeur: number | null; siecles: number[]; tout: string; onChange: (v: number | null) => void
}) {
  return (
    <select id={id} value={valeur ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      style={{ flex: 1, minWidth: 0, fontFamily: 'inherit', fontSize: '0.72rem', padding: '3px 5px', borderRadius: '5px', border: `1px solid ${BORD}`, background: '#fff', color: '#3a3530' }}>
      <option value="">{tout}</option>
      {siecles.map(s => <option key={s} value={s}>{s > 0 ? `${s}e s.` : `${-s}e s. av. J.-C.`}</option>)}
    </select>
  )
}

function GroupeFiltre({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '13px', paddingTop: '13px', borderTop: `1px solid ${SEP}` }}>
      <div style={{ fontFamily: SANS, fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b7ad9e', marginBottom: '8px' }}>{label}</div>
      {children}
    </div>
  )
}

function BoutonFamille({ fam, actif, onClick }: { fam: string; actif: boolean; onClick: () => void }) {
  const c = coulFamille(fam)
  return (
    <button onClick={onClick} aria-pressed={actif} style={{
      display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left',
      padding: '6px 9px', borderRadius: '6px', cursor: 'pointer',
      border: `1px solid ${actif ? c : `${c}40`}`,
      background: actif ? `${c}22` : `${c}0d`,
      transition: 'background 0.12s, border-color 0.12s',
    }}>
      <span aria-hidden style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, flexShrink: 0 }} />
      <span style={{ fontFamily: SERIF, fontSize: '0.79rem', color: c, fontWeight: actif ? 600 : 500, lineHeight: 1.25 }}>{fam}</span>
    </button>
  )
}

function LigneCase({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={actif} style={{
      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'none', border: 'none', borderLeft: `2px solid ${actif ? VERT : 'transparent'}`,
      padding: '2px 0 2px 9px', margin: 0,
      fontFamily: SERIF, fontSize: '0.76rem', lineHeight: 1.35,
      color: actif ? VERT : '#8a8278', fontWeight: actif ? 600 : 400,
      transition: 'color 0.12s, border-color 0.12s',
    }}>{children}</button>
  )
}
