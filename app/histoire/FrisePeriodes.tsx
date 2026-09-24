'use client'

// LA FRISE DES PÉRIODES — dans le pendant du volet, à droite de la liste de l'Histoire
// de l'Église (décision de l'auteur, 2026-09-24, charte § 38.39).
//
// ⛔ DES BLOCS QUI OCCUPENT TOUTE LA HAUTEUR, un par période, plus ou moins hauts selon
// sa DURÉE (décision de l'auteur, le même jour, après deux essais refusés : une frise
// proportionnée à la liste, puis une bande étroite avec les noms à côté).
//
// ⛔ LA HAUTEUR D'UN BLOC EST UN SOCLE PLUS UNE PART DU RESTE (`flex: durée 1 socle`).
// Quatre mille ans tiennent dans huit cents pixels : en proportion pure, trente-deux ans
// y feraient six pixels, où aucun nom ne tient. Chaque bloc reçoit donc le socle d'une
// ligne de nom, puis le reste se partage au prorata des années. ⚠️ Un premier jet
// laissait la hauteur « auto » faire plancher : les planchers de deux lignes mangeaient
// toute la place, et seul le monde biblique ancien paraissait plus long que les autres.
// Le socle d'UNE ligne laisse plus de la moitié de la frise à la proportion, et l'ordre
// des durées se lit toujours : un bloc plus long dure plus longtemps.
//
// ⛔ LA COMPOSITION EST CELLE D'UNE PAGE DE TITRE ANCIENNE (demande de l'auteur) : le
// nom centré en sérif, les dates en italique aux chiffres elzéviriens dessous,
// un filet gravé autour du bloc. Le socle garde des marges propres même au plus court.
// Les dates paraissent quand le bloc en a la place, le nom passe sur deux lignes quand
// il y a la hauteur (requêtes de conteneur sur la hauteur du CONTENU, rembourrage
// déduit), et l'infobulle donne toujours tout.
//
// ⛔ ELLE SUIT LES FILTRES : une période sans événement retenu dans la liste s'éteint,
// sans disparaître, pour que la frise garde sa forme.
//
// ⚠️ Elle ne paraît que là où le pendant paraît : ni au téléphone ni sur un écran
// étroit (décision de l'auteur).

import { useEffect, useState } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { SERIF } from '@/app/lib/polices'
import { allerAAncre } from '@/app/lib/defilement'

export type PeriodeFrise = { code: string; nom: string; date_debut: number | null; date_fin: number | null }

/** L'ancre de la première section d'une période dans la liste. */
export const ancrePeriode = (code: string) => `periode-${code}`

// Une période qui court encore porte une fin conventionnelle (2100) dans la base : sa
// durée se compte jusqu'à l'année courante. Lue une fois, au chargement du module, et
// non pendant un rendu.
const ANNEE_COURANTE = new Date().getFullYear()
const FIN_OUVERTE = 2100

/** « 313 – 476 », « 2000 – 301 av. J.-C. », « 300 av. – 29 apr. J.-C. », « depuis 1979 ».
 *  Le tiret demi-cadratin entre deux dates est cerné de deux espaces (décision de
 *  l'auteur), comme celui des dates d'événement de la même page. */
export function bornesPeriode(debut: number | null, fin: number | null): string {
  if (debut == null) return ''
  if (fin == null || fin >= FIN_OUVERTE) return debut < 0 ? `depuis ${-debut} av. J.-C.` : `depuis ${debut}`
  if (fin < 0) return `${-debut} – ${-fin} av. J.-C.`
  if (debut < 0) return `${-debut} av. – ${fin} apr. J.-C.`
  return `${debut} – ${fin}`
}

/** La durée d'une période, en années, jamais moins d'une. */
export function dureePeriode(debut: number | null, fin: number | null): number {
  if (debut == null) return 1
  const f = fin == null || fin >= FIN_OUVERTE ? ANNEE_COURANTE : fin
  return Math.max(1, f - debut + 1)
}

