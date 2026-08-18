// Pipeline IA en 5 étapes (consignes 2026-08-09) — Phase A : MODÈLE D'ÉTAT du projet.
// Pur et testable (aucune I/O, aucun Date.now / randomUUID interne : l'appelant fournit run_id/dates,
// pour rester déterministe). Réutilise le pipeline local existant ; n'introduit PAS de second pipeline.
//
// Parcours fixe : 1 Diagnostic IA → 2 OCR local → 3 Contrôle IA → 4 Validation ciblée → 5 Génération.
// Doctrine : chaque étape est persistée, versionnée, jamais écrasée en silence ; une modification en
// amont PÉRIME les étapes dépendantes (sans effacer leurs sorties).

export const ETAPES = ['diagnostic_ia', 'ocr_local', 'controle_ia', 'validation_ciblee', 'generation_locale']
export const ETATS = ['non_commence', 'pret', 'en_cours', 'termine', 'a_verifier', 'bloque', 'erreur', 'perime']
export const VERSION_SCHEMA = 1

const etapeVide = () => ({
  etat: 'non_commence', run_id: null, version_entree: null, version_sortie: null,
  date_debut: null, date_fin: null, resume: {}, erreurs: [], historique: [],
})

/** Structure de workflow neuve (toutes les étapes « non commencé », la 1re active). */
export function nouveauWorkflow() {
  const etapes = {}
  for (const e of ETAPES) etapes[e] = etapeVide()
  return { version_schema: VERSION_SCHEMA, etape_active: ETAPES[0], etapes }
}

/**
 * Compat anciens projets : ajoute `projet.workflow` s'il manque, avec des états INFÉRÉS des données
 * existantes. NE DÉTRUIT RIEN, ne réécrit pas l'OCR, n'applique aucune règle nouvelle automatiquement.
 */
export function assurerWorkflow(projet) {
  if (!projet) return projet
  if (!projet.workflow) projet.workflow = nouveauWorkflow()
  const wf = projet.workflow
  if (wf.version_schema == null) wf.version_schema = VERSION_SCHEMA
  if (!wf.etapes) wf.etapes = {}
  for (const e of ETAPES) if (!wf.etapes[e]) wf.etapes[e] = etapeVide()
  if (!wf.etape_active) wf.etape_active = ETAPES[0]
  const pages = projet.pages || {}
  const nums = Object.keys(pages)
  const ocrFaites = nums.filter((n) => Array.isArray(pages[n].lignes) && pages[n].lignes.length).length
  if (ocrFaites && wf.etapes.ocr_local.etat === 'non_commence') wf.etapes.ocr_local.etat = 'termine'
  const valide = nums.some((n) => pages[n].valide_humain)
  if (valide && wf.etapes.validation_ciblee.etat === 'non_commence') wf.etapes.validation_ciblee.etat = 'a_verifier'
  return projet
}

/**
 * Met à jour une étape. Ne l'ÉCRASE jamais en silence : si un `run_id` différent remplace un run
 * existant, l'ancien est archivé dans `historique`. `patch` peut porter etat, run_id, versions, dates, resume, erreurs.
 */
export function majEtape(wf, etape, patch = {}) {
  if (!wf?.etapes?.[etape]) return wf
  const cur = wf.etapes[etape]
  if (cur.run_id && patch.run_id && patch.run_id !== cur.run_id) {
    cur.historique = cur.historique || []
    cur.historique.push({ run_id: cur.run_id, etat: cur.etat, version_sortie: cur.version_sortie, date_fin: cur.date_fin })
  }
  Object.assign(cur, patch)
  return wf
}

// §5 — quelles étapes une modification en amont périme (l'événement = ce qui a changé).
const DEPENDANCES = {
  diagnostic: ['ocr_local', 'controle_ia', 'validation_ciblee', 'generation_locale'], // diagnostic / profil OCR
  ocr_modele: ['ocr_local', 'controle_ia', 'validation_ciblee', 'generation_locale'], // changement de modèle OCR
  ocr_page: ['controle_ia', 'validation_ciblee', 'generation_locale'],               // nouvel OCR d'une page
  charte: ['controle_ia', 'validation_ciblee', 'generation_locale'],                 // règle de charte
  ia_modele: ['controle_ia', 'validation_ciblee', 'generation_locale'],              // modèle / prompt IA
  edition_texte: ['validation_ciblee', 'generation_locale'],                         // édition manuelle après contrôle
  validation: ['generation_locale'],                                                 // nouvelle validation
}

/** Marque « périmé » les étapes dépendantes d'un événement amont (ne touche pas les « non commencé »
 *  ni les étapes amont ; n'efface aucune sortie). */
export function invaliderDependances(wf, evenement) {
  const liste = DEPENDANCES[evenement]
  if (!wf?.etapes || !liste) return wf
  for (const e of liste) {
    const s = wf.etapes[e]
    if (s && s.etat !== 'non_commence') s.etat = 'perime'
  }
  return wf
}
