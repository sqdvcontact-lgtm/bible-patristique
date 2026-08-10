// Abstraction FOURNISSEUR IA — indépendante du modèle. Sélection par configuration (variables
// d'environnement), défaut = mock (aucun réseau). Ajoute : validation de schéma (on rejette une
// réponse non conforme, on n'interprète jamais de la prose libre comme une correction), cache par
// hash, garde de consentement cloud, et robustesse (une panne d'IA ne casse jamais le projet).

import { createHash } from 'node:crypto'
import { fournisseurMock } from './mock.mjs'
import { fournisseurClaude } from './claude.mjs'
import { fournisseurClaudeLocal } from './claude-local.mjs'

export const TACHES = ['diagnostic', 'lettrine', 'titre', 'ligne', 'page', 'section', 'lot', 'notes']

/** Choisit le fournisseur selon l'environnement. `claude-local`/`local` → CLI local (abonnement, sans
 *  clé API) ; `anthropic`/`claude` → API (clé + crédits console) ; sinon mock (hors-ligne). */
export function choisirFournisseur(env = {}) {
  const nom = String(env.LG_AI_PROVIDER || 'mock').toLowerCase()
  if (nom === 'claude-local' || nom === 'local') return fournisseurClaudeLocal(env)
  if (nom === 'anthropic' || nom === 'claude') return fournisseurClaude(env)
  return fournisseurMock()
}

/** Validation MINIMALE d'une sortie IA : objet, `statut:'candidat'`, `abstention` booléen. Rejette
 *  toute prose libre ou réponse non conforme. Renvoie {ok, erreurs}. */
export function validerSortieIA(sortie) {
  const erreurs = []
  if (!sortie || typeof sortie !== 'object' || Array.isArray(sortie)) return { ok: false, erreurs: ['sortie non-objet'] }
  if (sortie.statut !== 'candidat') erreurs.push('statut doit valoir « candidat »')
  if (typeof sortie.abstention !== 'boolean') erreurs.push('abstention manquante ou non booléenne')
  return { ok: erreurs.length === 0, erreurs }
}

/** Clé de cache : hash de TOUT ce qui, s'il change, doit invalider (image, texte, prompt, version du
 *  prompt, modèle, version de la charte, type de tâche). */
export function cleCache({ sha256_image = '', sha256_texte = '', prompt = '', version_prompt = '', modele = '', version_charte = '', tache = '' } = {}) {
  const brut = [tache, modele, version_prompt, version_charte, sha256_image, sha256_texte, prompt].join('')
  return createHash('sha1').update(brut).digest('hex')
}

/** Consentement cloud : lié à UN fournisseur ; invalide si le fournisseur change (jamais permanent). */
export function enregistrerConsentement(fournisseur, dateISO) {
  return { fournisseur, date: dateISO, actif: true }
}
export function consentementValide(record, fournisseur) {
  return !!record && record.actif === true && record.fournisseur === fournisseur && !!record.date
}

/**
 * Enrobage d'appel : cache → (fournisseur) → validation. Ne lève JAMAIS d'exception (une panne
 * renvoie une abstention). Le consentement cloud est vérifié par le fournisseur lui-même (le mock
 * n'en a pas besoin ; Claude s'abstient sans consentement).
 */
export async function appelerIA(fournisseur, tache, charge, { cache = null, cacheCle = null, ...opts } = {}) {
  if (!TACHES.includes(tache)) return { type: tache, statut: 'candidat', abstention: true, erreur: 'tâche inconnue' }
  if (cache && cacheCle && cache.has(cacheCle)) return cache.get(cacheCle)
  const methode = { diagnostic: 'diagnostiquer', lettrine: 'lettrine', titre: 'titre', ligne: 'ligne', page: 'page', section: 'section', lot: 'lot', notes: 'notes' }[tache]
  let sortie
  try {
    sortie = await fournisseur[methode](charge, opts)
  } catch (e) {
    sortie = { type: tache, statut: 'candidat', abstention: true, erreur: 'IA indisponible : ' + (e?.message || e) }
  }
  const v = validerSortieIA(sortie)
  if (!v.ok) sortie = { type: tache, statut: 'candidat', abstention: true, erreur: 'sortie IA non conforme (' + v.erreurs.join(', ') + ')' }
  if (cache && cacheCle) cache.set(cacheCle, sortie)
  return sortie
}
