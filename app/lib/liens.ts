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
  // Par paquets : une clause `in` trop longue dépasse la limite d'URL.
  for (let i = 0; i < segmentIds.length; i += 500) {
    const { data, error } = await supabase.from('liens_bibliques')
      .select(COLS).in('segment_id', segmentIds.slice(i, i + 500))
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
  for (let i = 0; i < segmentIds.length; i += 500) {
    const { data, error } = await client.from('liens_bibliques')
      .select(COLS).in('segment_id', segmentIds.slice(i, i + 500))
    if (error) throw error
    for (const l of (data ?? []) as Lien[]) {
      if (!parSegment.has(l.segment_id)) parSegment.set(l.segment_id, [])
      parSegment.get(l.segment_id)!.push(l)
    }
  }
  for (const arr of parSegment.values()) arr.sort((a, b) => a.type - b.type)
  return parSegment
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
