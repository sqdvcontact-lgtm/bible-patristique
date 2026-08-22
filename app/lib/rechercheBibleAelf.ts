import { supabase } from '@/app/lib/supabase'

export type ResultatRechercheBibleAelf = {
  id_verset: string
  ref: string
  livre: string
  chapitre: number
  verset: number
  chapitre_label?: string | null
  verset_label?: string | null
  aelf_version_id?: string | null
  aelf_entry_id?: string | null
  aelf_reference?: string | null
  historical_canon_id?: string | null
  hors_axe_aelf?: boolean
  ordre?: number | null
  relation_kind?: string | null
  validation_status?: string | null
  confidence_level?: string | null
  est_suscription?: boolean
  est_surnumeraire?: boolean
  [key: string]: unknown
}

type ProjectionAelf = {
  source_canon_id: string
  aelf_version_id: string | null
  aelf_entry_id: string | null
  aelf_reference: string | null
  livre: string | null
  chapitre: number | null
  verset: number | null
  chapitre_label: string | null
  verset_label: string | null
  ordre: number | null
  relation_kind: string | null
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

type ExtraAelf = {
  id_verset: string
  historical_canon_id: string | null
  livre: string
  chapitre: number
  verset: number
  chapitre_label: string
  verset_label: string
  ref: string
  est_suscription: boolean
  est_surnumeraire: boolean
  TR0001: string | null
  TR0002: string | null
  TR0003: string | null
  TR0004: string | null
  TR0005: string | null
}

const TRADS = ['TR0001', 'TR0002', 'TR0003', 'TR0004', 'TR0005'] as const
const CANON_ID = /^[A-Z0-9]+\.\d+\.\d+$/

function lots<T>(valeurs: T[], taille: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < valeurs.length; i += taille) out.push(valeurs.slice(i, i + taille))
  return out
}

function cleCoordonnee(v: {
  livre: string
  chapitre: number
  verset: number
  est_suscription?: boolean | null
  est_surnumeraire?: boolean | null
}) {
  return `${v.livre}|${v.chapitre}|${v.verset}|${v.est_suscription === true ? 'S' : v.est_surnumeraire === true ? 'X' : '-'}`
}

async function chargerProjections(ids: string[], signal: AbortSignal): Promise<ProjectionAelf[]> {
  const reponses = await Promise.all(lots([...new Set(ids)], 1000).map(lot =>
    supabase.rpc('bible_search_resolve_aelf', { p_canon_ids: lot }).abortSignal(signal),
  ))
  const out: ProjectionAelf[] = []
  for (const { data, error } of reponses) {
    if (error) throw error
    out.push(...((data ?? []) as ProjectionAelf[]))
  }
  return out
}

async function chargerTextesAelf(entryIds: string[], signal: AbortSignal): Promise<Map<string, Record<string, string>>> {
  const uniques = [...new Set(entryIds)]
  const reponses = await Promise.all(lots(uniques, 1000).map(lot =>
    supabase.rpc('bible_reading_cells_for_aelf_entries', { p_entry_ids: lot }).abortSignal(signal),
  ))
  const cellules: CelluleAelf[] = []
  for (const { data, error } of reponses) {
    if (error) throw error
    cellules.push(...((data ?? []) as CelluleAelf[]))
  }

  // Une traduction peut avoir plusieurs unités natives sur une entrée AELF : on les
  // recompose dans leur ordre natif, sans modifier leur segmentation en base.
  cellules.sort((a, b) => a.aelf_entry_id.localeCompare(b.aelf_entry_id)
    || a.trad_id.localeCompare(b.trad_id)
    || a.ch_orig - b.ch_orig
    || a.v_orig - b.v_orig
    || String(a.v_orig_suffixe ?? '').localeCompare(String(b.v_orig_suffixe ?? ''), 'fr', { numeric: true }))

  const map = new Map<string, Record<string, string>>()
  for (const cellule of cellules) {
    if (!cellule.texte || !TRADS.includes(cellule.trad_id as typeof TRADS[number])) continue
    if (!map.has(cellule.aelf_entry_id)) map.set(cellule.aelf_entry_id, {})
    const textes = map.get(cellule.aelf_entry_id)!
    textes[cellule.trad_id] = textes[cellule.trad_id]
      ? `${textes[cellule.trad_id]} ${cellule.texte}`
      : cellule.texte
  }
  return map
}

