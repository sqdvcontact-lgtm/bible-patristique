import { ROLES_HORS_CORPS } from './structure.mjs' // vocabulaire UNIQUE des rôles (pas de second système)
import { poserAppel } from './notes-ancrage.mjs'   // §13.3 : l'appel se colle au mot annoté

// Phase 1 (plan d'action 2026-08-09) — MATÉRIALISER les corrections dans le TEXTE candidat.
//
// Principe éditorial (charte §14-§15) : le fac-similé et l'OCR brut restent IMMUABLES ; toute
// intervention agit dans une couche CANDIDATE traçable, réversible et exportable.
//   - `ocr0` : ce que la machine a lu. Ne change JAMAIS (posé à l'OCR ; filet ici si absent).
//   - `dip`  : l'état éditorial candidat COURANT — c'est lui que lisent tous les exports.
//   - `corrections[]` : l'historique par ligne (avant, après, provenance, statut, annulation).
//
// Ces fonctions sont PURES au sens testable : elles mutent l'objet ligne/projet reçu et renvoient un
// compte-rendu, sans I/O ni réseau. Le client (atelier) et le serveur peuvent s'en servir de la même
// manière ; l'atelier en garde un miroir minimal (comme corrigerLettrineClient / pageAnormaleClient).

/** Entrée de correction normalisée — provenance complète (§15). Statut par défaut : appliquée candidate. */
export function entreeCorrection(c = {}) {
  return {
    id: c.id ?? null,
    type: c.type || 'correction_ocr',
    avant: String(c.avant ?? ''),
    apres: String(c.apres ?? ''),
    origine: c.origine || 'ia',              // 'ia' | 'humain' | 'deterministe'
    modele: c.modele ?? null,
    regle: c.regle ?? null,                  // ex. 'relecture_page'
    statut: c.statut || 'applique_candidate',
    validation_humaine: !!c.validation_humaine,
    annulee: false,
    date: c.date ?? null,                    // horodatage passé par l'appelant (jamais Date.now() ici)
  }
}

/**
 * Applique une correction à une LIGNE : écrit `apres` dans `dip`, journalise l'entrée dans
 * `ligne.corrections`, et préserve `ocr0` (posé au besoin depuis la valeur courante). Sécurités :
 *   - CONFLIT : si le `dip` courant ne correspond plus au `avant` attendu (une modification humaine ou
 *     une correction plus récente est passée entre-temps), on n'écrase RIEN → {ok:false, conflit:true}.
 *   - IDEMPOTENCE : si `dip` vaut déjà `apres`, on ne rejournalise pas → {ok:true, statut:'deja_applique'}.
 *   - VIDE : une correction vide est refusée sauf `autoriserVide` (ex. retrait explicite d'un artefact).
 * Mutation en place ; renvoie un compte-rendu.
 */
export function appliquerCorrection(ligne, corr = {}) {
  if (!ligne || typeof ligne !== 'object') return { ok: false, erreur: 'ligne absente' }
  const avant = String(corr.avant ?? '')
  const apres = String(corr.apres ?? '')
  const actuel = String(ligne.dip ?? '')
  if (apres === '' && !corr.autoriserVide) return { ok: false, erreur: 'correction vide refusée' }
  if (actuel === apres) return { ok: true, statut: 'deja_applique' }
  if (actuel !== avant) return { ok: false, conflit: true, attendu: avant, actuel }
  if (ligne.ocr0 == null) ligne.ocr0 = actuel               // filet : l'original doit exister avant toute édition
  if (!Array.isArray(ligne.corrections)) ligne.corrections = []
  const e = entreeCorrection({ ...corr, avant, apres })
  ligne.corrections.push(e)
  ligne.dip = apres                                         // le candidat courant devient la valeur corrigée
  return { ok: true, statut: e.statut, entree: e }
}

/**
 * Annule une correction : restaure `dip` à la valeur `avant` de l'entrée visée (la plus récente encore
 * active, ou celle d'`id`), et marque l'entrée `annulee=true` (jamais supprimée — l'historique reste).
 * Ne touche JAMAIS `ocr0`. Renvoie {ok, restaure} ou {ok:false, erreur}.
 */
export function annulerCorrection(ligne, id = null) {
  if (!ligne || !Array.isArray(ligne.corrections)) return { ok: false, erreur: 'aucune correction' }
  let idx = -1
  for (let i = ligne.corrections.length - 1; i >= 0; i--) {
    const c = ligne.corrections[i]
    if (c.annulee) continue
    if (id == null || c.id === id) { idx = i; break }
  }
  if (idx < 0) return { ok: false, erreur: 'correction introuvable' }
  const c = ligne.corrections[idx]
  ligne.dip = c.avant
  c.annulee = true
  return { ok: true, restaure: c.avant }
}

/**
 * Phase 3 — RECLASSEMENT de rôle (ornement, titre courant, folio, signature, réclame, bruit…). Pose
 * `suggestion.role_confirme` (qui fait foi) et recalcule `export_corps`. Ne touche JAMAIS le texte
 * (`dip`), l'OCR (`ocr0`), la bbox ni le crop : la ligne reste en source, seulement écartée du CORPS.
 * Mêmes sécurités que les corrections : conflit (un rôle humain différent n'est pas écrasé), idempotence,
 * historique et annulation. `role_apres` doit appartenir au vocabulaire de structure.mjs.
 */
