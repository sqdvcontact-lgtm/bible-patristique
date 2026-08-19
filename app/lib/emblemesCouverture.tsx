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

const T = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const }

/** Un emblème par catégorie de publication (`CATEGORIES_ESSAIS`). */
const EMBLEMES: Record<string, ReactNode> = {
  // Le livre ouvert sous la loupe : lire de près.
  'Exégèse': <>
    <path {...T} d="M32 20C26 15 18 13 9 14v34c9-1 17 1 23 6 6-5 14-7 23-6V14c-9-1-17 1-23 6z" />
    <path {...T} d="M32 20v34" />
    <circle {...T} cx="41" cy="34" r="10" />
    <path {...T} d="M48.5 41.5 56 49" />
  </>,
  // La plume : ce qui s'écrit sans avoir eu lieu.
  'Fiction': <>
    <path {...T} d="M14 52C18 30 32 14 52 10c2 20-12 36-32 40z" />
    <path {...T} d="M46 16C36 24 28 34 22 46" />
    <path {...T} d="M10 56l6-6" />
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
    <path {...T} d="M16 14h32M14 10h36M18 54h28M14 58h36" />
    <path {...T} d="M20 14v40M32 14v40M44 14v40" />
  </>,
  // La lampe : la raison qui éclaire sans consumer.
  'Philosophie': <>
    <path {...T} d="M14 40h26a10 10 0 0 0 0-20H20a6 6 0 0 0-6 6z" />
    <path {...T} d="M14 40 8 52h34l-6-12" />
    <path {...T} d="M40 20c0-5 4-7 4-12 4 4 6 8 6 12" />
  </>,
  // La lyre : le chant avant le discours.
  'Poésie': <>
    <path {...T} d="M22 50C13 42 13 22 22 12M42 50c9-8 9-28 0-38" />
    <path {...T} d="M19 20h26M20 50h24" />
    <path {...T} d="M27 20v30M32 20v30M37 20v30" />
  </>,
  // Le rameau : ce qui croît en silence.
  'Spiritualité': <>
    <path {...T} d="M32 56V16" />
    <path {...T} d="M32 30c-8 0-13-5-13-12 8 0 13 5 13 12zM32 30c8 0 13-5 13-12-8 0-13 5-13 12z" />
    <path {...T} d="M32 44c-8 0-13-5-13-12 8 0 13 5 13 12zM32 44c8 0 13-5 13-12-8 0-13 5-13 12z" />
  </>,
  // La croix nimbée.
  'Théologie': <>
    <path {...T} d="M32 8v48M14 26h36" />
    <circle {...T} cx="32" cy="26" r="13" />
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
