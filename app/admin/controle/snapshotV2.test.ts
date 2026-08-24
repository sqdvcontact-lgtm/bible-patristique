import { describe, expect, it } from 'vitest'

import {
  ageLisible,
  comptesParSeverite,
  decisionsConnues,
  estFrais,
  etatGeneral,
  grouperAmbiguites,
  lireSnapshot,
  sectionsControle,
  totauxAlignements,
  type Ambiguite,
  type DiagnosticAlignement,
  type MemoireRevues,
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
  const memoire: MemoireRevues = {
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

describe('totauxAlignements', () => {
  it('additionne les runs courants au lieu de croire le cache', () => {
    const totaux = totauxAlignements([
      diagnostic({ book_code: 'ACT', cases: { total: 5, high: 0, medium: 0, low: 5 } }),
      diagnostic({ book_code: 'JHN', cases: { total: 126, high: 10, medium: 62, low: 54 } }),
    ])
    expect(totaux).toEqual({ runs: 2, frais: 2, perimes: 0, total: 131, high: 10, medium: 62, low: 59 })
  })

  it('compte les périmés sans leur prêter la fraîcheur', () => {
    const totaux = totauxAlignements([
      diagnostic(),
      diagnostic({ book_code: 'GEN', stale: true, captured_fingerprint: null }),
    ])
    expect(totaux.frais).toBe(1)
    expect(totaux.perimes).toBe(1)
  })

  it('rend des zéros sans diagnostic', () => {
    expect(totauxAlignements(null).total).toBe(0)
  })
})

describe('grouperAmbiguites', () => {
  const ambigu = (id: string, missions: string[], liens: number, date: string): Ambiguite => ({
    object_type: 'segment', object_id: id, id_oeuvre: 'A0012O0002', segment_numero: id,
    sections: null, dependent_links: liens, first_changed_at: date, last_changed_at: date,
    candidate_missions: missions,
  })

  it('réunit les objets par jeu de missions revendiquantes', () => {
    const groupes = grouperAmbiguites([
      ambigu('1', ['A|edition', 'A|audit'], 2, '2026-08-24T08:00:00Z'),
      ambigu('2', ['A|audit', 'A|edition'], 3, '2026-08-24T09:00:00Z'),
      ambigu('3', ['B|x', 'B|y'], 1, '2026-08-24T07:00:00Z'),
    ])
    expect(groupes).toHaveLength(2)
    expect(groupes[0].objets).toBe(2)
    expect(groupes[0].liens).toBe(5)
    expect(groupes[0].dernier).toBe('2026-08-24T09:00:00Z')
    expect(groupes[0].missions).toEqual(['A|audit', 'A|edition'])
  })

  it('borne les exemples sans fausser le compte', () => {
    const groupes = grouperAmbiguites(
      Array.from({ length: 30 }, (_, i) => ambigu(String(i), ['A|x', 'A|y'], 1, '2026-08-24T08:00:00Z')),
      4,
    )
    expect(groupes[0].objets).toBe(30)
    expect(groupes[0].exemples).toHaveLength(4)
  })

  it('rend une liste vide sans ambiguïté', () => {
    expect(grouperAmbiguites(null)).toEqual([])
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

describe('sectionsControle', () => {
  const complet = (partiel: Partial<Snapshot> = {}) => snapshot({
    metrics: {
      rules: { total: 43, blocking: 21, automatic: 39 },
      aelf_spine: { entries: 35480, version_code: 'TOL_WEB_20260821', version_status: 'review', canonical_review: 0, translation_review: 0, tr0001_tr0005_units: 10, tr0001_tr0005_units_verified: 10 },
      biblical_links: { total: 44575, with_canon: 44049, without_canon: 526, arbitrage_required: 87 },
      alignment_tools: {} as Snapshot['metrics']['alignment_tools'],
      journal: {} as Snapshot['metrics']['journal'],
      quality_calculated_at: null,
    },
    ...partiel,
  })

  it('garde un ordre fixe, du plus actionnable au plus informatif', () => {
    expect(sectionsControle(complet()).map((s) => s.id)).toEqual([
      'dernier-run', 'file-liens', 'ambigus', 'alignements', 'certifications', 'gardes', 'spine', 'liens-bibliques',
    ])
  })

  it('range chaque section dans son groupe', () => {
    const groupes = sectionsControle(complet()).map((s) => s.groupe)
    expect(groupes.filter((g) => g === 'traiter')).toHaveLength(4)
    expect(groupes.filter((g) => g === 'tient')).toHaveLength(2)
    expect(groupes.filter((g) => g === 'contexte')).toHaveLength(2)
  })

  it('donne l’action aux ambiguïtés dès qu’il y en a une', () => {
    const sansAmbiguite = sectionsControle(complet()).find((s) => s.id === 'ambigus')
    expect(sansAmbiguite?.gravite).toBe('ok')
    const avec = sectionsControle(complet({
      routing_ambiguities: [{ object_type: 'segment', object_id: '1', id_oeuvre: null, segment_numero: null, sections: null, dependent_links: 1, first_changed_at: null, last_changed_at: null, candidate_missions: ['a', 'b'] }],
    })).find((s) => s.id === 'ambigus')
    expect(avec?.gravite).toBe('action')
    expect(avec?.chiffre).toBe('1')
  })

  it('met les alignements en action tant qu’un run est périmé, en attention sur un high', () => {
    const perime = sectionsControle(complet({ alignment_diagnostics: [diagnostic({ stale: true, captured_fingerprint: null })] })).find((s) => s.id === 'alignements')
    expect(perime?.gravite).toBe('action')
    const haut = sectionsControle(complet({ alignment_diagnostics: [diagnostic({ cases: { total: 39, high: 3, medium: 29, low: 7 } })] })).find((s) => s.id === 'alignements')
    expect(haut?.gravite).toBe('attention')
    const propre = sectionsControle(complet({ alignment_diagnostics: [diagnostic({ cases: { total: 5, high: 0, medium: 0, low: 5 } })] })).find((s) => s.id === 'alignements')
    expect(propre?.gravite).toBe('ok')
  })

  it('compte les certifications propres sur leur total', () => {
    const section = sectionsControle(complet({
      certifications: [
        { code: 'A', status: 'ok', dirty: false, dirty_at: null, dirty_reason: null, issue_count: 0, certified_at: null },
        { code: 'B', status: 'ok', dirty: true, dirty_at: null, dirty_reason: null, issue_count: 2, certified_at: null },
      ],
    })).find((s) => s.id === 'certifications')
    expect(section?.chiffre).toBe('1 / 2')
    expect(section?.gravite).toBe('action')
  })

  it('met les gardes en action sur une écriture non suivie', () => {
    const section = sectionsControle(complet({ live_guard: garde({ untracked_bible_text_events: 1 }) })).find((s) => s.id === 'gardes')
    expect(section?.gravite).toBe('action')
  })

  it('écrit les chiffres en français', () => {
    const section = sectionsControle(complet()).find((s) => s.id === 'liens-bibliques')
    expect(section?.chiffre).toBe((44575).toLocaleString('fr-FR'))
    expect(section?.gravite).toBe('attention')
  })
})
