export type GroupeOriginalRow = {
  alignment_id: string
  metadata: Record<string, unknown> | null
}

export type MembreOriginalRow = {
  alignment_id: string
  segment_key: string
  member_order: number
}

export type OriginalAligne = {
  alignmentId: string
  texte: string
  ordreMembre: number
}

export type IndexOriginalAligne = Record<string, OriginalAligne>

/** Projette le latin déjà conservé par l'alignement sémantique sur chacune des
 *  clés de segments de la traduction. Aucune donnée source n'est réécrite. */
export function construireIndexOriginal(
  groupes: GroupeOriginalRow[],
  membres: MembreOriginalRow[],
): IndexOriginalAligne {
  const texteParAlignement = new Map<string, string>()
  for (const groupe of groupes) {
    const latin = groupe.metadata?.latin_text
    if (typeof latin === 'string' && latin.trim()) texteParAlignement.set(groupe.alignment_id, latin.trim())
  }

  const index: IndexOriginalAligne = {}
  for (const membre of membres) {
    const texte = texteParAlignement.get(membre.alignment_id)
    if (!texte) continue
    index[membre.segment_key] = {
      alignmentId: membre.alignment_id,
      texte,
      ordreMembre: membre.member_order,
    }
  }
  return index
}

/** En lecture bilingue, les groupes sémantiques 1:n remplacent les paragraphes
 *  forcés. Les passages non alignés conservent leur regroupement éditorial. */
export function blocsSelonOriginal(
  itemIds: number[],
  source: Map<number, { segmentKey?: string | null; paragraphe?: number | null }>,
  index: IndexOriginalAligne,
): { ids: number[] }[] {
  const blocs: { cle: string; ids: number[] }[] = []
  for (const sid of itemIds) {
    const segment = source.get(sid)
    const original = segment?.segmentKey ? index[segment.segmentKey] : undefined
    const cle = original
      ? `alignement:${original.alignmentId}`
      : segment?.paragraphe != null ? `paragraphe:${segment.paragraphe}` : `segment:${sid}`
    const dernier = blocs[blocs.length - 1]
    if (dernier?.cle === cle) dernier.ids.push(sid)
    else blocs.push({ cle, ids: [sid] })
  }
  return blocs.map(({ ids }) => ({ ids }))
}
