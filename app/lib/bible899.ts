// TR0009 « Bible française du XIIIᵉ siècle » (manuscrit Français 899) — accès au
// texte des versets CANONIQUES recomposé depuis les tables éditoriales Bible 899.
//
// Une seule traduction, plusieurs états textuels (couches) : `diplomatic`
// (transcription diplomatique) et `expanded` (abréviations développées). Le texte
// est recomposé côté base par la vue `v_bible899_verse_recomposed` (offsets +
// join_before), alignée sur `canon_id`. Aucune copie vers `versets_v2` : toute
// nouvelle passe d'alignement importée apparaît automatiquement.
//
// Ce module est neutre client/serveur : il reçoit un `SupabaseClient` en argument
// (client navigateur pour la Polyglotte, client serveur pour la page Bible).

import type { SupabaseClient } from '@supabase/supabase-js'

/** Identifiant de la traduction Bible 899 dans `traductions`. */
export const TRAD_ID_BIBLE899 = 'TR0009'

// Couche textuelle (état du texte). « diplomatic » (transcription) et « expanded »
// (abréviations développées) existent toujours ; « modernized » (graphie modernisée
// du segment canonique) n'existe QUE si les données l'exposent — la disponibilité se
// lit sur les colonnes de la vue, jamais sur une constante frontend. Voir
// couchesDisponibles899.
export type Couche899 = 'diplomatic' | 'expanded' | 'modernized'
/** Défaut hors « modernized » : abréviations développées (« Manuscrit »). */
export const COUCHE_DEFAUT_899: Couche899 = 'expanded'

/** Couche par défaut selon les couches réellement disponibles : « modernized » si
 *  elle existe (elle devient alors le défaut), sinon « expanded ». */
export function coucheDefaut899(disponibles?: readonly Couche899[]): Couche899 {
  return disponibles?.includes('modernized') ? 'modernized' : COUCHE_DEFAUT_899
}

/**
 * Normalise la couche demandée (URL `?couche=`) contre les couches réellement
 * disponibles. Sans liste `disponibles`, seules diplomatic/expanded sont garanties.
 * Repli propre sur « expanded » si la couche demandée n'existe pas (ex.
 * `?couche=modernized` avant publication de la couche modernisée) : jamais d'erreur.
 */
export function normaliserCouche899(
  valeur: string | null | undefined,
  disponibles?: readonly Couche899[],
): Couche899 {
  if (valeur == null || valeur === '') return coucheDefaut899(disponibles)
  const demandee: Couche899 | null =
    valeur === 'diplomatic' ? 'diplomatic'
    : valeur === 'modernized' ? 'modernized'
    : valeur === 'expanded' ? 'expanded'
    : null
  if (demandee == null) return coucheDefaut899(disponibles)
  if (!disponibles) return demandee === 'diplomatic' ? 'diplomatic' : 'expanded'
  return disponibles.includes(demandee) ? demandee : 'expanded'
}

/** Couches déductibles des colonnes réellement présentes dans `v_bible899_verse_recomposed`. */
export function couchesDisponiblesDepuisColonnes(colonnes: readonly string[]): Couche899[] {
  const dispo: Couche899[] = []
  if (colonnes.includes('texte_diplomatic')) dispo.push('diplomatic')
  if (colonnes.includes('texte_expanded')) dispo.push('expanded')
  if (colonnes.includes('texte_modernized')) dispo.push('modernized')
  return dispo.length ? dispo : ['expanded']
}

/** Une ligne de `v_bible899_verse_recomposed` (un alignement). */
export type Ligne899 = {
  trad_id: string
  canon_id: string | null
  canon_id_fin: string | null
  livre: string | null
  chapitre: number | null
  verset: number | null
  alignment_order: number
  alignment_status: string
  verification_status: string
  segment_key: string | null
  texte_diplomatic: string | null
  texte_expanded: string | null
  /** Présent seulement si la vue expose la couche modernisée (voir couchesDisponibles899). */
  texte_modernized?: string | null
}

/** Plafond de lignes que l'API de données rend par réponse. Pas un réglage : une borne. */
const TAILLE_TRANCHE_899 = 1000

const COLONNES_META_899 =
  'trad_id, canon_id, canon_id_fin, livre, chapitre, verset, alignment_order, alignment_status, verification_status, segment_key'
const COLONNE_TEXTE_899: Record<Couche899, string> = {
  diplomatic: 'texte_diplomatic',
  expanded: 'texte_expanded',
  modernized: 'texte_modernized',
}

