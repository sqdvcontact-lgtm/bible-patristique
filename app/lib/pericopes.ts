// Recherche de péricopes — types, appel RPC et helpers d'affichage.
//
// Le RPC `rechercher_pericopes(p_requete, p_limite, p_livre, p_chapitre, p_verset)`
// n'est accessible qu'aux utilisateurs AUTHENTIFIÉS et renvoie une ligne par péricope
// (jamais une par appellation, même si plusieurs correspondent). La ligne « Correspond
// à : … » dit l'appellation qui a répondu, sauf un alias INEXACT (`populaire_inexact`) ;
// un alias masqué s'y dit depuis le 2026-09-06 (voir `correspondanceVisible`).

import { supabase } from './supabase'
import { formaterPlageCanonique, parsePointCanonique } from './referencesBibliques'
import { analyserRequetePericope, correspondanceVisible, premierePhraseNotice } from './pericopesRecherche'

export type PericopeUsageRecherche =
  | 'principal'
  | 'equivalent'
  | 'reference'
  | 'descriptif'
  | 'paraphrase'
  | 'contextuel'
  | 'elargi'
  | 'populaire_inexact'

export type PericopeSearchOccurrence = {
  id: number
  livre: string
  debut: string
  fin: string
  niveau: number
  principale: boolean
  fiabilite: string
}

export type PericopeSearchResult = {
  pericope_id: string
  titre: string
  correspondance: string
  correspondance_visible: boolean
  usage_recherche: PericopeUsageRecherche
  poids_recherche: number
  score: number
  categorie: string
  notice: string | null
  notice_contexte: string | null
  est_collection: boolean
  nb_occurrences: number
  preuve_directe: boolean
  occurrences: PericopeSearchOccurrence[]
}

/**
 * Interroge le RPC. Ne lance rien sous deux caractères. Passe le `signal` d'un
 * AbortController pour annuler une requête devenue obsolète. Renvoie au plus `limite`
 * résultats (le RPC applique déjà la limite).
 *
 * La recherche est LIMITÉE au titre, aux appellations et à la RÉFÉRENCE (demande de
 * l'auteur, 2026-09-04). Le RPC ne retient plus un nom pour sa seule ressemblance de
 * trigrammes — « noces » rendait « Nativité » par « Noël » —, sauf en SECOURS, quand
 * la recherche stricte ne rend rien : une faute de frappe trouve encore sa péricope.
 *
 * ⚠️ LA RÉFÉRENCE EST COMPRISE ICI, par `analyserRequetePericope` — le module PUR que
 * le catalogue emploie déjà —, et passée au RPC en trois valeurs. La base ne reçoit
 * qu'un code de livre et deux nombres : ⛔ la table des noms et des abréviations vit
 * dans `app/lib/bible.ts`, et une seconde liste écrite en SQL divergerait au premier
 * ajout. C'est aussi ce qui fait dire la même chose aux deux surfaces de recherche.
 *
 * ⛔ Un NOM DE LIVRE SEUL (« Jonas ») ne déclenche PAS la voie de la référence : une
 * référence est « Mt 5 », non « Matthieu ». Le catalogue, qui a la place de les
 * montrer, réunit le livre et les titres qui portent le mot ; la barre de recherche
 * n'a que huit rangs, où les cinquante-deux péricopes de Matthieu chasseraient tout.
 */
export async function chercherPericopes(
  query: string,
  signal?: AbortSignal,
  limite = 8,
): Promise<PericopeSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const ref = analyserRequetePericope(q)
  const parReference = ref.livre !== null && ref.chapitre !== null
  let requete = supabase.rpc('rechercher_pericopes', {
    p_requete: q,
    p_limite: limite,
    p_livre: parReference ? ref.livre : null,
    p_chapitre: parReference ? ref.chapitre : null,
    p_verset: parReference ? ref.verset : null,
  })
  if (signal) requete = requete.abortSignal(signal)
  const { data, error } = await requete
  if (error) throw error
  return (data ?? []) as PericopeSearchResult[]
}

/**
 * Référence biblique affichée dans l'autocomplétion : construite sur la PREMIÈRE
 * occurrence principale (à défaut la première occurrence). Le détail complet des
 * occurrences est réservé à la page de la péricope.
 */
export function referencePericope(r: PericopeSearchResult): string | null {
  const occ = r.occurrences?.find(o => o.principale) ?? r.occurrences?.[0]
  if (!occ) return null
  return formaterPlageCanonique(occ.debut, occ.fin)
}

// La ligne « Correspond à : … » se décide dans le module PUR (`pericopesRecherche`,
// testé) : ce fichier ouvre un client Supabase dès son import et ne se teste pas.
export { correspondanceVisible }

// ── Catalogue : toutes les péricopes, groupées par livre ─────────────────────
export type PericopeCatalogueItem = {
  id: string
  nom: string
  categorie: string
  est_collection: boolean
  livre: string
  canon_debut: string
  canon_fin: string | null
  appellations: string[]
  /** Première phrase de la notice — l'avant-goût affiché sous le titre. Elle est
   *  taillée CÔTÉ SERVEUR (`premierePhraseNotice`) : les notices font 660 signes en
   *  moyenne, soit 165 Ko pour 249 péricopes si on les envoyait entières au client. */
  notice_debut: string
}

