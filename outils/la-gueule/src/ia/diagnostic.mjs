// Phase B — aides du DIAGNOSTIC (pures). Échantillonnage local représentatif (on n'envoie JAMAIS le
// livre entier au modèle) et construction du profil de traitement.

/**
 * Pages représentatives d'un document : couverture/titre, première page de corps, premier quart,
 * milieu, dernier quart, dernière page, plus les pages atypiques repérées localement (colonnes,
 * beaucoup de blanc, poésie/notes/lettrines…). Renvoie une liste triée, dédupliquée, bornée.
 */
export function pagesEchantillon(nbPages, { atypiques = [], premierCorps = null } = {}) {
  const n = Math.max(0, Math.floor(nbPages || 0))
  if (!n) return []
  const corps = premierCorps || Math.min(3, n)
  const brut = [1, corps, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n, ...(atypiques || [])]
  return [...new Set(brut.map((p) => Math.max(1, Math.min(n, Math.round(p)))))].sort((a, b) => a - b)
}

/**
 * Profil de traitement (§6.4). Valeurs par défaut PRUDENTES : prétraitement inactif ; l'IA PROPOSE,
 * n'impose pas. À écrire dans `profils-traitement/<projet>-profil-v1.json` (l'écriture est ailleurs).
 */
export function construireProfil({ document = {}, regimes = [], pretraitement = null, phenomenes = {}, controles_requis = [] } = {}) {
  return {
    document: {
      type: document.type || 'inconnu',
      langues: document.langues || [],
      periode_probable: document.periode_probable || null,
      qualite_scan: document.qualite_scan || 'inconnue',
    },
    regimes: (regimes || []).map((r) => ({
      pages_pdf: r.pages_pdf || [], nature: r.nature || 'corps',
      moteur: r.moteur || 'kraken', modele: r.modele || null, colonnes: r.colonnes || 1,
    })),
    pretraitement: { actif: !!(pretraitement && pretraitement.actif), tests_recommandes: (pretraitement && pretraitement.tests_recommandes) || [] },
    phenomenes: {
      lettrines: !!phenomenes.lettrines, poesie: !!phenomenes.poesie, notes: !!phenomenes.notes,
      titres_courants: !!phenomenes.titres_courants, reclames: !!phenomenes.reclames, marques_cahier: !!phenomenes.marques_cahier,
    },
    controles_requis: controles_requis || [],
  }
}