async function chargerExtras(livres: string[], signal: AbortSignal): Promise<ExtraAelf[]> {
  if (!livres.length) return []
  const uniques = [...new Set(livres)]
  const select = 'id_verset,historical_canon_id,livre,chapitre,verset,chapitre_label,verset_label,ref,est_suscription,est_surnumeraire,TR0001,TR0002,TR0003,TR0004,TR0005'
  const out: ExtraAelf[] = []
  // La vue compte actuellement 1 159 positions. On pagine pour ne jamais dépendre
  // du plafond PostgREST de 1 000 lignes.
  for (let debut = 0; debut < 4000; debut += 1000) {
    const { data, error } = await supabase.from('v_aelf_bible_lecture_extras')
      .select(select)
      .in('livre', uniques)
      .order('livre')
      .order('chapitre')
      .order('verset')
      .range(debut, debut + 999)
      .abortSignal(signal)
    if (error) throw error
    const lot = (data ?? []) as ExtraAelf[]
    out.push(...lot)
    if (lot.length < 1000) break
  }
  return out
}

function depuisProjection(p: ProjectionAelf, textes: Record<string, string>): ResultatRechercheBibleAelf {
  return {
    id_verset: `AELF:${p.aelf_entry_id}`,
    ref: p.aelf_reference
      ? p.aelf_reference.replace(/^AELF:/, '').replace(':', ' ').replace(':', ':')
      : `${p.livre ?? ''} ${p.chapitre_label ?? p.chapitre ?? ''}:${p.verset_label ?? p.verset ?? ''}`,
    livre: p.livre ?? '',
    chapitre: p.chapitre ?? 0,
    verset: p.verset ?? 0,
    chapitre_label: p.chapitre_label,
    verset_label: p.verset_label,
    aelf_version_id: p.aelf_version_id,
    aelf_entry_id: p.aelf_entry_id,
    aelf_reference: p.aelf_reference,
    historical_canon_id: p.source_canon_id,
    hors_axe_aelf: false,
    ordre: p.ordre,
    relation_kind: p.relation_kind,
    validation_status: p.validation_status,
    confidence_level: p.confidence_level,
    ...textes,
  }
}

function depuisExtra(extra: ExtraAelf, original: ResultatRechercheBibleAelf, statut?: ProjectionAelf): ResultatRechercheBibleAelf {
  const out: ResultatRechercheBibleAelf = {
    ...original,
    id_verset: extra.id_verset,
    ref: extra.ref,
    livre: extra.livre,
    chapitre: extra.chapitre,
    verset: extra.verset,
    chapitre_label: extra.chapitre_label,
    verset_label: extra.verset_label,
    aelf_version_id: null,
    aelf_entry_id: null,
    aelf_reference: null,
    historical_canon_id: extra.historical_canon_id ?? (CANON_ID.test(original.id_verset) ? original.id_verset : null),
    hors_axe_aelf: true,
    relation_kind: statut?.relation_kind ?? null,
    validation_status: statut?.validation_status ?? null,
    confidence_level: statut?.confidence_level ?? null,
    est_suscription: extra.est_suscription,
    est_surnumeraire: extra.est_surnumeraire,
  }
  for (const trad of TRADS) {
    out[trad] = extra[trad]
    out[`num_${trad}`] = extra[trad] ? `${extra.chapitre_label}, ${extra.verset_label}` : null
  }
  return out
}

/**
 * Transforme les hits de l'ancien index de recherche en références de lecture AELF.
 * L'index historique reste un détail d'implémentation performant : il ne décide plus
 * ni de la référence affichée ni de la cible de navigation.
 */
