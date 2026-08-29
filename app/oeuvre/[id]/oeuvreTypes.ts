import type { AuteurOeuvre } from '@/app/lib/auteursOeuvre'
import type { AncreNoteStructureeProjection } from '@/app/lib/appelsNotesStructurees'
import type { BlocOriginal } from './bilingueAlignement'

export type VRef = { id: string; label: string; textes: Record<string, string>; livre: string; chapitre: string; verset: string }
export type NoteBlocData = {
  blockId: string
  rank: number
  kind: 'lemma' | 'commentary' | 'quotation' | 'translation' | 'reference' | 'attribution'
  form: 'prose' | 'verse'
  language?: string | null
  text: string
  rendering?: string | null
  needsReview: boolean
  targetBlockId?: string | null
  translationOf?: string | null
  /** `metadata.editorial_role`. C'est LUI, et non `kind`, qui désigne un bloc
   *  d'apparat critique : `commentary` couvre aussi la note de prose ordinaire.
   *  Voir `app/lib/apparatCritique.ts`. */
  editorialRole?: string | null
  /** `metadata.printed_line` — la ligne de l'édition imprimée. ⛔ Ne paraît
   *  JAMAIS dans la lecture ordinaire : elle ne sert qu'à retirer le préfixe
   *  redondant que la transcription a laissé en tête du texte, et à situer
   *  l'entrée côté administration. */
  printedLine?: number | null
  /** `metadata.visual_review_reason` — contrôle sur fac-similé demandé. Signalé
   *  aux seuls administrateurs ; aucun drapeau n'est jamais posé depuis ici. */
  visualReviewReason?: string | null
  /** `metadata.human_validated`. Lu, jamais écrit. */
  humanValidated?: boolean | null
}
export type NoteStructuree = { noteKey: string; noteNumber: number; blocks: NoteBlocData[] }
export type NoteAffichee = string | NoteStructuree
export type SegData = {
  id: number
  idTexte: string
  segmentKey?: string | null
  numero: number
  numeroSource: number
  // Projection d'affichage (appels structurés matérialisés) ; `texte` demeure la
  // donnée canonique utilisée par l'édition, la copie et le signalement.
  texteAffichage?: string
  texte: string
  versets: VRef[]
  notes?: Record<string, NoteAffichee>
  paragraphe?: number | null
  rang?: number | null
  texteOriginal?: string | null
  /** Le segment du texte en langue originale dont `texteOriginal` est la copie
   *  (`segment_metadata.original_segment_key`). C'est par lui qu'on retrouve les
   *  notes de ce bloc latin : elles pendent au texte original, pas à la traduction. */
  cleOriginal?: string | null
  /** `texteOriginal` avec ses appels de note matérialisés, comme `texteAffichage`
   *  pour le corps. ⛔ Jamais renvoyé dans un `update` Supabase. */
  texteOriginalAffichage?: string
  /** Le GROUPE d'alignement auquel ce segment appartient — l'unité qui se recoupe d'une
   *  colonne à l'autre en lecture bilingue, et qui y tient lieu de paragraphe. C'est par
   *  lui qu'on trouve l'original en regard, dans `blocsOriginal`. `null` quand aucun
   *  alignement ne couvre le segment : il retombe alors sur `paragraphe`. */
  groupeOriginal?: string | null
  /** Les notes du bloc latin, séparées de `notes` qui sert la colonne française :
   *  un même segment porte les deux, et les mêler ferait sortir l'apparat de Knöll
   *  dans le texte d'Arnauld d'Andilly. */
  notesOriginal?: Record<string, NoteAffichee>
  nature?: string | null
  espaceTextuel?: string | null
  joinBefore?: string | null
  /** La position du bord gauche de la ligne sur la page imprimée, relevée à
   *  l'océrisation (`segment_metadata.indent_inches`). C'est d'elle que se déduisent
   *  les alinéas poétiques — voir `app/lib/compositionVers.ts`. */
  alinea?: number | null
  /** La ligne ouvre-t-elle une strophe (`segment_metadata.stanza_before`) ?
   *  ⚠️ `null` veut dire « l'édition n'a rien dit », et non « non » : c'est cette
   *  distinction qui commande le repli sur `paragraphe`. */
  stropheAvant?: boolean | null
  /** Le numéro du VERSET biblique porté par un segment de nature `verset`
   *  (`segment_metadata.biblical_verse_number`), écrit à la main. `null` quand
   *  l'édition ne le donne pas : le bloc se lit alors sans numéros. */
  numeroVerset?: string | null
  /** La FORME du segment : `vers`, ou rien. ⛔ Axe SÉPARÉ de la nature — dans
   *  l'apparat celle-ci vaut déjà `apparat_critique`. Voir `estEnVers`. */
  forme?: string | null
}
export type GroupeData = {
  niv1: string; niv2: string; niv3: string; niv4: string
  niv1_texte?: string; niv2_texte?: string; niv3_texte?: string; niv4_texte?: string
  anchor: string; itemIds: number[]
}
export type TocEntry = { niv1: string; niv2: string; anchor: string }
export type Commentaire = { id: number; texte: string; valide: boolean; created_at: string }
// Le titre seul ne suffit pas à nommer une œuvre : deux éditions d'un même texte le
// partagent, normalisé, et « Du même auteur » en donnait alors deux lignes identiques.
// Les champs d'édition suivent donc le titre partout où la liste doit départager.
export type OeuvreResumee = {
  id_oeuvre: string; titre: string; note?: string | null
  trad_auteur?: string | null; editeur?: string | null; ville?: string | null
  date_publication?: string | null; langue_originale?: string | null; langue_trad?: string | null
}

