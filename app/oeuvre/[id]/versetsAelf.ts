import { ABREV_FR } from '@/app/lib/bible'
import { cellulesLectureAelf, liensAelfDeSegments, type LienAelf } from '@/app/lib/liens'
import type { VRef } from './oeuvreTypes'

type ClientLecture = {
  from: (table: string) => any
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>
}

type VRefAvecNature = VRef & { natures: string[] }

type CelluleHistorique = {
  id: string
  historical_canon_id: string
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
}

const NATURE_LIEN: Record<number, string> = {
  1: 'citation',
  2: 'reprise',
  3: 'doctrine',
  4: 'écho',
}

function nettoyerLabel(label: string | null | undefined): string {
  if (!label) return ''
  return label.replace(/^0+(?=\d)/, '')
}

function labelAelf(livre: string, chapitre: string, verset: string): string {
  const abr = ABREV_FR[livre] ?? livre
  return verset ? `${abr} ${nettoyerLabel(chapitre)}, ${nettoyerLabel(verset)}` : `${abr} ${nettoyerLabel(chapitre)}`
}

function detailsCanonHistorique(canonId: string): { label: string; livre: string; chapitre: string; verset: string } {
  const [livre = '', chapitre = '', verset = ''] = canonId.split('.')
  return {
    label: labelAelf(livre, chapitre, verset),
    livre,
    chapitre,
    verset,
  }
}

function statutGroupe(liens: readonly LienAelf[]): VRef['resolutionStatus'] {
  if (liens.some(l => l.resolution_status === 'review')) return 'review'
  if (liens.some(l => l.resolution_status === 'resolved')) return 'resolved'
  if (liens.some(l => l.resolution_status === 'legacy_only')) return 'legacy_only'
  if (liens.some(l => l.resolution_status === 'chapter_only')) return 'chapter_only'
  return 'unresolved'
}

function valeurUnique(liens: readonly LienAelf[], cle: 'historical_canon_id' | 'validation_status' | 'confidence_level'): string | null {
  const valeurs = [...new Set(liens.map(l => l[cle]).filter((v): v is string => Boolean(v)))]
  return valeurs.length === 1 ? valeurs[0] : null
}

async function cellulesHistoriques(client: ClientLecture, canonIds: string[]): Promise<CelluleHistorique[]> {
  if (!canonIds.length) return []
  const { data, error } = await client.rpc('bible_reading_cells_for_historical_canons', { p_canon_ids: [...new Set(canonIds)] })
  if (error) throw new Error(`Lecture biblique historique indisponible : ${error.message}`)
  return (data ?? []) as CelluleHistorique[]
}

/**
 * Construit l'apparat biblique d'un lot de segments sans passer par `versets_lecture`.
 * - AELF porte l'identité et le libellé de lecture ;
 * - les traductions conservent leur segmentation native ;
 * - legacy_only reste une référence historique autonome, sans cible AELF inventée ;
 * - les liens chapter_only/unresolved ne deviennent pas de faux boutons de verset.
 */
