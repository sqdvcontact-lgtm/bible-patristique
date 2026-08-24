// Lecture du contrat compact du système de contrôle v2.
//
// Toute la matière vient d'un seul appel : `public.controle_v2_admin_snapshot()`.
// La règle est de ne rien recalculer ici : le frontend affiche ce que le backend
// certifie, et les seuls calculs admis sont de présentation (compléter les
// sévérités absentes par zéro, traduire un état en couleur, dire un âge en
// français). Les gros comptages historiques restent sur /admin/controle/statistiques.

export type Severite = 'BLOCKER' | 'ERROR' | 'REVIEW' | 'INFO'

export const SEVERITES: Severite[] = ['BLOCKER', 'ERROR', 'REVIEW', 'INFO']

export type Constat = {
  rule_code: string
  severity: Severite | string
  object_type: string | null
  object_key: string | null
  details: Record<string, unknown> | null
}

export type DernierRun = {
  id: string
  status: string
  started_at: string | null
  finished_at: string | null
  findings: Constat[] | null
  metadata: {
    control_v2_version?: string
    findings_by_severity?: Partial<Record<Severite, number>>
  } | null
}

export type Certification = {
  code: string
  status: string
  dirty: boolean
  dirty_at: string | null
  dirty_reason: string | null
  issue_count: number
  certified_at: string | null
}

export type GardeVivante = {
  open_postchecks: number
  attention_current: boolean
  hard_block_current: boolean
  stale_alignment_runs: number
  editorial_work_allowed: boolean
  untracked_bible_text_events: number
  structural_invalid_postchecks: number
  ambiguous_owner_objects_with_links: number
  untracked_segment_events_with_links: number
}

export type FileLiens = {
  checks: number
  ambiguous_owner: number
  dependent_links: number
  bootstrap_checks: number
  structural_invalid: number
  post_go_live_checks: number
}

export type ProprietaireFile = {
  checks: number
  missions: string[]
  routing_status: string
  dependent_links: number
}

export type Ambiguite = {
  object_type: string
  object_id: string
  id_oeuvre: string | null
  segment_numero: string | null
  sections: string[] | null
  dependent_links: number
  first_changed_at: string | null
  last_changed_at: string | null
  candidate_missions: string[]
}

export type DiagnosticAlignement = {
  run_id: string
  book_code: string
  created_at: string
  stale: boolean
  stale_reason: string | null
  model_version: string | null
  script_version: string | null
  aelf_spine_version: string | null
  current_fingerprint: string | null
  captured_fingerprint: string | null
  current_fingerprint_dirty: boolean
  current_fingerprint_dirty_reason: string | null
  human_reviews_same_run: number
  cases: { total: number; high: number; medium: number; low: number }
}

export type MemoireRevues = {
  total_cases: number
  carried_reviews: number
  cases_with_review_memory: number
  books: {
    book_code: string
    cases: number
    decisions: Record<string, number>
    carried_reviews: number
    same_run_reviews: number
    cases_with_review_memory: number
  }[]
}

export type Snapshot = {
  backend_version: string
  generated_at: string
  cache_calculated_at: string | null
  cache_age_seconds: number | null
  go_live: { version: string; activated_at: string; meaning: string } | null
  last_run: DernierRun | null
  live_guard: GardeVivante
  rpc_security: { secure: boolean; registered: number; public_leaks: number; missing_functions: number; required_role_missing: number } | null
  certifications: Certification[] | null
  postcheck_owners: ProprietaireFile[] | null
  link_review_queue: FileLiens | null
  routing_ambiguities: Ambiguite[] | null
  alignment_diagnostics: DiagnosticAlignement[] | null
  alignment_review_memory: MemoireRevues | null
  alignment_rerun_manifest: { mode: string; trad_id: string; canonical_authority: string } | null
  metrics: {
    rules: { total: number; blocking: number; automatic: number }
    aelf_spine: {
      entries: number
      version_code: string
      version_status: string
      canonical_review: number
      translation_review: number
      tr0001_tr0005_units: number
      tr0001_tr0005_units_verified: number
    }
    biblical_links: { total: number; with_canon: number; without_canon: number; arbitrage_required: number }
    alignment_tools: {
      cases_total: number
      cases_high: number
      cases_medium: number
      cases_low: number
      stale_runs: number
      current_runs: number
      review_rows: number
      stale_books: string[]
      last_spine_mapping_update: string | null
    }
    journal: { backlog: number; todos_done: number; todos_total: number; active_missions: number; active_without_stable_id: number }
    quality_calculated_at: string | null
  }
}

/** La RPC enveloppe son contrat dans une clé unique ; on ne la déballe qu'ici. */
export function lireSnapshot(brut: unknown): Snapshot | null {
  if (!brut || typeof brut !== 'object') return null
  const enveloppe = (brut as { controle_v2_admin?: unknown }).controle_v2_admin
  const contenu = enveloppe ?? brut
  if (!contenu || typeof contenu !== 'object') return null
  if (!('live_guard' in contenu)) return null
  return contenu as Snapshot
}

