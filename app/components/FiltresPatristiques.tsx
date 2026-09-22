'use client'

// ── LES FILTRES DU VOLET DES PÈRES ─────────────────────────────────────────────
//
// Sortis de `PanneauPatristique` (2026-09-22) : l'état des quatre facettes, leur calcul
// (ce qui reste sélectionnable sous les autres facettes) et le volet dépliant. Le volet de
// droite ne garde que la liste qu'on filtre.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

// ── LE FILTRE ET SON VOLET PARLENT L'OR ─────────────────────────────────────
//
// Demande de l'auteur (14 septembre 2026) : « uniformiser “Filtre” et la petite fenêtre qui
// s'ouvre quand on clique dessus ; utiliser la couleur dorée/mordorée, y compris sur le bouton
// “filtre” ». Une seule voix, l'or, en quatre valeurs.
// ⛔ L'ENCRE est `--cs-or-lisible`, jamais `--cs-or`, qui ne rend que 3,67 sur le papier.
export const OR_ENCRE = 'var(--cs-or-lisible)'
const OR_FILET = 'rgba(var(--cs-or-rgb), 0.45)'
const OR_LAVIS = 'rgba(var(--cs-or-rgb), 0.07)'
const OR_SELECTION = 'rgba(var(--cs-or-rgb), 0.16)'
const OR_SURVOL = 'rgba(var(--cs-or-rgb), 0.10)'

/** La rubrique d'une facette du volet de filtres : « Auteurs », « Tradition »… */
const STYLE_RUBRIQUE_FILTRE: React.CSSProperties = {
  fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: OR_ENCRE,
}

/** Une pastille de facette : retenue, offerte, ou indisponible sous le tri en cours. */
function stylePastilleFiltre(sel: boolean, dispo: boolean): React.CSSProperties {
  return {
    fontSize: '0.6875rem', padding: '2px 7px', borderRadius: '8px', cursor: dispo ? 'pointer' : 'default',
    border: `1px solid ${sel ? 'var(--cs-or)' : dispo ? 'var(--cs-or-doux)' : 'var(--cs-bord-clair)'}`,
    background: sel ? OR_SELECTION : dispo ? 'var(--cs-surface)' : 'transparent',
    color: sel ? OR_ENCRE : dispo ? 'var(--cs-texte-second)' : 'var(--cs-or-doux)',
  }
}

/** ⛔ Un `%` ou un `_` tapé dans la recherche est une LETTRE, non un joker : sans échappement,
 *  « _ » trouvait tous les auteurs. L'antislash est l'échappement par défaut de LIKE. */
export function echapperMotifIlike(saisie: string): string {
  return saisie.replace(/[\\%_]/g, c => `\\${c}`)
}

// ── Siècles ────────────────────────────────────────────────────────────────────
function siecleEnRomain(n: number): string {
  const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV']
  return (r[n - 1] ?? String(n)) + 'e'
}

// Rang chronologique d'un siècle donné en toutes lettres (« IXe siècle ») ou en nombre.
function rangSiecle(s: unknown): number {
  const str = String(s).trim()
  const dec = str.match(/^\d+/)
  if (dec) return parseInt(dec[0], 10)
  const m = str.toUpperCase().match(/[IVXLCDM]+/)
  if (!m) return 9999
  const val: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  const rn = m[0]
  let n = 0
  for (let i = 0; i < rn.length; i++) {
    const c = val[rn[i]] ?? 0, suiv = val[rn[i + 1]] ?? 0
    n += c < suiv ? -c : c
  }
  return n
}

// `auteurs.siecle` est du TEXTE déjà complet (« IXe siècle ») : on le rend tel quel. On ne
// construit le libellé que si la valeur est un simple nombre (évite « sièclee »).
function labelSiecle(s: unknown): string {
  const str = String(s).trim()
  if (/[a-zà-ÿ]/i.test(str)) return str
  const n = parseInt(str, 10)
  return Number.isFinite(n) ? `${siecleEnRomain(n)} siècle` : str
}

// Le chiffre romain en PETITES CAPITALES, l'ordinal en EXPOSANT. Pas de drapeau insensible
// à la casse : « siècle » contient i/c/l.
function rendreSiecle(str: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const re = /([IVXLCDM]+)(er|ère|ème|e)?/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index))
    parts.push(<span key={k++} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{m[1].toLowerCase()}</span>)
    if (m[2]) parts.push(<sup key={k++} style={{ fontSize: '0.68em', lineHeight: 0, verticalAlign: 'baseline', position: 'relative', top: '-0.5em' }}>{m[2]}</sup>)
    last = re.lastIndex
  }
  if (last < str.length) parts.push(str.slice(last))
  return parts
}

const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

