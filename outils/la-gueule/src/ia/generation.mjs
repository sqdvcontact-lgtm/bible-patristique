// Phase F — GÉNÉRATION LOCALE (§12). Après la validation ciblée, le moteur local génère les fichiers.
// AUCUNE correction IA à cette étape ; génération déterministe et reproductible. Ici : l'ÉTAT de
// livraison et le rapport de provenance (les fichiers eux-mêmes viennent des exports existants).

/**
 * État de livraison (§12.4). Ne JAMAIS employer « validé humainement » pour un livre seulement
 * contrôlé par IA / échantillonnage.
 *  - un blocage (R4) → CANDIDAT_INCOMPLET ;
 *  - des cas critiques ou non résolus restants → FINAL_CANDIDAT_AVEC_RESERVES ;
 *  - sinon → FINAL_CANDIDAT.
 */
export function etatLivraison(validation) {
  const c = (validation && validation.compteurs) || {}
  if ((c.blocages || 0) > 0) return 'CANDIDAT_INCOMPLET'
  if ((c.critiques || 0) > 0 || (c.non_resolus || 0) > 0) return 'FINAL_CANDIDAT_AVEC_RESERVES'
  return 'FINAL_CANDIDAT'
}

/** Rapport de provenance de la génération (§12.5). Déterministe : dates/run_id fournis par l'appelant. */
export function rapportGeneration({ projet = {}, validation = {}, profil = null, run_id = null, date = null, version_charte = 1, fichiers = [] } = {}) {
  const pages = projet.pages || {}
  const nums = Object.keys(pages)
  const moteurs = [...new Set(nums.map((n) => pages[n]?.ocr?.moteur).filter(Boolean))]
  const modeles = [...new Set(nums.map((n) => pages[n]?.ocr?.modele || pages[n]?.ocr?.langue).filter(Boolean))]
  const c = validation.compteurs || {}
  return {
    run_id, date, etat_livraison: etatLivraison(validation), version_charte,
    pages_traitees: nums.length,
    moteurs, modeles,
    corrections: {
      automatiques: c.automatiques || 0, familles: c.familles || 0, critiques: c.critiques || 0,
      non_resolus: c.non_resolus || 0, blocages: c.blocages || 0, total: c.corrections_totales || 0,
    },
    profil: profil ? { document: profil.document, regimes: profil.regimes } : null,
    fichiers,
    avertissement: etatLivraison(validation) !== 'FINAL_CANDIDAT'
      ? 'Livraison PROVISOIRE : ne pas présenter comme validée humainement ; voir cas non résolus / blocages.'
      : 'Candidat : validation humaine complète non affirmée (contrôle IA + échantillonnage).',
  }
}