/** Le socle d'un bloc : une ligne de nom et des marges propres autour. */
const SOCLE = '1.875rem'

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
    <nav aria-label="Périodes de l’histoire de l’Église"
      style={{ display: 'flex', flexDirection: 'column', gap: '3px', height: '100%', boxSizing: 'border-box', padding: '18px 10px 20px', overflow: 'hidden' }}>
      {periodes.map((p, i) => {
        const n = comptes.get(p.code) ?? 0
        const actif = courante === p.code
        const eteinte = n === 0
        const bornes = bornesPeriode(p.date_debut, p.date_fin)
        return (
          <button key={p.code} type="button" disabled={eteinte} aria-current={actif ? 'true' : undefined}
            onClick={() => allerAAncre(ancrePeriode(p.code))}
            title={`${p.nom}${bornes ? ` (${bornes})` : ''}${eteinte ? ' : aucun événement retenu' : ` : ${n} événement${n > 1 ? 's' : ''}`}`}
            className={`frise-periode${i % 2 ? ' frise-periode--paire' : ''}`}
            style={{ flex: `${dureePeriode(p.date_debut, p.date_fin)} 1 ${SOCLE}` }}>
            <span className="frise-periode-nom">{p.nom}</span>
            {bornes && <span className="frise-periode-bornes">{bornes}</span>}
          </button>
        )
      })}
      {/* ⚠️ La forme vit dans la feuille : l'état retenu et le survol battraient un style
          posé en ligne sans point d'exclamation. */}
      <style>{`
        .frise-periode {
          container-type: size; min-height: 0; overflow: hidden;
          display: flex; flex-direction: column; justify-content: safe center; align-items: center;
          width: 100%; margin: 0; padding: 6px 8px; border: none; border-radius: 4px;
          text-align: center; cursor: pointer; font-family: ${SERIF};
          background: var(--cs-fond-doux);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cs-bord) 60%, transparent);
          transition: background var(--cs-duree-courte), box-shadow var(--cs-duree-courte);
        }
        .frise-periode--paire { background: color-mix(in srgb, var(--cs-fond-doux) 78%, var(--cs-bord)); }
        .frise-periode-nom {
          max-width: 100%; font-size: 0.75rem; line-height: 1.2; letter-spacing: 0; word-spacing: -0.02em; color: var(--cs-encre);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .frise-periode-bornes {
          margin-top: 1px; font-size: 0.6875rem; line-height: 1.2; font-style: italic; color: var(--cs-texte-second);
          font-variant-numeric: oldstyle-nums proportional-nums; white-space: nowrap;
        }
        /* Assez de hauteur : le nom peut passer sur deux lignes au lieu d'être coupé. */
        @container (min-height: 3rem) {
          .frise-periode-nom { white-space: normal; text-wrap: balance; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        }
        /* Trop peu de hauteur pour les dates : le nom seul. */
        @container (max-height: 1.8125rem) { .frise-periode-bornes { display: none; } }
        .frise-periode[aria-current='true'] {
          background: color-mix(in srgb, var(--cs-fond-doux) 86%, var(--cs-vert));
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cs-vert) 70%, transparent);
        }
        .frise-periode[aria-current='true'] .frise-periode-nom { color: var(--cs-vert); font-weight: 600; }
        .frise-periode:disabled { cursor: default; opacity: var(--cs-opacite-desactive); }
        @media (hover: hover) {
          .frise-periode:not(:disabled):not([aria-current='true']):hover { background: color-mix(in srgb, var(--cs-fond-doux) 90%, var(--cs-vert)); }
        }
      `}</style>
    </nav>
  )
}

/** La hauteur de la barre, pour un saut qui ne passe pas dessous. */
export const MARGE_SAUT_PERIODE = `calc(${HAUTEUR_NAVBAR} + 4px)`