export function appliquerReclassement(ligne, corr = {}) {
  if (!ligne || typeof ligne !== 'object') return { ok: false, erreur: 'ligne absente' }
  const apres = String(corr.role_apres ?? '')
  if (!apres) return { ok: false, erreur: 'rôle cible absent' }
  const avant = corr.role_avant ?? null
  if (!ligne.suggestion || typeof ligne.suggestion !== 'object') ligne.suggestion = {}
  const actuel = ligne.suggestion.role_confirme ?? null
  if (actuel === apres) return { ok: true, statut: 'deja_applique' }
  if (actuel != null && avant != null && actuel !== avant) return { ok: false, conflit: true, attendu: avant, actuel }
  if (!Array.isArray(ligne.corrections)) ligne.corrections = []
  const e = entreeCorrection({ ...corr, type: 'reclassement_role', avant: String(avant ?? ''), apres, statut: 'applique_candidate' })
  e.role_avant = avant; e.role_apres = apres; e._role_precedent = actuel
  ligne.corrections.push(e)
  ligne.suggestion.role_confirme = apres
  ligne.suggestion.export_corps = !ROLES_HORS_CORPS.includes(apres) // hors-corps → exclu du corps exporté
  return { ok: true, statut: e.statut, entree: e }
}

/** Annule le dernier reclassement (ou celui d'`id`) : restaure `role_confirme` antérieur + `export_corps`. */
export function annulerReclassement(ligne, id = null) {
  if (!ligne || !Array.isArray(ligne.corrections)) return { ok: false, erreur: 'aucun reclassement' }
  let idx = -1
  for (let i = ligne.corrections.length - 1; i >= 0; i--) {
    const c = ligne.corrections[i]
    if (c.annulee || c.type !== 'reclassement_role') continue
    if (id == null || c.id === id) { idx = i; break }
  }
  if (idx < 0) return { ok: false, erreur: 'reclassement introuvable' }
  const c = ligne.corrections[idx]
  if (!ligne.suggestion) ligne.suggestion = {}
  ligne.suggestion.role_confirme = c._role_precedent ?? null
  ligne.suggestion.export_corps = !ROLES_HORS_CORPS.includes(ligne.suggestion.role_confirme || '')
  c.annulee = true
  return { ok: true, restaure: c._role_precedent ?? null }
}

/**
 * ANCRAGE D'UNE NOTE (§13) — matérialise réellement le rattachement quand l'humain l'accepte :
 *   1. pose l'appel « [[n]] » dans la LIGNE DE CORPS annotée, collé au mot (§13.3) ;
 *   2. estampille la ou les LIGNES DE LA NOTE avec ce numéro (`note_numero`), pour que l'export
 *      puisse les rassembler sous « [[n]] … » sans les chercher.
 * Le texte de la note n'est jamais réécrit. Traçable et réversible comme toute correction : la pose
 * de l'appel passe par `appliquerCorrection` (donc `ocr0` préservé, historique, conflit détecté).
 * `ancrage` : { corps_i, lignes_note[], numero, apres?, origine?, modele? }.
 */
export function appliquerAncrage(projet, page, ancrage = {}) {
  const lignes = projet?.pages?.[page]?.lignes
  if (!Array.isArray(lignes)) return { ok: false, erreur: 'page introuvable' }
  const numero = Number(ancrage.numero)
  if (!Number.isInteger(numero) || numero < 1) return { ok: false, erreur: 'numéro de note absent' }
  const cible = lignes[ancrage.corps_i]
  if (!cible) return { ok: false, erreur: 'ligne de corps introuvable' }
  const avant = String(cible.dip ?? cible.texte ?? '')
  if (avant.includes('[[' + numero + ']]')) return { ok: true, statut: 'deja_applique' }
  const { texte, place } = poserAppel(avant, numero, ancrage.apres ?? null)
  const r = appliquerCorrection(cible, {
    avant, apres: texte, type: 'ancrage_note', regle: 'ancrage_note',
    origine: ancrage.origine || 'ia', modele: ancrage.modele ?? null, date: ancrage.date ?? null,
  })
  if (!r.ok) return r
  if (r.entree) { r.entree.note_numero = numero; r.entree.place_appel = place }
  // La note porte désormais son numéro : l'export sait à quel appel elle répond (§13.1).
  const ids = Array.isArray(ancrage.lignes_note) ? ancrage.lignes_note : []
  for (const i of ids) if (lignes[i]) lignes[i].note_numero = numero
  return { ok: true, statut: r.statut, numero, place, lignes_note: ids }
}

/** Localise une ligne (page + index) dans un projet et lui applique la correction. */
export function appliquerDansProjet(projet, page, index, corr) {
  const lignes = projet?.pages?.[page]?.lignes
  if (!Array.isArray(lignes) || !lignes[index]) return { ok: false, erreur: 'ligne introuvable' }
  return appliquerCorrection(lignes[index], corr)
}

/**
 * Applique un GROUPE de corrections (issu d'une famille / d'un échantillonnage accepté). Chaque item :
 * { page, index, avant, apres, ... }. Applique réellement chacune et RECENSE les conflits restants
 * (jamais d'écrasement silencieux). Renvoie {appliquees, deja, conflits:[…], refusees}.
 */
export function appliquerGroupe(projet, items = []) {
  const bilan = { appliquees: 0, deja: 0, conflits: [], refusees: 0 }
  for (const it of (Array.isArray(items) ? items : [])) {
    const r = appliquerDansProjet(projet, it.page, it.index, it)
    if (r.ok && r.statut === 'deja_applique') bilan.deja++
    else if (r.ok) bilan.appliquees++
    else if (r.conflit) bilan.conflits.push({ page: it.page, index: it.index, attendu: r.attendu, actuel: r.actuel })
    else bilan.refusees++
  }
  return bilan
}
