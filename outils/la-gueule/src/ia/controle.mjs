// Phase D — CONTRÔLE. Schéma d'intervention traçable (§15), classification de risque R0-R4 (§10),
// lecture du catalogue d'erreurs, et passe de contrôle DÉTERMINISTE (aucun réseau : confiance faible,
// lignes vides, doublons, pages anormales). Les corrections vont dans la COUCHE CANDIDATE ; l'OCR
// brut reste immuable ; rien n'est validé sans l'humain.

import { pageAnormale } from './diagnostic.mjs'

/** Intervention normalisée (provenance complète, §15). Statut par défaut : propose_ia. */
export function intervention(c = {}) {
  return {
    id: c.id ?? null, type: c.type || 'correction_ocr', page: c.page ?? null, ligne_ids: c.ligne_ids || [],
    bbox: c.bbox || [], texte_original: c.texte_original ?? '', texte_candidat: c.texte_candidat ?? '',
    modele: c.modele ?? null, fournisseur: c.fournisseur ?? null, version_modele: c.version_modele ?? null,
    version_prompt: c.version_prompt ?? null, sha256_image: c.sha256_image ?? null, regle: c.regle ?? null,
    preuves: c.preuves || [], lecture_fondee_sur_image: !!c.lecture_fondee_sur_image,
    inference_contextuelle: !!c.inference_contextuelle, confiance_modele: c.confiance_modele ?? 0,
    niveau_risque: c.niveau_risque || 'R0', statut: c.statut || 'propose_ia', validation_humaine: false,
    interdit_entrainement: !!c.interdit_entrainement, date: c.date ?? null, historique: [],
  }
}

/**
 * Niveau de risque R0-R4 (§10) — la confiance du modèle NE SUFFIT PAS. On classe d'après des signaux
 * explicites (preuve visuelle, stabilité de la règle, portée, caractère conjectural…).
 */
export function niveauRisque(s = {}) {
  if (s.bloquant || s.page_non_traitee || s.ordre_indeterminable || s.contradiction || s.conjectural_non_signale) return 'R4'
  if (s.lettre_partielle || s.lectures_multiples || s.change_hierarchie || s.ordre_lecture || s.note_vs_corps || s.correction_contextuelle || (s.suppression_ajout && (s.nb_chars || 0) >= 3)) return 'R3'
  if (s.nouveau_motif || s.fusion_fragments || s.lettrine_lisible || s.niveau_titre_nouveau || s.cesure_probable) return 'R2'
  if (s.repetition_validee || s.folio_stable || s.marque_cahier_confirmee || (s.erreur_connue && s.preuve_visuelle_forte)) return 'R1'
  return 'R0'
}

/** Parse un catalogue d'erreurs au format JSONL (une entrée par ligne). Ignore les lignes vides. */
export function chargerCatalogue(texte) {
  return String(texte || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
}

/**
 * Passe de contrôle DÉTERMINISTE (§8.2-A) : sans IA, sans réseau. Produit des findings (interventions)
 * et des compteurs. Ne modifie PAS le projet. La couche candidate est alimentée ailleurs, après revue.
 */
export function controlerDeterministe(projet, { seuilConfiance = 0.8 } = {}) {
  const findings = []
  const compteurs = { pages: 0, lignes: 0, confiance_faible: 0, lignes_vides: 0, doublons: 0, pages_anormales: 0 }
  const nums = Object.keys(projet?.pages || {}).map(Number).sort((a, b) => a - b)
  for (const n of nums) {
    const lignes = projet.pages[n].lignes || []
    compteurs.pages++
    const anom = pageAnormale(lignes)
    if (anom) {
      compteurs.pages_anormales++
      findings.push(intervention({ id: 'deter-page-vide', type: 'controle_page', page: n, regle: 'page_anormale', preuves: [anom], niveau_risque: niveauRisque({ bloquant: true }), statut: 'bloquant' }))
    }
    let prev = null
    lignes.forEach((l, i) => {
      compteurs.lignes++
      const t = String(l.dip ?? l.texte ?? '').trim()
      if (Array.isArray(l.bbox) && !t) {
        compteurs.lignes_vides++
        findings.push(intervention({ id: 'deter-ligne-vide', page: n, ligne_ids: [i], regle: 'ligne_vide', niveau_risque: 'R0', statut: 'applique_deterministe' }))
      }
      if (l.confiance != null && l.confiance < seuilConfiance) {
        compteurs.confiance_faible++
        findings.push(intervention({ id: 'deter-confiance-faible', page: n, ligne_ids: [i], regle: 'confiance_faible', confiance_modele: l.confiance, lecture_fondee_sur_image: true, niveau_risque: 'R2', statut: 'propose_ia' }))
      }
      if (t && prev != null && t === prev) {
        compteurs.doublons++
        findings.push(intervention({ id: 'struct-ligne-dupliquee', type: 'structure', page: n, ligne_ids: [i - 1, i], regle: 'doublon', niveau_risque: 'R1', statut: 'propose_ia' }))
      }
      prev = t
    })
  }
  return { findings, compteurs }
}
