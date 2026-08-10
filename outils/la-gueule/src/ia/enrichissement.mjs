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

/** Déduit la langue d'origine d'un titre original d'après son ÉCRITURE : le grec est repérable au script
 *  (le latin, lui, ne se distingue pas fiablement du français). Renvoie 'grec' ou null. Pur / testable. */
export function langueDeTitre(s) {
  return /[Ͱ-Ͽἀ-῿]/.test(String(s || '')) ? 'grec' : null
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

/**
 * Jetons SIGNIFIANTS d'un titre : les mots longs (≥5 lettres) ET les NOMBRES. Un nombre est très
 * discriminant — « Discours 38-41 » ne se distingue des autres discours que par « 38 » et « 41 » —
 * et les jeter revenait à ne garder qu'un seul jeton, donc à rendre le rapprochement impossible.
 */
export function jetonsTitre(titre) {
  return new Set(normaliser(titre).split(' ').filter((t) => t.length >= 5 || /^\d+$/.test(t)))
}

/**
 * Meilleure œuvre du catalogue pour le titre lu. Rapprochement volontairement STRICT (un faux
 * rattachement coûte plus cher qu'une absence de rattachement) :
 *   - soit 2 jetons communs et un recouvrement ≥ 50 % ;
 *   - soit un SEUL jeton commun, mais un recouvrement ≥ 80 % — c'est le cas d'un titre court ou
 *     d'une correspondance exacte (« Confessions » ↔ « Confessions »), que la règle des 2 jetons
 *     rendait mécaniquement impossible.
 * « Homélies, discours et lettres choisis » ne matche toujours PAS « Homélies sur l'Hexaéméron »
 * (un seul mot commun, recouvrement 25 %). Pur / testable.
 */
export function choisirOeuvre(lignes, titreLu) {
  const jl = jetonsTitre(titreLu); if (!jl.size) return null
  let best = null, bestScore = 0, bestRec = 0
  for (const o of (Array.isArray(lignes) ? lignes : [])) {
    const jo = jetonsTitre(o?.titre); if (!jo.size) continue
    let s = 0; for (const t of jl) if (jo.has(t)) s++
    if (!s) continue
    const recouvrement = s / Math.max(jl.size, jo.size)
    const admissible = (s >= 2 && recouvrement >= 0.5) || (s >= 1 && recouvrement >= 0.8)
    if (!admissible) continue
    // À égalité de jetons communs, le meilleur recouvrement l'emporte (titre le plus proche).
    if (s > bestScore || (s === bestScore && recouvrement > bestRec)) { bestScore = s; bestRec = recouvrement; best = o }
  }
  return best
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
  if (!cfg) return { diagnostic: { base: false } }
  const out = {}, diag = { base: true, auteur: null, oeuvre: null }
  // 1) ŒUVRE : `oeuvres` (œuvre importée) puis `catalogue_notices` (œuvre seulement cataloguée). On garde
  //    l'id_auteur de l'œuvre trouvée pour en déduire l'auteur SANS ambiguïté (plusieurs « Basile »…).
  let idAuteurOeuvre = null
  const jt = jetonsRequete(titre, 5)
  if (jt.length) {
    const tok = encodeURIComponent([...jt].sort((x, y) => y.length - x.length)[0]) // jeton le plus long
    let o = choisirOeuvre(await pg(cfg, `oeuvres?select=titre,sous_titre,titre_original,langue_originale,date_composition,date_approx,genre,id_auteur&titre=ilike.*${tok}*&limit=20`), titre)
    let source = 'oeuvres'
    if (!o) {
      const cn = await pg(cfg, `catalogue_notices?select=titre_stable,titre_edition,titre_original,langue_originale,id_auteur&or=(titre_stable.ilike.*${tok}*,titre_edition.ilike.*${tok}*)&limit=20`)
      o = choisirOeuvre((Array.isArray(cn) ? cn : []).map((x) => ({ titre: x.titre_stable || x.titre_edition, titre_original: x.titre_original, langue_originale: x.langue_originale, id_auteur: x.id_auteur })), titre)
      if (o) source = 'catalogue_notices'
    }
    if (o) {
      if (o.titre_original) out.titre_original = o.titre_original
      if (o.langue_originale) out.langue_originale = o.langue_originale
      // NB : on n'écrase JAMAIS le sous_titre depuis le catalogue — le sous-titre de la fiche est une
      // caractéristique de l'ÉDITION (« Nouvelle édition revue et corrigée »), lue sur la page ; le
      // sous-titre canonique de l'œuvre (« ou L'Ouvrage des six jours ») ne s'applique pas à cet exemplaire.
      if (o.date_composition || o.date_approx) out.date_composition = o.date_composition || o.date_approx
      if (o.genre) out.genre = o.genre
      idAuteurOeuvre = o.id_auteur || null
      diag.oeuvre = { titre: o.titre, titre_original: o.titre_original || null, source }
    }
  }
  // 2) AUTEUR : d'abord celui de l'ŒUVRE trouvée (fiable, sans homonyme) ; sinon recherche par nom.
  if (idAuteurOeuvre) {
    const a = (await pg(cfg, `auteurs?select=id_auteur,nom,nom_original&id_auteur=eq.${encodeURIComponent(idAuteurOeuvre)}&limit=1`) || [])[0]
    if (a) { out.auteur_complet = a.nom; out.auteur_id = a.id_auteur; if (a.nom_original) out.auteur_original = a.nom_original; diag.auteur = { nom: a.nom, id_auteur: a.id_auteur, source: 'œuvre' } }
  }
  if (!out.auteur_id) {
    const ja = jetonsRequete(auteur, 3)
    if (ja.length && jetonsAuteur(auteur).length) {
      const tok = encodeURIComponent(ja[ja.length - 1])
      const a = choisirAuteur(await pg(cfg, `auteurs?select=id_auteur,nom,nom_original,dates&or=(nom.ilike.*${tok}*,nom_original.ilike.*${tok}*)&limit=20`), auteur)
      if (a) { out.auteur_complet = a.nom; out.auteur_id = a.id_auteur; if (a.nom_original) out.auteur_original = a.nom_original; diag.auteur = { nom: a.nom, id_auteur: a.id_auteur, source: 'auteurs' } }
    }
  }
  // Langue d'origine déductible du script du titre original (grec) si la base ne l'a pas fournie.
  if (!out.langue_originale && out.titre_original) { const l = langueDeTitre(out.titre_original); if (l) out.langue_originale = l }
  out.diagnostic = diag
  return out
}
