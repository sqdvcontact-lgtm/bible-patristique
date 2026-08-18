// Triage automatique des corrections OCR — cas de régression de la consigne (§12).
// Les exemples viennent tous du document de test « Discours panegyrique sur la Nativité ».

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  classerIntervention, deciderTriage, prioriteRevue, mesurerTriage,
  normaliserTechnique, memeLecture, normaliserVerdict, verdictConcluant, lectureCoherente,
  jetonsModifies,
} from '../src/ia/triage.mjs'

const corr = (avant, apres, extra = {}) => ({
  type: 'correction_ocr', texte_original: avant, texte_candidat: apres,
  confiance_modele: 0.99, page: 1, ligne_ids: [0], ...extra,
})

// Verdict visuel « net » : l'image tranche franchement en faveur de `pour`.
const vu = (pour, lecture, extra = {}) => ({
  verdict: pour, exact_reading: lecture, confidence: 0.99, crop_quality: 'GOOD',
  visual_evidence: 'lettre nette', editorial_change_detected: false, ...extra,
})

// ── Normalisation technique ───────────────────────────────────────────────────────────────────

test('la normalisation technique ne touche QUE les espaces et les variantes d’apostrophe', () => {
  assert.equal(normaliserTechnique('l’homme  vint'), "l'homme vint")
  assert.equal(normaliserTechnique(' Ainsi soit-il '), 'Ainsi soit-il')
  assert.ok(memeLecture("l’an", "l'an"))
  // Elle ne modernise RIEN d'autre : casse, accents, orthographe et ponctuation restent distincts.
  assert.ok(!memeLecture('Estre', 'estre'))
  assert.ok(!memeLecture('estre', 'être'))
  assert.ok(!memeLecture('nité, pronches', 'nité. pronches'))
})

// ── Pré-classement (§4) ───────────────────────────────────────────────────────────────────────

test('les fautes OCR d’une ou deux lettres sont LOW_RISK', () => {
  for (const [a, b] of [
    ['Par FEn. MOREL Interprete', 'Par FED. MOREL Interprete'],
    ['Gregotre de Nazianze', 'Gregoire de Nazianze'],
    ['Chez FED. MOREI', 'Chez FED. MOREL'],
    ['cest bomme', 'cest homme'],
    ['sans artisice', 'sans artifice'],
    ['Pasteut.', 'Pasteur.'],
    ['Anpes.', 'Anges.'],
  ]) {
    const c = classerIntervention(corr(a, b))
    assert.equal(c.classe, 'LOW_RISK', `${a} → ${b} : ${c.flags.join(', ')}`)
  }
})

test('chiffres, références, ponctuation et segmentation sont HIGH_RISK_AUTO_CHECK', () => {
  const cas = [
    ['10', '15', 'chiffre_modifie'],
    ['Deut.23.', 'Deut.22.', 'reference'],
    ['Luc. O.', 'Luc. 6.', 'reference'],
    ['nité, pronches-tu', 'nité.Bronches-tu', 'ponctuation'],
  ]
  for (const [a, b, attendu] of cas) {
    const c = classerIntervention(corr(a, b))
    assert.equal(c.classe, 'HIGH_RISK_AUTO_CHECK', `${a} → ${b}`)
    assert.ok(c.flags.includes(attendu), `${a} → ${b} : ${attendu} attendu, obtenu ${c.flags.join(', ')}`)
  }
})

test('un tilde ou un signe abréviatif ajouté déclenche le contrôle renforcé', () => {
  const c = classerIntervention(corr('come', 'cõme'))
  assert.equal(c.classe, 'HIGH_RISK_AUTO_CHECK')
  assert.ok(c.flags.includes('abreviatif'), c.flags.join(', '))
})

test('un diacritique ajouté déclenche le contrôle renforcé', () => {
  const c = classerIntervention(corr('Iustice', 'Iusticé'))
  assert.ok(c.flags.includes('diacritique'), c.flags.join(', '))
  assert.equal(c.classe, 'HIGH_RISK_AUTO_CHECK')
})

test('les rôles sensibles et les zones hors corps sont signalés', () => {
  const c = classerIntervention(corr('Aiij', 'Aiiij'), { role: 'signature', zone: 'bas' })
  assert.ok(c.flags.includes('role:signature'))
  assert.ok(c.flags.includes('zone:bas'))
})