/** Le texte de la couche demandée (null si absent / lacune). */
export function texteCouche899(
  ligne: Pick<Ligne899, 'texte_diplomatic' | 'texte_expanded' | 'texte_modernized'>,
  couche: Couche899,
): string | null {
  if (couche === 'diplomatic') return ligne.texte_diplomatic
  if (couche === 'modernized') return ligne.texte_modernized ?? null
  return ligne.texte_expanded
}

export type Rendu899 = 'texte' | 'lacune' | 'exclu'

/**
 * Décide comment rendre une ligne, sans imposer de mise en forme :
 *   - `exclu`  : MANUSCRIPT_EXTRA (matière propre au manuscrit, sans place canonique)
 *                — ne JAMAIS transformer en faux verset canonique ;
 *   - `lacune` : CANONICAL_GAP (le manuscrit ne porte pas ce verset) → « [lacune du manuscrit] » ;
 *   - `texte`  : MATCH / OFFSET / UNCERTAIN alignés (affichage normal).
 */
export function rendu899(
  ligne: Pick<Ligne899, 'canon_id' | 'alignment_status'>,
): Rendu899 {
  if (ligne.canon_id == null) return 'exclu'
  if (ligne.alignment_status === 'CANONICAL_GAP') return 'lacune'
  return 'texte'
}

/** Alignement à signaler discrètement « à revoir » (relecture non close). */
export function aRevoir899(
  ligne: Pick<Ligne899, 'alignment_status' | 'verification_status'>,
): boolean {
  return ligne.verification_status === 'review' || ligne.alignment_status === 'UNCERTAIN'
}

/**
 * Charge les versets canoniques recomposés de TR0009 pour un livre (et,
 * facultativement, un seul chapitre). Les lignes MANUSCRIPT_EXTRA (canon_id null,
 * livre null) sont naturellement écartées par le filtre sur `livre`.
 */
export async function chargerVersets899(
  client: SupabaseClient,
  params: { livre: string; chapitre?: number | null },
  couches: readonly Couche899[] = ['diplomatic', 'expanded'],
): Promise<Ligne899[]> {
  // On ne nomme QUE les colonnes de texte réellement présentes (nommer une colonne
  // absente ferait échouer toute la requête PostgREST). La couche « modernized »
  // n'est donc demandée que si l'appelant l'a vue disponible.
  const select = [COLONNES_META_899, ...couches.map((c) => COLONNE_TEXTE_899[c])].join(', ')
  // ⚠️ L'API de données plafonne à 1000 lignes par réponse. Un CHAPITRE tient toujours
  // sous ce plafond, mais un LIVRE ENTIER (mode « livre entier » de la Polyglotte) ne le
  // tient pas toujours : au 2026-08-19, huit livres le dépassent — Psaumes 2527, Genèse
  // 1533, Nombres 1289, Exode 1213, Luc 1149, Job 1070, Matthieu 1068, Actes 1002. Sans
  // pagination, la lecture s'arrêtait au millième verset SANS RIEN SIGNALER : le livre
  // paraissait simplement s'interrompre. On lit donc par tranches jusqu'à épuisement.
  const lignes: Ligne899[] = []
  for (let debut = 0; ; debut += TAILLE_TRANCHE_899) {
    let requete = client
      .from('v_bible899_verse_recomposed')
      .select(select)
      .eq('trad_id', TRAD_ID_BIBLE899)
      .eq('livre', params.livre)
    if (params.chapitre != null) requete = requete.eq('chapitre', params.chapitre)
    const { data, error } = await requete
      .order('chapitre', { ascending: true })
      .order('verset', { ascending: true })
      .range(debut, debut + TAILLE_TRANCHE_899 - 1)
    if (error) throw new Error(`Versets Bible 899 illisibles : ${error.message}`)
    // `select` dynamique : supabase-js ne peut plus inférer la forme des lignes, d'où le
    // passage par `unknown` (les colonnes demandées correspondent bien à Ligne899).
    const tranche = (data ?? []) as unknown as Ligne899[]
    lignes.push(...tranche)
    // Une tranche incomplète est la dernière. Un chapitre se lit donc en UN aller-retour.
    if (tranche.length < TAILLE_TRANCHE_899) break
  }
  return lignes
}

