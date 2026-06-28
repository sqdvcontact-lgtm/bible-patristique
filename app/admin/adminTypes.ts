export type Commentaire = { id: number; texte: string; auteur_nom: string; auteur_mail: string; valide: boolean; created_at: string; id_segment: number | null; id_verset: string | null; user_id?: string | null; demande_validation?: boolean; certifie?: boolean }
export type Signalement  = { id: number | string; message: string; traite: boolean; created_at: string; id_segment: number | null; id_verset?: string | null; user_id?: string | null; source?: 'signalements' | 'quiz_signalements' }
export type SegInfo      = { texte: string; numero: number; id_oeuvre: string }
export type Oeuvre       = { id_oeuvre: string; titre: string; titre_original: string | null; profondeur_sommaire?: number | null }
export type Auteur       = { id_auteur: string; nom: string; nom_original?: string | null; titre?: string | null; dates: string | null; date_naissance?: string | null; date_mort?: string | null; siecle?: string | null; tradition?: string | null; traditions?: string[] | null; note?: string | null; note_biographique?: string | null; note_theologique?: string | null; langue_principale?: string | null; oeuvres: Oeuvre[] }

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
  photo: string | null
  photo_position: {
    bandeau:  { x: number; y: number; scale: number }
    lateral:  { x: number; y: number; scale: number }
  } | null
}

export type LignePreview = {
  id: string; segment_numero: string; segment_texte: string
  ref_niv1: string; ref_niv2: string; ref_niv3: string
  lien_1: string; lien_2: string; lien_3: string; lien_4: string; fiabilite: string
  _lien_1_orig?: string; _fiabilite_orig?: string; _texte_orig?: string; _modifie?: boolean
}

export type Essai = { id: number; titre: string; sous_titre: string | null; resume: string | null; categories: string[]; statut: string; created_at: string; updated_at?: string | null; publie_at?: string | null; user_id: string; auteur_pseudo: string | null }
export type EssaiPublie = {
  id: number
  titre: string
  sous_titre: string | null
  auteur: string
  created_at: string
  updated_at: string | null
  publie_at: string | null
  statut: string
  nb_vues: number
  nb_likes: number
  nb_commentaires: number
  nb_signes: number
  nb_signalements: number
}

export type AdminProps = {
  commentaires: Commentaire[]
  signalements: Signalement[]
  demandesCertification: Commentaire[]
  essaisEnAttente: Essai[]
  essaisModification: Essai[]
  essaisPublies: EssaiPublie[]
  essaisBrouillons: EssaiPublie[]
  versetMap: Record<string, string>
  segMap: Record<number, SegInfo>
  auteurs: Auteur[]
  traductions: Traduction[]
  nbVerifications: number
  actionDeconnexion: () => Promise<void>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
  actionMarquerTraite: (id: number | string) => Promise<void>
  actionSupprimerSignalement: (id: number | string) => Promise<void>
  actionCertifier: (id: number) => Promise<void>
  actionRetirerDemandeCertification: (id: number) => Promise<void>
  actionPublierEssai: (id: number) => Promise<void>
  actionRenvoyerBrouillonEssai: (id: number, note: string, refus?: boolean) => Promise<void>
}

export type Onglet = 'bibliotheque' | 'ajouter-oeuvre' | 'depot-oeuvre' | 'traductions' | 'verifications' | 'moderation' | 'essais'
