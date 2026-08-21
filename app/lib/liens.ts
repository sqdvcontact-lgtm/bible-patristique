// Accès aux liens bibliques — source unique pour tout le site.
//
// Les liens vivaient dans quatre colonnes texte de `segments` (lien_1 … lien_4),
// où l'on entassait des id de versets séparés par des virgules. Trois défauts :
// aucune intégrité (un id supprimé du canon restait là sans que rien ne le signale),
// une seule fiabilité pour tout le segment, et une recherche inverse en
// `ilike '%GEN.1.1%'` — qui parcourt 136 770 lignes et attrape GEN.1.10 à GEN.1.19
// au passage.
//
// Ils vivent maintenant dans `liens_bibliques`, une ligne par lien, avec clés
// étrangères et index. LES QUATRE TYPES SONT CONSERVÉS À L'IDENTIQUE (charte §9) —
// c'est leur portage qui change, pas la distinction éditoriale.
import { supabase } from '@/app/lib/supabase'
import { ABREV_FR } from '@/app/lib/bible'

export type TypeLien = 1 | 2 | 3 | 4

/** Les quatre types de la charte §9.1 à §9.4, inchangés. */
export const TYPES_LIEN: Record<TypeLien, { cle: string; libelle: string; description: string }> = {
  1: { cle: 'citation',   libelle: 'Citation',   description: 'Citation exacte de l’Écriture' },
  2: { cle: 'fondu',      libelle: 'Reprise',    description: 'Texte biblique fondu dans le discours de l’auteur' },
  3: { cle: 'doctrinal',  libelle: 'Doctrine',   description: 'Commentaire doctrinal du passage' },
  4: { cle: 'thematique', libelle: 'Écho',       description: 'Écho thématique' },
}

export type Fiabilite = 'à constituer' | 'douteux' | 'probable' | 'vérifié'
export const FIABILITES: Fiabilite[] = ['à constituer', 'douteux', 'probable', 'vérifié']

export type Lien = {
  id: number
  segment_id: number
  canon_id: string | null
  verset_v2_id: string | null
  livre: string | null
  chapitre: number | null
  type: TypeLien
  fiabilite: Fiabilite
  motif: string | null
  provenance: 'ia' | 'editeur' | null
  arbitrage_requis: boolean
}

const COLS = 'id, segment_id, canon_id, verset_v2_id, livre, chapitre, type, fiabilite, motif, provenance, arbitrage_requis'

/** Tous les liens d'un lot de segments, groupés par segment puis par type.
 *  Une seule requête, quel que soit le nombre de segments. */
export async function liensDeSegments(segmentIds: number[]): Promise<Map<number, Lien[]>> {
  const parSegment = new Map<number, Lien[]>()
  if (!segmentIds.length) return parSegment
  // Par paquets (une clause `in` trop longue dépasse la limite d'URL), mais tirés
  // EN PARALLÈLE : les grosses œuvres (milliers de segments) enchaînaient sinon
  // une dizaine d'allers-retours séquentiels rien que pour les liens.
  const lots: number[][] = []
  for (let i = 0; i < segmentIds.length; i += 500) lots.push(segmentIds.slice(i, i + 500))
  const resultats = await Promise.all(lots.map(lot =>
    supabase.from('liens_bibliques').select(COLS).in('segment_id', lot)))
  for (const { data, error } of resultats) {
    if (error) throw error
    for (const l of (data ?? []) as Lien[]) {
      if (!parSegment.has(l.segment_id)) parSegment.set(l.segment_id, [])
      parSegment.get(l.segment_id)!.push(l)
    }
  }
  for (const arr of parSegment.values()) arr.sort((a, b) => a.type - b.type)
  return parSegment
}

/** Même chose, avec un client fourni — pour le rendu serveur, qui a le sien. */
async function liensParClient(client: { from: (t: string) => any }, segmentIds: number[]): Promise<Map<number, Lien[]>> {
  const parSegment = new Map<number, Lien[]>()
  if (!segmentIds.length) return parSegment
  const lots: number[][] = []
  for (let i = 0; i < segmentIds.length; i += 500) lots.push(segmentIds.slice(i, i + 500))
  const resultats = await Promise.all(lots.map(lot =>
    client.from('liens_bibliques').select(COLS).in('segment_id', lot)))
  for (const { data, error } of resultats) {
    if (error) throw error
    for (const l of (data ?? []) as Lien[]) {
      if (!parSegment.has(l.segment_id)) parSegment.set(l.segment_id, [])
      parSegment.get(l.segment_id)!.push(l)
    }
  }
  for (const arr of parSegment.values()) arr.sort((a, b) => a.type - b.type)
  return parSegment
}