export async function projeterResultatsRechercheBibleAelf(
  lignes: ResultatRechercheBibleAelf[],
  signal: AbortSignal,
): Promise<ResultatRechercheBibleAelf[]> {
  if (!lignes.length) return []

  const projections = await chargerProjections(lignes.map(v => v.id_verset), signal)
  if (signal.aborted) return []

  const parSource = new Map<string, ProjectionAelf[]>()
  for (const p of projections) {
    if (!parSource.has(p.source_canon_id)) parSource.set(p.source_canon_id, [])
    parSource.get(p.source_canon_id)!.push(p)
  }

  const entryIds = projections.flatMap(p => p.aelf_entry_id ? [p.aelf_entry_id] : [])
  const textesParEntree = await chargerTextesAelf(entryIds, signal)
  if (signal.aborted) return []

  const resolus: ResultatRechercheBibleAelf[] = []
  const sansCible: Array<{ ligne: ResultatRechercheBibleAelf; statut?: ProjectionAelf }> = []
  const entreesVues = new Set<string>()

  for (const ligne of lignes) {
    const statut = parSource.get(ligne.id_verset) ?? []
    const cibles = statut.filter(p => p.aelf_entry_id)
    if (!cibles.length) {
      sansCible.push({ ligne, statut: statut[0] })
      continue
    }
    for (const cible of cibles) {
      const entryId = cible.aelf_entry_id as string
      // Plusieurs anciens versets peuvent fusionner vers la même unité AELF : un seul
      // résultat de lecture doit paraître.
      if (entreesVues.has(entryId)) continue
      entreesVues.add(entryId)
      resolus.push(depuisProjection(cible, textesParEntree.get(entryId) ?? {}))
    }
  }

  if (!sansCible.length) return resolus

  const extras = await chargerExtras(sansCible.map(({ ligne }) => ligne.livre), signal)
  if (signal.aborted) return []
  const extrasParCanon = new Map<string, ExtraAelf[]>()
  const extrasParCoord = new Map<string, ExtraAelf[]>()
  for (const e of extras) {
    if (e.historical_canon_id) {
      if (!extrasParCanon.has(e.historical_canon_id)) extrasParCanon.set(e.historical_canon_id, [])
      extrasParCanon.get(e.historical_canon_id)!.push(e)
    }
    const cle = cleCoordonnee(e)
    if (!extrasParCoord.has(cle)) extrasParCoord.set(cle, [])
    extrasParCoord.get(cle)!.push(e)
  }

  const horsAxe: ResultatRechercheBibleAelf[] = []
  for (const { ligne, statut } of sansCible) {
    const parCanon = CANON_ID.test(ligne.id_verset) ? (extrasParCanon.get(ligne.id_verset) ?? []) : []
    const parCoord = extrasParCoord.get(cleCoordonnee(ligne)) ?? []
    const candidats = parCanon.length ? parCanon : parCoord
    if (candidats.length === 1) {
      horsAxe.push(depuisExtra(candidats[0], ligne, statut))
    } else {
      // Cas volontairement non forcé : on garde le hit historique et on mène au
      // chapitre, sans inventer un verset AELF ni choisir arbitrairement un extra.
      horsAxe.push({
        ...ligne,
        chapitre_label: ligne.chapitre_label ?? String(ligne.chapitre),
        verset_label: ligne.verset_label ?? String(ligne.verset),
        aelf_version_id: null,
        aelf_entry_id: null,
        aelf_reference: null,
        historical_canon_id: CANON_ID.test(ligne.id_verset) ? ligne.id_verset : null,
        hors_axe_aelf: true,
        relation_kind: statut?.relation_kind ?? null,
        validation_status: statut?.validation_status ?? null,
        confidence_level: statut?.confidence_level ?? null,
      })
    }
  }

  return [...resolus, ...horsAxe]
}

export function urlResultatRechercheBible(v: ResultatRechercheBibleAelf, traduction: string): string {
  const chapitre = String(v.chapitre_label ?? v.chapitre)
  const verset = String(v.verset_label ?? v.verset)
  const base = `/?livre=${encodeURIComponent(v.livre)}&chapitre=${encodeURIComponent(chapitre)}&trad=${encodeURIComponent(traduction)}`
  const ancre = v.aelf_entry_id
    ? `verset-${v.aelf_entry_id}`
    : v.id_verset.startsWith('EXTRA:')
      ? `verset-${v.id_verset}`
      : null
  return ancre
    ? `${base}&verset=${encodeURIComponent(verset)}#${ancre}`
    : base
}
