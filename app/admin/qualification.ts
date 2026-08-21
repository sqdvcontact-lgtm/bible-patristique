// Logique PARTAGÉE et pure du système de qualification scientifique, isolée pour être
// testable sans la base ni React. On n'y recalcule JAMAIS la valeur scientifique finale
// d'un ouvrage (statut_scientifique) : cela reste le travail de Supabase. On n'y traite
// que deux correspondances fixes et documentées.

// Correspondance imposée par la base (contrainte auteurs_valeur_score_statut_chk et
// équivalents éditeurs / collections) : à un score de rang répond un statut d'usage.
// 1 → référence, 2 → solide, 3 et 4 → secondaire, 5 → exclu, absence de score → à vérifier.
// Le code DOIT écrire ce statut avec le score, sinon la base refuse l'écriture.
export type StatutUsage = 'reference' | 'solide' | 'secondaire' | 'exclu' | 'a_verifier'

export function statutUsagePourScore(score: number | null | undefined): StatutUsage {
  switch (score) {
    case 1: return 'reference'
    case 2: return 'solide'
    case 3:
    case 4: return 'secondaire'
    case 5: return 'exclu'
    default: return 'a_verifier'
  }
}

// Traduit un refus PostgreSQL (contrainte, RLS) en message clair pour l'admin (§10).
// On n'effectue pas de mise à jour optimiste définitive : ce message accompagne la
// restauration de l'état précédent.
export function messageErreurQualification(msg: string): string {
  const s = msg || ''
  if (/row-level security/i.test(s))
    return "Écriture refusée : la base n’autorise pas encore cette modification (politique RLS admin manquante)."
  if (/motif_statut_scientifique|reserve_motif|reserve.*motif|motif.*(oblig|reserve)/i.test(s))
    return "Un motif est obligatoire (exclusion manuelle ou mise en réserve)."
  if (/score_statut|statut_usage.*score/i.test(s))
    return "Le statut d’usage doit correspondre au score (1 référence, 2 solide, 3-4 secondaire, 5 exclu)."
  // Refus du trigger de contrôle d'usage (lien vérifié / déclaré utilisé) et de la
  // contrainte de validation éditoriale : la base impose retenu/secondaire, un statut
  // éditorial non rejeté et un usage admis dans les notices.
  if (/ne peut être valid|déclaré utilis|statut[_ ]scientifique|statut[_ ]editorial|garantie|\bvalid(e|é)/i.test(s))
    return "Cet ouvrage ne peut pas être validé ni déclaré utilisé tant que sa valeur scientifique (retenu ou source secondaire), son statut éditorial et son usage dans les notices ne le permettent pas."
  return "Enregistrement refusé par la base : " + s
}
