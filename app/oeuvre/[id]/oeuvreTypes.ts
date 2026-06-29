export type VRef = { id: string; label: string; textes: Record<string, string>; livre: string; chapitre: string; verset: string }
export type SegData = { id: number; numero: number; texte: string; versets: VRef[] }
export type GroupeData = {
  niv1: string; niv2: string; niv3: string; niv4: string
  niv1_texte?: string; niv2_texte?: string; niv3_texte?: string; niv4_texte?: string
  anchor: string; itemIds: number[]
}
export type TocEntry = { niv1: string; niv2: string; anchor: string }
export type Commentaire = { id: number; texte: string; valide: boolean; created_at: string }
export type OeuvreResumee = { id_oeuvre: string; titre: string }

export type Props = {
  auteur: string
  auteurId?: string
  idOeuvre: string
  estAdmin: boolean
  niv1List: string[]
  niv1TexteMap?: Record<string, string>
  niveauxSommaire?: number
  niveauxCorps?: number
  txtSommaire?: boolean[]
  txtCorps?: boolean[]
  afficherNumeros?: boolean
  oeuvre: { titre: string; sous_titre?: string; titre_original?: string; trad_auteur?: string; trad_date?: string; editeur?: string; collection?: string; ville?: string; date_publication?: string; id_oeuvre?: string }
  groupes: GroupeData[]
  segments: SegData[]
  tocApparat: TocEntry[]
  groupesApparat: GroupeData[]
  segmentsApparat: SegData[]
  segmentCibleId?: number | null
  niv1Initial?: string | null
  vueInitiale?: 'texte' | 'apparat'
}

// Description de ce qui est en cours d'édition dans la modale admin :
// un segment de texte, un titre de niveau 2/3/4 rattaché à un groupe,
// ou le titre principal de l'œuvre (table oeuvres, hors segments).
export type EditionCible =
  | { type: 'segment'; seg: SegData }
  | { type: 'titre'; niveau: 1 | 2 | 3 | 4; groupe: GroupeData; texteActuel: string; schemaTexte: boolean }
  | { type: 'titre_oeuvre'; texteActuel: string }