/**
 * Le backend n'écrit que les sévérités rencontrées : une sévérité absente vaut
 * zéro constat, et doit se lire comme telle plutôt que de disparaître.
 */
export function comptesParSeverite(run: DernierRun | null): Record<Severite, number> {
  const source = run?.metadata?.findings_by_severity ?? {}
  const comptes = { BLOCKER: 0, ERROR: 0, REVIEW: 0, INFO: 0 } as Record<Severite, number>
  for (const severite of SEVERITES) comptes[severite] = Number(source[severite] ?? 0)
  return comptes
}

export type EtatGeneral = { code: 'bloque' | 'attention' | 'ok'; libelle: string; phrase: string }

/**
 * L'état général est celui que la garde vivante affirme, pas une moyenne des
 * compteurs : un blocage dur prime sur tout, l'attention ensuite.
 */
export function etatGeneral(snapshot: Snapshot): EtatGeneral {
  const garde = snapshot.live_guard
  const comptes = comptesParSeverite(snapshot.last_run)
  if (garde.hard_block_current || comptes.BLOCKER > 0) {
    return {
      code: 'bloque',
      libelle: 'Bloqué',
      phrase: 'Le contrôle interdit les écritures tant que le blocage n’est pas levé.',
    }
  }
  if (garde.attention_current || comptes.ERROR > 0 || comptes.REVIEW > 0) {
    return {
      code: 'attention',
      libelle: 'Attention',
      phrase: garde.editorial_work_allowed
        ? 'Le travail éditorial reste autorisé, mais des constats attendent une revue.'
        : 'Des constats attendent une revue et le travail éditorial est suspendu.',
    }
  }
  return { code: 'ok', libelle: 'En ordre', phrase: 'Aucun constat ouvert au dernier run global.' }
}

export function teinteEtat(code: EtatGeneral['code']): string {
  if (code === 'bloque') return 'var(--cs-danger)'
  if (code === 'attention') return 'var(--cs-or)'
  return 'var(--cs-vert)'
}

export function teinteSeverite(severite: Severite): string {
  if (severite === 'BLOCKER' || severite === 'ERROR') return 'var(--cs-danger)'
  if (severite === 'REVIEW') return 'var(--cs-or)'
  return 'var(--cs-texte-second)'
}

