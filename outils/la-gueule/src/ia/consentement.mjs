// Phase B/§14.6 — CONSENTEMENT cloud et ÉTAT du fournisseur. Aucun appel cloud ne part sans (1) une
// clé présente en variable d'environnement ET (2) un consentement explicite, lié AU fournisseur (jamais
// permanent si le fournisseur change). La clé n'est JAMAIS lue ici en clair ni renvoyée : on n'expose
// que `dispo` (présence booléenne). Le consentement est stocké localement (controles/ia-consentement.json).

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'controles')
const FICHIER = join(DIR, 'ia-consentement.json')

/** État du fournisseur SANS révéler la clé : `dispo` = une clé est présente (booléen). */
export function etatFournisseur(env = {}) {
  const nom = String(env.LG_AI_PROVIDER || 'mock').toLowerCase()
  const cloud = nom === 'anthropic' || nom === 'claude'
  const dispo = cloud ? !!env.ANTHROPIC_API_KEY : true
  const modeles = {
    diagnostic: env.LG_AI_MODEL_DIAGNOSTIC || null,
    vision: env.LG_AI_MODEL_VISION || null,
    controle: env.LG_AI_MODEL_CONTROLE || null,
  }
  return { nom: cloud ? 'anthropic' : 'mock', cloud, dispo, modeles }
}

export async function lireConsentement() {
  try { return JSON.parse(await readFile(FICHIER, 'utf8')) } catch { return null }
}

/** Écrit le consentement (lié au fournisseur + daté). `actif:false` = révocation. */
export async function ecrireConsentement({ fournisseur, date, actif = true }) {
  await mkdir(DIR, { recursive: true })
  const record = { fournisseur, date, actif: !!actif }
  await writeFile(FICHIER, JSON.stringify(record, null, 2), 'utf8')
  return record
}

/** Le consentement enregistré couvre-t-il le fournisseur courant ? (invalide si le fournisseur change) */
export function consentementActif(record, fournisseur) {
  return !!record && record.actif === true && record.fournisseur === fournisseur && !!record.date
}