export type VersionTextuelle = {
  idTexte: string
  titre: string
  langue: string | null
  traducteur: string | null
  anneeEdition: number | null
  editionLabel: string | null
  sourceUrl: string | null
  catalogueNoticeIdLigne: string | null
  metadata: Record<string, unknown>
  isDefault: boolean
  isPublic: boolean
  statut: string | null
  labelCourt: string
  traducteurLabel: string | null
  editionDescription: string | null
  publicationLabel: string | null
  villeEdition: string | null
  editeurEdition: string | null
  dateEdition: string | null
}

export type AlignementDisponible = {
  alignmentSetId: string
  referenceTextId: string
  alignedTextId: string
  referenceLabel: string
  alignedLabel: string
  // Langue de chaque colonne : un alignement peut confronter deux traductions
  // françaises (Boèce) ou le latin et le français (La Cité de Dieu). La colonne en
  // langue originale se compose alors en sans-serif, comme en lecture bilingue.
  referenceLangue: string | null
  alignedLangue: string | null
  // `paragraph`, `segment` ou `division` — l'étiquette de l'éditeur. ⛔ Elle ne désigne
  // plus l'ensemble qui porte la lecture bilingue : c'est `nbGroupes` qui le fait, et
  // elle ne sert qu'à départager (voir `bilingueAlignement.ts`).
  alignmentLevel?: string | null
  // Nombre de groupes de l'ensemble : la mesure de sa FINESSE, et donc ce qui le
  // désigne pour porter la lecture. Chargé seulement quand plusieurs alignements se
  // disputent la même paire de textes ; `null` partout ailleurs, faute d'avoir à
  // choisir.
  nbGroupes?: number | null
  status: string | null
}

/** Une colonne se compose en sérif, sauf le texte en langue originale mis en
 *  regard du français, qui passe en sans-serif pour se distinguer d'un coup d'œil.
 *  Fonction pure, testée dans `polices.test.ts`. */
export function estColonneOriginale(langue: string | null | undefined): boolean {
  const l = (langue ?? '').trim().toLowerCase()
  return l.length > 0 && l !== 'français' && l !== 'francais'
}

