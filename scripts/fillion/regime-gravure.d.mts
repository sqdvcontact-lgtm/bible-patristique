// Déclarations de `regime-gravure.mjs` pour les scripts TypeScript de l'atelier
// (`auditer-illustrations.mts`). ⛔ Le module reste du JavaScript pur : la chaîne
// d'image et les scripts de charge l'importent sans compilation. Ce fichier ne
// porte que ses signatures ; la règle vit dans le `.mjs`.

export type RegimeGravure = 'vignette' | 'au-fil' | 'hors-texte'

export type DecoupeGravure = {
  normalized?: unknown
  left?: unknown
  right?: unknown
  page_width_px?: unknown
} | null | undefined

export const REGIMES: readonly RegimeGravure[]
export const LARGEUR_DEUX_COLONNES: number
export const PLANCHER_ILLUSTRATION: number
export const PLAFOND_ILLUSTRATION: number
export const PLAFOND_VIGNETTE: number
export const MESURE_COLONNE: number

export function largeurImprimee(decoupe: DecoupeGravure, metadata?: unknown): number | null
export function estPhotographie(legende: string | null | undefined): boolean
export function regimeForce(metadata: unknown): RegimeGravure | null
export function regimeGravure(actif: { assetKind: string; decoupe: DecoupeGravure; legende?: string | null; metadata?: unknown }): RegimeGravure
export function regimeDuProfil(profil: string | null | undefined): RegimeGravure | null
export function partColonne(regime: RegimeGravure, largeur: number | null | undefined): number
export function largeurAServir(part: number): number
export function regimeEtPart(actif: { assetKind: string; decoupe: DecoupeGravure; legende?: string | null; metadata?: unknown }): { regime: RegimeGravure; part_colonne: number }