test('les interventions de structure sont classées STRUCTURAL, sans passer par les drapeaux de texte', () => {
  for (const type of ['reclassement_role', 'scission_marge', 'ligne_omise', 'ancrage_note', 'controle_page']) {
    const c = classerIntervention({ type, texte_original: 'x', texte_candidat: 'y' })
    assert.equal(c.classe, 'STRUCTURAL', type)
  }
})

test('jetonsModifies compte les mots réellement changés', () => {
  assert.equal(jetonsModifies('cest bomme icy', 'cest homme icy'), 1)
  assert.equal(jetonsModifies('a b c', 'x y c'), 2)
  assert.equal(jetonsModifies('un deux', 'un deux trois'), 3)
})

// ── Verdicts ──────────────────────────────────────────────────────────────────────────────────

test('un verdict incomplet est normalisé sans jamais lever', () => {
  const v = normaliserVerdict({ verdict: 'n’importe quoi', confidence: 'abc' })
  assert.equal(v.verdict, 'UNREADABLE')
  assert.equal(v.crop_quality, 'BAD')
  assert.equal(v.confidence, 0)
})

test('un verdict n’est concluant que net, exploitable et franc', () => {
  assert.ok(verdictConcluant(normaliserVerdict(vu('CANDIDATE', 'x'))))
  assert.ok(!verdictConcluant(normaliserVerdict(vu('CANDIDATE', 'x', { confidence: 0.9 }))))
  assert.ok(!verdictConcluant(normaliserVerdict(vu('CANDIDATE', 'x', { crop_quality: 'BAD' }))))
  assert.ok(!verdictConcluant(normaliserVerdict(vu('OTHER', 'x'))))
  assert.ok(!verdictConcluant(normaliserVerdict(vu('UNREADABLE', ''))))
  assert.ok(!verdictConcluant(normaliserVerdict({ ...vu('CANDIDATE', 'x'), abstention: true })))
})

test('un verdict qui recopie autre chose que la cible qu’il désigne est incohérent', () => {
  const v = normaliserVerdict(vu('CANDIDATE', 'troisieme lecture'))
  assert.ok(!lectureCoherente(v, { avant: 'a', apres: 'b' }))
  assert.ok(lectureCoherente(normaliserVerdict(vu('CANDIDATE', 'b')), { avant: 'a', apres: 'b' }))
  assert.ok(lectureCoherente(normaliserVerdict(vu('OCR0', 'a')), { avant: 'a', apres: 'b' }))
})

// ── Décision (§6, §12) ────────────────────────────────────────────────────────────────────────

test('LOW_RISK : une seule vérification visuelle nette suffit à auto-accepter', () => {
  const cas = [
    ['Par FEn. MOREL Interprete', 'Par FED. MOREL Interprete'],
    ['Gregotre de Nazianze', 'Gregoire de Nazianze'],
    ['Chez FED. MOREI', 'Chez FED. MOREL'],
    ['cest bomme', 'cest homme'],
    ['sans artisice', 'sans artifice'],
    ['Pasteut.', 'Pasteur.'],
    ['Anpes.', 'Anges.'],
  ]
  for (const [a, b] of cas) {
    const d = deciderTriage(corr(a, b), [vu('CANDIDATE', b)])
    assert.equal(d.auto_decision, 'AUTO_ACCEPT', `${a} → ${b} : ${d.auto_decision_reason}`)
    assert.equal(d.review_priority, 0)
  }
})

test('LOW_RISK : si l’image donne raison à la machine, on revient à ocr0 automatiquement', () => {
  const d = deciderTriage(corr('Pasteut.', 'Pasteur.'), [vu('OCR0', 'Pasteut.')])
  assert.equal(d.auto_decision, 'AUTO_KEEP_OCR0')
})

test('HIGH_RISK : une seule vérification ne suffit pas, deux concordantes suffisent', () => {
  const cas = [
    ['10', '15'],
    ['Deut.23.', 'Deut.22.'],
    ['Luc. O.', 'Luc. 6.'],
    ['nité, pronches-tu', 'nité.Bronches-tu'],
  ]
  for (const [a, b] of cas) {
    const seule = deciderTriage(corr(a, b), [vu('CANDIDATE', b)])
    assert.equal(seule.auto_decision, 'HUMAN_REVIEW', `${a} → ${b} : une seule vérification`)
    assert.match(seule.auto_decision_reason, /confirmation_manquante/)
    const deux = deciderTriage(corr(a, b), [vu('CANDIDATE', b), vu('CANDIDATE', b)])
    assert.equal(deux.auto_decision, 'AUTO_ACCEPT', `${a} → ${b} : ${deux.auto_decision_reason}`)
  }
})