type LignePericopeCat = { id: string; nom: string; categorie: string; est_collection: boolean; notice?: string | null }
type LigneOccurrenceCat = { pericope_id: string; livre: string; canon_id_debut: string; canon_id_fin: string | null }
type LigneNomCat = { pericope_id: string; nom: string }

/** Fusion PURE des lignes brutes (péricopes + occurrence principale + noms) en items
 *  de catalogue, notice réduite à sa première phrase. Appelée par le rendu ISR. */
export function assemblerCatalogue(pRows: LignePericopeCat[], oRows: LigneOccurrenceCat[], nRows: LigneNomCat[]): PericopeCatalogueItem[] {
  const occParId = new Map<string, { livre: string; debut: string; fin: string | null }>()
  for (const o of oRows) if (!occParId.has(o.pericope_id)) occParId.set(o.pericope_id, { livre: o.livre, debut: o.canon_id_debut, fin: o.canon_id_fin })
  const nomsParId = new Map<string, string[]>()
  for (const n of nRows) { const l = nomsParId.get(n.pericope_id) ?? []; l.push(n.nom); nomsParId.set(n.pericope_id, l) }
  const items: PericopeCatalogueItem[] = []
  for (const p of pRows) {
    const occ = occParId.get(p.id)
    if (!occ) continue
    items.push({ id: p.id, nom: p.nom, categorie: p.categorie, est_collection: p.est_collection, livre: occ.livre, canon_debut: occ.debut, canon_fin: occ.fin, appellations: (nomsParId.get(p.id) ?? []).filter(n => n && n !== p.nom), notice_debut: premierePhraseNotice(p.notice) })
  }
  return items
}

// ── Texte biblique visé par une péricope, dans UNE traduction ─────────────────
export type TraductionBible = { code: string; nom: string; langue: 'fr' | 'la' | 'grc' }

// Traductions disponibles (stables). Le texte se lit dans la vue large `versets_lecture`
// (une colonne par traduction). La Septante (grec) ne couvre que l'Ancien Testament.
export const TRADUCTIONS_BIBLE: TraductionBible[] = [
  { code: 'TR0001', nom: 'Bible de Sacy', langue: 'fr' },
  { code: 'TR0002', nom: 'Bible Segond', langue: 'fr' },
  { code: 'TR0003', nom: 'Bible Crampon', langue: 'fr' },
  { code: 'TR0004', nom: 'Vulgate clémentine', langue: 'la' },
  { code: 'TR0005', nom: 'Septante de Swete', langue: 'grc' },
]

export type VersetPericope = {
  id_verset: string
  chapitre: number
  verset: number
  ordre: number
  numero: string | null
  texte: string | null
}

/** Récupère tous les versets couverts par une plage canonique, dans la traduction
 *  demandée. `tradCode` provient de TRADUCTIONS_BIBLE (jamais d'une saisie libre). */
export async function chargerTextePericope(
  livre: string,
  canonDebut: string,
  canonFin: string | null,
  tradCode: string,
  signal?: AbortSignal,
): Promise<VersetPericope[]> {
  const d = parsePointCanonique(canonDebut)
  const f = canonFin ? parsePointCanonique(canonFin) : d
  if (!d) return []
  const c1 = d.chapitre ?? 1
  const c2 = f?.chapitre ?? c1
  let req = supabase.from('versets_lecture')
    .select(`id_verset, livre, chapitre, verset, ordre, ${tradCode}, num_${tradCode}`)
    .eq('livre', livre).gte('chapitre', c1).lte('chapitre', c2).order('ordre')
  if (signal) req = req.abortSignal(signal)
  const { data, error } = await req
  if (error) throw error
  const v1 = d.verset
  const v2 = f?.verset
  type Ligne = Record<string, unknown> & { id_verset: string; chapitre: number; verset: number; ordre: number }
  return ((data ?? []) as unknown as Ligne[])
    .filter(r => {
      if (v1 != null && r.chapitre === c1 && r.verset < v1) return false
      if (v2 != null && r.chapitre === c2 && r.verset > v2) return false
      return true
    })
    .map(r => ({
      id_verset: r.id_verset,
      chapitre: r.chapitre,
      verset: r.verset,
      ordre: r.ordre,
      numero: (r[`num_${tradCode}`] as string | null) ?? null,
      texte: (r[tradCode] as string | null) ?? null,
    }))
}

const LIB_CATEGORIE: Record<string, string> = {
  recit: 'Récit',
  parabole: 'Parabole',
  discours: 'Discours',
  miracle: 'Miracle',
  enseignement: 'Enseignement',
  psaume: 'Psaume',
  cantique: 'Cantique',
  oracle: 'Oracle',
  vision: 'Vision',
  poeme: 'Poème',
  priere: 'Prière',
  hymne: 'Hymne',
  loi: 'Loi',
  genealogie: 'Généalogie',
  exhortation: 'Exhortation',
}

/** Libellé français d'une catégorie de péricope. */
export function libelleCategoriePericope(c: string | null | undefined): string {
  if (!c) return ''
  return LIB_CATEGORIE[c] ?? (c.charAt(0).toUpperCase() + c.slice(1))
}
