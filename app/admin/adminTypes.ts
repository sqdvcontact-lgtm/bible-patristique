export type Commentaire = { id: number; texte: string; auteur_nom: string; auteur_mail: string; valide: boolean; created_at: string; id_segment: number | null; id_verset: string | null }
export type Signalement  = { id: number; message: string; traite: boolean; created_at: string; id_segment: number }
export type SegInfo      = { texte: string; numero: number; id_oeuvre: string }
export type Oeuvre       = { id_oeuvre: string; titre: string; titre_original: string | null; profondeur_sommaire?: number | null }
export type Auteur       = { id_auteur: string; nom: string; dates: string | null; siecle: string | null; tradition?: string | null; note?: string | null; aire_geographique?: string | null; langue_principale?: string | null; oeuvres: Oeuvre[] }

export type Traduction = {
  trad_id: string
  nom: string
  auteur: string
  dates: string
  bio_courte: string
  date_publication: string
  confession: string
  langue: string
  commentaire_editorial: string
  ordre: number
}

export type LignePreview = {
  id: string; segment_numero: string; segment_texte: string
  ref_niv1: string; ref_niv2: string; ref_niv3: string
  lien_1: string; lien_2: string; lien_3: string; lien_4: string; fiabilite: string
  _lien_1_orig?: string; _fiabilite_orig?: string; _texte_orig?: string; _modifie?: boolean
}

export type AdminProps = {
  commentaires: Commentaire[]
  signalements: Signalement[]
  segMap: Record<number, SegInfo>
  auteurs: Auteur[]
  traductions: Traduction[]
  actionDeconnexion: () => Promise<void>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
  actionMarquerTraite: (id: number) => Promise<void>
  actionSupprimerSignalement: (id: number) => Promise<void>
}

export type Onglet = 'bibliotheque' | 'ajouter-oeuvre' | 'depot-oeuvre' | 'traductions' | 'verifications' | 'commentaires' | 'signalements' | 'remplacer-segments'