test('les nombres et références ne partent plus d’office à l’humain (§7A)', () => {
  const d = deciderTriage(corr('Psal. F1.', 'Psal. 81.'), [vu('CANDIDATE', 'Psal. 81.'), vu('CANDIDATE', 'Psal. 81.')])
  assert.equal(d.auto_decision, 'AUTO_ACCEPT')
  assert.ok(d.risk_flags.includes('reference'))
})

test('STRUCTURAL exige aussi deux vérifications concordantes', () => {
  const iv = { type: 'reclassement_role', texte_original: 'Solemi¬', texte_candidat: '[note_marginale]', confiance_modele: 0.9 }
  assert.equal(deciderTriage(iv, [vu('CANDIDATE', '[note_marginale]')]).auto_decision, 'HUMAN_REVIEW')
  assert.equal(deciderTriage(iv, [vu('CANDIDATE', '[note_marginale]'), vu('CANDIDATE', '[note_marginale]')]).auto_decision, 'AUTO_ACCEPT')
})

test('désaccord entre vérificateurs → HUMAN_REVIEW', () => {
  const d = deciderTriage(corr('cest bomme', 'cest homme'), [vu('OCR0', 'cest bomme'), vu('CANDIDATE', 'cest homme')])
  assert.equal(d.auto_decision, 'HUMAN_REVIEW')
  assert.match(d.auto_decision_reason, /desaccord/)
  assert.ok(d.review_priority > 0)
})

test('générateur = candidat, vérif 1 = ocr0, vérif 2 = autre lecture → HUMAN_REVIEW (§12)', () => {
  const d = deciderTriage(corr('Anpes.', 'Anges.'), [vu('OCR0', 'Anpes.'), vu('OTHER', 'Auges.')])
  assert.equal(d.auto_decision, 'HUMAN_REVIEW')
  assert.match(d.auto_decision_reason, /lecture_tierce/)
})

test('image illisible → HUMAN_REVIEW, avec le motif exact', () => {
  const d = deciderTriage(corr('cest bomme', 'cest homme'), [vu('UNREADABLE', '', { crop_quality: 'BAD', confidence: 0.2 })])
  assert.equal(d.auto_decision, 'HUMAN_REVIEW')
  assert.match(d.auto_decision_reason, /image_ambigue/)
})

test('sans aucune vérification, rien n’est auto-accepté', () => {
  const d = deciderTriage(corr('cest bomme', 'cest homme'), [])
  assert.equal(d.auto_decision, 'HUMAN_REVIEW')
  assert.match(d.auto_decision_reason, /sans_verification/)
})

test('la confiance du générateur ne suffit jamais, si haute soit-elle (§3)', () => {
  const d = deciderTriage(corr('cest bomme', 'cest homme', { confiance_modele: 1 }), [])
  assert.equal(d.auto_decision, 'HUMAN_REVIEW')
  assert.equal(d.generator_confidence, 1)   // conservée pour l'audit, mais hors du seuil
})

test('une graphie ancienne réintroduite sur un imprimé n’est jamais auto-acceptée (§7C)', () => {
  const iv = corr('estre', 'eſtre')
  const d = deciderTriage(iv, [vu('CANDIDATE', 'eſtre'), vu('CANDIDATE', 'eſtre')])
  assert.equal(d.auto_decision, 'HUMAN_REVIEW')
  assert.match(d.auto_decision_reason, /politique_couche/)
  // Sur un MANUSCRIT (transcription diplomatique), la même correction est légitime.
  const m = deciderTriage(iv, [vu('CANDIDATE', 'eſtre'), vu('CANDIDATE', 'eſtre')], { regime: 'manuscrit' })
  assert.equal(m.auto_decision, 'AUTO_ACCEPT')
})

// ── Priorité et métriques ─────────────────────────────────────────────────────────────────────

