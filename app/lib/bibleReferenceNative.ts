export type ReferenceNativeSimple = {
  chapitre: number
  verset: number
}

/**
 * Référence NATIVE d'un segment éditorial.
 *
 * `editorial_label` est le libellé humain du segment — « Genèse 50, 25 » — et
 * peut donc contenir le nom du livre. `metadata.native_reference`, elle, porte
 * la référence seule — « 50, 25 » — et c'est cette forme que le lecteur doit
 * poser dans la gouttière d'un verset. Le libellé complet ne sert qu'en repli
 * pour les lots anciens qui n'ont pas encore la métadonnée structurée.
 */
export function referenceNativeDuSegment(
  metadata: Record<string, unknown> | null,
  editorialLabel: string | null,
): string | null {
  const native = metadata?.native_reference
  if (typeof native === 'string' && native.trim()) return native.trim()
  return editorialLabel?.trim() || null
}

/** Une référence native simple « 50, 25 ». Les formes complexes restent intactes
 * pour la lecture en regard, mais ne deviennent pas une fausse numérotation
 * alternative dans la lecture simple. */
export function analyserReferenceNativeSimple(reference: string | null): ReferenceNativeSimple | null {
  const match = reference?.match(/^\s*(\d+)\s*,\s*(\d+)\s*$/)
  if (!match) return null
  const chapitre = Number(match[1])
  const verset = Number(match[2])
  return Number.isSafeInteger(chapitre) && chapitre > 0 && Number.isSafeInteger(verset) && verset > 0
    ? { chapitre, verset }
    : null
}

/**
 * Numérotation alternative exposée par le contrat déjà lu par `TexteBible`.
 * Elle n'apparaît que si une UNIQUE référence native simple diffère du créneau
 * canonique. Une fusion de plusieurs références reste lisible dans `num_TR…`
 * mais ne se réduit jamais artificiellement à un seul numéro.
 */
export function numerotationAlternative(
  canonChapitre: number | string,
  canonVerset: number | string,
  references: readonly string[],
): { chapitre_alternatif: number; verset_alternatif: number } | null {
  const uniques = [...new Set(references.map((r) => r.trim()).filter(Boolean))]
  if (uniques.length !== 1) return null
  const native = analyserReferenceNativeSimple(uniques[0])
  if (!native) return null
  const chapitreCanon = Number(canonChapitre)
  const versetCanon = Number(canonVerset)
  if (native.chapitre === chapitreCanon && native.verset === versetCanon) return null
  return {
    chapitre_alternatif: native.chapitre,
    verset_alternatif: native.verset,
  }
}
