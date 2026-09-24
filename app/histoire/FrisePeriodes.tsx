'use client'

// LA FRISE DES PÉRIODES — dans le pendant du volet, à droite de la liste de l'Histoire
// de l'Église (décision de l'auteur, 2026-09-24, charte § 38.39).
//
// ⛔ ELLE EST PROPORTIONNÉE À LA LISTE, NON AU TEMPS : chaque période y prend la hauteur
// de sa part des événements affichés. Elle se lit donc comme le plan de la page. Le
// mode « à l'échelle » a été supprimé le 2026-09-05, et une frise au temps réel y
// retomberait : de longs tronçons presque vides. Les bornes de dates, écrites sous
// chaque nom, rendent le repère chronologique sans l'échelle.
//
// ⛔ ELLE SUIT LES FILTRES : les comptes viennent de la liste RENDUE. Une période sans
// événement retenu s'éteint, sans disparaître, pour que la frise garde sa forme.
//
// ⚠️ Elle ne paraît que là où le pendant paraît : ni au téléphone ni sur un écran
// étroit (décision de l'auteur).

import { useEffect, useState } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { SANS } from '@/app/lib/polices'
import { allerAAncre } from '@/app/lib/defilement'

export type PeriodeFrise = { code: string; nom: string; date_debut: number | null; date_fin: number | null }

/** L'ancre de la première section d'une période dans la liste. */
export const ancrePeriode = (code: string) => `periode-${code}`

/** « 313-476 », « 2000-301 av. J.-C. », « 300 av.-29 apr. J.-C. », « depuis 1979 ». */
export function bornesPeriode(debut: number | null, fin: number | null): string {
  if (debut == null) return ''
  // Une période qui court encore porte une fin conventionnelle (2100) dans la base.
  if (fin == null || fin >= 2100) return debut < 0 ? `depuis ${-debut} av. J.-C.` : `depuis ${debut}`
  if (fin < 0) return `${-debut}-${-fin} av. J.-C.`
  if (debut < 0) return `${-debut} av.-${fin} apr. J.-C.`
  return `${debut}-${fin}`
}

export default function FrisePeriodes({ periodes, comptes }: {
  periodes: PeriodeFrise[]
  /** Le nombre d'événements affichés par période, sur la liste filtrée. */
  comptes: Map<string, number>
}) {
  const [courante, setCourante] = useState<string | null>(null)

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

  return (
    <nav aria-label="Périodes de l’histoire de l’Église" className="cs-defilement-discret"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', padding: '14px 12px 18px 0', overflowY: 'auto', fontFamily: SANS }}>
      {periodes.map(p => {
        const n = comptes.get(p.code) ?? 0
        const actif = courante === p.code
        const eteinte = n === 0
        const bornes = bornesPeriode(p.date_debut, p.date_fin)
        return (
          <button key={p.code} type="button" disabled={eteinte} aria-current={actif ? 'true' : undefined}
            onClick={() => allerAAncre(ancrePeriode(p.code))}
            title={eteinte ? `${p.nom} : aucun événement retenu` : `${p.nom} : ${n} événement${n > 1 ? 's' : ''}`}
            className="frise-periode"
            style={{
              // La hauteur suit la part de la période dans la liste. ⛔ Aucun
              // min-height écrit : celui d'un élément flexible, laissé à « auto », est
              // la hauteur de son contenu, si bien qu'un nom sur deux lignes ne déborde
              // jamais sur la période suivante.
              flex: `${n} 1 0px`,
              display: 'flex', alignItems: 'stretch', gap: '9px', width: '100%',
              background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left',
              cursor: eteinte ? 'default' : 'pointer', opacity: eteinte ? 'var(--cs-opacite-desactive)' : 1,
            }}>
            <span aria-hidden style={{
              // Le trait de la frise, et un cran en tête de chaque période.
              flexShrink: 0, width: '8px', marginLeft: actif ? '14px' : '15px',
              borderLeft: actif ? '3px solid var(--cs-vert)' : '1px solid var(--cs-bord)',
              borderTop: '1px solid var(--cs-bord)',
            }} />
            <span style={{ display: 'flex', flexDirection: 'column', padding: '3px 0 8px', minWidth: 0 }}>
              <span className="frise-periode-nom" style={{
                fontSize: '0.6875rem', lineHeight: 1.25, fontWeight: actif ? 600 : 400,
                color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-second)',
              }}>{p.nom}</span>
              {bornes && <span style={{ fontSize: '0.6875rem', lineHeight: 1.25, color: 'var(--cs-texte-gris)', fontVariantNumeric: 'tabular-nums' }}>{bornes}</span>}
            </span>
          </button>
        )
      })}
      <style>{`
        @media (hover: hover) {
          .frise-periode:not(:disabled):hover .frise-periode-nom { color: var(--cs-vert-fonce); text-decoration: underline; text-underline-offset: 2px; }
        }
      `}</style>
    </nav>
  )
}

/** La hauteur de la barre, pour un saut qui ne passe pas dessous. */
export const MARGE_SAUT_PERIODE = `calc(${HAUTEUR_NAVBAR} + 4px)`
