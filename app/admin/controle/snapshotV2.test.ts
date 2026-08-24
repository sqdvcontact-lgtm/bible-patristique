import { describe, expect, it } from 'vitest'

import {
  ageLisible,
  comptesParSeverite,
  decisionsConnues,
  estFrais,
  etatGeneral,
  lireSnapshot,
  type DiagnosticAlignement,
  type Snapshot,
} from './snapshotV2'

function garde(partiel: Partial<Snapshot['live_guard']> = {}): Snapshot['live_guard'] {
  return {
    open_postchecks: 0,
    attention_current: false,
    hard_block_current: false,
    stale_alignment_runs: 0,
    editorial_work_allowed: true,
    untracked_bible_text_events: 0,
    structural_invalid_postchecks: 0,
    ambiguous_owner_objects_with_links: 0,
    untracked_segment_events_with_links: 0,
    ...partiel,
  }
}

function snapshot(partiel: Partial<Snapshot> = {}): Snapshot {
  return {
    backend_version: '2.33',
    generated_at: '2026-08-24T07:22:37.681519+00:00',
    cache_calculated_at: null,
    cache_age_seconds: 0,
    go_live: null,
    last_run: null,
    live_guard: garde(),
    rpc_security: null,
    certifications: null,
    postcheck_owners: null,
    link_review_queue: null,
    routing_ambiguities: null,
    alignment_diagnostics: null,
    alignment_review_memory: null,
    alignment_rerun_manifest: null,
    metrics: {} as Snapshot['metrics'],
    ...partiel,
  }
}

function diagnostic(partiel: Partial<DiagnosticAlignement> = {}): DiagnosticAlignement {
  return {
    run_id: 'r1',
    book_code: 'ACT',
    created_at: '2026-08-24T07:00:00+00:00',
    stale: false,
    stale_reason: null,
    model_version: 'bible-alignment-audit-model-v1.4.2',
    script_version: 'bible-alignment-audit-v1.4.2',
    aelf_spine_version: 'TOL_WEB_20260821',
    current_fingerprint: 'abc',
    captured_fingerprint: 'abc',
    current_fingerprint_dirty: false,
    current_fingerprint_dirty_reason: null,
    human_reviews_same_run: 0,
    cases: { total: 6, high: 0, medium: 1, low: 5 },
    ...partiel,
  }
}

describe('lireSnapshot', () => {
  it('déballe la clé unique du contrat', () => {
    const brut = { controle_v2_admin: { live_guard: garde(), backend_version: '2.33' } }
    expect(lireSnapshot(brut)?.backend_version).toBe('2.33')
  })

  it('accepte un contrat déjà déballé', () => {
    expect(lireSnapshot({ live_guard: garde(), backend_version: '2.33' })?.backend_version).toBe('2.33')
  })

  it('refuse ce qui n’est pas un contrat de contrôle', () => {
    expect(lireSnapshot(null)).toBeNull()
    expect(lireSnapshot({ autre_chose: 1 })).toBeNull()
  })
})

describe('comptesParSeverite', () => {
  it('complète par zéro les sévérités que le backend n’écrit pas', () => {
    const comptes = comptesParSeverite({
      id: 'x', status: 'attention', started_at: null, finished_at: null, findings: [],
      metadata: { findings_by_severity: { REVIEW: 3 } },
    })
    expect(comptes).toEqual({ BLOCKER: 0, ERROR: 0, REVIEW: 3, INFO: 0 })
  })

  it('rend quatre zéros en l’absence de run', () => {
    expect(comptesParSeverite(null)).toEqual({ BLOCKER: 0, ERROR: 0, REVIEW: 0, INFO: 0 })
  })
})

describe('etatGeneral', () => {
  it('donne la priorité au blocage dur de la garde vivante', () => {
    expect(etatGeneral(snapshot({ live_guard: garde({ hard_block_current: true }) })).code).toBe('bloque')
  })

  it('bloque aussi sur un BLOCKER, même sans blocage de garde', () => {
    const run = { id: 'x', status: 'blocked', started_at: null, finished_at: null, findings: [], metadata: { findings_by_severity: { BLOCKER: 1 } } }
    expect(etatGeneral(snapshot({ last_run: run })).code).toBe('bloque')
  })

  it('signale l’attention quand des constats de revue restent ouverts', () => {
    const run = { id: 'x', status: 'attention', started_at: null, finished_at: null, findings: [], metadata: { findings_by_severity: { REVIEW: 3 } } }
    const etat = etatGeneral(snapshot({ last_run: run, live_guard: garde({ attention_current: true }) }))
    expect(etat.code).toBe('attention')
    expect(etat.phrase).toContain('travail éditorial reste autorisé')
  })

  it('dit l’ordre quand rien n’est ouvert', () => {
    expect(etatGeneral(snapshot()).code).toBe('ok')
  })
})

describe('estFrais', () => {
  it('exige une empreinte capturée identique à celle du corpus', () => {
    expect(estFrais(diagnostic())).toBe(true)
    expect(estFrais(diagnostic({ captured_fingerprint: 'autre' }))).toBe(false)
  })

  it('ne prête jamais l’empreinte courante à un run legacy', () => {
    expect(estFrais(diagnostic({ captured_fingerprint: null, stale: true, stale_reason: 'legacy_no_fingerprint' }))).toBe(false)
  })

  it('respecte le verdict stale du backend', () => {
    expect(estFrais(diagnostic({ stale: true }))).toBe(false)
  })
})

describe('decisionsConnues', () => {
  const memoire = {
    total_cases: 180,
    carried_reviews: 10,
    cases_with_review_memory: 15,
    books: [
      { book_code: 'ACT', cases: 6, decisions: { REJECTED: 1 }, carried_reviews: 0, same_run_reviews: 1, cases_with_review_memory: 1 },
      { book_code: 'GEN', cases: 8, decisions: {}, carried_reviews: 0, same_run_reviews: 0, cases_with_review_memory: 0 },
    ],
  }

  it('rend les décisions du livre demandé', () => {
    expect(decisionsConnues(memoire, 'ACT')).toEqual([{ code: 'REJECTED', n: 1 }])
  })

  it('rend une liste vide quand le livre n’a aucune décision', () => {
    expect(decisionsConnues(memoire, 'GEN')).toEqual([])
    expect(decisionsConnues(memoire, 'LUK')).toEqual([])
    expect(decisionsConnues(null, 'ACT')).toEqual([])
  })
})

describe('ageLisible', () => {
  it('dit les minutes, les heures et les jours', () => {
    expect(ageLisible(30)).toBe('à l’instant')
    expect(ageLisible(2563)).toBe('il y a 43 min')
    expect(ageLisible(7200)).toBe('il y a 2 h')
    expect(ageLisible(172800)).toBe('il y a 2 j')
  })

  it('reste lisible sans valeur', () => {
    expect(ageLisible(null)).toBe('âge inconnu')
  })
})
