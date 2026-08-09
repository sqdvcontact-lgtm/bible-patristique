// Phase D — CONTRÔLE. Schéma d'intervention traçable (§15), classification de risque R0-R4 (§10),
// lecture du catalogue d'erreurs, et passe de contrôle DÉTERMINISTE (aucun réseau : confiance faible,
// lignes vides, doublons, pages anormales). Les corrections vont dans la COUCHE CANDIDATE ; l'OCR
// brut reste immuable ; rien n'est validé sans l'humain.

import { pageAnormale } from './diagnostic.mjs'
import { appelerIA } from './fournisseur.mjs'

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

/**
 * Mappe une sortie IA (lettrine / titre / correction) en INTERVENTION §15, avec provenance et risque.
 * Une abstention → aucune intervention (null). Une lecture CONJECTURALE (inférée du contexte, non
 * fondée sur l'image) → R3 ET interdit_entrainement (jamais au ground-truth).
 */
export function interventionDepuisSortieIA(sortie, ctx = {}) {
  if (!sortie || sortie.abstention) return null
  const contextuel = !!sortie.inference_contextuelle
  const fondeeImage = sortie.lecture_fondee_sur_image !== false && !contextuel
  let risque = 'R2'
  if (contextuel || sortie.presence === 'probable' || sortie.lecture_partielle || sortie.restitution_editoriale) risque = 'R3'
  return intervention({
    id: ctx.id || sortie.type, type: sortie.type || 'correction_ocr', page: ctx.page ?? null,
    ligne_ids: ctx.ligne_ids || [], bbox: ctx.bbox || [],
    texte_original: ctx.texte_original ?? sortie.texte_ocr ?? '',
    texte_candidat: sortie.lecture_candidate ?? sortie.texte_propose ?? sortie.texte_reconstruit ?? '',
    modele: sortie.modele ?? null, fournisseur: sortie.fournisseur ?? null,
    regle: ctx.regle || sortie.type, preuves: sortie.preuves || [],
    lecture_fondee_sur_image: fondeeImage, inference_contextuelle: contextuel,
    confiance_modele: sortie.confiance ?? 0, niveau_risque: risque,
    statut: 'propose_ia', interdit_entrainement: contextuel || !!sortie.restitution_editoriale,
  })
}

/**
 * Passe de contrôle IA (§8.3-8.5) : sur les lettrines candidates et les lignes à faible confiance,
 * demande un avis au fournisseur (mock → s'abstient, donc AUCUNE intervention par défaut ; un vrai
 * fournisseur n'agit que derrière clé + consentement). Ne modifie JAMAIS le projet ; renvoie des
 * interventions candidates traçables.
 */
export async function controlerIA(projet, { fournisseur, consentement = false, cache = null, seuilConfiance = 0.8, preparerCharge = null } = {}) {
  const interventions = []
  if (!fournisseur) return { interventions }
  const nums = Object.keys(projet?.pages || {}).map(Number).sort((a, b) => a - b)
  for (const n of nums) {
    const lignes = projet.pages[n].lignes || []
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i], s = l.suggestion
      const ctx = { page: n, ligne_ids: [i], bbox: l.bbox, texte_original: l.dip }
      const estLettrine = s && /^lettrine_candidate$/.test(s.role_suggere || '')
      const faibleConf = l.confiance != null && l.confiance < seuilConfiance
      if (!estLettrine && !faibleConf) continue
      const tache = estLettrine ? 'lettrine' : 'ligne'
      // preparerCharge (serveur) construit le crop + les messages ; sinon charge texte simple (mock).
      const charge = preparerCharge ? await preparerCharge(tache, { page: n, ligne: i, ligne_obj: l, projet }) : { page: n, ligne: i, texte: l.dip }
      const out = await appelerIA(fournisseur, tache, charge, { consentement, cache })
      const iv = interventionDepuisSortieIA(out, { ...ctx, regle: estLettrine ? 'lettrine' : 'correction_ocr' }); if (iv) interventions.push(iv)
    }
  }
  return { interventions }
}
