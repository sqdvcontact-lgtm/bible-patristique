import React from 'react'

/* ── Les siècles, en un seul endroit ──────────────────────────────────────────
 *
 *  Règle : le chiffre romain en petites capitales, l'ordinal qui le suit en
 *  exposant. « IVe siècle », jamais « IVe siècle » en capitales pleines, qui
 *  fait une tache dans une ligne de bas-de-casse.
 *
 *  Cette règle était appliquée en CINQ endroits, de cinq façons différentes :
 *  petites capitales tantôt `small-caps` tantôt `all-small-caps`, exposant à
 *  0,6 / 0,65 / 0,68 / 0,72 em, et la page auteur qui n'appliquait rien du tout.
 *  Deux remarques tirées de ce nettoyage, à ne pas reperdre :
 *
 *  — `font-variant: small-caps` ne transforme QUE les bas-de-casse. Appliqué à
 *    « IV » déjà en capitales, il ne fait rien. C'est pourquoi il faut
 *    `all-small-caps` (ou passer le texte en bas-de-casse au préalable) ; le
 *    panneau d'administration composait ses siècles sans le savoir.
 *  — On ne compose que les siècles, jamais un chiffre romain isolé : « Léon X »,
 *    « Ps. IV », « livre V » n'en sont pas. La marque est donc le mot qui suit —
 *    « siècle », « siècles », ou l'abréviation « s. » —, et l'on remonte de là.
 *
 *  Le vérificateur `scripts/audit-siecles.mjs` signale toute composition faite
 *  à la main hors de ce module.
 */

const ORDINAL = '(?:er|ère|ere|ème|eme|ième|ieme|e)'

// Un empan complet : « IVe siècle », mais aussi « IIIe–IVe siècle » ou
// « Ier au IIe s. ». Le groupe intérieur autorise la suite d'ordinaux liés
// avant le mot qui les qualifie.
const EMPAN = new RegExp(
  `\\b[IVXLCDM]+${ORDINAL}\\b(?:\\s*(?:[–—-]|au|et|à)\\s*[IVXLCDM]+${ORDINAL}\\b)*\\s*(?:siècles?|s\\.)`,
  'g',
)
const UN_SIECLE = new RegExp(`\\b([IVXLCDM]+)(${ORDINAL})\\b`, 'g')

/** Petites capitales : `all-small-caps` et non `small-caps` — voir en tête. */
export const STYLE_ROMAIN: React.CSSProperties = { fontVariantCaps: 'all-small-caps' }
// L'ordinal en exposant. ⚠️ On NE laisse PAS le `vertical-align: super` par défaut du
// `<sup>` : il monte l'ordinal beaucoup trop haut (au-dessus de la casse du chiffre). On
// le cale par un décalage relatif modéré (`top`), qui place le « e » dans le haut du
// chiffre sans toucher à l'interligne (contrairement à `super`, qui peut l'écarter).
export const STYLE_ORDINAL: React.CSSProperties = {
  fontSize: '0.62em',
  lineHeight: 1,
  verticalAlign: 'baseline',
  position: 'relative',
  top: '-0.5em',
}

export function enChiffresRomains(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let res = ''
  let reste = Math.abs(n)
  for (const [v, s] of table) { while (reste >= v) { res += s; reste -= v } }
  return res
}

const ROMAINS_VALEUR: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
export function romainVersNombre(r: string): number | null {
  let total = 0, prec = 0
  for (const c of r.toUpperCase().split('').reverse()) {
    const v = ROMAINS_VALEUR[c]; if (!v) return null
    total += v < prec ? -v : v; prec = v
  }
  return total || null
}

/** Un morceau de texte découpé : ce qui est à composer, et ce qui ne l'est pas.
 *
 *  Le découpage est séparé du rendu parce qu'il sert DEUX rendus : le HTML du
 *  site et le PDF des essais, qui n'ont pas les mêmes moyens — react-pdf ignore
 *  `font-variant-caps` et n'a pas de `<sup>`. Une seule expression régulière,
 *  deux façons de la peindre. */
export type FragmentSiecle =
  | { t: 'texte'; v: string }
  | { t: 'romain'; v: string }
  | { t: 'ordinal'; v: string }

