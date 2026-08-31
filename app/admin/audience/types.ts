// Contrat de la RPC `audience_tableau_bord(p_jours)`.
//
// ⛔ Il n'y a rien de nominatif ici, et il ne doit rien y entrer. Une vue de page
// ne porte ni adresse IP ni identifiant de compte : elle ne sait dire que si une
// session était ouverte. Ajouter une colonne qui rattacherait une vue à quelqu'un
// ferait sortir la mesure de la dispense de consentement (voir la migration
// 20260831180000_audience_mesure_maison.sql et la page Confidentialité, point 8).

export type SerieJour = {
  jour: string
  vues: number
  visiteurs: number
  comptes: number
  livres: number
}

export type TableauAudience = {
  genere_le: string
  jours: number
  depuis: string
  /** Nul tant que la collecte n'a rien recueilli : la page le dit alors en clair. */
  premiere_vue: string | null
  /**
   * Horodatage complet, non une date : le témoin de panne se lit en heures autant
   * qu'en jours. Une collecte en panne et une absence de visiteurs rendent les
   * mêmes zéros, et c'est le seul champ qui les sépare.
   */
  derniere_vue: string | null
  resume: {
    vues_jour: number
    vues_veille: number
    vues_periode: number
    visiteurs_jour: number
    /**
     * ⛔ PAS un compte de visiteurs distincts sur la période, qui serait faux :
     * l'empreinte tournant chaque jour, un lecteur assidu compterait autant de fois
     * qu'il revient. C'est la moyenne des visiteurs QUOTIDIENS, jours creux compris,
     * et elle peut donc porter une décimale.
     */
    visiteurs_moyens: number
    part_connectee: number
    comptes_total: number
    comptes_periode: number
    livres_periode: number
    liste_attente: number
  }
  serie: SerieJour[]
  /**
   * `libelle` est nul quand la base n'a rien à nommer : le nom se compose alors
   * côté page, par `app/lib/audienceLibelles.ts`.
   *
   * ⚠️ La colonne « visiteurs » a quitté ce classement : elle portait le même
   * défaut que le total de la période, des visiteurs-jours sous un autre nom.
   */
  pages: { chemin: string; vues: number; libelle: string | null }[]
  rubriques: { rubrique: string; vues: number }[]
  referents: { referent: string; vues: number }[]
  pays: { pays: string; vues: number }[]
  appareils: { appareil: string; vues: number }[]
  comptes: {
    total: number
    avec_essai: number
    actifs_7j: number
    actifs_30j: number
    derniers: { pseudo: string | null; created_at: string }[]
    liste_attente: number
    liste_attente_a_prevenir: number
  }
  lectures: {
    livres_total: number
    favoris_periode: number
    prelevements_periode: number
    commentaires_periode: number
    essais_publies: number
    livres: { livre_code: string; lectures: number; lecteurs: number }[]
    versets: { id_verset: string; nb_lectures: number }[]
    essais: { titre: string; nb_vues: number | null }[]
  }
}
