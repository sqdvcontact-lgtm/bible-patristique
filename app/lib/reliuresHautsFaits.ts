// LES RELIURES DU TABLEAU DES HAUTS FAITS — une gamme DESSINÉE, pas des jetons.
//
// Décision de l'auteur, 1er septembre 2026 : « ça doit être plus souple et plus dans
// l'esprit du site ; pourquoi ne pas utiliser le style des cartes de l'accueil ? »
//
// ⛔ AUCUNE TEINTE N'EST INVENTÉE. Les trois cuirs sont pris dans les DEUX gammes
// dessinées que le site possède déjà — les cartons de l'accueil
// (`AccueilCards.tsx`) et les couvertures d'essai (`couverturesEssai.ts`) —, et la
// provenance de chaque valeur est écrite en face d'elle. C'est la règle de la
// charte : sur un site crème et vert d'encre, une teinte étrangère à la gamme fait
// tache, quelle que soit sa beauté.
//
// ⚠️ Le premier essai avait repris les DEUX cartons de l'accueil tels quels, et le
// Cuir l'a démenti : `.ac-bible` y vaut un brun (#4a3d2d) qui ne se distingue plus
// d'un emplacement vide sur le sol brun, et le vieil or y devient un parchemin si
// clair (#bda471) que « L'écrit » paraissait la série la plus précieuse du tableau.
// La gamme de l'accueil n'a été calibrée que pour DEUX cartons côte à côte ; elle ne
// tient pas à six séries. Le Cuir prend donc les TROIS CUIRS PROFONDS des
// couvertures, que la charte a calibrés pour ce cas exact — « ils se séparent par la
// CHROMA (brun neutre, fauve, châtaigne) et non par la clarté, qui les pousserait
// dans la bande médiane, où plus aucune encre ne tient ».
//
// ⛔ Une valeur ne se change pas sans repasser `reliuresHautsFaits.test.ts` : c'est
// le contraste de l'encre sur la teinte HAUTE du dégradé — la plus claire, donc la
// plus faible — qui décide, jamais l'œil seul.

import type { FamilleCorpus } from '@/app/lib/hautsFaits'

/** Un cuir : deux arrêts de dégradé, du plus clair au plus profond. La composition
 *  est celle du carton de l'accueil, à 160 degrés — voir `degradeReliure`. */
export type Cuir = readonly [haut: string, bas: string]

export type Reliure = {
  /** Thème Clair. */
  readonly clair: Cuir
  /** Thème Cuir. ⛔ Jamais dérivé du Clair : une famille transposée se relit dans
   *  son nouveau sol, elle ne se recopie pas (charte, « Le Cuir est MONOCHROME »). */
  readonly sombre: Cuir
}

export const RELIURES: Record<FamilleCorpus, Reliure> = {
  // Maroquin vert — `.ac-bible` de l'accueil, qui est aussi le « vert d'encre » des
  // couvertures d'essai : le site n'a qu'un seul vert de reliure, et c'est celui-là.
  // Cuir : le brun neutre des couvertures (`encre.fondSombre`), le moins chargé des
  // trois, pour la famille qui porte le plus de cases.
  ecriture: { clair: ['#2a3d30', '#1e2e24'], sombre: ['#3b352d', '#2e2a23'] },

  // Maroquin rouge — `.ac-patristique`. La charte le nomme : « la paire d'une
  // bibliothèque ancienne, maroquin vert et maroquin rouge, les deux reliures d'un
  // même ensemble ». Cuir : le châtaigne des couvertures (`sauge.fondSombre`), qui
  // garde le penchant rouge sans en avoir la saturation.
  peres: { clair: ['#5a2a26', '#3e1a17'], sombre: ['#63421f', '#4c3218'] },

  // Vieil or — `or.fond` des couvertures. ⚠️ Ce n'est PAS `--cs-or` (#9a7a38) : la
  // charte a mesuré que l'or du site ne contraste pas assez en aplat, d'où ce vieil
  // or plus profond. Cuir : le fauve des couvertures (`vert.fondSombre`).
  communaute: { clair: ['#664b17', '#4e3811'], sombre: ['#4a3a25', '#3a2d1c'] },
}

/** ⛔ L'encre est un BLANC TRANSPARENT, et c'est la solution de l'accueil pour ces
 *  cuirs mêmes, non un choix neuf. Les couvertures d'essai emploient au contraire
 *  des encres teintées et croisées — mais elles composent une page de titre entière
 *  à 3,3 cqw, quand une case porte deux lignes de 13 px. Le blanc transparent tient
 *  sur les trois cuirs des deux thèmes, ce qu'aucune encre teintée unique ne ferait. */
export const ENCRE_RELIURE = 'rgba(255,255,255,0.92)'
/** La ligne des points, un rang sous le nom. ⚠️ 0,72 et non 0,62 : la charte a déjà
 *  payé ce quart de point sur le sous-titre des cartons de l'accueil. */
export const ENCRE_RELIURE_DOUCE = 'rgba(255,255,255,0.72)'

/** Le filet doré du dernier degré d'une série, comme un dos poussé à l'or. */
export const OR_FLEURON = 'rgba(233,205,148,0.85)'

/** L'angle du dégradé, celui des cartons de l'accueil. */
export const ANGLE_RELIURE = 160

export function degradeReliure(famille: FamilleCorpus, cuir: boolean): string {
  const [haut, bas] = RELIURES[famille][cuir ? 'sombre' : 'clair']
  return `linear-gradient(${ANGLE_RELIURE}deg, ${haut} 0%, ${bas} 100%)`
}

// ── Le contrôle du contraste, partagé avec la garde ───────────────────────────

/** ⚠️ Sur une encre BLANCHE, le pire cas est la teinte la plus CLAIRE du dégradé,
 *  donc son arrêt HAUT. C'est l'inverse des couvertures, dont l'encre est teintée
 *  et dont la charte éprouve la date à 0,78 d'opacité. */
export function teinteLaPlusFaible(famille: FamilleCorpus, cuir: boolean): string {
  return RELIURES[famille][cuir ? 'sombre' : 'clair'][0]
}

function canaux(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`Teinte hors format : ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance(rgb: readonly number[]): number {
  const [r, v, b] = rgb.map(c => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * v + 0.0722 * b
}

/** Le contraste d'une encre blanche posée à `opacite` sur un fond opaque. Le blanc
 *  translucide se COMPOSE d'abord sur son fond : le lire à pleine opacité
 *  surestimerait le rapport, et c'est le défaut que la charte relève déjà sur les
 *  dates des couvertures. */
export function contrasteBlancSur(fond: string, opacite: number): number {
  const f = canaux(fond)
  const compose = f.map(c => 255 * opacite + c * (1 - opacite))
  const [haut, bas] = [luminance(compose), luminance(f)].sort((a, b) => b - a)
  return (haut + 0.05) / (bas + 0.05)
}
