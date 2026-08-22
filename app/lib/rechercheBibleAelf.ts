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

/**
 * Construit la cible de lecture à partir d’un résultat déjà résolu sur l’axe AELF/TOL.
 * Les positions historiques hors axe conservent leur identifiant EXTRA et restent
 * navigables sans leur inventer de verset AELF.
 */
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
