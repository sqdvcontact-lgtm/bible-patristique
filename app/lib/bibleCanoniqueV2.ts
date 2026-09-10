// Sélection des gloses autonomes d'une traduction lue depuis `versets_v2`.
//
// Le témoin 899 porte plusieurs sortes de MANUSCRIPT_EXTRA : gloses, rubriques,
// dittographies, colophons, etc. La lecture biblique ordinaire ne montre que les
// gloses, comme `adapterVersets899` pour TR0009. TR0013 ne recopie volontairement
// pas `phenomenon` : on confronte donc les extras du verset hôte au NOMBRE de
// gloses attesté par la source, sans jamais deviner une nature absente.

export type SourceGloseCanoniqueV2 = {
  canonical_context: string | null
}

export type LigneExtraCanoniqueV2 = {
  id: string
  livre: string | null
  ch_orig: number | null
  v_orig: number | null
  v_orig_suffixe: string | null
  texte: string | null
  ordre_slot: number | null
  note_structure: string | null
}

export type GloseCanoniqueV2 = LigneExtraCanoniqueV2 & {
  canonIdHote: string
}

type PointCanonique = {
  canonId: string
  livre: string
  chapitre: number
  verset: number
}

function pointCanonique(contexte: string | null): PointCanonique {
  const brut = contexte?.trim() ?? ''
  const morceaux = brut.split('.')
  if (morceaux.length !== 3) {
    throw new Error(`Contexte canonique de glose invalide : ${brut || 'vide'}`)
  }
  const chapitre = Number(morceaux[1])
  const verset = Number(morceaux[2])
  if (!morceaux[0] || !Number.isInteger(chapitre) || !Number.isInteger(verset)) {
    throw new Error(`Contexte canonique de glose invalide : ${brut}`)
  }
  return { canonId: brut, livre: morceaux[0], chapitre, verset }
}

/**
 * Une partie des anciennes lignes TR0013 nomme déjà explicitement la glose dans
 * son suffixe ou au début de sa note de structure. Le mot « glose » rencontré
 * ailleurs ne suffit pas : deux notices disent précisément « non surqualifiée
 * comme glose ». Ces marqueurs sont donc des preuves positives, jamais un critère
 * d'exclusion : des lignes plus anciennes portent encore des suffixes génériques
 * comme `extra-1`.
 */
export function estExtraExplicitementGlose(ligne: LigneExtraCanoniqueV2): boolean {
  const suffixe = ligne.v_orig_suffixe ?? ''
  const note = ligne.note_structure ?? ''
  return /gloss/i.test(suffixe) || /MANUSCRIPT_EXTRA\s*[–—-]\s*glose\b/i.test(note)
}

/**
 * Retient exactement les extras TR0013 qui correspondent aux gloses attestées
 * par la source 899.
 *
 * Pour chaque verset hôte, la source donne un nombre N de gloses. Les lignes V2
 * explicitement marquées « gloss/glose » sont retenues d'abord. Si des anciennes
 * lignes n'ont pas encore ce marqueur, elles ne sont admises que lorsque le
 * verset hôte possède exactement N extras au total : il n'y a alors aucune ligne
 * d'une autre nature avec laquelle les confondre. Toute autre situation échoue
 * bruyamment plutôt que d'afficher une rubrique ou une dittographie comme glose.
 */
export function selectionnerGlosesCanoniquesV2(
  sources: readonly SourceGloseCanoniqueV2[],
  extras: readonly LigneExtraCanoniqueV2[],
): Map<string, GloseCanoniqueV2[]> {
  const requisParCanon = new Map<string, { point: PointCanonique; nombre: number }>()
  for (const source of sources) {
    const point = pointCanonique(source.canonical_context)
    const courant = requisParCanon.get(point.canonId)
    requisParCanon.set(point.canonId, { point, nombre: (courant?.nombre ?? 0) + 1 })
  }

  const extrasParHote = new Map<string, LigneExtraCanoniqueV2[]>()
  for (const extra of extras) {
    if (!extra.livre || extra.ch_orig == null || extra.v_orig == null) continue
    const cle = `${extra.livre}.${extra.ch_orig}.${extra.v_orig}`
    const groupe = extrasParHote.get(cle) ?? []
    groupe.push(extra)
    extrasParHote.set(cle, groupe)
  }

  const resultat = new Map<string, GloseCanoniqueV2[]>()
  for (const [canonId, requis] of requisParCanon) {
    const candidates = extrasParHote.get(canonId) ?? []
    const explicites = candidates.filter(estExtraExplicitementGlose)

    if (explicites.length > requis.nombre) {
      throw new Error(
        `Gloses V2 incohérentes pour ${canonId} : ${explicites.length} explicites pour ${requis.nombre} attendue(s)`,
      )
    }
    if (candidates.length < requis.nombre) {
      throw new Error(
        `Gloses V2 manquantes pour ${canonId} : ${candidates.length} extra(s) pour ${requis.nombre} attendue(s)`,
      )
    }

    const retenues = explicites.length === requis.nombre
      ? explicites
      : candidates.length === requis.nombre
        ? candidates
        : null
    if (retenues === null) {
      throw new Error(
        `Gloses V2 ambiguës pour ${canonId} : ${explicites.length} explicite(s), ${candidates.length} extra(s), ${requis.nombre} attendue(s)`,
      )
    }

    for (const ligne of retenues) {
      if (ligne.ordre_slot == null) {
        throw new Error(`Glose V2 sans ordre_slot pour ${canonId} : ${ligne.id}`)
      }
    }
    resultat.set(canonId, retenues
      .map((ligne) => ({ ...ligne, canonIdHote: canonId }))
      .sort((a, b) => (a.ordre_slot as number) - (b.ordre_slot as number) || a.id.localeCompare(b.id)))
  }
  return resultat
}
