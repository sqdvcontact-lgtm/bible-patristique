// Phase F — GÉNÉRATION LOCALE (§12). Après la validation ciblée, le moteur local génère les fichiers.
// AUCUNE correction IA à cette étape ; génération déterministe et reproductible. Ici : l'ÉTAT de
// livraison et le rapport de provenance (les fichiers eux-mêmes viennent des exports existants).

/**
 * État de livraison (§12.4, Phase 5). Ne JAMAIS employer « validé humainement » pour un livre seulement
 * contrôlé par IA / échantillonnage. `lot` (facultatif) = complétude du périmètre (Phase 2).
 *  - un blocage RÉEL (R4) ou des pages du périmètre non traitées → CANDIDAT_INCOMPLET ;
 *  - des critiques / non résolus / pages en erreur / avertissements → FINAL_CANDIDAT_AVEC_RESERVES ;
 *  - sinon → FINAL_CANDIDAT.
 * Une page COURTE n'est plus un blocage (c'est un avertissement) : elle n'empêche pas la livraison.
 */
export function etatLivraison(validation, lot = {}) {
  const c = (validation && validation.compteurs) || {}
  const manquantes = lot.manquantes || 0, erreurs = lot.erreurs || 0
  if ((c.blocages || 0) > 0 || manquantes > 0) return 'CANDIDAT_INCOMPLET'
  if ((c.critiques || 0) > 0 || (c.non_resolus || 0) > 0 || erreurs > 0 || (c.avertissements || 0) > 0) return 'FINAL_CANDIDAT_AVEC_RESERVES'
  return 'FINAL_CANDIDAT'
}

/** Rapport de provenance de la génération (§12.5). Déterministe : dates/run_id fournis par l'appelant.
 *  `lot` (Phase 2/5) = complétude du périmètre → l'état de livraison et le rapport de réserves. */
export function rapportGeneration({ projet = {}, validation = {}, profil = null, run_id = null, date = null, version_charte = 1, fichiers = [], lot = {} } = {}) {
  const pages = projet.pages || {}
  const nums = Object.keys(pages)
  const moteurs = [...new Set(nums.map((n) => pages[n]?.ocr?.moteur).filter(Boolean))]
  const modeles = [...new Set(nums.map((n) => pages[n]?.ocr?.modele || pages[n]?.ocr?.langue).filter(Boolean))]
  const c = validation.compteurs || {}
  const etat = etatLivraison(validation, lot)
  return {
    run_id, date, etat_livraison: etat, version_charte,
    pages_traitees: nums.length,
    perimetre: {
      lot_total: lot.total ?? null, faites: lot.faites ?? null, manquantes: lot.manquantes ?? 0,
      erreurs: lot.erreurs ?? 0, exclues: lot.exclues ?? 0, document_total: lot.docTotal ?? null,
    },
    moteurs, modeles,
    corrections: {
      automatiques: c.automatiques || 0, corrections: c.corrections || 0, familles: c.familles || 0,
      critiques: c.critiques || 0, non_resolus: c.non_resolus || 0, avertissements: c.avertissements || 0,
      blocages: c.blocages || 0, total: c.corrections_totales || 0,
    },
    profil: profil ? { document: profil.document, regimes: profil.regimes } : null,
    fichiers,
    avertissement: etat !== 'FINAL_CANDIDAT'
      ? 'Livraison PROVISOIRE : ne pas présenter comme validée humainement ; voir périmètre / réserves / blocages.'
      : 'Candidat : validation humaine complète non affirmée (contrôle IA + échantillonnage).',
  }
}
