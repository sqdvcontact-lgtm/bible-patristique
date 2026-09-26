import type { ReactNode } from 'react'
import type { AuteurOeuvre } from '@/app/lib/auteursOeuvre'
import type { AncreNoteStructureeProjection } from '@/app/lib/appelsNotesStructurees'
import type { RetourLecture } from '@/app/lib/retourLecture'
import type { BlocOriginal } from './bilingueAlignement'
import type { NatureBlocNote } from '@/app/lib/naturesNote'
import type { NoticeBibliographique } from '@/app/lib/referenceBibliographique'
import type { DegradationChargement } from '@/app/lib/chargementTolerant'
import type { SectionApparat } from '@/app/lib/oeuvreSelects'
import type { StyleLectureBloc } from '@/app/lib/explicationCorpus'
import type { RenvoiNoteData } from '@/app/lib/renvoisNotes'

export type VRef = { id: string; label: string; textes: Record<string, string>; livre: string; chapitre: string; verset: string }
export type NoteBlocData = {
  blockId: string
  rank: number
  /** La NATURE du bloc : ce qu'il EST. Vocabulaire clos, rangé en quatre familles
   *  dans `app/lib/naturesNote.ts`, qui reflète la contrainte SQL
   *  `texte_note_blocs_kind_check`. ⛔ Ne pas recopier l'union ici : deux listes
   *  parallèles finissent par diverger, et un bloc d'une nature inconnue du rendu
   *  ne paraît nulle part, en silence. */
  kind: NatureBlocNote
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
  /** `metadata.citation_layout` — la disposition que la DONNÉE déclare : `block`, une
   *  citation SORTIE du fil de la note ; `inline`, une citation qui y reste. C'est la
   *  seule métadonnée de DISPOSITION que le rendu lit (voir `dispositionCitation`,
   *  `compositionNote.ts`). ⛔ La nature et la disposition sont deux axes : on ne change
   *  pas un `kind` pour obtenir un retrait. */
  citationLayout?: 'block' | 'inline' | null
  /** `metadata.bibliography_list_item` — le bloc est une ENTRÉE d'une série
   *  bibliographique (charte § 47.2, « SÉRIES BIBLIOGRAPHIQUES DANS LES NOTES ») : la
   *  donnée matérialise chaque œuvre d'une énumération dans son propre bloc `reference`,
   *  et le rendu réunit les entrées qui se suivent en une liste
   *  (`serieBibliographiqueNote.tsx`). Posé quand il vaut vrai, absent sinon. */
  bibliographyListItem?: boolean
  /** `metadata.reader_style` — la présentation que la DONNÉE demande au lecteur
   *  (`app/lib/explicationCorpus.ts`). ⛔ C'est lui, et jamais `editorialRole`, qui
   *  déclenche le rendu d'une explication de Corpus Scriptura. Posé quand il est reconnu,
   *  absent sinon. */
  readerStyle?: StyleLectureBloc | null
  /** `metadata.reader_label` — le libellé de présentation qui accompagne ce style.
   *  ⛔ Il se compose dans sa propre boîte, jamais au début du texte. */
  readerLabel?: string | null
  /** Les RENVOIS vers d'autres notes que porte ce bloc (`texte_note_renvois`), dans
   *  l'ordre de lecture. ⛔ Chacun vise une note par son identité stable ; sa tête —
   *  numéro affiché, titre de niveau 1 — se résout au chargement, jamais dans la donnée
   *  (`app/lib/renvoisNotes.ts`). Absent quand le bloc n'en porte aucun. */
  renvois?: RenvoiNoteData[]
}
export type NoteStructuree = {
  noteKey: string
  /** `texte_notes.note_number` — le numéro INTERNE, qui porte l'identité et l'ordre
   *  de lecture. ⛔ Ne s'affiche plus : `texte_note_ancres.marker` vaut exactement
   *  `[[note_number]]`, et 23 569 ancres en dépendent. */
  noteNumber: number
  /** Le numéro que le LECTEUR voit : il repart à 1 à chaque division de niveau 1, et
   *  l'apparat critique tient sa propre série (charte § 13.8). Calculé au chargement
   *  par `numerosAffiches`, jamais stocké. Absent quand la division n'a pas pu être
   *  établie : l'appel retombe alors sur `noteNumber`. */
  displayNumber?: number | null
  blocks: NoteBlocData[]
}
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
  /** Le GROUPE d'alignement auquel ce segment appartient — l'unité qui se recoupe d'une
   *  colonne à l'autre en lecture bilingue, et qui y tient lieu de paragraphe. C'est par
   *  lui qu'on trouve l'original en regard, dans `blocsOriginal`. `null` quand aucun
   *  alignement ne couvre le segment : il retombe alors sur `paragraphe`. */
  groupeOriginal?: string | null
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
  /** L'OUVRAGE que cite ce segment bibliographique (`segment_metadata.ouvrage_id`).
   *  Quand la notice est chargée, c'est elle qui se compose, non `texte`, qui n'est
   *  plus qu'une projection de secours. `null` pour tout segment ordinaire. */
  ouvrageId?: number | null
  /** Le style de composition que la DONNÉE déclare (`segment_metadata.presentation.style`).
   *  `bibliographie` fait composer le bloc dans la famille bibliographique commune de
   *  l'apparat (charte § 47.2), non en paragraphe de lecture. Absent quand la donnée ne
   *  déclare rien, c'est-à-dire presque toujours : la clé ne voyage alors pas. */
  presentationStyle?: string | null
}
/** Les huit champs de titre d'un groupe — ceux qu'une note peut viser. */
export type ChampTitre = 'niv1' | 'niv1_texte' | 'niv2' | 'niv2_texte' | 'niv3' | 'niv3_texte' | 'niv4' | 'niv4_texte'

