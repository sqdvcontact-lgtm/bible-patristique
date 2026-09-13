// Les TEXTES ORIGINAUX qu'une traduction offre aussi à la lecture, pour les listes qui
// les proposent (la bibliothèque, sous chaque traduction).
//
// ⛔ LA MÊME RÈGLE QUE LA PAGE D'ŒUVRE (`paireDeLecture`) : un texte est l'original quand
// il n'a pas de traducteur et que sa langue est celle de l'œuvre ; une version retirée
// (invalide, charte § 52) n'est jamais une cible implicite. La colonne héritée
// `segments.texte_original` compte aussi, tant qu'elle sert de repli au bilingue.
//
// ⚠️ CE QU'IL RÉPARE (relevé de l'auteur, 2026-09-13). La bibliothèque ne lisait que la vue
// `v_oeuvres_texte_original`, c'est-à-dire la seule colonne héritée : cinq œuvres. Le grec
// de la Doctrine des Apôtres, texte à part entière d'`oeuvre_textes`, n'y était proposé
// nulle part, et la seule langue qui parût sous les Douze Apôtres était le latin de la
// Doctrina apostolorum, donné pour un « Texte original latin ».
//
// Module PUR : les lignes arrivent de l'appelant, qui les a lues.

import { etatValidation } from './etatsPublication'
import { memeLangue } from './langues'

/** Ce qu'il faut savoir d'une ligne d'`oeuvre_textes` pour y reconnaître un original. */
export type TexteDOeuvre = {
  id_oeuvre: string
  langue: string | null
  traducteur: string | null
  statut: string | null
}

export type OriginauxDisponibles = {
  /** Les œuvres dont les segments portent `texte_original` (vue `v_oeuvres_texte_original`). */
  repli: ReadonlySet<string>
  /** Par œuvre, les langues de ses textes SANS traducteur et non retirés. */
  languesSansTraducteur: ReadonlyMap<string, readonly string[]>
}

export const ORIGINAUX_VIDES: OriginauxDisponibles = { repli: new Set(), languesSansTraducteur: new Map() }

export function composerOriginauxDisponibles(
  repli: readonly { id_oeuvre: string }[],
  textes: readonly TexteDOeuvre[],
): OriginauxDisponibles {
  const langues = new Map<string, string[]>()
  for (const texte of textes) {
    const langue = texte.langue?.trim()
    if (!langue || texte.traducteur?.trim()) continue
    if (etatValidation(texte.statut) === 'invalide') continue
    langues.set(texte.id_oeuvre, [...(langues.get(texte.id_oeuvre) ?? []), langue])
  }
  return { repli: new Set(repli.map(ligne => ligne.id_oeuvre)), languesSansTraducteur: langues }
}

/**
 * Une TRADUCTION qui offre aussi son texte original.
 *
 * ⚠️ Une édition en langue originale (`langue_trad` vide) n'en offre pas : elle EST ce
 * texte, et sa propre ligne y mène déjà. Sans cette garde, l'œuvre latine autonome aurait
 * paru deux fois de suite, sous le même libellé.
 */
export function traductionAvecOriginal(
  oeuvre: { id_oeuvre: string; langue_originale?: string | null; langue_trad?: string | null },
  originaux: OriginauxDisponibles,
): boolean {
  if (!oeuvre.langue_trad?.trim()) return false
  if (originaux.repli.has(oeuvre.id_oeuvre)) return true
  return (originaux.languesSansTraducteur.get(oeuvre.id_oeuvre) ?? [])
    .some(langue => memeLangue(langue, oeuvre.langue_originale))
}
