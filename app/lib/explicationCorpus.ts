/**
 * L'EXPLICATION DE CORPUS SCRIPTURA — la voix du site, quand elle éclaire une note.
 *
 * La passe P10 « Clarté et compréhensibilité » (14 septembre 2026) ajoute à des notes
 * difficiles un bloc rédigé par Corpus Scriptura : il dit en français clair ce que la note
 * de l'édition discute, sans rien retrancher de celle-ci. Le lecteur doit le reconnaître
 * AVANT de le lire — c'est un ajout du site, non la parole de l'éditeur —, d'où un rendu à
 * part : un petit libellé, le texte en vert, un filet discret en marge
 * (`ContenuNoteStructuree`, et la feuille : `.cs-note-explication-corpus`).
 *
 * Le contrat est posé par la donnée sur `texte_note_blocs.metadata` :
 *
 *     editorial_role     = "corpus_editorial_note"   qui parle
 *     reader_style       = "corpus_explanation"      comment le lecteur doit le voir
 *     reader_label       = "Corpus Scriptura"        le libellé de présentation
 *     editorial_origin   = "Corpus Scriptura"        la provenance
 *     editorial_addition = true                      c'est un ajout, non une transcription
 *     clarity_summary    = true                      il résume pour éclairer
 *
 * ⛔ LE RENDU SE DÉCLENCHE SUR `reader_style`, ET SUR LUI SEUL. `editorial_role` dit qui
 * parle, et Corpus Scriptura signe aussi des citations, des traductions et des attributions
 * qui ne sont pas des explications : mesuré le 14 septembre 2026, 40 blocs portent le style
 * et 25 autres blocs de Corpus Scriptura ne le portent pas. Les colorer tous rangerait une
 * traduction parmi les éclaircissements.
 *
 * ⛔ AUCUN IDENTIFIANT DE BLOC n'est écrit nulle part : toute clarification future qui porte
 * le style se rend de la même façon, sans qu'on touche au code. ⚠️ Le compte le prouve : la
 * mission annonçait 15 blocs le matin même, la passe en avait posé 40 le soir.
 *
 * ⛔ LE LIBELLÉ EST UNE DONNÉE DE PRÉSENTATION, jamais un préfixe du texte. Il vit dans sa
 * propre boîte ; le texte enregistré — la colonne `text`, et elle seule — ne change pas d'un
 * caractère. On n'écrit jamais « Note de Corpus Scriptura : La note explique… ».
 *
 * ⚠️ `editorial_origin`, `editorial_addition` et `clarity_summary` sont CONNUS et ne sont PAS
 * projetés : le rendu ne les lit pas, et un champ que rien ne lit n'a pas à traverser le
 * réseau une fois par bloc (voir `lireMetadonneesBlocNote`).
 *
 * Module PUR, testé dans `explicationCorpus.test.ts`.
 */

/** Le seul style de lecture qu'un bloc de note puisse déclarer aujourd'hui. */
export const STYLE_EXPLICATION_CORPUS = 'corpus_explanation' as const

/** Le vocabulaire des styles de lecture, CLOS : une valeur inconnue vaut « rien de
 *  déclaré », et le bloc se rend comme tout autre. */
export const STYLES_LECTURE_BLOC = [STYLE_EXPLICATION_CORPUS] as const
export type StyleLectureBloc = typeof STYLES_LECTURE_BLOC[number]

/** Le libellé quand la donnée n'en déclare pas. */
export const LIBELLE_EXPLICATION_CORPUS = 'Corpus Scriptura'

/** La classe du bloc et celle de son libellé. ⛔ La COULEUR vit dans la feuille, sous ces
 *  noms, et jamais en style en ligne : c'est ce qui la fait suivre les deux thèmes. */
export const CLASSE_EXPLICATION_CORPUS = 'cs-note-explication-corpus'
export const CLASSE_LIBELLE_EXPLICATION_CORPUS = 'cs-note-explication-corpus__libelle'

/** Lit `metadata.reader_style` dans son vocabulaire clos. */
export function styleLectureSur(valeur: unknown): StyleLectureBloc | null {
  return (STYLES_LECTURE_BLOC as readonly unknown[]).includes(valeur) ? valeur as StyleLectureBloc : null
}

/** Lit `metadata.reader_label` : une chaîne non vide, débarrassée de ses blancs de bord. */
export function libelleLectureSur(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null
  const libelle = valeur.trim()
  return libelle === '' ? null : libelle
}

/** Le bloc est-il une explication de Corpus Scriptura ? ⛔ Le style, et lui seul : jamais
 *  le rôle éditorial. */
export function estExplicationCorpus(bloc: { readerStyle?: string | null }): boolean {
  return bloc.readerStyle === STYLE_EXPLICATION_CORPUS
}

/** Le libellé que le lecteur voit : celui que la donnée déclare, sinon « Corpus Scriptura ». */
export function libelleExplicationCorpus(bloc: { readerLabel?: string | null }): string {
  return libelleLectureSur(bloc.readerLabel) ?? LIBELLE_EXPLICATION_CORPUS
}
