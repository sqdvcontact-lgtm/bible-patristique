'use client'

// LA FRISE DES PÉRIODES — dans le pendant du volet, à droite de la liste de l'Histoire
// de l'Église (décision de l'auteur, 2026-09-24, charte § 38.39).
//
// ⛔ ELLE EST PROPORTIONNÉE À LA DURÉE DE CHAQUE PÉRIODE (rectification de l'auteur, le
// même jour : un premier jet la proportionnait à la liste). La frise dit donc le temps,
// et la liste dit ce qu'il contient.
//
// ⛔ LA DURÉE SE DESSINE SUR UNE BANDE, LES NOMS SE RANGENT À CÔTÉ. Quatre mille ans
// tiennent dans huit cents pixels : trente-deux ans y font six pixels, où aucun nom ne
// tient. Un premier jet logeait chaque nom DANS son bloc, avec un plancher de hauteur ; le
// plancher mangeait alors toute la place, et seul le monde biblique ancien paraissait plus
// long que les autres — la proportion ne se voyait plus. La bande est donc exacte, et
// chaque nom se pose au plus près du milieu de son segment, relié à lui par un trait ;
// quand deux noms se disputent la même hauteur, ils s'écartent ensemble (placerEtiquettes).
//
// ⛔ ELLE SUIT LES FILTRES : une période sans événement retenu dans la liste s'éteint,
// sans disparaître, pour que la frise garde sa forme.
//
// ⚠️ Elle ne paraît que là où le pendant paraît : ni au téléphone ni sur un écran
// étroit (décision de l'auteur).

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { SANS, SERIF } from '@/app/lib/polices'
import { allerAAncre } from '@/app/lib/defilement'
import { placerEtiquettes } from '@/app/lib/placerEtiquettes'

export type PeriodeFrise = { code: string; nom: string; date_debut: number | null; date_fin: number | null }

/** L'ancre de la première section d'une période dans la liste. */
export const ancrePeriode = (code: string) => `periode-${code}`

// Une période qui court encore porte une fin conventionnelle (2100) dans la base : sa
// durée se compte jusqu'à l'année courante. Lue une fois, au chargement du module, et
// non pendant un rendu.
const ANNEE_COURANTE = new Date().getFullYear()
const FIN_OUVERTE = 2100

/** « 313-476 », « 2000-301 av. J.-C. », « 300 av.-29 apr. J.-C. », « depuis 1979 ». */
export function bornesPeriode(debut: number | null, fin: number | null): string {
  if (debut == null) return ''
  if (fin == null || fin >= FIN_OUVERTE) return debut < 0 ? `depuis ${-debut} av. J.-C.` : `depuis ${debut}`
  if (fin < 0) return `${-debut}-${-fin} av. J.-C.`
  if (debut < 0) return `${-debut} av.-${fin} apr. J.-C.`
  return `${debut}-${fin}`
}

/** La durée d'une période, en années, jamais moins d'une. */
export function dureePeriode(debut: number | null, fin: number | null): number {
  if (debut == null) return 1
  const f = fin == null || fin >= FIN_OUVERTE ? ANNEE_COURANTE : fin
  return Math.max(1, f - debut + 1)
}

// La mesure se prend avant la peinture : sans quoi les noms paraîtraient à leur place
// idéale, puis sauteraient à leur place réelle.
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

// Géométrie de la frise, en pixels (elle vit dans un pendant de largeur fixe).
const MARGE_HAUT = 20
const MARGE_BAS = 20
const BANDE_X = 18
const BANDE_L = 8
const NOMS_X = BANDE_X + BANDE_L + 22
const ECART_NOMS = 5
/** Distance du haut d'une étiquette au milieu de sa première ligne : le point d'attache. */
const ATTACHE = 8

type Mise = { hauteur: number; tops: number[]; segments: { y: number; h: number }[] }

