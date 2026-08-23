// Règles communes aux deux frises (générale et par auteur).
//
// Sources de dates : la RPC `rechercher_frise_v2` et la vue
// `v_chronologie_auteurs_dates`.
// Ne jamais interroger `evenements` ni `auteurs_evenements` depuis le site :
// les vues portent déjà l'ordre éditorial (`ordre_affichage`), la date rédigée
// (`date_affichage`), la géographie de filtrage et les sources. Elles sont en
// lecture seule.

// ── Lignes des vues ────────────────────────────────────────────────────────
export type RangFrise = {
  id: string
  date_debut: number | null
  date_fin: number | null
  date_affichage: string
  date_precision_affichage: string | null
  qualification_date: string | null
  titre: string
  notice: string | null
  lieu: string | null
  famille: string | null
  famille_id: number | null
  genre: string | null
  genre_id: string | null
  importance_code: string | null
  importance_ordre: number | null
  zone_geographique: string | null
  pays: string | null
  region: string | null
  ville: string | null
  pays_filtre_codes: string[] | null
  pays_filtres: string[] | null
  source_principale: string | null
  source_secondaire: string | null
  note_datation: string | null
  ordre_affichage: number
}

export type RangChrono = {
  association_id: number
  auteur_id: string
  evenement_id: string
  date_debut: number | null
  date_fin: number | null
  date_affichage_courte: string
  date_precision_affichage: string | null
  date_exacte: string | null
  qualification_date: string | null
  titre: string
  notice: string | null
  lieu: string | null
  famille: string | null
  genre: string | null
  nature_lien: string | null
  justification: string | null
  type_affichage: string | null
  zone_geographique: string | null
  pays: string | null
  region: string | null
  ville: string | null
  source_principale: string | null
  source_secondaire: string | null
  source_lien: string | null
  note_datation: string | null
  position_relative: string | null
  est_hors_vie: boolean | null
  ordre_affichage: number
}

export type RangFriseDates = Pick<
  RangFrise,
  'id' | 'date_affichage' | 'date_precision_affichage' | 'qualification_date' | 'note_datation'
>

/** La RPC v2 est canonique pour les textes de date ; la vue conserve les champs
 * riches nécessaires aux filtres, à la géographie et aux sources. */
export function fusionnerDatesFrise(rangs: RangFrise[], dates: RangFriseDates[]): RangFrise[] {
  const datesParId = new Map(dates.map(date => [date.id, date]))
  return rangs.map(rang => {
    const date = datesParId.get(rang.id)
    return date ? { ...rang, ...date } : rang
  })
}

// ── Familles : teintes sobres, légèrement désaturées ───────────────────────
export const COUL_FAMILLE: Record<string, string> = {
  'Vie des auteurs': 'var(--cs-vert)',
  'Textes et doctrine': '#6d7d43',
  'Église et vie religieuse': '#c79a3a',
  'Pouvoirs, conflits et ruptures': '#b54d3f',
  'Culture et contexte': '#746187',
}
export const coulFamille = (f?: string | null) => (f && COUL_FAMILLE[f]) || 'var(--cs-texte-gris)'

// ── Importance : quatre degrés, du plus fort au plus discret ───────────────
export type Densite = 'essentiel' | 'etendu' | 'complet'

// Rangs croissants : plus le rang est bas, plus l'événement est structurant.
const RANG_IMPORTANCE: Record<string, number> = {
  rupture: 0,
  structurant: 1,
  majeur: 2,
  'complémentaire': 3,
}
export const rangImportance = (code?: string | null): number =>
  (code ? RANG_IMPORTANCE[code] : undefined) ?? RANG_IMPORTANCE['complémentaire']

// Seuil retenu par densité. Le mode complet n'exclut rien.
const SEUIL_DENSITE: Record<Densite, number> = { essentiel: 1, etendu: 2, complet: 3 }
export const passeDensite = (code: string | null | undefined, d: Densite) =>
  rangImportance(code) <= SEUIL_DENSITE[d]

export const DENSITES: { cle: Densite; label: string }[] = [
  { cle: 'essentiel', label: 'Essentiel' },
  { cle: 'etendu', label: 'Étendu' },
  { cle: 'complet', label: 'Complet' },
]

// Une rupture porte un marqueur plus large et un titre plus appuyé.
export const poidsTitre = (code?: string | null) => (rangImportance(code) <= 1 ? 600 : 400)
export const taillePuce = (code?: string | null) => {
  switch (rangImportance(code)) {
    case 0: return '0.95em'
    case 1: return '0.82em'
    case 2: return '0.72em'
    default: return '0.6em'
  }
}

// ── Types d'événement dans une chronologie d'auteur ────────────────────────
// Une seule frise, trois nuances discrètes : la lecture doit rester homogène.
export const COUL_TYPE: Record<string, string> = {
  vie: 'var(--cs-vert)',
  'œuvre': '#83a06a',
  contexte: '#c19a3e',
  // Chronologie d'une TRADUCTION : quatre nuances discrètes (pas de couleurs vives).
  formation: 'var(--cs-vert)',
  edition: '#8a7440',
  reception: '#83a06a',
}
export const coulType = (t?: string | null) => (t && COUL_TYPE[t]) || 'var(--cs-texte-gris)'

export const LIB_TYPE: Record<string, string> = {
  vie: 'Vie',
  'œuvre': 'Œuvre',
  contexte: 'Contexte',
  formation: 'Formation',
  edition: 'Édition',
  reception: 'Réception',
}

// ── Sources : jamais d'URL brute dans le corps de la carte ─────────────────
/** Libellé lisible d'une source : nom de domaine, sans « www. ». Une source
 *  qui n'est pas une URL est rendue telle quelle. */
export function libelleSource(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const v = valeur.trim()
  if (!v) return null
  if (!/^https?:\/\//i.test(v)) return v
  try {
    return new URL(v).hostname.replace(/^www\./, '')
  } catch {
    return v
  }
}
export const estUrl = (v: string | null | undefined) => !!v && /^https?:\/\//i.test(v.trim())

// ── Repères de siècle ──────────────────────────────────────────────────────
/** Siècle d'une année (négatif avant notre ère). */
export const siecleDe = (annee: number | null): number | null =>
  annee == null ? null : annee > 0 ? Math.ceil(annee / 100) : -Math.ceil(-annee / 100)
