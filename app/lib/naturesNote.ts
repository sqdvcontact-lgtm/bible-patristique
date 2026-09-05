// NATURES D'UN BLOC DE NOTE — le vocabulaire CLOS de `texte_note_blocs.kind`, et
// les quatre familles qui le rangent (charte § 13.10).
//
// ⛔ SOURCE UNIQUE. Ce fichier reflète la contrainte SQL
// `texte_note_blocs_kind_check` : les deux listes se modifient ENSEMBLE, dans cet
// ordre — la charte d'abord, la contrainte ensuite, le vocabulaire ici, le rendu
// enfin (charte § 7.6). ⛔ Jamais l'inverse : semer en base une nature que rien ne
// sait composer fait disparaître le bloc de la page, en silence. Ce dépôt a déjà
// payé ce défaut quatre fois avec `NATURES_CORPS`.
//
// ── LES TROIS AXES, qu'on ne confond pas ─────────────────────────────────────
//   NATURE  ce que le bloc EST      → `kind`, ici
//   FORME   prose ou vers           → `form`
//   TYPE    qui parle               → `metadata.editorial_role`, voir `typeNote.ts`
//
// Les mêler ferait doubler le vocabulaire sans rien dire de plus : un renvoi
// biblique en vers écrit par un traducteur est UN bloc, décrit trois fois.

/** Le vocabulaire, dans l'ordre où la charte § 13.10 le présente. */
export const NATURES_BLOC_NOTE = [
  'lemma',
  'source_locator',
  'commentary',
  'quotation',
  'translation',
  'attribution',
  'reference',
  'internal_cross_reference',
] as const

export type NatureBlocNote = typeof NATURES_BLOC_NOTE[number]

/**
 * Les quatre FAMILLES. Elles ne sont pas un classement de commodité : c'est la
 * famille qui commande la composition, et c'est en la nommant qu'on voit
 * pourquoi deux natures voisines ne se rendent pas de la même façon.
 *
 *  - `ancrage`     ce à quoi la note tient — le mot qu'elle reprend, la
 *                  coordonnée d'où elle vient. Se compose en retrait, discret :
 *                  le lecteur le traverse pour atteindre le propos.
 *  - `propos`      ce que la note dit d'elle-même. La prose ordinaire, et de
 *                  loin le plus gros de l'appareil.
 *  - `temoignage`  ce qu'elle rapporte d'un tiers. Porte les marques de la
 *                  citation : langue, guillemets, filet de la traduction.
 *  - `renvoi`      ce vers quoi elle envoie. ⚠️ C'est ici que la DESTINATION
 *                  commande le traitement : un renvoi vers le DEHORS se
 *                  normalise (auteur, titre, locus), un renvoi vers le DEDANS
 *                  ne le peut pas — il n'a ni auteur ni titre à normaliser.
 */
export const FAMILLES_NATURE = ['ancrage', 'propos', 'temoignage', 'renvoi'] as const
export type FamilleNature = typeof FAMILLES_NATURE[number]

const FAMILLE_DE: Record<NatureBlocNote, FamilleNature> = {
  lemma: 'ancrage',
  source_locator: 'ancrage',
  commentary: 'propos',
  quotation: 'temoignage',
  translation: 'temoignage',
  attribution: 'temoignage',
  reference: 'renvoi',
  internal_cross_reference: 'renvoi',
}

export function familleDeNature(nature: NatureBlocNote): FamilleNature {
  return FAMILLE_DE[nature]
}

/** Lecture TOLÉRANTE d'une valeur venue de la base : une nature inconnue vaut
 *  `null`, et le bloc retombe alors sur le rendu de `commentary`. ⛔ Il ne
 *  disparaît jamais : un vocabulaire en avance sur le rendu doit rester lisible,
 *  fût-ce sans sa composition propre. */
export function natureBlocNoteSur(value: unknown): NatureBlocNote | null {
  return (NATURES_BLOC_NOTE as readonly string[]).includes(String(value))
    ? value as NatureBlocNote
    : null
}

/**
 * Le renvoi se NORMALISE-T-IL comme une référence bibliographique ?
 *
 * ⛔ Vrai pour `reference` SEULEMENT. C'est toute la raison d'être de la nature
 * `internal_cross_reference` : « Voyez la note I, p. 150 » passé par
 * `normaliserReferencesDansTexte` se ferait composer comme un renvoi
 * bibliographique — avec l'auteur et le titre qu'il n'a pas — et son « I » de
 * numéro de note se verrait converti en chapitre arabe.
 */
export function natureSeNormaliseCommeReference(nature: NatureBlocNote | null): boolean {
  return nature === 'reference'
}