export type Props = {
  // Libellé de tous les auteurs (« Augustin d’Hippone et Possidius ») : c'est lui
  // qui nomme l'œuvre au frontispice, dans les citations et dans l'historique.
  auteur: string
  // Premier auteur — conservé pour les surfaces qui n'en visent qu'un.
  auteurId?: string
  // Tous les auteurs, à égalité, dans l'ordre d'affichage.
  auteurs?: AuteurOeuvre[]
  idOeuvre: string
  idTexte: string
  estAdmin: boolean
  versionsTextuelles: VersionTextuelle[]
  alignementsDisponibles: AlignementDisponible[]
  notesStructurees?: Record<string, Record<string, NoteStructuree>>
  ancresNotesStructurees?: Record<string, AncreNoteStructureeProjection[]>
  /** Notes et ancres du TEXTE EN LANGUE ORIGINALE lu en regard, indexées par la
   *  `segment_key` de ce texte. Elles servent la seconde colonne du bilingue, que la
   *  traduction ne peut pas fournir : son `texte_original` n'est qu'une copie. */
  notesOriginales?: Record<string, Record<string, NoteStructuree>>
  ancresNotesOriginales?: Record<string, AncreNoteStructureeProjection[]>
  /** L'original mis en regard, groupe d'alignement par groupe d'alignement. C'est la
   *  SEULE source de la colonne de droite quand l'œuvre est alignée : le texte y est
   *  lu depuis ses propres segments, où il n'existe qu'une fois. Vide quand l'œuvre
   *  n'a pas d'alignement — la colonne retombe alors sur `segments.texte_original`,
   *  repli qui s'éteindra avec elle (voir `bilingueAlignement.ts`). */
  blocsOriginal?: Record<string, BlocOriginal>
  niv1List: string[]
  niv1TexteMap?: Record<string, string>
  niveauxSommaire?: number
  niveauxCorps?: number
  txtSommaire?: boolean[]
  txtCorps?: boolean[]
  afficherNumeros?: boolean
  lectureTexteEntier?: boolean
  // `nb_signes` mesure le texte PAR DÉFAUT de l'œuvre, et lui seul : la fiche
  // « À propos de cette édition » ne l'annonce donc que sur cette édition-là.
  oeuvre: { titre: string; titre_affichage?: string | null; sous_titre?: string; titre_original?: string; trad_auteur?: string; trad_date?: string; commentaire_traduction?: string | null; note_editoriale_secondaire?: string | null; editeur?: string; collection?: string; ville?: string; date_publication?: string; date_mise_en_ligne?: string | null; id_oeuvre?: string; date_composition?: string | null; langue_originale?: string | null; genres?: string[] | null; url_source?: string | null; nb_signes?: number | null }
  groupes: GroupeData[]
  segments: SegData[]
  tocApparat: TocEntry[]
  groupesApparat: GroupeData[]
  segmentsApparat: SegData[]
  segmentCibleId?: number | null
  niv1Initial?: string | null
  vueInitiale?: 'texte' | 'apparat'
  comparaisonInitiale?: boolean
  alignmentSetIdInitial?: string | null
  comparaisonLivreInitial?: number
  comparaisonDivisionInitiale?: number
  // Le serveur n'a envoyé que la 1re tranche du niv1 initial : le client charge
  // le reste en tâche de fond (grosses divisions).
  niv1InitialPartiel?: boolean
}

export type ChampOeuvre = 'titre' | 'titre_affichage' | 'sous_titre' | 'titre_original' | 'trad_auteur'

// Le titre d'une œuvre vit dans DEUX colonnes, et l'on ne modifie pas la même
// chose selon celle que l'on vise. `titre` est le titre de catalogue : il nomme
// l'œuvre dans la bibliothèque, la recherche, les citations et le fil d'Ariane,
// et il s'écrit d'un seul tenant. `titre_affichage` est sa composition pour le
// frontispice seul : c'est là que vivent les sauts de ligne voulus par l'auteur.
// Dès qu'il est renseigné, c'est LUI qui paraît sur la page de titre, et une
// correction portée sur `titre` y reste donc invisible.
export type VarianteTitre = { champ: ChampOeuvre; libelle: string; texte: string; aide: string }

// Description de ce qui est en cours d'édition dans la modale admin :
// un segment de texte, un titre de niveau 2/3/4 rattaché à un groupe,
// ou un champ de la fiche œuvre (titre, sous_titre, titre_original, trad_auteur…).
export type EditionCible =
  | { type: 'segment'; seg: SegData }
  | { type: 'titre'; niveau: 1 | 2 | 3 | 4; groupe: GroupeData; texteActuel: string; schemaTexte: boolean }
  | { type: 'titre_oeuvre'; champ: ChampOeuvre; texteActuel: string; variantes?: VarianteTitre[] }