export type LienAelf = Lien & {
  historical_canon_id: string | null
  aelf_version_id: string | null
  aelf_entry_id: string | null
  aelf_external_reference: string | null
  aelf_book_code: string | null
  aelf_chapter_label: string | null
  aelf_verse_label: string | null
  aelf_sequence_no: number | null
  resolution_status: 'resolved' | 'review' | 'legacy_only' | 'chapter_only' | 'unresolved'
  relation_kind: string | null
  validation_status: string | null
  confidence_level: string | null
}

const COLS_AELF = `${COLS}, historical_canon_id, aelf_version_id, aelf_entry_id, aelf_external_reference, aelf_book_code, aelf_chapter_label, aelf_verse_label, aelf_sequence_no, resolution_status, relation_kind, validation_status, confidence_level`

/** Projection AELF des liens d'un lot de segments. Filtrer par segment_id est indexé ;
 *  le résolveur n'est appelé que pour les liens des segments demandés. */
export async function liensAelfDeSegments(
  segmentIds: number[],
  client: { from: (t: string) => any } = supabase,
): Promise<Map<number, LienAelf[]>> {
  const parSegment = new Map<number, LienAelf[]>()
  if (!segmentIds.length) return parSegment
  const lots: number[][] = []
  for (let i = 0; i < segmentIds.length; i += 500) lots.push(segmentIds.slice(i, i + 500))
  const resultats = await Promise.all(lots.map(lot =>
    client.from('v_aelf_biblical_links').select(COLS_AELF).in('segment_id', lot)))
  for (const { data, error } of resultats) {
    if (error) throw error
    for (const l of (data ?? []) as LienAelf[]) {
      if (!parSegment.has(l.segment_id)) parSegment.set(l.segment_id, [])
      parSegment.get(l.segment_id)!.push(l)
    }
  }
  for (const arr of parSegment.values()) arr.sort((a, b) => a.type - b.type || (a.aelf_sequence_no ?? Number.MAX_SAFE_INTEGER) - (b.aelf_sequence_no ?? Number.MAX_SAFE_INTEGER))
  return parSegment
}

/** Recherche inverse depuis UNE entrée de la spine AELF. */
export async function segmentsLiesAEntreeAelf(entryId: string): Promise<LienAelf[]> {
  const { data, error } = await supabase.rpc('bible_links_for_aelf_entry', { p_entry_id: entryId })
  if (error) throw error
  return (data ?? []) as LienAelf[]
}

/** Apparat d'un chapitre AELF. La RPC conserve aussi les livres historiques sans
 *  entrée autonome dans la spine (par ex. SUS/BEL) via leur référence ancienne. */
export async function segmentsLiesAuChapitreAelf(livre: string, chapitre: number): Promise<LienAelf[]> {
  const { data, error } = await supabase.rpc('bible_links_for_aelf_chapter', { p_book_code: livre, p_chapter_base: chapitre })
  if (error) throw error
  return (data ?? []) as LienAelf[]
}

export type CelluleLectureAelf = {
  id: string
  aelf_entry_id: string
  aelf_external_reference: string
  aelf_book_code: string
  aelf_chapter_label: string
  aelf_verse_label: string
  aelf_sequence_no: number
  historical_canon_id: string | null
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
  mapping_relation_kind: string
  mapping_validation_status: string
  mapping_confidence_level: string
  mapping_source: string
}

/** Textes publics TR0001–TR0005 pour des cibles AELF précises. La RPC est conçue
 *  pour les lots et ne peut jamais exposer TR0012. */
export async function cellulesLectureAelf(
  entryIds: string[],
  client: { rpc: (fn: string, args: Record<string, unknown>) => any } = supabase,
): Promise<CelluleLectureAelf[]> {
  if (!entryIds.length) return []
  const uniques = [...new Set(entryIds)]
  const lots: string[][] = []
  for (let i = 0; i < uniques.length; i += 200) lots.push(uniques.slice(i, i + 200))
  const resultats = await Promise.all(lots.map(lot => client.rpc('bible_reading_cells_for_aelf_entries', { p_entry_ids: lot })))
  const out: CelluleLectureAelf[] = []
  for (const { data, error } of resultats) {
    if (error) throw error
    out.push(...((data ?? []) as CelluleLectureAelf[]))
  }
  return out
}

export type ReferenceBibliqueAelf = {
  id: string
  label: string
  textes: Record<string, string>
  livre: string
  chapitre: string
  verset: string
  aelfVersionId: string | null
  aelfEntryId: string | null
  aelfReference: string | null
  historicalCanonId: string | null
  resolutionStatus: LienAelf['resolution_status']
  validationStatus: string | null
  confidenceLevel: string | null
  linkIds: number[]
  natures: string[]
  ordreAelf: number | null
}