export default function FrisePeriodes({ periodes, comptes }: {
  periodes: PeriodeFrise[]
  /** Le nombre d'événements affichés par période, sur la liste filtrée. */
  comptes: Map<string, number>
}) {
  const [courante, setCourante] = useState<string | null>(null)
  const [survolee, setSurvolee] = useState<string | null>(null)
  const [mise, setMise] = useState<Mise | null>(null)
  const refNav = useRef<HTMLElement>(null)
  const refsNoms = useRef<(HTMLButtonElement | null)[]>([])

  // La période qu'on lit : celle de la dernière section dont le haut a passé la barre.
  useEffect(() => {
    let image = 0
    const mesurer = () => {
      image = 0
      const barre = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3.5 + 8
      let code: string | null = null
      document.querySelectorAll<HTMLElement>('[data-periode]').forEach(el => {
        if (el.getBoundingClientRect().top <= barre) code = el.dataset.periode ?? null
      })
      if (code == null) code = document.querySelector<HTMLElement>('[data-periode]')?.dataset.periode ?? null
      setCourante(code)
    }
    const planifier = () => { if (!image) image = requestAnimationFrame(mesurer) }
    planifier()
    window.addEventListener('scroll', planifier, { passive: true })
    window.addEventListener('resize', planifier)
    return () => {
      window.removeEventListener('scroll', planifier)
      window.removeEventListener('resize', planifier)
      if (image) cancelAnimationFrame(image)
    }
  }, [comptes])

  // La bande et la place des noms : se recalculent quand le pendant change de taille
  // (fenêtre, police racine) ou quand un nom change de hauteur (police chargée).
  useMesureAvantPeinture(() => {
    const nav = refNav.current
    if (!nav) return
    const calculer = () => {
      const hauteurs = periodes.map((_, i) => refsNoms.current[i]?.offsetHeight ?? 0)
      const besoin = MARGE_HAUT + MARGE_BAS + hauteurs.reduce((a, h) => a + h + ECART_NOMS, 0)
      const hauteur = Math.max(nav.clientHeight, besoin)
      const utile = hauteur - MARGE_HAUT - MARGE_BAS
      const durees = periodes.map(p => dureePeriode(p.date_debut, p.date_fin))
      const total = durees.reduce((a, d) => a + d, 0)
      let y = MARGE_HAUT
      const segments = durees.map(d => { const h = (d / total) * utile; const s = { y, h }; y += h; return s })
      const ideaux = segments.map(s => s.y + s.h / 2 - ATTACHE)
      const tops = placerEtiquettes(ideaux, hauteurs, MARGE_HAUT, hauteur - MARGE_BAS, ECART_NOMS)
      setMise(m => m && m.hauteur === hauteur && m.tops.every((t, i) => Math.abs(t - tops[i]) < 0.5) ? m : { hauteur, tops, segments })
    }
    calculer()
    const observateur = new ResizeObserver(calculer)
    observateur.observe(nav)
    refsNoms.current.forEach(el => { if (el) observateur.observe(el) })
    // ⚠️ Une police qui arrive change la coupe des noms : on remesure alors.
    document.fonts?.addEventListener('loadingdone', calculer)
    document.fonts?.ready.then(calculer)
    return () => { observateur.disconnect(); document.fonts?.removeEventListener('loadingdone', calculer) }
  }, [periodes])

  return (
    <nav ref={refNav} aria-label="Périodes de l’histoire de l’Église" className="cs-defilement-discret"
      style={{ position: 'relative', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ position: 'relative', height: mise?.hauteur ?? '100%' }}>
        {mise && (
          <svg aria-hidden width="100%" height={mise.hauteur} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            {periodes.map((p, i) => {
              const s = mise.segments[i]
              const eteinte = (comptes.get(p.code) ?? 0) === 0
              const vive = courante === p.code || survolee === p.code
              const milieu = s.y + s.h / 2
              const attache = mise.tops[i] + ATTACHE
              return (
                <g key={p.code} className={`frise-trace${vive ? ' frise-trace--vive' : ''}${i % 2 ? ' frise-trace--paire' : ''}`}
                  style={{ opacity: eteinte ? 'var(--cs-opacite-desactive)' : undefined }}>
                  <rect x={BANDE_X} y={s.y + 0.5} width={BANDE_L} height={Math.max(1, s.h - 1)} rx={1.5} />
                  <path d={`M ${BANDE_X + BANDE_L + 2} ${milieu} H ${BANDE_X + BANDE_L + 8} L ${NOMS_X - 8} ${attache} H ${NOMS_X - 3}`} />
                </g>
              )
            })}
          </svg>
        )}
        {periodes.map((p, i) => {
          const n = comptes.get(p.code) ?? 0
          const actif = courante === p.code
          const eteinte = n === 0
          const bornes = bornesPeriode(p.date_debut, p.date_fin)
          return (
            <button key={p.code} ref={el => { refsNoms.current[i] = el }} type="button" disabled={eteinte}
              aria-current={actif ? 'true' : undefined}
              onClick={() => allerAAncre(ancrePeriode(p.code))}
              onPointerEnter={() => setSurvolee(p.code)} onPointerLeave={() => setSurvolee(s => (s === p.code ? null : s))}
              onFocus={() => setSurvolee(p.code)} onBlur={() => setSurvolee(s => (s === p.code ? null : s))}
              title={eteinte ? `${p.nom} : aucun événement retenu` : `${p.nom} : ${n} événement${n > 1 ? 's' : ''}`}
              className="frise-nom"
              style={{ top: mise ? mise.tops[i] : 0, visibility: mise ? undefined : 'hidden' }}>
              <span className="frise-nom-titre">{p.nom}</span>
              {bornes && <span className="frise-nom-bornes">{bornes}</span>}
            </button>
          )
        })}
      </div>
      {/* ⚠️ La forme vit dans la feuille : l'état retenu et le survol battraient un style
          posé en ligne sans point d'exclamation. */}
      <style>{`
        .frise-trace rect { fill: color-mix(in srgb, var(--cs-bord) 70%, var(--cs-fond-clair)); transition: fill var(--cs-duree-courte); }
        .frise-trace--paire rect { fill: var(--cs-bord); }
        .frise-trace path { fill: none; stroke: var(--cs-bord); stroke-width: 1; transition: stroke var(--cs-duree-courte); }
        .frise-trace--vive rect { fill: var(--cs-vert-aplat); }
        .frise-trace--vive path { stroke: var(--cs-vert); }
        .frise-nom {
          position: absolute; left: ${NOMS_X}px; right: 10px;
          display: flex; flex-direction: column; align-items: flex-start;
          margin: 0; padding: 0; border: none; background: none;
          text-align: left; cursor: pointer; font-family: ${SANS};
        }
        .frise-nom-titre { font-family: ${SERIF}; font-size: 0.75rem; line-height: 1.3; color: var(--cs-encre); transition: color var(--cs-duree-courte); }
        .frise-nom-bornes { font-size: 0.6875rem; line-height: 1.25; color: var(--cs-texte-second); font-variant-numeric: tabular-nums; }
        .frise-nom[aria-current='true'] .frise-nom-titre { color: var(--cs-vert); font-weight: 600; }
        .frise-nom:disabled { cursor: default; opacity: var(--cs-opacite-desactive); }
        @media (hover: hover) {
          .frise-nom:not(:disabled):hover .frise-nom-titre { color: var(--cs-vert); }
        }
        @media (prefers-reduced-motion: reduce) {
          .frise-trace rect, .frise-trace path, .frise-nom-titre { transition: none; }
        }
      `}</style>
    </nav>
  )
}

/** La hauteur de la barre, pour un saut qui ne passe pas dessous. */
export const MARGE_SAUT_PERIODE = `calc(${HAUTEUR_NAVBAR} + 4px)`
