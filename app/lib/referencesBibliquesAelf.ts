import { ABREV_FR } from '@/app/lib/bible'

export type ClientLectureBiblique = {
  from: (relation: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => any
}

export type ReferenceBibliqueAelf = {
  id: string
  label: string
  textes: Record<string, string>
  livre: string
  chapitre: string
  chapitreBase: number | null
  verset: string
  natures: string[]
  linkIds: number[]
  aelfVersionId: string | null
  aelfEntryId: string | null
  aelfReference: string | null
  historicalCanonId: string | null
  resolutionStatus: 'resolved' | 'review' | 'legacy_only' | 'chapter_only' | 'unresolved'
  validationStatus: string | null
  confidenceLevel: string | null
}

type LienProjection = {
  id: number
  segment_id: number
  canon_id: string | null
  historical_canon_id: string | null
  livre: string | null
  chapitre: number | null
  type: number
  aelf_version_id: string | null
  aelf_entry_id: string | null
  aelf_external_reference: string | null
  aelf_book_code: string | null
  aelf_chapter_label: string | null
  aelf_chapter_base: number | null
  aelf_verse_label: string | null
  aelf_sequence_no: number | null
  resolution_status: ReferenceBibliqueAelf['resolutionStatus']
  validation_status: string | null
  confidence_level: string | null
}

type CelluleAelf = {
  aelf_entry_id: string
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
}

type CelluleLegacy = {
  canon_id: string | null
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
}

const NATURES_LIEN = ['citation', 'reprise', 'doctrine', 'écho'] as const
const COLS_LIENS = [
  'id','segment_id','canon_id','historical_canon_id','livre','chapitre','type',
  'aelf_version_id','aelf_entry_id','aelf_external_reference','aelf_book_code',
  'aelf_chapter_label','aelf_chapter_base','aelf_verse_label','aelf_sequence_no',
  'resolution_status','validation_status','confidence_level',
].join(',')

const LIVRE_PAR_ABREV = new Map(Object.entries(ABREV_FR).map(([code, abr]) => [abr, code]))

function nettoyerLabel(label: string | null | undefined): string {
  const brut = String(label ?? '')
  const nettoye = brut.replace(/^0+(?=\d)/, '')
  return nettoye || brut
}

function decrireAelf(lien: LienProjection) {
  const parts = lien.aelf_external_reference?.split(':') ?? []
  const abr = parts.length >= 4 ? parts[1] : (lien.aelf_book_code ?? '')
  const chapitre = nettoyerLabel(lien.aelf_chapter_label ?? (parts.length >= 4 ? parts[2] : ''))
  const verset = nettoyerLabel(lien.aelf_verse_label ?? (parts.length >= 4 ? parts[3] : ''))
  const livre = LIVRE_PAR_ABREV.get(abr) ?? lien.historical_canon_id?.split('.')[0] ?? lien.livre ?? abr
  const label = verset ? `${abr} ${chapitre}, ${verset}` : `${abr} ${chapitre}`.trim()
  return { livre, chapitre, verset, label }
}

function decrireCanonHistorique(canonId: string) {
  const [livre = '', chapitre = '', verset = ''] = canonId.split('.')
  const abr = ABREV_FR[livre] ?? livre
  return {
    livre,
    chapitre,
    verset,
    chapitreBase: Number.isFinite(Number(chapitre)) ? Number(chapitre) : null,
    label: verset ? `${abr} ${chapitre}, ${verset}` : `${abr} ${chapitre}`.trim(),
  }
}

function cibleDuLien(lien: LienProjection) {
  if (lien.aelf_entry_id) {
    const d = decrireAelf(lien)
    return {
      cle: `aelf:${lien.aelf_entry_id}`,
      ...d,
      chapitreBase: lien.aelf_chapter_base,
      aelfVersionId: lien.aelf_version_id,
      aelfEntryId: lien.aelf_entry_id,
      aelfReference: lien.aelf_external_reference,
      historicalCanonId: lien.historical_canon_id,
    }
  }
  if (lien.historical_canon_id) {
    const d = decrireCanonHistorique(lien.historical_canon_id)
    return {
      cle: `legacy:${lien.historical_canon_id}`,
      ...d,
      aelfVersionId: lien.aelf_version_id,
      aelfEntryId: null,
      aelfReference: null,
      historicalCanonId: lien.historical_canon_id,
    }
  }
  if (lien.livre && lien.chapitre != null) {
    const abr = ABREV_FR[lien.livre] ?? lien.livre
    return {
      cle: `chapter:${lien.livre}:${lien.chapitre}`,
      livre: lien.livre,
      chapitre: String(lien.chapitre),
      chapitreBase: lien.chapitre,
      verset: '',
      label: `${abr} ${lien.chapitre}`,
      aelfVersionId: lien.aelf_version_id,
      aelfEntryId: null,
      aelfReference: null,
      historicalCanonId: null,
    }
  }
  return null
}

async function chargerLiens(client: ClientLectureBiblique, segmentIds: number[]): Promise<LienProjection[]> {
  const uniques = [...new Set(segmentIds)]
  if (!uniques.length) return []
  const lots: number[][] = []
  for (let i = 0; i < uniques.length; i += 500) lots.push(uniques.slice(i, i + 500))
  const reponses = await Promise.all(lots.map(lot =>
    client.from('v_aelf_biblical_links').select(COLS_LIENS).in('segment_id', lot)))
  const lignes: LienProjection[] = []
  for (const { data, error } of reponses) {
    if (error) throw error
    lignes.push(...((data ?? []) as LienProjection[]))
  }
  return lignes
}

async function chargerCellulesAelf(client: ClientLectureBiblique, entryIds: string[]): Promise<CelluleAelf[]> {
  const uniques = [...new Set(entryIds)]
  if (!uniques.length) return []
  const lots: string[][] = []
  for (let i = 0; i < uniques.length; i += 200) lots.push(uniques.slice(i, i + 200))
  const reponses = await Promise.all(lots.map(lot =>
    client.rpc('bible_reading_cells_for_aelf_entries', { p_entry_ids: lot })))
  const lignes: CelluleAelf[] = []
  for (const { data, error } of reponses) {
    if (error) throw error
    lignes.push(...((data ?? []) as CelluleAelf[]))
  }
  return lignes
}

async function chargerCellulesLegacy(
  client: ClientLectureBiblique,
  canonIds: string[],
  traductions: string[],
): Promise<CelluleLegacy[]> {
  const canons = [...new Set(canonIds)]
  const trads = [...new Set(traductions)]
  if (!canons.length || !trads.length) return []
  const lots: string[][] = []
  for (let i = 0; i < canons.length; i += 200) lots.push(canons.slice(i, i + 200))
  const reponses = await Promise.all(lots.map(lot =>
    client.from('versets_v2')
      .select('canon_id,trad_id,ch_orig,v_orig,v_orig_suffixe,texte')
      .in('canon_id', lot)
      .in('trad_id', trads)))
  const lignes: CelluleLegacy[] = []
  for (const { data, error } of reponses) {
    if (error) throw error
    lignes.push(...((data ?? []) as CelluleLegacy[]))
  }
  return lignes
}

function textesParCibleAelf(cellules: CelluleAelf[], traductions: Set<string>) {
  const map = new Map<string, Record<string, string>>()
  const vus = new Map<string, Map<string, Set<string>>>()
  for (const cellule of cellules) {
    if (!traductions.has(cellule.trad_id) || !cellule.texte) continue
    const parTrad = vus.get(cellule.aelf_entry_id) ?? new Map<string, Set<string>>()
    const textes = parTrad.get(cellule.trad_id) ?? new Set<string>()
    textes.add(cellule.texte)
    parTrad.set(cellule.trad_id, textes)
    vus.set(cellule.aelf_entry_id, parTrad)
  }
  for (const [entryId, parTrad] of vus) {
    const textes: Record<string, string> = {}
    for (const [trad, valeurs] of parTrad) textes[trad] = [...valeurs].join(' ')
    map.set(entryId, textes)
  }
  return map
}

function textesParCanonLegacy(cellules: CelluleLegacy[], traductions: Set<string>) {
  const map = new Map<string, Record<string, string>>()
  const vus = new Map<string, Map<string, Set<string>>>()
  for (const cellule of cellules) {
    if (!cellule.canon_id || !traductions.has(cellule.trad_id) || !cellule.texte) continue
    const parTrad = vus.get(cellule.canon_id) ?? new Map<string, Set<string>>()
    const textes = parTrad.get(cellule.trad_id) ?? new Set<string>()
    textes.add(cellule.texte)
    parTrad.set(cellule.trad_id, textes)
    vus.set(cellule.canon_id, parTrad)
  }
  for (const [canonId, parTrad] of vus) {
    const textes: Record<string, string> = {}
    for (const [trad, valeurs] of parTrad) textes[trad] = [...valeurs].join(' ')
    map.set(canonId, textes)
  }
  return map
}

/**
 * Construit les références bibliques affichables d'un lot de segments.
 *
 * - l'identité de lecture est l'entrée AELF quand elle existe ;
 * - un lien `legacy_only` conserve sa référence historique sans cible AELF fictive ;
 * - un lien de chapitre reste un lien de chapitre ;
 * - les natures et les ids de liens sont agrégés sans modifier `liens_bibliques`.
 */
export async function referencesBibliquesAelfParSegment(
  client: ClientLectureBiblique,
  segmentIds: number[],
  traductions: string[],
): Promise<Map<number, ReferenceBibliqueAelf[]>> {
  const liens = await chargerLiens(client, segmentIds)
  const entries = liens.flatMap(l => l.aelf_entry_id ? [l.aelf_entry_id] : [])
  const legacy = liens.flatMap(l => !l.aelf_entry_id && l.historical_canon_id ? [l.historical_canon_id] : [])
  const [cellulesAelf, cellulesLegacy] = await Promise.all([
    chargerCellulesAelf(client, entries),
    chargerCellulesLegacy(client, legacy, traductions),
  ])
  const trads = new Set(traductions)
  const textesAelf = textesParCibleAelf(cellulesAelf, trads)
  const textesLegacy = textesParCanonLegacy(cellulesLegacy, trads)

  const groupes = new Map<number, Map<string, ReferenceBibliqueAelf>>()
  for (const lien of liens) {
    const cible = cibleDuLien(lien)
    if (!cible) continue
    const parCible = groupes.get(lien.segment_id) ?? new Map<string, ReferenceBibliqueAelf>()
    const existante = parCible.get(cible.cle)
    const nature = NATURES_LIEN[lien.type - 1] ?? `type ${lien.type}`
    if (existante) {
      if (!existante.linkIds.includes(lien.id)) existante.linkIds.push(lien.id)
      if (!existante.natures.includes(nature)) existante.natures.push(nature)
      if (existante.resolutionStatus === 'resolved' && lien.resolution_status !== 'resolved') {
        existante.resolutionStatus = lien.resolution_status
      }
      parCible.set(cible.cle, existante)
    } else {
      const textes = cible.aelfEntryId
        ? (textesAelf.get(cible.aelfEntryId) ?? {})
        : cible.historicalCanonId
          ? (textesLegacy.get(cible.historicalCanonId) ?? {})
          : {}
      parCible.set(cible.cle, {
        id: cible.aelfReference ?? cible.historicalCanonId ?? cible.cle,
        label: cible.label,
        textes,
        livre: cible.livre,
        chapitre: cible.chapitre,
        chapitreBase: cible.chapitreBase,
        verset: cible.verset,
        natures: [nature],
        linkIds: [lien.id],
        aelfVersionId: cible.aelfVersionId,
        aelfEntryId: cible.aelfEntryId,
        aelfReference: cible.aelfReference,
        historicalCanonId: cible.historicalCanonId,
        resolutionStatus: lien.resolution_status,
        validationStatus: lien.validation_status,
        confidenceLevel: lien.confidence_level,
      })
    }
    groupes.set(lien.segment_id, parCible)
  }

  const resultat = new Map<number, ReferenceBibliqueAelf[]>()
  for (const [segmentId, parCible] of groupes) {
    resultat.set(segmentId, [...parCible.values()].sort((a, b) => {
      const la = liens.find(l => l.segment_id === segmentId && a.linkIds.includes(l.id))
      const lb = liens.find(l => l.segment_id === segmentId && b.linkIds.includes(l.id))
      return (la?.aelf_sequence_no ?? Number.MAX_SAFE_INTEGER) - (lb?.aelf_sequence_no ?? Number.MAX_SAFE_INTEGER)
        || a.label.localeCompare(b.label, 'fr')
    }))
  }
  return resultat
}
