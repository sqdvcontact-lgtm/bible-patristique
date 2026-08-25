// APPARAT CRITIQUE — le rendu commun à toute édition savante du corpus, et non
// aux seules Confessions de Knöll. Un bloc s'y rattache par sa métadonnée
// `texte_note_blocs.metadata->>'editorial_role' = 'critical_apparatus'`, JAMAIS
// par son `kind` : `commentary` désigne aussi bien la note de prose d'un
// traducteur du XIXe siècle, qui doit continuer de se composer comme avant.
//
// Fonctions PURES, testées dans `apparatCritique.test.ts`. Elles ne touchent
// jamais la donnée : tout ce qui suit appartient au rendu.

/** Valeur de `metadata.editorial_role` qui désigne un apparat critique. */
export const ROLE_APPARAT_CRITIQUE = 'critical_apparatus'

/** Ce que le rendu retient de `texte_note_blocs.metadata` — trois scalaires, et
 *  non le jsonb entier : il traverse le réseau une fois par bloc de note. */
export type MetadonneesBlocNote = {
  editorialRole: string | null
  printedLine: number | null
  visualReviewReason: string | null
  humanValidated: boolean | null
}

export const METADONNEES_BLOC_VIDES: MetadonneesBlocNote = {
  editorialRole: null, printedLine: null, visualReviewReason: null, humanValidated: null,
}

/** Projette `metadata` sur les seuls champs que l'affichage lit. Tolérante :
 *  une métadonnée absente ou d'un autre type vaut `null`, et le bloc retombe
 *  alors sur le rendu ordinaire. */
export function lireMetadonneesBlocNote(metadata: unknown): MetadonneesBlocNote {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return METADONNEES_BLOC_VIDES
  const m = metadata as Record<string, unknown>
  const ligne = m.printed_line
  const valide = m.human_validated
  return {
    editorialRole: typeof m.editorial_role === 'string' ? m.editorial_role : null,
    printedLine: typeof ligne === 'number' && Number.isInteger(ligne) && ligne > 0 ? ligne : null,
    visualReviewReason: typeof m.visual_review_reason === 'string' ? m.visual_review_reason : null,
    humanValidated: typeof valide === 'boolean' ? valide : null,
  }
}

export type BlocApparat = {
  text: string
  editorialRole?: string | null
  printedLine?: number | null
}

export function estBlocApparatCritique(bloc: { editorialRole?: string | null }): boolean {
  return bloc.editorialRole === ROLE_APPARAT_CRITIQUE
}

/** Une note relève de l'apparat quand TOUS ses blocs en relèvent. Le « tous »
 *  n'est pas une prudence de style : il garantit qu'une note mixte — un apparat
 *  suivi d'un renvoi biblique, par exemple — continue de passer par le rendu
 *  ordinaire, qui seul sait composer les blocs rattachés. */
export function estNoteApparatCritique(
  note: { blocks: readonly { editorialRole?: string | null }[] },
): boolean {
  return note.blocks.length > 0 && note.blocks.every(estBlocApparatCritique)
}

// Les trois espaces que le corpus emploie indifféremment (ordinaire, insécable,
// fine insécable) : le séparateur attendu entre le numéro de ligne et la leçon.
const SEPARATEURS = new Set([' ', ' ', ' '])

/**
 * Retire le numéro de LIGNE IMPRIMÉE que la transcription a laissé en tête du
 * texte. Ce n'est pas un numéro de note : c'est la ligne de la page de Knöll,
 * déjà portée par `metadata.printed_line`, et elle n'a rien à faire dans le
 * corps lu.
 *
 * ⛔ Le retrait est STRICTEMENT déterministe, et n'ôte jamais « un nombre en
 * tête » : il faut que le texte s'ouvre exactement sur l'écriture décimale de
 * `printed_line`, suivie d'UN séparateur, lui-même suivi d'autre chose qu'un
 * blanc. « 13 uirtus » avec `printed_line = 3` n'est pas touché : la ligne
 * annoncée n'est pas celle qui est écrite, et le renderer n'a pas à trancher.
 */
export function retirerLigneImprimee(texte: string, ligneImprimee: number | null | undefined): string {
  if (typeof ligneImprimee !== 'number' || !Number.isInteger(ligneImprimee) || ligneImprimee <= 0) return texte
  const prefixe = String(ligneImprimee)
  if (!texte.startsWith(prefixe)) return texte
  const separateur = texte[prefixe.length]
  if (separateur === undefined || !SEPARATEURS.has(separateur)) return texte
  const reste = texte.slice(prefixe.length + 1)
  // Un reste vide laisserait une entrée muette ; un reste ouvert sur un blanc
  // signale une composition qu'on n'a pas prévue. Dans les deux cas, on s'abstient.
  if (reste.length === 0 || /^\s/u.test(reste)) return texte
  return reste
}

/**
 * Le texte d'un bloc tel qu'il doit PARAÎTRE. Seul un bloc d'apparat critique
 * perd son numéro de ligne ; partout ailleurs le texte est rendu intact.
 *
 * ⛔ Rien d'autre n'est fait ici, et c'est voulu : pas de correction d'OCR, pas
 * d'astérisque retiré, pas d'abréviation développée, pas de sigle normalisé,
 * pas de ponctuation recomposée. La notation critique se rend telle quelle.
 */
export function texteApparatAffiche(bloc: BlocApparat): string {
  if (!estBlocApparatCritique(bloc)) return bloc.text
  return retirerLigneImprimee(bloc.text, bloc.printedLine)
}