export type GroupeData = {
  niv1: string; niv2: string; niv3: string; niv4: string
  niv1_texte?: string; niv2_texte?: string; niv3_texte?: string; niv4_texte?: string
  anchor: string; itemIds: number[]
  /**
   * Les titres AVEC leurs appels de note matérialisés, quand une ancre en vise un.
   *
   * ⛔ À CÔTÉ des titres, jamais à leur place : `niv1` est une IDENTITÉ — la navigation,
   * le sommaire, `changerNiv1` et la RPC `get_niv1_list` s'y appuient tous —, et y
   * glisser un « [[12]] » romprait le rapprochement. C'est le partage que `SegData` fait
   * déjà entre `texte` et `texteAffichage`.
   * ⚠️ Absent quand rien n'est à projeter, c'est-à-dire presque toujours : 34 ancres du
   * corpus sont dans ce cas (mesuré le 9 septembre 2026).
   */
  titresAffichage?: Partial<Record<ChampTitre, string>>
  /** L'apparat SEUL en porte une : il se lit en deux sections, l'auteur puis l'éditeur
   *  (`partagerLApparat`). Absente au corps, qui n'a rien à distinguer. */
  section?: SectionApparat
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
  /** La mesure qui partage les œuvres des OPUSCULES (`app/lib/opuscules.ts`), la même
   *  qu'à la bibliothèque. ⚠️ Sans elle aucune entrée n'est un opuscule et la section ne
   *  paraît jamais : c'est la panne exacte que la bibliothèque a portée six semaines. */
  nb_signes?: number | null
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
  /** L'édition est-elle déclarée indisponible ? ⛔ C'est la SEULE chose que le site
   *  lisait dans `oeuvre_textes.metadata`, lequel ne voyage plus : le carnet de
   *  l'atelier y pèse jusqu'à 72 000 signes par texte. */
  indisponible: boolean
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
  /** Le responsable SCIENTIFIQUE d'une édition critique — « Pius Knöll (éd.) » — tiré
   *  de `edition_label`. Ce n'est ni un traducteur, ni une ville, ni une maison. */
  responsableEdition: string | null
  /** La collection de CETTE édition (« CSEL 33 »). ⛔ Distincte de `oeuvres.collection`,
   *  qui ne décrit que le texte par défaut : voir `identiteEdition`. */
  collectionEdition: string | null
  /** Ce que CETTE édition déclare pour qu’on la lise : ses manuscrits et leurs sigles,
   *  ses abréviations, ses conventions de transcription (charte § 5.6).
   *  ⛔ Propre au TEXTE, jamais à l’œuvre : les manuscrits de Knöll sont ceux de son
   *  latin, et la traduction d’Arnauld d’Andilly, sous la même œuvre, n’en a aucun.
   *  ⚠️ `null` ou vide veut dire « rien à déclarer », et la rubrique ne paraît pas. */
  informationsComplementaires: string | null
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
  /** Vrai quand la page n'a reçu que les notes des segments qu'elle rend (et, depuis le
   *  2026-09-21, AUCUNE ancre) : le navigateur demande le reste quand il en a besoin
   *  (voir `notesDuTexteUtiles`, `notesEnRegard.ts`). */
  notesStructureesPartielles?: boolean
  /** Notes et ancres du TEXTE EN LANGUE ORIGINALE lu en regard, indexées par la
   *  `segment_key` de ce texte. Elles servent la seconde colonne du bilingue, que la
   *  traduction ne peut pas fournir. */
  notesOriginales?: Record<string, Record<string, NoteStructuree>>
  ancresNotesOriginales?: Record<string, AncreNoteStructureeProjection[]>
  /** Vrai quand la page n'a reçu que les notes du texte en regard qu'elle compose : le
   *  navigateur demande le reste quand il en a besoin (voir `notesEnRegard.ts`). */
  notesOriginalesPartielles?: boolean
  /** L'original mis en regard, groupe d'alignement par groupe d'alignement. C'est la
   *  SEULE source de la colonne de droite quand l'œuvre est alignée : le texte y est
   *  lu depuis ses propres segments, où il n'existe qu'une fois. Vide quand l'œuvre
   *  n'a pas d'alignement : rien ne se met alors en regard (voir `bilingueAlignement.ts`). */
  blocsOriginal?: Record<string, BlocOriginal>
  niv1List: string[]
  niv1TexteMap?: Record<string, string>
  niveauxSommaire?: number
  niveauxCorps?: number
  txtSommaire?: boolean[]
  txtCorps?: boolean[]
  afficherNumeros?: boolean
  lectureTexteEntier?: boolean
  /** La clé du fleuron qui sépare la page de titre du texte (`app/lib/fleurons.ts`).
   *  ⚠️ `null` est le cas ORDINAIRE et veut dire « celui du site », non « aucun ». */
  fleuron?: string | null
  /** Les INTERTITRES COMPOSÉS de l'œuvre, par chemin de division (`compositionTitres.ts`).
   *  ⚠️ Presque toujours vide : un titre ne se compose que là où l'auteur l'a voulu, et
   *  l'identité de la division (`ref_nivN`) reste ce que le sommaire et les ancres lisent. */
  titresComposes?: Record<string, string> | null
  // `nb_signes` mesure le texte PAR DÉFAUT de l'œuvre, et lui seul : la fiche
  // « À propos de cette édition » ne l'annonce donc que sur cette édition-là.
  oeuvre: { titre: string; titre_affichage?: string | null; sous_titre?: string; sous_titre_affichage?: string | null; titre_original?: string; titre_original_affichage?: string | null; auteur_affichage?: string | null; trad_auteur?: string; trad_auteur_affichage?: string | null; provenance_affichage?: string | null; trad_date?: string; commentaire_traduction?: string | null; note_editoriale_complete?: string | null; note_editoriale_complement?: string | null; bibliographie_selective?: string | null; note_editoriale_titre?: string | null; editeur?: string; collection?: string; ville?: string; date_publication?: string; date_mise_en_ligne?: string | null; id_oeuvre?: string; date_composition?: string | null; langue_originale?: string | null; genres?: string[] | null; url_source?: string | null; nb_signes?: number | null }
  groupes: GroupeData[]
  segments: SegData[]
  tocApparat: TocEntry[]
  groupesApparat: GroupeData[]
  segmentsApparat: SegData[]
  /** Les notices des ouvrages que citent les segments d'apparat, par `ouvrage_id`,
   *  chargées avec eux au rendu serveur (`v_references_bibliographiques`). Le client
   *  les complète quand il recharge l'apparat. */
  noticesBibliographiques?: Record<number, NoticeBibliographique>
  /** Les couches SECONDAIRES que le serveur n'a pas pu charger (notes, renvois,
   *  versets cités, original en regard, apparat). La page se lit sans elles et le
   *  dit au lecteur par un bandeau ; voir `app/lib/chargementTolerant.ts`. */
  degradations?: DegradationChargement[]
  segmentCibleId?: number | null
  /** Le segment visé est une REPRISE (on arrive d'un autre texte de l'œuvre, au même
   *  passage) : on s'y pose sans le sélectionner. Voir `passageTexte.ts`. */
  cibleReprise?: boolean
  niv1Initial?: string | null
  vueInitiale?: 'texte' | 'apparat'
  /** Le fil d'Ariane visible, et le retour au verset d'où l'on vient (`?depuis=`),
   *  composés par la page serveur et posés au-dessus du frontispice. */
  filAriane?: ReactNode
  /** Le retour au verset d'où l'on vient, tenu en vue quand le fil d'Ariane ne l'est
   *  plus (`RetourFlottant`). */
  retour?: RetourLecture | null
  // Le serveur n'a envoyé que la 1re tranche du niv1 initial : le client charge
  // le reste en tâche de fond (grosses divisions).
  niv1InitialPartiel?: boolean
}

