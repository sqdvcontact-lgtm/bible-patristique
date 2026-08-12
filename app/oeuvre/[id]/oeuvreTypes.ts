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
}
export type NoteStructuree = { noteKey: string; noteNumber: number; blocks: NoteBlocData[] }
export type NoteAffichee = string | NoteStructuree
export type SegData = {
  id: number
  idTexte: string
  segmentKey?: string | null
  numero: number
  numeroSource: number
  texte: string
  versets: VRef[]
  notes?: Record<string, NoteAffichee>
  paragraphe?: number | null
  rang?: number | null
  texteOriginal?: string | null
  nature?: string | null
  espaceTextuel?: string | null
  joinBefore?: string | null
}
export type GroupeData = {
  niv1: string; niv2: string; niv3: string; niv4: string
  niv1_texte?: string; niv2_texte?: string; niv3_texte?: string; niv4_texte?: string
  anchor: string; itemIds: number[]
}
export type TocEntry = { niv1: string; niv2: string; anchor: string }
export type Commentaire = { id: number; texte: string; valide: boolean; created_at: string }
export type OeuvreResumee = { id_oeuvre: string; titre: string; note?: string | null }

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
  status: string | null
}

export type Props = {
  auteur: string
  auteurId?: string
  idOeuvre: string
  idTexte: string
  estAdmin: boolean
  versionsTextuelles: VersionTextuelle[]
  alignementsDisponibles: AlignementDisponible[]
  notesStructurees?: Record<string, Record<string, NoteStructuree>>
  niv1List: string[]
  niv1TexteMap?: Record<string, string>
  niveauxSommaire?: number
  niveauxCorps?: number
  txtSommaire?: boolean[]
  txtCorps?: boolean[]
  afficherNumeros?: boolean
  lectureTexteEntier?: boolean
  oeuvre: { titre: string; titre_affichage?: string | null; sous_titre?: string; titre_original?: string; trad_auteur?: string; trad_date?: string; commentaire_traduction?: string | null; editeur?: string; collection?: string; ville?: string; date_publication?: string; date_mise_en_ligne?: string | null; id_oeuvre?: string; date_composition?: string | null; langue_originale?: string | null; genres?: string[] | null; url_source?: string | null }
  groupes: GroupeData[]
  segments: SegData[]
  tocApparat: TocEntry[]
  groupesApparat: GroupeData[]
  segmentsApparat: SegData[]
  segmentCibleId?: number | null
  niv1Initial?: string | null
  vueInitiale?: 'texte' | 'apparat'
  eligibleParagraphes?: boolean
  comparaisonInitiale?: boolean
  alignmentSetIdInitial?: string | null
  comparaisonLivreInitial?: number
  comparaisonDivisionInitiale?: number
  // Le serveur n'a envoyé que la 1re tranche du niv1 initial : le client charge
  // le reste en tâche de fond (grosses divisions).
  niv1InitialPartiel?: boolean
}

export type ChampOeuvre = 'titre' | 'sous_titre' | 'titre_original' | 'trad_auteur'

// Description de ce qui est en cours d'édition dans la modale admin :
// un segment de texte, un titre de niveau 2/3/4 rattaché à un groupe,
// ou un champ de la fiche œuvre (titre, sous_titre, titre_original, trad_auteur…).
export type EditionCible =
  | { type: 'segment'; seg: SegData }
  | { type: 'titre'; niveau: 1 | 2 | 3 | 4; groupe: GroupeData; texteActuel: string; schemaTexte: boolean }
  | { type: 'titre_oeuvre'; champ: ChampOeuvre; texteActuel: string }