export async function chargerVersetsAelfSegments(
  client: ClientLecture,
  segmentIds: number[],
  codesTraductions: string[],
): Promise<Map<number, VRefAvecNature[]>> {
  const resultat = new Map<number, VRefAvecNature[]>()
  if (!segmentIds.length) return resultat

  const liensParSegment = await liensAelfDeSegments(segmentIds, client)
  const entryIds = [...new Set(
    [...liensParSegment.values()].flat().map(l => l.aelf_entry_id).filter((v): v is string => Boolean(v)),
  )]
  const canonsLegacyOnly = [...new Set(
    [...liensParSegment.values()].flat()
      .filter(l => l.resolution_status === 'legacy_only' && l.historical_canon_id)
      .map(l => l.historical_canon_id as string),
  )]

  const [cellulesAelf, cellulesLegacy] = await Promise.all([
    cellulesLectureAelf(entryIds, client),
    cellulesHistoriques(client, canonsLegacyOnly),
  ])

  const textesAelf = new Map<string, Record<string, string>>()
  for (const c of cellulesAelf) {
    if (!codesTraductions.includes(c.trad_id)) continue
    const cle = c.aelf_entry_id
    if (!textesAelf.has(cle)) textesAelf.set(cle, {})
    const actuels = textesAelf.get(cle)!
    if (c.texte) actuels[c.trad_id] = actuels[c.trad_id] ? `${actuels[c.trad_id]} ${c.texte}` : c.texte
  }

  const textesLegacy = new Map<string, Record<string, string>>()
  for (const c of cellulesLegacy) {
    if (!codesTraductions.includes(c.trad_id)) continue
    if (!textesLegacy.has(c.historical_canon_id)) textesLegacy.set(c.historical_canon_id, {})
    const actuels = textesLegacy.get(c.historical_canon_id)!
    if (c.texte) actuels[c.trad_id] = actuels[c.trad_id] ? `${actuels[c.trad_id]} ${c.texte}` : c.texte
  }

  for (const segmentId of segmentIds) {
    const liens = liensParSegment.get(segmentId) ?? []
    const parEntree = new Map<string, LienAelf[]>()
    const legacyOnly = new Map<string, LienAelf[]>()

    for (const lien of liens) {
      if (lien.aelf_entry_id) {
        if (!parEntree.has(lien.aelf_entry_id)) parEntree.set(lien.aelf_entry_id, [])
        parEntree.get(lien.aelf_entry_id)!.push(lien)
      } else if (lien.resolution_status === 'legacy_only' && lien.historical_canon_id) {
        if (!legacyOnly.has(lien.historical_canon_id)) legacyOnly.set(lien.historical_canon_id, [])
        legacyOnly.get(lien.historical_canon_id)!.push(lien)
      }
    }

    const refs: VRefAvecNature[] = []
    for (const [entryId, groupe] of parEntree) {
      const premier = groupe[0]
      const livre = premier.aelf_book_code ?? ''
      const chapitre = nettoyerLabel(premier.aelf_chapter_label)
      const verset = nettoyerLabel(premier.aelf_verse_label)
      refs.push({
        id: `AELF:${entryId}`,
        label: labelAelf(livre, chapitre, verset),
        textes: textesAelf.get(entryId) ?? {},
        livre,
        chapitre,
        verset,
        aelfVersionId: (premier as LienAelf & { aelf_version_id?: string | null }).aelf_version_id ?? null,
        aelfEntryId: entryId,
        historicalCanonId: valeurUnique(groupe, 'historical_canon_id'),
        resolutionStatus: statutGroupe(groupe),
        validationStatus: valeurUnique(groupe, 'validation_status'),
        confidenceLevel: valeurUnique(groupe, 'confidence_level'),
        natures: [...new Set(groupe.map(l => NATURE_LIEN[l.type]).filter(Boolean))],
      })
    }

    for (const [canonId, groupe] of legacyOnly) {
      const ref = detailsCanonHistorique(canonId)
      refs.push({
        id: `LEGACY:${canonId}`,
        ...ref,
        textes: textesLegacy.get(canonId) ?? {},
        aelfVersionId: null,
        aelfEntryId: null,
        historicalCanonId: canonId,
        resolutionStatus: 'legacy_only',
        validationStatus: valeurUnique(groupe, 'validation_status'),
        confidenceLevel: valeurUnique(groupe, 'confidence_level'),
        natures: [...new Set(groupe.map(l => NATURE_LIEN[l.type]).filter(Boolean))],
      })
    }

    refs.sort((a, b) => {
      const la = liens.find(l => l.aelf_entry_id === a.aelfEntryId)?.aelf_sequence_no ?? Number.MAX_SAFE_INTEGER
      const lb = liens.find(l => l.aelf_entry_id === b.aelfEntryId)?.aelf_sequence_no ?? Number.MAX_SAFE_INTEGER
      return la - lb || a.label.localeCompare(b.label, 'fr')
    })
    resultat.set(segmentId, refs)
  }

  return resultat
}
