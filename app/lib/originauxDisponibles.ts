// Les TEXTES ORIGINAUX qu'une traduction offre aussi à la lecture, pour les listes qui
// les proposent (la bibliothèque, sous chaque traduction).
//
// ⛔ LA MÊME RÈGLE QUE LA PAGE D'ŒUVRE (`paireDeLecture`) : un texte est l'original quand
// il n'a pas de traducteur et que sa langue est celle de l'œuvre ; une version retirée
// (invalide, charte § 52) n'est jamais une cible implicite.
//
// ⛔ LES TEXTES SEULS (2026-09-22). La colonne héritée `segments.texte_original` et sa vue
// `v_oeuvres_texte_original` ne comptent plus : les cinq œuvres qu'elles portaient ont
// toutes leur original comme texte à part entière, et la lecture en regard ne passe plus
// que par l'alignement.
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
  /** Par œuvre, les langues de ses textes SANS traducteur et non retirés. */
  languesSansTraducteur: ReadonlyMap<string, readonly string[]>
}

export const ORIGINAUX_VIDES: OriginauxDisponibles = { languesSansTraducteur: new Map() }

export function composerOriginauxDisponibles(textes: readonly TexteDOeuvre[]): OriginauxDisponibles {
  const langues = new Map<string, string[]>()
  for (const texte of textes) {
    const langue = texte.langue?.trim()
    if (!langue || texte.traducteur?.trim()) continue
    if (etatValidation(texte.statut) === 'invalide') continue
    langues.set(texte.id_oeuvre, [...(langues.get(texte.id_oeuvre) ?? []), langue])
  }
  return { languesSansTraducteur: langues }
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
  return (originaux.languesSansTraducteur.get(oeuvre.id_oeuvre) ?? [])
    .some(langue => memeLangue(langue, oeuvre.langue_originale))
}