/** Ensemble des livres canoniques réellement portés par TR0009 (pour la navigation). */
export async function livresDisponibles899(client: SupabaseClient): Promise<Set<string>> {
  // ⛔ On demande la LISTE DES LIVRES, jamais tous les versets pour en déduire la liste.
  // C'est la règle déjà posée pour les traductions ordinaires (`livres_par_traduction`,
  // cf. le commentaire de `BibleLayout`), et TR0009 l'avait rouverte : la vue de
  // recomposition était interrogée sans borne, l'API plafonne à 1000 lignes, si bien que
  // sur 18 957 lignes alignées seuls les livres tombant dans cette fenêtre étaient vus —
  // RUT, TOB, MRK, 1PE, JAS. Les dix-neuf autres, GENÈSE COMPRISE, étaient marqués
  // « vides », donc INERTES dans NavLivres (`handleLivre` sort aussitôt) : la Bible du
  // XIIIᵉ ne s'ouvrait plus. Le défaut est né en silence le jour où le corpus a dépassé
  // les mille lignes. Vue jumelle : `livres_bible899` (sql/20260819_livres_bible899.sql).
  const { data, error } = await client
    .from('livres_bible899')
    .select('livre')
    .eq('trad_id', TRAD_ID_BIBLE899)
  if (error) throw new Error(`Livres Bible 899 illisibles : ${error.message}`)
  const livres = new Set<string>()
  for (const ligne of (data ?? []) as { livre: string | null }[]) {
    if (ligne.livre) livres.add(ligne.livre)
  }
  return livres
}

// Sonde des couches réellement portées par la vue de recomposition. Piloté par les
// DONNÉES (les colonnes présentes), jamais par une constante frontend : le jour où
// Codex ajoutera une colonne `texte_modernized` (couche modernisée validée), elle
// sera reprise automatiquement. Même mécanisme de sondage que codesTraductionsLecture.
const COUCHES_CACHE_MS = 5 * 60_000
let coucheCache: { expiresAt: number; promise: Promise<Couche899[]> } | null = null

async function sonderCouchesDisponibles899(client: SupabaseClient): Promise<Couche899[]> {
  const { data } = await client.from('v_bible899_verse_recomposed').select('*').limit(1)
  const ligne = (data ?? [])[0] as Record<string, unknown> | undefined
  return couchesDisponiblesDepuisColonnes(ligne ? Object.keys(ligne) : [])
}

export async function couchesDisponibles899(client: SupabaseClient): Promise<Couche899[]> {
  const now = Date.now()
  if (coucheCache && coucheCache.expiresAt > now) return coucheCache.promise
  const promise = sonderCouchesDisponibles899(client)
  coucheCache = { expiresAt: now + COUCHES_CACHE_MS, promise }
  try {
    return await promise
  } catch (error) {
    if (coucheCache?.promise === promise) coucheCache = null
    throw error
  }
}

// Une ligne recomposée, adaptée au CONTRAT ORDINAIRE de la page Bible : la mécanique
// (offsets, unités-source, join_before, folios, colonnes, segmentation) reste derrière
// la vue et cette fonction. L'interface ne voit qu'un verset canonique et son texte.
export type VersetAdapte899 = {
  id_verset: string
  ref: string
  livre: string
  chapitre: number
  verset: number
  _est899: true
  _estLacune: boolean
  [traduction: string]: string | number | boolean | null | undefined
}

/**
 * Adapte les lignes 899 vers la forme consommée par TexteBible (texte sous la clé
 * dynamique `trad`). Écarte MANUSCRIPT_EXTRA (jamais un faux verset canonique) ; pose
 * le texte à `null` sur une lacune du manuscrit. N'expose AUCUN statut technique
 * (alignment_status / verification_status / confidence restent internes).
 */
export function adapterVersets899(
  lignes: readonly Ligne899[],
  trad: string,
  livre: string,
  chapitreDefaut: number,
  couche: Couche899,
): VersetAdapte899[] {
  const out: VersetAdapte899[] = []
  for (const ligne of lignes) {
    const mode = rendu899(ligne)
    if (mode === 'exclu') continue
    const estLacune = mode === 'lacune'
    out.push({
      id_verset: `899:${ligne.canon_id}`,
      ref: ligne.canon_id ?? '',
      livre,
      chapitre: ligne.chapitre ?? chapitreDefaut,
      verset: ligne.verset ?? 0,
      _est899: true,
      _estLacune: estLacune,
      [trad]: estLacune ? null : texteCouche899(ligne, couche),
    })
  }
  return out
}
