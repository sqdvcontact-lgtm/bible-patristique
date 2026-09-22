// Accès aux liens bibliques — source unique pour tout le site.
//
// Les liens vivaient dans quatre colonnes texte de `segments` (lien_1 … lien_4),
// où l'on entassait des id de versets séparés par des virgules. Trois défauts :
// aucune intégrité (un id supprimé du canon restait là sans que rien ne le signale),
// une seule fiabilité pour tout le segment, et une recherche inverse en
// `ilike '%GEN.1.1%'` — qui parcourt 136 770 lignes et attrape GEN.1.10 à GEN.1.19
// au passage.
//
// Ils vivent maintenant dans `liens_bibliques`, une ligne par lien, avec clés
// étrangères et index. LES QUATRE TYPES SONT CONSERVÉS À L'IDENTIQUE (charte §9) —
// c'est leur portage qui change, pas la distinction éditoriale.
import { chargerToutesPagesSupabase, lancerEnParallele, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import { supabase } from '@/app/lib/supabase'

export type TypeLien = 1 | 2 | 3 | 4

/** Les quatre types de la charte §9.1 à §9.4, inchangés. */
export const TYPES_LIEN: Record<TypeLien, { cle: string; libelle: string; description: string }> = {
  1: { cle: 'citation',   libelle: 'Citation',   description: 'Citation exacte de l’Écriture' },
  2: { cle: 'fondu',      libelle: 'Reprise',    description: 'Texte biblique fondu dans le discours de l’auteur' },
  3: { cle: 'doctrinal',  libelle: 'Doctrine',   description: 'Commentaire doctrinal du passage' },
  4: { cle: 'thematique', libelle: 'Écho',       description: 'Écho thématique' },
}

export type Fiabilite = 'à constituer' | 'douteux' | 'probable' | 'vérifié'
export const FIABILITES: Fiabilite[] = ['à constituer', 'douteux', 'probable', 'vérifié']

export type Lien = {
  id: number
  segment_id: number
  canon_id: string | null
  verset_v2_id: string | null
  livre: string | null
  chapitre: number | null
  type: TypeLien
  fiabilite: Fiabilite
  motif: string | null
  provenance: 'ia' | 'editeur' | null
  arbitrage_requis: boolean
}

const COLS = 'id, segment_id, canon_id, verset_v2_id, livre, chapitre, type, fiabilite, motif, provenance, arbitrage_requis'

type SegmentPourLiens = {
  id: number
  id_texte: string | null
  segment_key: string | null
}

type SegmentAvecLiens = {
  id_texte: string | null
  segment_key: string | null
  liens_bibliques: Lien | Lien[] | null
}

const cleStableSegment = (idTexte: string, segmentKey: string) => `${idTexte}\u0000${segmentKey}`

function liensDuSegment(ligne: SegmentAvecLiens): Lien[] {
  if (!ligne.liens_bibliques) return []
  return Array.isArray(ligne.liens_bibliques) ? ligne.liens_bibliques : [ligne.liens_bibliques]
}

/**
 * Les ids de `segments` sont des bigint à 19 chiffres. PostgREST les encode comme
 * des nombres JSON et JavaScript les arrondit au-delà de Number.MAX_SAFE_INTEGER :
 * réutiliser `segment.id` dans une clause `in` cherche alors un autre nombre et ne
 * rapporte aucun lien. La paire textuelle (id_texte, segment_key), unique dans la
 * base, est donc l'identité de transport de la page d'œuvre.
 */
export async function liensDeSegments(
  segments: SegmentPourLiens[],
  client: Pick<typeof supabase, 'from'> = supabase,
): Promise<Map<string, Lien[]>> {
  const parSegment = new Map<string, Lien[]>()
  if (!segments.length) return parSegment

  const parTexte = new Map<string, Set<string>>()
  for (const segment of segments) {
    if (!segment.id_texte || !segment.segment_key) {
      throw new Error('Un segment sans id_texte ou segment_key ne peut pas charger ses liens bibliques sans perte de précision.')
    }
    if (!parTexte.has(segment.id_texte)) parTexte.set(segment.id_texte, new Set())
    parTexte.get(segment.id_texte)!.add(segment.segment_key)
  }

  // ⛔ Des FABRIQUES, non des requêtes déjà construites : un `PostgrestFilterBuilder`
  // part au premier `then`, et un tableau passé à `Promise.all` est donc déjà tout
  // entier en vol. C'est ainsi que cette lecture occupait à elle seule toutes les
  // connexions (voir `REQUETES_EN_VOL`).
  const requetes: (() => PromiseLike<{ data: unknown; error: unknown }>)[] = []
  for (const [idTexte, ensemble] of parTexte) {
    // ⛔ Les lots se comptent en OCTETS D'ADRESSE, jamais en nombre de clés : voir
    // `lotsPourClauseIn`, et l'« Explication sur le psaume IV » qu'un lot de 500
    // avait fermée. Les clés de segment vont de trente à quatre-vingts signes selon
    // l'œuvre — aucun nombre fixe ne tient d'un texte à l'autre.
    // ⛔ On interroge `segments` et l'on EMBARQUE ses liens, jamais l'inverse.
    // Filtrer une ressource EMBARQUÉE — `liens_bibliques … segments!inner`, puis
    // `.eq('segments.id_texte', …)` — fait compiler par PostgREST une jointure
    // latérale BORNÉE (`… LIMIT $ OFFSET $`), et ce `LIMIT` est une barrière
    // d'optimisation : le planificateur ne peut plus attaquer par
    // `segments_texte_segment_key_uq` et parcourt `liens_bibliques` EN ENTIER,
    // 65 954 lignes, en sondant `segments` à chaque fois. Mesuré le 2026-09-03
    // sur une division de 300 clés, base au repos : 5 028 ms contre 10.
    for (const lot of lotsPourClauseIn([...ensemble])) {
      requetes.push(() =>
        client.from('segments')
          .select(`id_texte, segment_key, liens_bibliques!inner(${COLS})`)
          .eq('id_texte', idTexte)
          .in('segment_key', lot),
      )
    }
  }

  const resultats = await lancerEnParallele(requetes)
  for (const { data, error } of resultats) {
    if (error) throw error
    for (const ligne of (data ?? []) as SegmentAvecLiens[]) {
      if (!ligne.id_texte || !ligne.segment_key) continue
      const liens = liensDuSegment(ligne)
      if (!liens.length) continue
      const cle = cleStableSegment(ligne.id_texte, ligne.segment_key)
      if (!parSegment.has(cle)) parSegment.set(cle, [])
      parSegment.get(cle)!.push(...liens)
    }
  }
  for (const arr of parSegment.values()) arr.sort((a, b) => a.type - b.type || a.id - b.id)
  return parSegment
}

// ⛔ Toute lecture de `liens_bibliques` par verset, chapitre ou plage est PAGINÉE et
// triée par `id` : le plafond PostgREST de 1 000 lignes tronquait en silence (Genèse 1
// porte 2 773 liens), et sans ordre stable deux pages peuvent se recouvrir ou se trouer.
const requeteLiens = () => supabase.from('liens_bibliques').select(COLS)
type RequeteLiens = ReturnType<typeof requeteLiens>
type ReponseLiens = PromiseLike<{ data: Lien[] | null; error: unknown }>

/** Une lecture qui tient d'ordinaire en une page (un verset, les liens de chapitre) :
 *  pages en série, sans spéculer une vague inutile. */
const lireLiensEnSerie = (filtrer: (q: RequeteLiens) => RequeteLiens) =>
  chargerToutesPagesSupabase<Lien>((debut, fin) =>
    filtrer(requeteLiens()).order('id', { ascending: true }).range(debut, fin) as unknown as ReponseLiens,
  )

/** La taille d'une page de liens : le plafond PostgREST. */
const PAGE_LIENS = 1000

/** Une lecture qui dépasse souvent une page (les liens au verset d'un chapitre) : pages
 *  par CURSEUR (`id > dernier`), en série (2026-09-22).
 *
 *  ⛔ PLUS DE VAGUES PARALLÈLES À DÉCALAGE. Mesuré sous `authenticated` sur Genèse 1
 *  (2 839 liens) : une page à décalage évalue la politique de lecture sur TOUTES les
 *  lignes du chapitre puis les trie, si bien que trois pages la payaient trois fois
 *  (52 ms la page à chaud, 1,8 s à froid) ; et la vague spéculait deux pages vides par
 *  chapitre. Par curseur, sur l'index (canon_livre, canon_chapitre, id) (migration
 *  `20260922155227_volet_peres_audit`), une page s'arrête à ses mille lignes (22 ms) et
 *  chaque ligne n'est évaluée qu'une fois. ⚠️ En série par construction : une page ne
 *  part qu'avec l'identifiant de la précédente, si bien qu'une lecture ne garde JAMAIS
 *  plus d'une requête en vol, et que la borne de `lancerEnParallele` qui l'enveloppe
 *  est la borne réelle. */
async function lireLiensParCurseur(filtrer: (q: RequeteLiens) => RequeteLiens): Promise<Lien[]> {
  const lignes: Lien[] = []
  let dernier: number | null = null
  for (;;) {
    let q = filtrer(requeteLiens())
    if (dernier !== null) q = q.gt('id', dernier)
    const page = await (q.order('id', { ascending: true }).range(0, PAGE_LIENS - 1) as unknown as ReponseLiens)
    if (page.error) throw page.error
    const donnees = page.data ?? []
    lignes.push(...donnees)
    if (donnees.length < PAGE_LIENS) return lignes
    dernier = donnees[donnees.length - 1].id
  }
}

/** Recherche inverse : les segments qui renvoient à un verset donné.
 *
 *  Un lien peut viser trois choses — un créneau du canon, un verset surnuméraire
 *  (hors ossature), ou un chapitre entier. Un segment rattaché au chapitre répond
 *  donc aussi pour chacun de ses versets : c'est voulu, et c'était impossible à
 *  exprimer du temps des colonnes texte.
 */
export async function segmentsLiesAuVerset(canonId: string): Promise<Lien[]> {
  const [livre, chapitre] = canonId.split('.')
  const [parVerset, parChapitre] = await lancerEnParallele([
    () => lireLiensEnSerie(q => q.eq('canon_id', canonId)),
    () => lireLiensEnSerie(q => q.eq('livre', livre).eq('chapitre', Number(chapitre))),
  ])
  return [...parVerset, ...parChapitre]
}

/** Recherche inverse à l'échelle d'un CHAPITRE entier : tous les segments qui
 *  renvoient à l'un quelconque de ses versets, plus ceux rattachés au chapitre.
 *  Sert le volet de droite quand un chapitre est ouvert sans verset sélectionné.
 *
 *  Deux requêtes, comme pour le verset : les liens par verset ne portent que
 *  `canon_id` (« GEN.1.7 ») ; les liens de chapitre ne portent que `livre` +
 *  `chapitre`.
 *
 *  ⛔ Le chapitre d'un lien AU VERSET se filtre par `canon_livre` + `canon_chapitre`,
 *  deux colonnes ENGENDRÉES de `canon_id` (migration du 2026-09-05), jamais par
 *  `like 'GEN.1.%'`. Sous la RLS, `like` n'est pas « leakproof » : Postgres doit
 *  évaluer la politique de lecture (un EXISTS sur segments ⋈ oeuvre_textes ⋈
 *  oeuvres) sur CHAQUE ligne de la table AVANT d'appliquer le motif, et aucun
 *  index ne peut servir de condition. Mesuré le 2026-09-05 sur GEN 1, rôle
 *  `authenticated` : 66 236 lignes sondées par la politique pour 2 741 rendues,
 *  2 337 ms au repos, et le délai de huit secondes sous charge (quatorze 500 le
 *  4 septembre). `=` est leakproof : l'index `liens_bib_canon_chapitre_idx`
 *  retient d'abord les lignes du chapitre, la politique ne s'évalue que sur elles.
 */
export async function segmentsLiesAuChapitre(livre: string, chapitre: number): Promise<Lien[]> {
  const [parVerset, parChapitre] = await lancerEnParallele([
    () => lireLiensParCurseur(q => q.eq('canon_livre', livre).eq('canon_chapitre', chapitre)),
    () => lireLiensEnSerie(q => q.eq('livre', livre).eq('chapitre', chapitre)),
  ])
  return [...parVerset, ...parChapitre]
}

/** Recherche inverse sur une PLAGE canonique (péricope) : les segments qui renvoient
 *  à l'un des versets de la plage, plus ceux rattachés à l'un de ses chapitres. Sert le
 *  volet patristique de la page d'une péricope, à l'identique de la page Bible.
 */
export async function segmentsLiesAPlage(livre: string, canonDebut: string, canonFin: string | null): Promise<Lien[]> {
  const point = (s: string) => {
    const [, c, v] = s.split('.')
    return { chapitre: c ? Number(c) : null, verset: v ? Number(v) : null }
  }
  const d = point(canonDebut)
  const f = canonFin ? point(canonFin) : d
  if (d.chapitre == null) return []
  const c1 = d.chapitre, c2 = f.chapitre ?? c1
  const v1 = d.verset, v2 = f.verset
  const chapitres: number[] = []
  for (let c = c1; c <= c2; c++) chapitres.push(c)
  // Même filtre leakproof que `segmentsLiesAuChapitre` : jamais `like` sur `canon_id`.
  // La liste `chapitres` est bornée par construction (les chapitres d'une péricope) :
  // la clause `in` n'a pas à passer par `lotsPourClauseIn`. Chaque lecture est paginée.
  const resultats = await lancerEnParallele([
    ...chapitres.map(c => () => lireLiensParCurseur(q => q.eq('canon_livre', livre).eq('canon_chapitre', c))),
    () => lireLiensEnSerie(q => q.is('canon_id', null).eq('livre', livre).in('chapitre', chapitres)),
  ])
  const out: Lien[] = []
  resultats.forEach((liens, idx) => {
    for (const l of liens) {
      if (idx < chapitres.length) {
        // Lien au verset : ne garder que ceux DANS la plage (bornes aux chapitres extrêmes).
        const p = point(l.canon_id ?? '')
        if (p.verset == null) continue
        if (v1 != null && p.chapitre === c1 && p.verset < v1) continue
        if (v2 != null && p.chapitre === c2 && p.verset > v2) continue
      }
      out.push(l)
    }
  })
  return out
}

/** Les versets visés par un segment, dans l'ordre des types — pour l'affichage. */
export function versetsDuLien(liens: Lien[], type: TypeLien): string[] {
  return liens.filter(l => l.type === type && l.canon_id).map(l => l.canon_id!)
}

/** Un lien sans cible est un lien à constituer : la référence est connue de
 *  l'éditeur (elle est dans `motif`) mais n'a pas encore été résolue au canon. */
export const estAConstituer = (l: Lien) => !l.canon_id && !l.verset_v2_id && !l.livre

/** ADAPTATEUR TRANSITOIRE. Reconstitue `lien_1 … lien_4` en mémoire, au format
 *  hérité (« GEN.1.1;GEN.1.2 »), à partir de la table.
 *
 *  Il existe pour les écrans déjà écrits contre les quatre colonnes — au premier
 *  chef la page d'une œuvre, qui les lit à sept endroits. Les réécrire d'un bloc,
 *  sans pouvoir rien vérifier à l'écran, ferait courir plus de risque que ce
 *  détour n'en fait courir. La base, elle, est déjà propre : c'est le point
 *  important, et ces écrans pourront migrer un à un.
 *
 *  N'écrire AUCUN nouvel écran contre cette forme : utiliser `liensDeSegments`.
 */
export async function hydraterLiensHerites<T extends SegmentPourLiens>(
  segs: T[],
  // La page d'une œuvre est rendue par le SERVEUR, avec son propre client : sans
  // ce paramètre, l'hydratation s'y ferait avec le client du navigateur — et le
  // premier rendu, celui que le lecteur voit, arriverait sans aucun lien.
  client?: Pick<typeof supabase, 'from'>,
): Promise<T[]> {
  const parSegment = await liensDeSegments(segs, client ?? supabase)
  for (const s of segs) {
    const liens = s.id_texte && s.segment_key
      ? parSegment.get(cleStableSegment(s.id_texte, s.segment_key)) ?? []
      : []
    for (const t of [1, 2, 3, 4] as TypeLien[]) {
      ;(s as Record<string, unknown>)[`lien_${t}`] =
        liens.filter(l => l.type === t && l.canon_id).map(l => l.canon_id).join(';') || null
    }
  }
  return segs
}