// Groupe de tags : n'affiche que deux lignes ; « Afficher plus » déplie le reste. La hauteur
// de deux lignes se MESURE (le haut du premier tag de la troisième ligne).
// ⛔ Plus d'effet sans dépendances, rejoué à chaque rendu du volet : un `ResizeObserver`
// suit la largeur du volet, et les enfants (clé `signature`) suivent la liste des tags.
function GroupeTags({ titre, signature, children }: { titre: string; signature: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ouvert, setOuvert] = useState(false)
  const [hauteur2, setHauteur2] = useState<number | null>(null)
  useMesureAvantPeinture(() => {
    const el = ref.current
    if (!el) return
    const mesurer = () => {
      const enfants = Array.from(el.children) as HTMLElement[]
      if (enfants.length === 0) { setHauteur2(null); return }
      const base = enfants[0].offsetTop
      let lignes = 1, dernierTop = enfants[0].offsetTop, h: number | null = null
      for (const c of enfants) {
        if (c.offsetTop > dernierTop + 2) {
          lignes++; dernierTop = c.offsetTop
          if (lignes === 3) { h = c.offsetTop - base; break }
        }
      }
      setHauteur2(h)
    }
    mesurer()
    const obs = new ResizeObserver(mesurer)
    obs.observe(el)
    return () => obs.disconnect()
  }, [signature])
  const replie = hauteur2 != null && !ouvert
  return (
    <div style={{ marginTop: '8px' }}>
      <p style={{ ...STYLE_RUBRIQUE_FILTRE, margin: '0 0 4px' }}>{titre}</p>
      <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', overflow: 'hidden', maxHeight: replie ? `${hauteur2}px` : undefined }}>
        {children}
      </div>
      {hauteur2 != null && (
        <button onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} className="cs-bouton-lien cs-bouton-lien--or" style={{ marginTop: '1px' }}>
          {ouvert ? 'Afficher moins' : 'Afficher plus'}
        </button>
      )}
    </div>
  )
}

// ── L'état et le calcul ────────────────────────────────────────────────────────
export type MetaAuteur = { traditions: string[]; siecle: number | null; date_mort: string | null }
type OeuvreFiltrable = { id_auteur?: string; genre?: string | null }
type Facette = 'traditions' | 'siecles' | 'genres'

/** L'état des filtres et la liste filtrée. `onChange` est appelé à chaque changement de
 *  filtre (la page du volet revient à la première). */
