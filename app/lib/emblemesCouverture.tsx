// Emblèmes des couvertures de publication : un petit dessin au trait, posé sous le
// sous-titre, comme la vignette gravée d'une page de titre ancienne.
//
// Le trait est en `currentColor` et sans aplat : l'emblème prend donc l'encre de sa
// couverture, claire sur les fonds sombres, brune sur les clairs, sans qu'on ait à
// le décliner six fois. `vectorEffect="non-scaling-stroke"` garde le trait d'une
// même finesse quelle que soit la taille rendue.
//
// ⚠️ PROVISOIRE — ces neuf dessins sont des ébauches géométriques, tenant la
// composition en attendant les dessins-symboles de l'auteur. Les remplacer revient
// à substituer le contenu de chaque entrée : ni la clé, ni le gabarit (viewBox
// 0 0 64 64, trait seul, pas de `fill`) ne doivent changer.

import type { ReactNode } from 'react'

const T = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const }

/** Un emblème par catégorie de publication (`CATEGORIES_ESSAIS`). */
const EMBLEMES: Record<string, ReactNode> = {
  // Le livre ouvert sous la loupe : lire de près.
  'Exégèse': <>
    <path {...T} d="M32 21C25 16 17 14 8 15v31c9-1 17 1 24 6 7-5 15-7 24-6V15c-9-1-17 1-24 6z" />
    <path {...T} d="M32 21v31" />
    <path {...T} d="M14 24c4 0 8 1 12 3M14 32c4 0 8 1 12 3M38 24c4-2 8-3 12-3M38 32c4-2 8-3 12-3" />
    <circle {...T} cx="42" cy="40" r="8.5" />
    <path {...T} d="M48 46l7 7" />
  </>,
  // La plume : ce qui s'écrit sans avoir eu lieu.
  'Fiction': <>
    <path {...T} d="M13 51C19 31 34 14 53 10c-2 20-16 35-35 39z" />
    <path {...T} d="M53 10 20 45" />
    <path {...T} d="M28 22c3 2 6 3 9 3M22 30c3 2 6 3 9 3M17 38c3 2 6 3 9 3" />
    <path {...T} d="M8 56l7-7" />
  </>,
  // L'arc de triomphe : ce qui reste des cités.
  'Histoire': <>
    <path {...T} d="M12 52V30a20 20 0 0 1 40 0v22" />
    <path {...T} d="M22 52V32a10 10 0 0 1 20 0v20" />
    <path {...T} d="M6 52h52" />
    <path {...T} d="M10 24h44" />
  </>,
  // L'étoile à huit branches, celle des Nativités byzantines.
  'Méditation': <>
    <path {...T} d="M32 6l4.5 21.5L58 32l-21.5 4.5L32 58l-4.5-21.5L6 32l21.5-4.5z" />
    <path {...T} d="M45 19 38 26M19 45l7-7M45 45l-7-7M19 19l7 7" />
  </>,
  // La colonne : les Pères comme piliers.
  'Patristique': <>
    <path {...T} d="M12 10h40M16 15h32" />
    <path {...T} d="M22 15v34M42 15v34" />
    <path {...T} d="M32 18v28" />
    <path {...T} d="M16 49h32M12 54h40" />
  </>,
  // Le compas : la raison qui mesure — et le Dieu géomètre.
  'Philosophie': <>
    <circle {...T} cx="32" cy="13" r="3.5" />
    <path {...T} d="M32 16.5 17 52M32 16.5 47 52" />
    <path {...T} d="M17 52l-4 5M47 52l4 5" />
    <path {...T} d="M24 35c5 3 11 3 16 0" />
  </>,
  // La lyre : le chant avant le discours.
  'Poésie': <>
    <path {...T} d="M27 45C16 39 12 23 21 7c3 4 3 8 1 11M37 45c11-6 15-22 6-38-3 4-3 8-1 11" />
    <path {...T} d="M19 18h26" />
    <path {...T} d="M27 18v27M32 18v27M37 18v27" />
    <path {...T} d="M26 45h12" />
  </>,
  // Le rameau : ce qui croît en silence.
  'Spiritualité': <>
    <path {...T} d="M32 56V16" />
    <path {...T} d="M32 30c-8 0-13-5-13-12 8 0 13 5 13 12zM32 30c8 0 13-5 13-12-8 0-13 5-13 12z" />
    <path {...T} d="M32 44c-8 0-13-5-13-12 8 0 13 5 13 12zM32 44c8 0 13-5 13-12-8 0-13 5-13 12z" />
  </>,
  // La croix nimbée.
  'Théologie': <>
    <path {...T} d="M32 6v52M11 24h42" />
    <circle {...T} cx="32" cy="24" r="9" />
  </>,
}

/** Le fleuron rendu quand la catégorie n'a pas d'emblème, ou n'en a pas encore : un
 *  losange et ses filets, l'ornement du site. Une couverture n'est jamais nue. */
const FLEURON: ReactNode = <>
  <path {...T} d="M32 20l8 12-8 12-8-12z" />
  <path {...T} d="M8 32h10M46 32h10" />
</>

/** Le dessin de la couverture, d'après la première catégorie de la publication. */
export function emblemeDe(categorie: string | null | undefined): ReactNode {
  return EMBLEMES[(categorie ?? '').trim()] ?? FLEURON
}

/** Vrai si la catégorie a son propre dessin. Sert aux tests, et à repérer une
 *  catégorie ajoutée sans emblème. */
export function aUnEmbleme(categorie: string | null | undefined): boolean {
  return Object.hasOwn(EMBLEMES, (categorie ?? '').trim())
}
