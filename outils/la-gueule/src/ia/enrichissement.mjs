// Enrichissement des métadonnées depuis la BASE du projet (catalogue Supabase), en LECTURE SEULE.
// Doctrine : « d'abord la base, sinon vide » — on ne complète le nom canonique de l'auteur (+ id_auteur)
// et le titre original que s'ils EXISTENT dans le catalogue ; jamais de supposition. Zéro dépendance
// (fetch natif + API REST PostgREST). La clé service reste LOCALE : jamais journalisée, jamais exportée.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ICI = dirname(fileURLToPath(import.meta.url))
// src/ia → src → la-gueule → outils → racine du projet (où vit .env.local).
const ENV_DEFAUT = join(ICI, '..', '..', '..', '..', '.env.local')

/** Parse un .env (KEY=VALUE) : ignore commentaires/lignes vides, retire les guillemets. Pur / testable. */
export function parserEnv(texte) {
  const o = {}
  for (const brut of String(texte || '').split(/\r?\n/)) {
    const l = brut.trim(); if (!l || l.startsWith('#')) continue
    const i = l.indexOf('='); if (i < 0) continue
    o[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']/, '').replace(/["']$/, '')
  }
  return o
}

/** Normalise pour comparaison : minuscules, sans accents, sans ponctuation. Pur / testable. */
export function normaliser(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

const STOP = new Set(['saint', 'sainte', 'st', 'le', 'la', 'les', 'p', 'r', 'pere', 'de', 'du', 'des', 'd', 'l', 'monsieur', 'm', 'sieur', 'abbe', 'dom', 'the'])

/** Jetons significatifs NORMALISÉS (sans accents) d'un nom — pour le SCORE de rapprochement. Pur / testable. */
export function jetonsAuteur(nom) {
  return normaliser(nom).split(' ').filter((t) => t.length >= 3 && !STOP.has(t))
}

/**
 * Jetons significatifs pour la REQUÊTE, en gardant les ACCENTS (la base est accent-sensible : « boece »
 * ne matche pas « Boèce » ; « boèce » oui). Minuscule + découpe, filtre titres/particules. Pur / testable.
 */
export function jetonsRequete(texte, minLen = 3) {
  return String(texte || '').toLowerCase().split(/[^a-zà-ÿ0-9]+/i).filter(Boolean)
    .filter((m) => m.length >= minLen && !STOP.has(normaliser(m)))
}

/** Meilleur auteur du catalogue pour le nom lu (chevauchement de jetons nom + nom_original). Pur / testable. */
export function choisirAuteur(lignes, nomLu) {
  const jl = new Set(jetonsAuteur(nomLu)); if (!jl.size) return null
  let best = null, bestScore = 0
  for (const a of (Array.isArray(lignes) ? lignes : [])) {
    const ja = new Set([...jetonsAuteur(a?.nom), ...jetonsAuteur(a?.nom_original)])
    let s = 0; for (const t of jl) if (ja.has(t)) s++
    if (s > bestScore) { bestScore = s; best = a }
  }
  return bestScore > 0 ? best : null
}

/** Meilleure œuvre du catalogue pour le titre lu (chevauchement de jetons ≥ 5 lettres). Pur / testable. */
export function choisirOeuvre(lignes, titreLu) {
  const jl = new Set(normaliser(titreLu).split(' ').filter((t) => t.length >= 5)); if (!jl.size) return null
  let best = null, bestScore = 0
  for (const o of (Array.isArray(lignes) ? lignes : [])) {
    const jo = new Set(normaliser(o?.titre).split(' ').filter((t) => t.length >= 5))
    let s = 0; for (const t of jl) if (jo.has(t)) s++
    if (s > bestScore) { bestScore = s; best = o }
  }
  return bestScore > 0 ? best : null
}

async function lireConfig(cheminEnv) {
  try {
    const env = parserEnv(await readFile(cheminEnv || ENV_DEFAUT, 'utf8'))
    const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || null
    const cle = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null
    return (url && cle) ? { url: url.replace(/\/+$/, ''), cle } : null
  } catch { return null }
}

async function pg(cfg, chemin, { timeoutMs = 8000 } = {}) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  try {
    const rep = await fetch(cfg.url + '/rest/v1/' + chemin, {
      headers: { apikey: cfg.cle, authorization: 'Bearer ' + cfg.cle, accept: 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
    })
    return rep.ok ? await rep.json() : null
  } catch { return null } finally { if (t) clearTimeout(t) }
}

/**
 * Enrichit depuis la base : nom canonique + id_auteur (table `auteurs`), et titre_original si l'œuvre
 * existe déjà (table `oeuvres`). « Sinon vide » : aucun champ inventé. Ne lève JAMAIS (config absente,
 * réseau… → {}). Les jetons de recherche sont [a-z0-9] (normalisés) : pas d'injection dans l'URL.
 */
export async function enrichirDepuisBase({ auteur = '', titre = '' } = {}, { cheminEnv = null } = {}) {
  const cfg = await lireConfig(cheminEnv)
  if (!cfg) return {}
  const out = {}
  const ja = jetonsRequete(auteur, 3)
  if (ja.length && jetonsAuteur(auteur).length) {
    const tok = encodeURIComponent(ja[ja.length - 1]) // dernier jeton (accents gardés) = le plus souvent le nom
    const lignes = await pg(cfg, `auteurs?select=id_auteur,nom,nom_original,dates&or=(nom.ilike.*${tok}*,nom_original.ilike.*${tok}*)&limit=20`)
    const a = choisirAuteur(lignes, auteur)
    if (a) { out.auteur_complet = a.nom; out.auteur_id = a.id_auteur; if (a.nom_original) out.auteur_original = a.nom_original }
  }
  const jt = jetonsRequete(titre, 5)
  if (jt.length) {
    const tok = encodeURIComponent([...jt].sort((x, y) => y.length - x.length)[0]) // jeton le plus long
    const lignes = await pg(cfg, `oeuvres?select=titre,titre_original&titre=ilike.*${tok}*&limit=20`)
    const o = choisirOeuvre(lignes, titre)
    if (o && o.titre_original) out.titre_original = o.titre_original
  }
  return out
}
