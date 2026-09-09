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

/**
 * L'ANCRAGE QUI REPREND UN MOT DU TEXTE — la raison nommée que la charte § 13.11
 * réclame pour séparer deux natures d'une même famille.
 *
 * ⛔ `lemma` et `source_locator` sont tous deux de la famille `ancrage`, et tous deux
 * s'ouvrent sur la ligne du propos ; mais l'un est un mot de l'ŒUVRE, que la note
 * cite avant de le commenter, et l'autre une coordonnée de l'APPAREIL. Les composer
 * pareillement les confondrait précisément là où ils se touchent : chez Faivre,
 * « (V) pag. 178. — *Avec les démons les plus féroces* — On peut consulter… » les
 * range côte à côte sur la même ligne, et la passe 3 va en poser 396 de cette forme.
 *
 * La reprise se compose donc en ITALIQUE, à la teinte et à la mesure du texte, comme
 * toute édition savante compose son lemme ; la coordonnée garde le repère discret.
 * ⚠️ Un lemme latin serait déjà italique par sa langue (§ 13.8) : les deux règles
 * disent alors la même chose, et rien ne se cumule.
 */
export function natureReprendLeTexte(nature: NatureBlocNote | null): boolean {
  return nature === 'lemma'
}

/**
 * Le bloc peut-il SUIVRE SA CIBLE en ligne, plutôt que de faire paragraphe ?
 *
 * ⛔ TOUTE la famille `renvoi`, et non le seul `reference` : le renvoi interne se
 * compose comme l'autre, seule la NORMALISATION les sépare (§ 13.11). Sans cela, le
 * jour où les 116 renvois internes du corpus seront semés, celui qui porterait
 * `rendering = 'inline_after_target'` ferait paragraphe en silence, et le défaut se
 * lirait comme une donnée fautive plutôt que comme un rendu qui l'ignore.
 *
 * ⚠️ `attribution` s'y joint sans être un renvoi : « (Hieronymus.) » suit la citation
 * qu'elle attribue, et c'est ce que le corpus porte déjà (8 blocs sur 17).
 */
export function natureSuitSaCibleEnLigne(nature: NatureBlocNote | null): boolean {
  return nature !== null && (familleDeNature(nature) === 'renvoi' || nature === 'attribution')
}