const NATURE_LIEN_AELF: Record<TypeLien, string> = {
  1: 'citation',
  2: 'reprise',
  3: 'doctrine',
  4: 'écho',
}

function labelNumeriqueAelf(value: string | null | undefined): string {
  const v = String(value ?? '')
  return /^0+\d+$/.test(v) ? String(Number(v)) : v
}

/** Construit les cartes de versets affichées dans les œuvres patristiques.
 * L'axe normal est AELF ; les rares legacy_only sont lus dans la vue d'extras,
 * jamais forcés sur une entrée AELF. */
export async function referencesBibliquesAelfDeSegments(
  segmentIds: number[],
  codesTraductions: string[],
  client: { from: (t: string) => any; rpc: (fn: string, args: Record<string, unknown>) => any } = supabase,
): Promise<Map<number, ReferenceBibliqueAelf[]>> {
  const sortie = new Map<number, ReferenceBibliqueAelf[]>()
  if (!segmentIds.length) return sortie

  const liensParSegment = await liensAelfDeSegments(segmentIds, client)
  const tousLiens = [...liensParSegment.values()].flat()
  const entryIds = [...new Set(tousLiens.map(l => l.aelf_entry_id).filter((v): v is string => Boolean(v)))]
  const cellules = await cellulesLectureAelf(entryIds, client)
  const fragmentsParEntree = new Map<string, Map<string, string[]>>()
  for (const c of cellules) {
    if (!codesTraductions.includes(c.trad_id) || !c.texte) continue
    if (!fragmentsParEntree.has(c.aelf_entry_id)) fragmentsParEntree.set(c.aelf_entry_id, new Map())
    const parTrad = fragmentsParEntree.get(c.aelf_entry_id)!
    if (!parTrad.has(c.trad_id)) parTrad.set(c.trad_id, [])
    const fragments = parTrad.get(c.trad_id)!
    if (!fragments.includes(c.texte)) fragments.push(c.texte)
  }
  const textesParEntree = new Map<string, Record<string, string>>()
  for (const [entryId, parTrad] of fragmentsParEntree) {
    textesParEntree.set(entryId, Object.fromEntries(
      [...parTrad.entries()].map(([trad, fragments]) => [trad, fragments.join(' ')]),
    ))
  }

  const legacyIds = [...new Set(tousLiens
    .filter(l => !l.aelf_entry_id && l.historical_canon_id)
    .map(l => l.historical_canon_id as string))]
  const extrasParCanon = new Map<string, Record<string, unknown>>()
  const colonnesExtras = ['historical_canon_id', 'livre', 'chapitre_label', 'verset_label', 'ref', ...codesTraductions.map(c => `"${c}"`)].join(', ')
  for (let i = 0; i < legacyIds.length; i += 200) {
    const { data, error } = await client.from('v_aelf_bible_lecture_extras')
      .select(colonnesExtras)
      .in('historical_canon_id', legacyIds.slice(i, i + 200))
    if (error) throw error
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const canon = typeof row.historical_canon_id === 'string' ? row.historical_canon_id : null
      if (canon && !extrasParCanon.has(canon)) extrasParCanon.set(canon, row)
    }
  }

  for (const segmentId of segmentIds) {
    const refs = new Map<string, ReferenceBibliqueAelf>()
    for (const lien of liensParSegment.get(segmentId) ?? []) {
      const chapitreSeul = lien.resolution_status === 'chapter_only' && Boolean(lien.livre) && lien.chapitre != null
      if (!lien.aelf_entry_id && !lien.historical_canon_id && !chapitreSeul) continue
      const cle = lien.aelf_entry_id
        ? `aelf:${lien.aelf_entry_id}`
        : lien.historical_canon_id
          ? `legacy:${lien.historical_canon_id}`
          : `chapter:${lien.livre}:${lien.chapitre}`
      let ref = refs.get(cle)
      if (!ref) {
        if (lien.aelf_entry_id) {
          const livre = lien.aelf_book_code ?? lien.livre ?? ''
          const chapitre = lien.aelf_chapter_label ?? (lien.chapitre == null ? '' : String(lien.chapitre))
          const verset = labelNumeriqueAelf(lien.aelf_verse_label)
          ref = {
            id: `AELF:${lien.aelf_entry_id}`,
            label: verset ? `${ABREV_FR[livre] ?? livre} ${chapitre}, ${verset}` : `${ABREV_FR[livre] ?? livre} ${chapitre}`,
            textes: { ...(textesParEntree.get(lien.aelf_entry_id) ?? {}) },
            livre, chapitre, verset,
            aelfVersionId: lien.aelf_version_id,
            aelfEntryId: lien.aelf_entry_id,
            aelfReference: lien.aelf_external_reference,
            historicalCanonId: lien.historical_canon_id,
            resolutionStatus: lien.resolution_status,
            validationStatus: lien.validation_status,
            confidenceLevel: lien.confidence_level,
            linkIds: [], natures: [], ordreAelf: lien.aelf_sequence_no,
          }
        } else if (lien.historical_canon_id) {
          const canon = lien.historical_canon_id
          const extra = extrasParCanon.get(canon)
          const livre = String(extra?.livre ?? lien.livre ?? '')
          const chapitre = String(extra?.chapitre_label ?? lien.chapitre ?? '')
          const verset = labelNumeriqueAelf(typeof extra?.verset_label === 'string' ? extra.verset_label : '')
          const textes = Object.fromEntries(codesTraductions.map(code => [code, typeof extra?.[code] === 'string' ? String(extra[code]) : '']))
          ref = {
            id: `LEGACY:${canon}`,
            label: verset ? `${ABREV_FR[livre] ?? livre} ${chapitre}, ${verset}` : `${ABREV_FR[livre] ?? livre} ${chapitre}`,
            textes, livre, chapitre, verset,
            aelfVersionId: null, aelfEntryId: null, aelfReference: null,
            historicalCanonId: canon, resolutionStatus: lien.resolution_status,
            validationStatus: lien.validation_status, confidenceLevel: lien.confidence_level,
            linkIds: [], natures: [], ordreAelf: null,
          }
        } else {
          const livre = lien.livre ?? ''
          const chapitre = lien.chapitre == null ? '' : String(lien.chapitre)
          ref = {
            id: `CHAPTER:${livre}:${chapitre}`,
            label: `${ABREV_FR[livre] ?? livre} ${chapitre}`.trim(),
            textes: {}, livre, chapitre, verset: '',
            aelfVersionId: null, aelfEntryId: null, aelfReference: null,
            historicalCanonId: null, resolutionStatus: 'chapter_only',
            validationStatus: lien.validation_status, confidenceLevel: lien.confidence_level,
            linkIds: [], natures: [], ordreAelf: null,
          }
        }
        refs.set(cle, ref)
      }
      if (!ref.linkIds.includes(lien.id)) ref.linkIds.push(lien.id)
      const nature = NATURE_LIEN_AELF[lien.type]
      if (!ref.natures.includes(nature)) ref.natures.push(nature)
    }
    sortie.set(segmentId, [...refs.values()].sort((a, b) =>
      (a.ordreAelf ?? Number.MAX_SAFE_INTEGER) - (b.ordreAelf ?? Number.MAX_SAFE_INTEGER)
      || a.label.localeCompare(b.label, 'fr')))
  }
  return sortie
}

