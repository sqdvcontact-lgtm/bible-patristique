export type VRef = { id: string; label: string; textes: Record<string, string>; livre: string; chapitre: string; verset: string }
export type SegData = { id: number; numero: number; texte: string; versets: VRef[]; notes?: Record<string, string>; paragraphe?: number | null; rang?: number | null; texteOriginal?: string | null; nature?: string | null }
export type GroupeData = {
  niv1: string; niv2: string; niv3: string; niv4: string
  niv1_texte?: string; niv2_texte?: string; niv3_texte?: string; niv4_texte?: string
  anchor: string; itemIds: number[]
}
export type TocEntry = { niv1: string; niv2: string; anchor: string }
export type Commentaire = { id: number; texte: string; valide: boolean; created_at: string }
export type OeuvreResumee = { id_oeuvre: string; titre: string; note?: string | null }
export type VersionTextuelle = {
  id_texte: string
  titre_version: string
  langue?: string | null
  traducteur?: string | null
  is_default?: boolean
}

export type Props = {
  auteur: string
  auteurId?: string
  idOeuvre: string
  estAdmin: boolean
  idTexteActif?: string | null
  versionsTextuelles?: VersionTextuelle[]
  langueTexteActive?: string | null
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
// ou un champ de la fiche œuvre (titre, sous-titre, titre_original, trad_auteur…).
export type EditionCible =
  | { type: 'segment'; seg: SegData }
  | { type: 'titre'; niveau: 1 | 2 | 3 | 4; groupe: GroupeData; texteActuel: string; schemaTexte: boolean }
  | { type: 'titre_oeuvre'; champ: ChampOeuvre; texteActuel: string; variantes?: VarianteTitre[] }
