export type Commentaire = { id: number; texte: string; auteur_nom: string; auteur_mail: string; valide: boolean; created_at: string; id_segment: number | null; id_verset: string | null; user_id?: string | null; demande_validation?: boolean; certifie?: boolean; reponse_a?: number | null }
// Message auquel un commentaire répond — pour l'afficher en contexte dans la modération.
export type CommentaireParent = { auteur_nom: string; texte: string }
export type Signalement  = { id: number | string; message: string; traite: boolean; created_at: string; id_segment: number | null; id_verset?: string | null; user_id?: string | null; source?: 'signalements' | 'quiz_signalements'; importance?: string | null; url_source?: string | null }
export type SegInfo      = { texte: string; numero: number; id_oeuvre: string; id_texte: string }
export type Oeuvre = {
  id_oeuvre: string
  titre: string
  // Composition du titre pour la seule page de titre (sauts de ligne éditoriaux).
  // Renseignée, elle y paraît à la place de `titre`.
  titre_affichage?: string | null
  titre_original: string | null
  profondeur_sommaire?: number | null
  sous_titre?: string | null
  trad_auteur?: string | null
  editeur?: string | null
  collection?: string | null
  ville?: string | null
  date_publication?: string | null
  date_composition?: string | null
  url_source?: string | null
  langue_originale?: string | null
  genres?: string[] | null
  niveaux_sommaire?: number | null
  niveaux_corps?: number | null
  texte_sommaire?: string | null
  texte_corps?: string | null
  afficher_numeros?: boolean | null
  // Le seul drapeau de publication (app/lib/oeuvresPublication.ts) et son motif.
  acces_public?: boolean | null
  acces_public_note?: string | null
  commentaire_traduction?: string | null
  // Les trois notes éditoriales publiques : l'œuvre (sa substance), ses points de
  // détail, et le résumé de la page de titre. Voir la migration du 3 septembre 2026.
  note_editoriale_complete?: string | null
  note_editoriale_complement?: string | null
  note_editoriale_titre?: string | null
  // Notes de travail réservées à l'administration : elles ne viennent pas de la
  // table `oeuvres` mais de `oeuvres_commentaires_prives`, lue par la clé de service.
  commentaire_prive?: string | null
}
export type AuteurPhotoPos = { x: number; y: number; scale: number; scaleX?: number; scaleY?: number }
export type AuteurPhotoPositions = { carte: AuteurPhotoPos; fiche: AuteurPhotoPos }

export type Auteur       = { id_auteur: string; nom: string; nom_original?: string | null; titre?: string | null; dates: string | null; date_naissance?: string | null; date_mort?: string | null; siecle?: string | null; traditions?: string[] | null; note?: string | null; note_biographique?: string | null; note_theologique?: string | null; langue_principale?: string | null; chronologie?: string | null; anecdotes?: string | null; influence?: string | null; photo_position?: AuteurPhotoPositions | null; oeuvres: Oeuvre[] }

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
  /** Faux pour la notice bibliographique d'une traduction PATRISTIQUE — celle à
   *  laquelle renvoie `oeuvres.trad_id`. Ces lignes vivent dans la même table que
   *  les traductions bibliques, mais ne paraissent dans aucun sélecteur de lecture. */
  est_biblique: boolean
  /** Commande l'affichage de la NOTICE sur /traductions, et rien d'autre : une ligne
   *  masquée reste offerte dans les sélecteurs de lecture. Ce n'est pas `est_privee`,
   *  qui commande la RLS. */
  visible_public: boolean
  photo: string | null
  photo_encart: string | null
  import_maj_le: string | null
  photo_position: {
    bandeau:  { x: number; y: number; scale: number }
    encart?:  { x: number; y: number; scale: number }
    /** Ancien nom de l'encart, du temps où la même image servait aux deux cadres. */
    lateral?: { x: number; y: number; scale: number }
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

export type CommentairePublication = { id: number; id_essai: number; texte: string; auteur_nom: string; created_at: string; user_id: string | null; titre_essai: string }

export type AdminProps = {
  commentaires: Commentaire[]
  commentairesPublications: CommentairePublication[]
  signalements: Signalement[]
  demandesCertification: Commentaire[]
  essaisEnAttente: Essai[]
  essaisModification: Essai[]
  essaisPublies: EssaiPublie[]
  essaisBrouillons: EssaiPublie[]
  versetMap: Record<string, string>
  versetTexteMap: Record<string, string>
  segMap: Record<number, SegInfo>
  oeuvreTitreMap: Record<string, string>
  signalementAuteurMap: Record<string, string>
  commentaireParentMap: Record<number, CommentaireParent>
  auteurs: Auteur[]
  traductions: Traduction[]
  nbVerifications: number
  // Vrai si au moins une des requêtes de chargement serveur a échoué : la page
  // affiche alors un bandeau plutôt que de présenter des sections vides en silence.
  erreurChargement?: boolean
  actionDeconnexion: () => Promise<void>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
  actionValiderCommentaireEssai: (id: number) => Promise<void>
  actionSupprimerCommentaireEssai: (id: number) => Promise<void>
  actionMarquerTraite: (id: number | string) => Promise<void>
  actionMarquerTraiteSilencieux: (id: number | string) => Promise<void>
  actionSupprimerSignalement: (id: number | string) => Promise<void>
  actionCertifier: (id: number) => Promise<void>
  actionRetirerDemandeCertification: (id: number) => Promise<void>
  actionPublierEssai: (id: number) => Promise<void>
  actionRenvoyerBrouillonEssai: (id: number, note: string, refus?: boolean) => Promise<void>
}

export type Onglet = 'bibliotheque' | 'controle-oeuvres' | 'ouvrages' | 'validation-notices' | 'traductions' | 'editeurs' | 'fiabilite' | 'evenements' | 'verifications' | 'constituer-liens' | 'moderation' | 'lexique' | 'essais' | 'mecenes' | 'charte' | 'charte-accentuation' | 'propositions'