/** Recherche inverse : les segments qui renvoient à un verset donné.
 *
 *  Un lien peut viser trois choses — un créneau du canon, un verset surnuméraire
 *  (hors ossature), ou un chapitre entier. Un segment rattaché au chapitre répond
 *  donc aussi pour chacun de ses versets : c'est voulu, et c'était impossible à
 *  exprimer du temps des colonnes texte.
 */
export async function segmentsLiesAuVerset(canonId: string): Promise<Lien[]> {
  const [livre, chapitre] = canonId.split('.')
  const [parVerset, parChapitre] = await Promise.all([
    supabase.from('liens_bibliques').select(COLS).eq('canon_id', canonId),
    supabase.from('liens_bibliques').select(COLS).eq('livre', livre).eq('chapitre', Number(chapitre)),
  ])
  if (parVerset.error) throw parVerset.error
  if (parChapitre.error) throw parChapitre.error
  return [...(parVerset.data ?? []), ...(parChapitre.data ?? [])] as Lien[]
}

/** Recherche inverse à l'échelle d'un CHAPITRE entier : tous les segments qui
 *  renvoient à l'un quelconque de ses versets, plus ceux rattachés au chapitre.
 *  Sert le volet de droite quand un chapitre est ouvert sans verset sélectionné.
 *
 *  Deux requêtes, comme pour le verset : les liens par verset ne portent que
 *  `canon_id` (« GEN.1.7 ») ; les liens de chapitre ne portent que `livre` +
 *  `chapitre`. Le motif `LIKE 'GEN.1.%'` prend bien GEN.1.1 à GEN.1.31 sans
 *  déborder sur GEN.12.x (le second point est exigé par le motif).
 */