test('la file humaine est ordonnée du plus difficile au plus simple', () => {
  const facile = prioriteRevue(corr('Anpes.', 'Anges.'), null, [vu('CANDIDATE', 'Anges.', { confidence: 0.9 })])
  const dur = prioriteRevue(corr('Deut.23.', 'Deut.22.'), null, [vu('OCR0', 'Deut.23.'), vu('CANDIDATE', 'Deut.22.', { crop_quality: 'BAD' })])
  assert.ok(dur > facile, `${dur} doit dépasser ${facile}`)
})

test('les métriques disent la vérité sur le dénominateur (§13)', () => {
  const m = mesurerTriage([
    { auto_decision: 'AUTO_ACCEPT', classe: 'LOW_RISK', risk_flags: [] },
    { auto_decision: 'AUTO_ACCEPT', classe: 'HIGH_RISK_AUTO_CHECK', risk_flags: ['chiffre'] },
    { auto_decision: 'AUTO_KEEP_OCR0', classe: 'LOW_RISK', risk_flags: [] },
    { auto_decision: 'HUMAN_REVIEW', classe: 'STRUCTURAL', risk_flags: [] },
    { regle_triage: 'ligne_faible_confirmee' },
  ])
  assert.equal(m.total_candidats, 4)          // la ligne faible confirmée n'est pas un candidat
  assert.equal(m.auto_accept, 2)
  assert.equal(m.auto_keep_ocr0, 1)
  assert.equal(m.human_review, 1)
  assert.equal(m.lignes_faibles_confirmees, 1)
  assert.equal(m.risques_resolus_auto, 1)
  assert.equal(m.references_nombres, 1)
  assert.equal(m.human_review_rate, 0.25)
  assert.equal(m.automation_resolution_rate, 0.75)
})

// ── Autorité du triage sur les anciennes heuristiques ─────────────────────────────────────────

test('un cas HUMAN_REVIEW n’est jamais auto-appliqué par la vieille règle du « petit changement »', async () => {
  const { classerValidation } = await import('../src/ia/validation.mjs')
  // Un seul caractère d'écart : `estCorrectionSimple` l'aurait appliqué sans regarder personne. Or
  // c'est un chiffre de renvoi biblique, et l'image ne l'a pas tranché.
  const f = {
    type: 'correction_ocr', page: 1, ligne_ids: [2], texte_original: 'Deut.23.', texte_candidat: 'Deut.22.',
    statut: 'propose_ia', niveau_risque: 'R2', confiance_modele: 0.99,
    triage: { auto_decision: 'HUMAN_REVIEW', auto_decision_reason: 'desaccord', classe: 'HIGH_RISK_AUTO_CHECK', risk_flags: ['reference'], review_priority: 57 },
  }
  const v = classerValidation([f])
  assert.equal(v.auto_texte.length, 0, 'aucune application automatique')
  assert.equal(v.corrections.length + v.critiques.length, 1, 'le cas doit rester dans la file humaine')
})

test('les deux voies automatiques sont rangées séparément, hors de la file', async () => {
  const { classerValidation } = await import('../src/ia/validation.mjs')
  const base = { type: 'correction_ocr', page: 1, ligne_ids: [0], texte_original: 'a', texte_candidat: 'b', statut: 'propose_ia', niveau_risque: 'R2' }
  const v = classerValidation([
    { ...base, triage: { auto_decision: 'AUTO_ACCEPT' } },
    { ...base, ligne_ids: [1], triage: { auto_decision: 'AUTO_KEEP_OCR0' } },
  ])
  assert.equal(v.auto_texte.length, 1)
  assert.equal(v.auto_ocr0.length, 1)
  assert.equal(v.corrections.length, 0)
  assert.equal(v.critiques.length, 0)
})

test('la file humaine est triée du plus difficile au plus simple', async () => {
  const { classerValidation } = await import('../src/ia/validation.mjs')
  const c = (i, p) => ({ type: 'correction_ocr', page: 1, ligne_ids: [i], texte_original: 'aaaaaaaaaa', texte_candidat: 'bbbbbbbbbb', statut: 'propose_ia', niveau_risque: 'R2', triage: { auto_decision: 'HUMAN_REVIEW', review_priority: p } })
  const v = classerValidation([c(0, 12), c(1, 80), c(2, 40)])
  assert.deepEqual(v.corrections.map((f) => f.triage.review_priority), [80, 40, 12])
})