// ⚠️ TOUT élément de la page de titre a désormais ses deux faces (2026-09-20) : le
// champ de CATALOGUE, d'un seul tenant, et sa COMPOSITION pour le seul frontispice.
// Les correspondances et les libellés vivent dans `compositionTitres.ts`.
// `trad_auteur_affichage` et `provenance_affichage` composent une LIGNE entière, que
// la page formait elle-même à partir de plusieurs champs.
export type ChampOeuvre =
  | 'titre' | 'titre_affichage'
  | 'sous_titre' | 'sous_titre_affichage'
  | 'titre_original' | 'titre_original_affichage'
  | 'trad_auteur' | 'trad_auteur_affichage'
  | 'provenance_affichage'
  | 'auteur_affichage'

// Le titre d'une œuvre vit dans DEUX colonnes, et l'on ne modifie pas la même
// chose selon celle que l'on vise. `titre` est le titre de catalogue : il nomme
// l'œuvre dans la bibliothèque, la recherche, les citations et le fil d'Ariane,
// et il s'écrit d'un seul tenant. `titre_affichage` est sa composition pour le
// frontispice seul : c'est là que vivent les sauts de ligne voulus par l'auteur.
// Dès qu'il est renseigné, c'est LUI qui paraît sur la page de titre, et une
// correction portée sur `titre` y reste donc invisible.
export type VarianteTitre = {
  champ: string
  libelle: string
  texte: string
  aide: string
  /** La face COMPOSÉE. Elle ne s'écrit jamais dans le catalogue : colonne `*_affichage`
   *  pour le frontispice, `oeuvres.titres_composes` pour un intertitre. */
  compose?: boolean
}

// Description de ce qui est en cours d'édition dans la modale admin :
// un segment de texte, un titre de niveau 2/3/4 rattaché à un groupe,
// ou un champ de la fiche œuvre (titre, sous_titre, titre_original, trad_auteur…).
export type EditionCible =
  | { type: 'segment'; seg: SegData }
  | { type: 'titre'; niveau: 1 | 2 | 3 | 4; groupe: GroupeData; texteActuel: string; schemaTexte: boolean; variantes?: VarianteTitre[] }
  | { type: 'titre_oeuvre'; champ: ChampOeuvre; texteActuel: string; variantes?: VarianteTitre[] }