export async function segmentsLiesAuChapitre(livre: string, chapitre: number): Promise<Lien[]> {
  const [parVerset, parChapitre] = await Promise.all([
    supabase.from('liens_bibliques').select(COLS).like('canon_id', `${livre}.${chapitre}.%`),
    supabase.from('liens_bibliques').select(COLS).eq('livre', livre).eq('chapitre', chapitre),
  ])
  if (parVerset.error) throw parVerset.error
  if (parChapitre.error) throw parChapitre.error
  return [...(parVerset.data ?? []), ...(parChapitre.data ?? [])] as Lien[]
}

/** Recherche inverse sur une PLAGE canonique (péricope) : les segments qui renvoient
 *  à l'un des versets de la plage, plus ceux rattachés à l'un de ses chapitres. Sert le
 *  volet patristique de la page d'une péricope, à l'identique de la page Bible.
 */
export async function segmentsLiesAPlage(livre: string, canonDebut: string, canonFin: string | null): Promise<Lien[]> {
  const point = (s: string) => {
    const [, c, v] = s.split('.')
    return { chapitre: c ? Number(c) : null, verset: v ? Number(v) : null }
  }
  const d = point(canonDebut)
  const f = canonFin ? point(canonFin) : d
  if (d.chapitre == null) return []
  const c1 = d.chapitre, c2 = f.chapitre ?? c1
  const v1 = d.verset, v2 = f.verset
  const chapitres: number[] = []
  for (let c = c1; c <= c2; c++) chapitres.push(c)
  const requetesVerset = chapitres.map(c => supabase.from('liens_bibliques').select(COLS).like('canon_id', `${livre}.${c}.%`))
  const requeteChapitre = supabase.from('liens_bibliques').select(COLS).is('canon_id', null).eq('livre', livre).in('chapitre', chapitres)
  const resultats = await Promise.all([...requetesVerset, requeteChapitre])
  const out: Lien[] = []
  resultats.forEach((r, idx) => {
    if (r.error) throw r.error
    for (const l of (r.data ?? []) as Lien[]) {
      if (idx < requetesVerset.length) {
        // Lien au verset : ne garder que ceux DANS la plage (bornes aux chapitres extrêmes).
        const p = point(l.canon_id ?? '')
        if (p.verset == null) continue
        if (v1 != null && p.chapitre === c1 && p.verset < v1) continue
        if (v2 != null && p.chapitre === c2 && p.verset > v2) continue
      }
      out.push(l)
    }
  })
  return out
}

/** Les versets visés par un segment, dans l'ordre des types — pour l'affichage. */
export function versetsDuLien(liens: Lien[], type: TypeLien): string[] {
  return liens.filter(l => l.type === type && l.canon_id).map(l => l.canon_id!)
}

/** Un lien sans cible est un lien à constituer : la référence est connue de
 *  l'éditeur (elle est dans `motif`) mais n'a pas encore été résolue au canon. */
export const estAConstituer = (l: Lien) => !l.canon_id && !l.verset_v2_id && !l.livre

/** ADAPTATEUR TRANSITOIRE. Reconstitue `lien_1 … lien_4` en mémoire, au format
 *  hérité (« GEN.1.1;GEN.1.2 »), à partir de la table.
 *
 *  Il existe pour les écrans déjà écrits contre les quatre colonnes — au premier
 *  chef la page d'une œuvre, qui les lit à sept endroits. Les réécrire d'un bloc,
 *  sans pouvoir rien vérifier à l'écran, ferait courir plus de risque que ce
 *  détour n'en fait courir. La base, elle, est déjà propre : c'est le point
 *  important, et ces écrans pourront migrer un à un.
 *
 *  N'écrire AUCUN nouvel écran contre cette forme : utiliser `liensDeSegments`.
 */
export async function hydraterLiensHerites<T extends { id: number }>(
  segs: T[],
  // La page d'une œuvre est rendue par le SERVEUR, avec son propre client : sans
  // ce paramètre, l'hydratation s'y ferait avec le client du navigateur — et le
  // premier rendu, celui que le lecteur voit, arriverait sans aucun lien.
  client?: { from: (t: string) => any },
): Promise<T[]> {
  const parSegment = client
    ? await liensParClient(client, segs.map(s => s.id))
    : await liensDeSegments(segs.map(s => s.id))
  for (const s of segs) {
    const liens = parSegment.get(s.id) ?? []
    for (const t of [1, 2, 3, 4] as TypeLien[]) {
      ;(s as Record<string, unknown>)[`lien_${t}`] =
        liens.filter(l => l.type === t && l.canon_id).map(l => l.canon_id).join(';') || null
    }
  }
  return segs
}