/** Texte libre → fragments. Les fragments `romain` et `ordinal` sont ceux qui
 *  demandent une composition ; tout le reste ressort en `texte`. */
export function decouperSiecles(texte: string | null | undefined): FragmentSiecle[] {
  const t = texte ?? ''
  if (!t) return []
  const frags: FragmentSiecle[] = []
  const pousserTexte = (v: string) => { if (v) frags.push({ t: 'texte', v }) }

  let dernier = 0, m: RegExpExecArray | null
  EMPAN.lastIndex = 0
  while ((m = EMPAN.exec(t))) {
    pousserTexte(t.slice(dernier, m.index))
    // Dans l'empan repéré, isoler chaque « chiffre romain + ordinal ».
    const empan = m[0]
    let interne = 0, mi: RegExpExecArray | null
    UN_SIECLE.lastIndex = 0
    while ((mi = UN_SIECLE.exec(empan))) {
      pousserTexte(empan.slice(interne, mi.index))
      frags.push({ t: 'romain', v: mi[1] }, { t: 'ordinal', v: mi[2] })
      interne = UN_SIECLE.lastIndex
    }
    pousserTexte(empan.slice(interne))
    dernier = EMPAN.lastIndex
  }
  pousserTexte(t.slice(dernier))
  return frags
}

/** Texte libre → JSX, en composant les siècles rencontrés. Le reste du texte
 *  est renvoyé tel quel : la fonction ne met rien d'autre en forme.
 *
 *  À employer partout où l'on affiche un texte saisi à la main — dates d'un
 *  auteur, note biographique, mention d'édition, titre d'une œuvre. */
export function rendreSiecles(texte: string | null | undefined): React.ReactNode {
  const t = texte ?? ''
  if (!t) return t
  const frags = decouperSiecles(t)
  // Aucun siècle : rendre la chaîne elle-même, et non un tableau d'un élément.
  if (!frags.some(f => f.t !== 'texte')) return t
  return frags.map((f, i) =>
    f.t === 'romain' ? <span key={i} style={STYLE_ROMAIN}>{f.v}</span>
    : f.t === 'ordinal' ? <sup key={i} style={STYLE_ORDINAL}>{f.v}</sup>
    : f.v,
  )
}

/** Même règle, mais sur du HTML déjà composé (éditeur de traductions, notes).
 *  L'ordinal peut déjà porter un `<sup>` : on l'absorbe pour ne pas le doubler. */
export function sieclesEnHtml(html: string): string {
  return html.replace(
    new RegExp(`\\b([IVXLCDM]+)(?:<sup>)?(${ORDINAL})(?:</sup>)?(\\s*(?:siècles?|s\\.))`, 'g'),
    '<span style="font-variant-caps:all-small-caps">$1</span><sup style="font-size:0.62em !important;line-height:1;vertical-align:baseline;position:relative;top:-0.5em">$2</sup>$3',
  )
}

/** Siècle donné par son numéro — négatif pour « av. J.-C. ». */
export function siecleEnTexte(n: number): string {
  const abs = Math.abs(n)
  return `${enChiffresRomains(abs)}${abs === 1 ? 'er' : 'e'} siècle${n < 0 ? ' av. J.-C.' : ''}`
}

/** Siècle donné par son numéro, composé. Négatif pour « av. J.-C. ». */
export function Siecle({ n }: { n: number }) {
  const abs = Math.abs(n)
  return (
    <span>
      <span style={STYLE_ROMAIN}>{enChiffresRomains(abs)}</span>
      <sup style={STYLE_ORDINAL}>{abs === 1 ? 'er' : 'e'}</sup>
      {' siècle'}
      {n < 0 ? ' av. J.-C.' : ''}
    </span>
  )
}

/** Empan de deux siècles : « Ier–IIe siècle ». Employé par les filtres. */
export function EmpanSiecles({ de, a }: { de: number; a: number }) {
  return (
    <span>
      <span style={STYLE_ROMAIN}>{enChiffresRomains(de)}</span>
      <sup style={STYLE_ORDINAL}>{de === 1 ? 'er' : 'e'}</sup>
      –
      <span style={STYLE_ROMAIN}>{enChiffresRomains(a)}</span>
      <sup style={STYLE_ORDINAL}>{a === 1 ? 'er' : 'e'}</sup>
      {' siècle'}
    </span>
  )
}