/** Âge du cache de métriques, dit en français plutôt qu'en secondes brutes. */
export function ageLisible(secondes: number | null): string {
  if (secondes === null || secondes === undefined || !Number.isFinite(secondes)) return 'âge inconnu'
  if (secondes < 90) return 'à l’instant'
  const minutes = Math.round(secondes / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.round(heures / 24)
  return `il y a ${jours} j`
}

/**
 * Un run est frais quand son empreinte capturée est celle que le corpus donne
 * aujourd'hui. Sans empreinte capturée, il est périmé : ne jamais lui prêter
 * l'empreinte courante, qui reviendrait à certifier un calcul qu'on n'a pas fait.
 */
export function estFrais(diagnostic: DiagnosticAlignement): boolean {
  if (diagnostic.stale) return false
  if (!diagnostic.captured_fingerprint) return false
  return diagnostic.captured_fingerprint === diagnostic.current_fingerprint
}

/**
 * Les totaux d'« Outils alignements » se refont depuis les runs courants, que la
 * RPC calcule en direct, et non depuis `metrics.alignment_tools`, qui vient d'un
 * cache : après un rerun, le cache annonce encore les dossiers de la veille.
 */
export function totauxAlignements(diagnostics: DiagnosticAlignement[] | null) {
  const runs = diagnostics ?? []
  const somme = (choix: (item: DiagnosticAlignement) => number) => runs.reduce((total, item) => total + choix(item), 0)
  return {
    runs: runs.length,
    frais: runs.filter(estFrais).length,
    perimes: runs.filter((item) => !estFrais(item)).length,
    total: somme((item) => item.cases?.total ?? 0),
    high: somme((item) => item.cases?.high ?? 0),
    medium: somme((item) => item.cases?.medium ?? 0),
    low: somme((item) => item.cases?.low ?? 0),
  }
}

export type GroupeAmbiguite = {
  missions: string[]
  objets: number
  liens: number
  dernier: string | null
  exemples: Ambiguite[]
}

/**
 * Les ambiguïtés se comptent par centaines dès qu'une passe éditoriale traverse
 * une œuvre : elles se lisent par jeu de missions revendiquantes, avec quelques
 * objets nommés. Les lister toutes noierait la carte sans rien apprendre de plus,
 * et le compte exact reste porté par le total.
 */
export function grouperAmbiguites(ambiguites: Ambiguite[] | null, exemplesParGroupe = 4): GroupeAmbiguite[] {
  const groupes = new Map<string, GroupeAmbiguite>()
  for (const ambiguite of ambiguites ?? []) {
    const missions = [...(ambiguite.candidate_missions ?? [])].sort()
    const cle = missions.join(' | ')
    const groupe = groupes.get(cle) ?? { missions, objets: 0, liens: 0, dernier: null, exemples: [] }
    groupe.objets += 1
    groupe.liens += Number(ambiguite.dependent_links ?? 0)
    if (!groupe.dernier || (ambiguite.last_changed_at ?? '') > groupe.dernier) groupe.dernier = ambiguite.last_changed_at
    if (groupe.exemples.length < exemplesParGroupe) groupe.exemples.push(ambiguite)
    groupes.set(cle, groupe)
  }
  return [...groupes.values()].sort((a, b) => b.objets - a.objets)
}

export type Gravite = 'action' | 'attention' | 'ok'

export type GroupeSection = 'traiter' | 'tient' | 'contexte'

export type SectionControle = {
  id: string
  titre: string
  groupe: GroupeSection
  /** Le chiffre saillant de la section, déjà mis en français. */
  chiffre: string | null
  gravite: Gravite
}

const nombre = (n: number | null | undefined) => (n ?? 0).toLocaleString('fr-FR')

/**
 * L'ordre et la gravité des sections, pour le volet ET pour la colonne.
 *
 * Une seule source, sinon le volet finit par annoncer une section que la page a
 * déplacée. L'ordre est FIXE, du plus actionnable au plus informatif : un écran
 * qui réordonne ses sections selon l'état ne s'apprend jamais. C'est la pastille
 * qui dit la gravité du jour, pas la place.
 */
export function sectionsControle(snapshot: Snapshot): SectionControle[] {
  const comptes = comptesParSeverite(snapshot.last_run)
  const constats = (snapshot.last_run?.findings ?? []).length
  const file = snapshot.link_review_queue
  const ambigus = (snapshot.routing_ambiguities ?? []).length
  const totaux = totauxAlignements(snapshot.alignment_diagnostics)
  const certifications = snapshot.certifications ?? []
  const sales = certifications.filter((item) => item.dirty || item.status !== 'ok').length
  const garde = snapshot.live_guard
  const spine = snapshot.metrics?.aelf_spine
  const liens = snapshot.metrics?.biblical_links

  return [
    {
      id: 'dernier-run',
      titre: 'Dernier run global',
      groupe: 'traiter',
      chiffre: nombre(constats),
      gravite: comptes.BLOCKER + comptes.ERROR > 0 ? 'action' : comptes.REVIEW > 0 ? 'attention' : 'ok',
    },
    {
      id: 'file-liens',
      titre: 'File des postcontrôles',
      groupe: 'traiter',
      chiffre: nombre(file?.checks),
      gravite: (file?.structural_invalid ?? 0) > 0 ? 'action' : (file?.checks ?? 0) > 0 ? 'attention' : 'ok',
    },
    {
      id: 'ambigus',
      titre: 'Propriétaires ambigus',
      groupe: 'traiter',
      chiffre: nombre(ambigus),
      gravite: ambigus > 0 ? 'action' : 'ok',
    },
    {
      id: 'alignements',
      titre: 'Outils alignements',
      groupe: 'traiter',
      chiffre: nombre(totaux.total),
      gravite: totaux.perimes > 0 ? 'action' : totaux.high > 0 ? 'attention' : 'ok',
    },
    {
      id: 'certifications',
      titre: 'Certifications',
      groupe: 'tient',
      chiffre: `${nombre(certifications.length - sales)} / ${nombre(certifications.length)}`,
      gravite: sales > 0 ? 'action' : 'ok',
    },
    {
      id: 'gardes',
      titre: 'Gardes et règles',
      groupe: 'tient',
      chiffre: nombre(snapshot.metrics?.rules?.total),
      gravite:
        garde.untracked_bible_text_events + garde.untracked_segment_events_with_links > 0 || snapshot.rpc_security?.secure === false
          ? 'action'
          : 'ok',
    },
    {
      id: 'spine',
      titre: 'Spine AELF',
      groupe: 'contexte',
      chiffre: nombre(spine?.entries),
      gravite: (spine?.canonical_review ?? 0) + (spine?.translation_review ?? 0) > 0 ? 'attention' : 'ok',
    },
    {
      id: 'liens-bibliques',
      titre: 'Liens bibliques',
      groupe: 'contexte',
      chiffre: nombre(liens?.total),
      gravite: (liens?.arbitrage_required ?? 0) > 0 ? 'attention' : 'ok',
    },
  ]
}

export const INTITULES_GROUPES: Record<GroupeSection, string> = {
  traiter: 'À traiter',
  tient: 'Ce qui tient',
  contexte: 'Contexte',
}

export function teinteGravite(gravite: Gravite): string {
  if (gravite === 'action') return 'var(--cs-danger)'
  if (gravite === 'attention') return 'var(--cs-or)'
  return 'var(--cs-vert)'
}

/** Décisions humaines déjà connues pour un livre, tous runs confondus. */
export function decisionsConnues(memoire: MemoireRevues | null, livre: string): { code: string; n: number }[] {
  const entree = memoire?.books?.find((item) => item.book_code === livre)
  if (!entree) return []
  return Object.entries(entree.decisions ?? {})
    .map(([code, n]) => ({ code, n: Number(n) }))
    .filter((item) => item.n > 0)
    .sort((a, b) => b.n - a.n)
}
