import { supabase } from '@/app/lib/supabase'

export const TRADUCTIONS_PRELEVEMENTS_AELF = ['TR0001', 'TR0002', 'TR0003', 'TR0004', 'TR0005'] as const
export type TraductionPrelevementAelf = typeof TRADUCTIONS_PRELEVEMENTS_AELF[number]

export type PrelevementBibliqueAelf = {
  id: string
  aelf_version_id?: string | null
  aelf_entry_id?: string | null
  aelf_reference?: string | null
  ref_livre?: string | null
  ref_livre_abr?: string | null
  ref_chapitre?: number | null
  ref_verset?: number | null
  ref_chapitre_label?: string | null
  ref_verset_label?: string | null
}

type CelluleLectureAelf = {
  id: string
  aelf_entry_id: string
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
}

function lots<T>(valeurs: T[], taille = 1000): T[][] {
  const out: T[][] = []
  for (let i = 0; i < valeurs.length; i += taille) out.push(valeurs.slice(i, i + taille))
  return out
}

/**
 * Recharge le texte d'une sélection biblique à partir de son entrée AELF exacte.
 * Une traduction peut fournir plusieurs unités natives à une même entrée : elles sont
 * recomposées dans leur ordre natif, sans modifier leur segmentation en base.
 */
export async function chargerTextesPrelevementsAelf(
  entryIds: string[],
): Promise<Map<string, Record<string, string>>> {
  const uniques = [...new Set(entryIds.filter(Boolean))]
  if (!uniques.length) return new Map()

  const reponses = await Promise.all(lots(uniques).map(lot =>
    supabase.rpc('bible_reading_cells_for_aelf_entries', { p_entry_ids: lot }),
  ))

  const cellules: CelluleLectureAelf[] = []
  for (const { data, error } of reponses) {
    if (error) throw error
    cellules.push(...((data ?? []) as CelluleLectureAelf[]))
  }

  cellules.sort((a, b) =>
    a.aelf_entry_id.localeCompare(b.aelf_entry_id)
    || a.trad_id.localeCompare(b.trad_id)
    || a.ch_orig - b.ch_orig
    || a.v_orig - b.v_orig
    || String(a.v_orig_suffixe ?? '').localeCompare(String(b.v_orig_suffixe ?? ''), 'fr', { numeric: true })
    || a.id.localeCompare(b.id)
  )

  const map = new Map<string, Record<string, string>>()
  for (const cellule of cellules) {
    if (!cellule.texte || !TRADUCTIONS_PRELEVEMENTS_AELF.includes(cellule.trad_id as TraductionPrelevementAelf)) continue
    if (!map.has(cellule.aelf_entry_id)) map.set(cellule.aelf_entry_id, {})
    const textes = map.get(cellule.aelf_entry_id)!
    textes[cellule.trad_id] = textes[cellule.trad_id]
      ? `${textes[cellule.trad_id]} ${cellule.texte}`
      : cellule.texte
  }
  return map
}

export function chapitreLabelPrelevement(p: PrelevementBibliqueAelf): string {
  return p.ref_chapitre_label ?? String(p.ref_chapitre ?? '')
}

export function versetLabelPrelevement(p: PrelevementBibliqueAelf): string {
  return p.ref_verset_label ?? String(p.ref_verset ?? '')
}
