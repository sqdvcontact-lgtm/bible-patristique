/**
 * ATTRIBUER UN STYLE — ce que l'administration écrit, et ce qu'elle refuse.
 *
 * Deux objets reçoivent un style : un SEGMENT d'œuvre (sa nature, et sa forme en
 * vers, dans `segment_metadata.forme`) et un BLOC du paratexte biblique (son style
 * sémantique et son rang, dans `metadata`). Ce module calcule la nouvelle valeur
 * sans rien toucher d'autre : les métadonnées voisines restent telles quelles.
 *
 * ⛔ On n'attribue que ce que le vocabulaire connaît (charte § 7.6 : on ne crée pas
 * un style depuis l'administration). La base a ses propres verrous —
 * `chk_segments_nature`, `trg_bible_style_semantique_connu` — et c'est elle qui a le
 * dernier mot ; ce module dit la même chose plus tôt, en français.
 *
 * ⚠️ Une attribution SE TRACE. Un bloc biblique garde dans `metadata.style_attribution`
 * qui l'a changé, quand, et ce qu'il portait (charte § 14.2 : ce qu'on a lu se
 * distingue de ce qu'on a décidé). Le segment, lui, n'a pas cette case : sa nature
 * s'éditait déjà depuis le contrôle des œuvres sans trace, et `segment_metadata` ne
 * s'ouvre pas en grand pour cela.
 *
 * Module pur, testé par stylesAttribution.test.ts.
 */
import registre from '@/work/fillion/semantic_display_hierarchy.json'
import { JETONS_INFO } from './bibleHierarchieSemantique'
import { CLE_FORME, FORME_VERS } from './compositionVers'
import { NATURE_VALIDES, type NatureSegmentValide } from './naturesSegments'

type EntreeRegistre = { kind: 'title' | 'info' | 'note'; level?: string }
const ENTREES = registre.styles as unknown as Record<string, EntreeRegistre>

function objet(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {}
}

/** La nature demandée, ou une erreur en français. */
export function natureAttribuable(nature: unknown): NatureSegmentValide {
  const code = String(nature ?? '').trim()
  if (!(NATURE_VALIDES as readonly string[]).includes(code)) {
    throw new Error(`Nature inconnue : « ${code} ». Le vocabulaire est clos ; on ne crée pas une nature depuis l’administration.`)
  }
  if (code === 'separateur') throw new Error('« Séparateur » est une nature héritée : on n’en crée plus.')
  return code as NatureSegmentValide
}

/**
 * `segment_metadata` avec la forme demandée. `null` quand il ne reste rien à garder :
 * c'est la valeur ordinaire d'un segment de prose.
 */
export function metadonneesAvecForme(metadata: unknown, enVers: boolean): Record<string, unknown> | null {
  const base = objet(metadata)
  if (enVers) base[CLE_FORME] = FORME_VERS
  else delete base[CLE_FORME]
  return Object.keys(base).length > 0 ? base : null
}

/**
 * `metadata` d'un bloc biblique avec le style demandé.
 *
 * - un TITRE porte son rang dans le registre : on le pose tel quel ;
 * - une NATURE d'information exige un rang déclaré, I1 à I6 ;
 * - une NOTE n'est pas un bloc du corps : refusée.
 */
export function metadonneesAvecStyleBible(
  metadata: unknown,
  style: string,
  rang: string | null | undefined,
  trace: { par: string; le: string },
): Record<string, unknown> {
  const entree = ENTREES[style]
  if (!entree) throw new Error(`Style inconnu : « ${style} ». Le vocabulaire est clos ; on ne crée pas un style depuis l’administration (charte § 7.6).`)
  if (entree.kind === 'note') throw new Error('Une note de verset n’est pas un bloc du corps : elle ne s’attribue pas ici.')
  const base = objet(metadata)
  const avant = { style: base.semantic_style ?? null, rang: base.semantic_level ?? null }
  let niveau: string
  if (entree.kind === 'title') {
    niveau = entree.level ?? ''
  } else {
    const r = String(rang ?? '').trim()
    if (!(JETONS_INFO as readonly string[]).includes(r)) {
      throw new Error(`Le style « ${style} » dit une nature ; son rang se déclare, I1 (le livre) à I6 (le verset).`)
    }
    niveau = r
  }
  return {
    ...base,
    semantic_style: style,
    semantic_level: niveau,
    style_attribution: { ...trace, avant },
  }
}