export function useFiltresPatristiques<T extends { seg: { id_oeuvre: string } }>({ items, oeuvres, auteurMeta, onChange }: {
  items: T[]
  oeuvres: Record<string, OeuvreFiltrable>
  auteurMeta: Record<string, MetaAuteur>
  onChange: () => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [auteursIds, setAuteursIds] = useState<Set<string>>(new Set())
  const [auteursChoisis, setAuteursChoisis] = useState<{ id_auteur: string; nom: string }[]>([])
  const [traditions, setTraditions] = useState<Set<string>>(new Set())
  const [siecles, setSiecles] = useState<Set<number>>(new Set())
  const [genres, setGenres] = useState<Set<string>>(new Set())

  const nombreActifs = auteursIds.size + traditions.size + siecles.size + genres.size

  // ⛔ Stabilisée : c'est elle que les trois calculs de disponibilité lisent, et ils la
  // portent dans leurs dépendances au lieu de taire le linter.
  const passeSauf = useCallback((seg: { id_oeuvre: string }, sauf: Facette | null) => {
    const info = oeuvres[seg.id_oeuvre]
    const auteurId = info?.id_auteur
    const meta = auteurId ? auteurMeta[auteurId] : null
    if (auteursIds.size > 0 && (!auteurId || !auteursIds.has(auteurId))) return false
    if (sauf !== 'traditions' && traditions.size > 0 && !meta?.traditions?.some(t => traditions.has(t))) return false
    if (sauf !== 'siecles' && siecles.size > 0 && (!meta?.siecle || !siecles.has(meta.siecle))) return false
    if (sauf !== 'genres' && genres.size > 0 && (!info?.genre || !genres.has(info.genre))) return false
    return true
  }, [oeuvres, auteurMeta, auteursIds, traditions, siecles, genres])

  const itemsFiltres = useMemo(
    () => (nombreActifs ? items.filter(({ seg }) => passeSauf(seg, null)) : items),
    [items, nombreActifs, passeSauf],
  )

  // Ce qui existe dans la liste, et ce qui reste sélectionnable sous les AUTRES facettes :
  // une facette ne se grise jamais d'après sa propre sélection.
  const facettes = useMemo(() => {
    const dispo = { traditions: new Set<string>(), siecles: new Set<number>(), genres: new Set<string>() }
    const actifs = { traditions: new Set<string>(), siecles: new Set<number>(), genres: new Set<string>() }
    for (const { seg } of items) {
      const info = oeuvres[seg.id_oeuvre]
      const meta = info?.id_auteur ? auteurMeta[info.id_auteur] : null
      meta?.traditions?.forEach(t => dispo.traditions.add(t))
      if (meta?.siecle) dispo.siecles.add(meta.siecle)
      if (info?.genre) dispo.genres.add(info.genre)
      if (passeSauf(seg, 'traditions')) meta?.traditions?.forEach(t => actifs.traditions.add(t))
      if (meta?.siecle && passeSauf(seg, 'siecles')) actifs.siecles.add(meta.siecle)
      if (info?.genre && passeSauf(seg, 'genres')) actifs.genres.add(info.genre)
    }
    return {
      traditionsDisponibles: [...dispo.traditions].sort(),
      sieclesDisponibles: [...dispo.siecles].sort((a, b) => rangSiecle(a) - rangSiecle(b)),
      genresDisponibles: [...dispo.genres].sort(),
      actifs,
    }
  }, [items, oeuvres, auteurMeta, passeSauf])

  const basculer = <V,>(poser: React.Dispatch<React.SetStateAction<Set<V>>>, v: V) => {
    poser(prev => { const n = new Set(prev); if (n.has(v)) n.delete(v); else n.add(v); return n })
    onChange()
  }
  const toutEffacer = () => {
    setAuteursIds(new Set()); setAuteursChoisis([])
    setTraditions(new Set()); setSiecles(new Set()); setGenres(new Set())
    onChange()
  }
  const ajouterAuteur = (a: { id_auteur: string; nom: string }) => {
    setAuteursIds(prev => new Set([...prev, a.id_auteur]))
    setAuteursChoisis(prev => prev.find(x => x.id_auteur === a.id_auteur) ? prev : [...prev, a])
    onChange()
  }
  const retirerAuteur = (id: string) => {
    setAuteursIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setAuteursChoisis(prev => prev.filter(x => x.id_auteur !== id))
    onChange()
  }

  return {
    itemsFiltres,
    nombreActifs,
    panneau: {
      ouvert, basculerOuvert: () => setOuvert(o => !o),
      nombreActifs, auteursIds, auteursChoisis, ajouterAuteur, retirerAuteur,
      traditions, siecles, genres,
      basculerTradition: (t: string) => basculer(setTraditions, t),
      basculerSiecle: (s: number) => basculer(setSiecles, s),
      basculerGenre: (g: string) => basculer(setGenres, g),
      toutEffacer,
      ...facettes,
    },
  }
}

export type PanneauFiltresProps = ReturnType<typeof useFiltresPatristiques>['panneau']

// ── La recherche d'un auteur ───────────────────────────────────────────────────
function RechercheAuteur({ exclus, onChoisir }: { exclus: Set<string>; onChoisir: (a: { id_auteur: string; nom: string }) => void }) {
  const [saisie, setSaisie] = useState('')
  // Les résultats sont retenus AVEC la saisie qui les a demandés : une réponse ancienne,
  // arrivée après une plus récente, ne s'affiche jamais sous la saisie courante.
  const [resultats, setResultats] = useState<{ pour: string; liste: { id_auteur: string; nom: string }[] } | null>(null)
  const q = saisie.trim()
  useEffect(() => {
    if (!q) return
    let annule = false
    const t = setTimeout(() => {
      supabase.from('auteurs').select('id_auteur, nom').ilike('nom', `%${echapperMotifIlike(q)}%`).limit(6)
        .then(({ data, error }) => {
          if (annule) return
          if (error) { console.error('[volet] recherche d’auteur impossible :', error); setResultats({ pour: q, liste: [] }); return }
          setResultats({ pour: q, liste: (data ?? []) as { id_auteur: string; nom: string }[] })
        })
    }, 200)
    return () => { annule = true; clearTimeout(t) }
  }, [q])
  const liste = q && resultats?.pour === q ? resultats.liste.filter(a => !exclus.has(a.id_auteur)) : []
  return (
    <div style={{ position: 'relative', marginBottom: liste.length ? '0' : '4px' }}>
      <input aria-label="Chercher un auteur" type="text" value={saisie} onChange={e => setSaisie(e.target.value)}
        placeholder="Chercher un auteur…"
        style={{ width: '100%', fontSize: '0.75rem', padding: '4px 7px', borderRadius: '4px', border: '1px solid var(--cs-or-doux)', background: 'var(--cs-surface)', color: 'var(--cs-encre)', boxSizing: 'border-box', outline: 'none' }} />
      {liste.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--cs-surface)', border: '1px solid var(--cs-or-doux)', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 20, boxShadow: 'var(--cs-ombre-nette)' }}>
          {liste.map(a => (
            <button key={a.id_auteur} onClick={() => { onChoisir(a); setSaisie('') }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '5px 8px', fontSize: '0.75rem', color: 'var(--cs-encre)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = OR_SURVOL)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              {a.nom}
              <span style={{ fontSize: '0.84375rem', color: OR_ENCRE, lineHeight: 1 }}>+</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Le bouton et le volet dépliant ─────────────────────────────────────────────
export default function FiltresPatristiques(p: PanneauFiltresProps) {
  const pastilles = <V extends string | number>(liste: V[], choisis: Set<V>, actifs: Set<V>, basculer: (v: V) => void, libelle: (v: V) => string, rendu?: (v: V) => React.ReactNode) =>
    liste.map(v => {
      const sel = choisis.has(v)
      const dispo = sel || actifs.has(v)
      const lbl = libelle(v)
      return (
        <button key={String(v)} className="pp-tag" data-label={lbl} disabled={!dispo} aria-pressed={sel}
          onClick={() => basculer(v)} style={stylePastilleFiltre(sel, dispo)}>
          <span style={{ fontWeight: sel ? 600 : 400 }}>{rendu ? rendu(v) : lbl}</span>
        </button>
      )
    })

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0 0' }}>
        <button onClick={p.basculerOuvert} aria-expanded={p.ouvert} style={{
          position: 'relative',
          display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '4px',
          fontSize: '0.6875rem', padding: '5px 9px', borderRadius: '8px', cursor: 'pointer',
          border: `1px solid ${p.ouvert || p.nombreActifs > 0 ? 'var(--cs-or)' : OR_FILET}`,
          background: p.ouvert || p.nombreActifs > 0 ? OR_LAVIS : 'var(--cs-surface)',
          color: OR_ENCRE, fontWeight: 500,
        }}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Filtres
          {p.nombreActifs > 0 && (
            <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: OR_ENCRE, color: 'var(--cs-surface)', borderRadius: '8px', fontSize: '0.6875rem', padding: '0 4px', lineHeight: '14px', fontWeight: 700 }}>
              {p.nombreActifs}
            </span>
          )}
        </button>
      </div>

      {p.ouvert && (
        <div style={{ margin: '6px 0 2px', padding: '8px 10px', background: OR_LAVIS, border: `1px solid ${OR_FILET}`, borderRadius: '8px' }}>
          <p style={{ ...STYLE_RUBRIQUE_FILTRE, margin: '0 0 5px' }}>Auteurs</p>
          <RechercheAuteur exclus={p.auteursIds} onChoisir={p.ajouterAuteur} />
          {p.auteursChoisis.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px' }}>
              {p.auteursChoisis.map(a => (
                <span key={a.id_auteur} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.6875rem', padding: '1px 5px 1px 7px', background: OR_SELECTION, color: OR_ENCRE, border: '1px solid var(--cs-or)', borderRadius: '8px', fontWeight: 500 }}>
                  {a.nom}
                  <button onClick={() => p.retirerAuteur(a.id_auteur)} aria-label={`Retirer ${a.nom} des filtres`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: OR_ENCRE, fontSize: '0.78125rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}>×</button>
                </span>
              ))}
            </div>
          )}

          {(p.traditionsDisponibles.some(t => !p.traditions.has(t)) || p.traditions.size > 0) && (
            <GroupeTags titre="Tradition" signature={p.traditionsDisponibles.join('|')}>
              {pastilles(p.traditionsDisponibles, p.traditions, p.actifs.traditions, p.basculerTradition, t => t)}
            </GroupeTags>
          )}
          {(p.genresDisponibles.some(g => !p.genres.has(g)) || p.genres.size > 0) && (
            <GroupeTags titre="Genre" signature={p.genresDisponibles.join('|')}>
              {pastilles(p.genresDisponibles, p.genres, p.actifs.genres, p.basculerGenre, g => g)}
            </GroupeTags>
          )}
          {(p.sieclesDisponibles.some(s => !p.siecles.has(s)) || p.siecles.size > 0) && (
            <GroupeTags titre="Période" signature={p.sieclesDisponibles.join('|')}>
              {pastilles(p.sieclesDisponibles, p.siecles, p.actifs.siecles, p.basculerSiecle, labelSiecle, s => rendreSiecle(labelSiecle(s)))}
            </GroupeTags>
          )}

          {p.nombreActifs > 0 && (
            <button onClick={p.toutEffacer} className="cs-bouton-lien cs-bouton-lien--or" style={{ marginTop: '8px' }}>
              Tout effacer
            </button>
          )}
        </div>
      )}
    </>
  )
}
