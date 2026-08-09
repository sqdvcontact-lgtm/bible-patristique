// Passe 3 — ARCHITECTURE (seulement) d'un lecteur IA de vision, optionnel et SÉPARÉ du pipeline de
// vérité. Aucun appel réseau, aucune dépendance nouvelle : ce module ne fait que définir le CONTRAT
// (schéma de sortie, garde-fous). Un fournisseur réel se branchera plus tard, sur instruction explicite.
//
// Garde-fous non négociables (cf. instructions passe 3) :
//  - sortie = candidat, jamais autorité ; jamais de ground-truth ;
//  - jamais d'écriture (texte, tables actives, fichiers de vérité) sans action humaine ;
//  - le mode « contextuel » force inference_contextuelle=true ET interdit_entrainement=true ;
//  - le modèle peut S'ABSTENIR (répondre « indéterminé ») ;
//  - un appel cloud exige un consentement explicite ; local par défaut ;
//  - l'absence de réseau ou une erreur du service n'interrompt jamais l'OCR.

export const MODES_VISION = ['visuel_strict', 'contextuel']

/** Construit une sortie NORMALISÉE du lecteur de vision (candidat). Traçable, jamais autorité. */
export function sortieVision({
  mode = 'visuel_strict',
  modele = null,
  version_modele = null,
  fournisseur = 'local', // 'local' | 'cloud'
  version_prompt = null,
  date = null,           // passé par l'appelant (pas de Date.now ici)
  sha256_image = null,
  bbox = [],
  sortie_transcription = '',
  classe_region = null,
  confiance_declaree = 0,
  abstention = false,
} = {}) {
  if (!MODES_VISION.includes(mode)) throw new Error(`mode vision inconnu : ${mode}`)
  const contextuel = mode === 'contextuel'
  const s = {
    module: 'lecteur_vision',
    mode,
    modele,
    version_modele,
    fournisseur, // consigné pour la traçabilité
    version_prompt,
    date,
    sha256_image,
    bbox: Array.isArray(bbox) ? bbox : [],
    sortie_transcription: abstention ? '' : String(sortie_transcription ?? ''),
    classe_region: abstention ? null : classe_region,
    confiance_declaree: Number(confiance_declaree) || 0,
    abstention: !!abstention,
    inference_contextuelle: contextuel,     // le mode contextuel est toujours marqué
    interdit_entrainement: contextuel,      // ... et jamais versé au ground-truth
    statut: 'candidat',                     // jamais autorité
    validation_humaine: false,
  }
  return s
}

/** Garde-fou : refuse un appel cloud sans consentement explicite (aucun envoi d'image par défaut). */
export function autoriserAppel({ fournisseur = 'local', consentement_cloud = false } = {}) {
  if (fournisseur === 'cloud' && !consentement_cloud) {
    return { ok: false, raison: 'appel cloud refusé : consentement explicite requis avant tout envoi d’image' }
  }
  return { ok: true }
}

/**
 * Point d'entrée STUB : aucune implémentation réelle. Tant qu'aucun fournisseur n'est branché (sur
 * instruction explicite), demander un avis visuel renvoie une abstention traçable — jamais une erreur
 * qui interromprait l'OCR, jamais une autorité.
 */
export async function demanderAvisVisuel(entree = {}) {
  const garde = autoriserAppel(entree)
  if (!garde.ok) return { ...sortieVision({ ...entree, abstention: true }), erreur: garde.raison }
  // Pas de fournisseur configuré : abstention explicite (le module reste désactivable et inoffensif).
  return { ...sortieVision({ ...entree, abstention: true }), non_configure: true }
}
