// Rapport de contrôle après triage (§10) : la vue normale ne montre QUE la file humaine.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rapportTriageMarkdown, passeFiltre, expliquerMotif, repere, volumeProjet } from '../src/ia/rapport-triage.mjs'

const projet = {
  meta: { titre: 'Discours panégyrique', auteur: 'Grégoire de Nazianze' },
  pages: { 1: { lignes: [{}, {}, {}] }, 2: { lignes: [{}, {}] }, 3: { pngUrl: 'x' } },
}

const f = (over = {}) => ({
  type: 'correction_ocr', page: 2, ligne_ids: [1], texte_original: 'cest bomme', texte_candidat: 'cest homme',
  triage: {
    auto_decision: 'AUTO_ACCEPT', auto_decision_reason: 'image_concordante — 1 vérification(s)',
    classe: 'LOW_RISK', risk_flags: [], generator_confidence: 0.99, visual_verifier_confidence: 0.99,
    distance_edition: 1, review_priority: 0, verdicts: [{ verdict: 'CANDIDATE', exact_reading: 'cest homme', confidence: 0.99, crop_quality: 'GOOD', visual_evidence: 'h net' }],
  },
  ...over,
})
const aRevoir = (over = {}) => f({
  triage: {
    auto_decision: 'HUMAN_REVIEW', auto_decision_reason: 'desaccord — les vérifications se contredisent',
    classe: 'HIGH_RISK_AUTO_CHECK', risk_flags: ['chiffre', 'reference'], generator_confidence: 0.9,
    visual_verifier_confidence: 0.6, distance_edition: 2, review_priority: 55,
    verdicts: [{ verdict: 'OCR0', exact_reading: 'Deut.23.', confidence: 0.98, crop_quality: 'GOOD' },
      { verdict: 'CANDIDATE', exact_reading: 'Deut.22.', confidence: 0.6, crop_quality: 'MEDIUM' }],
  },
  texte_original: 'Deut.23.', texte_candidat: 'Deut.22.', ...over,
})

test('le volume compte les seules pages océrisées', () => {
  assert.deepEqual(volumeProjet(projet), { pages: 2, lignes: 5 })
})

test('le repère situe la ligne', () => {
  assert.equal(repere({ page: 12, ligne_ids: [3] }), 'p.12 L3')
  assert.equal(repere({ page: 12 }), 'p.12')
})

test('le motif technique est traduit en phrase lisible', () => {
  assert.match(expliquerMotif('desaccord — peu importe'), /se contredisent/)
  assert.match(expliquerMotif('image_ambigue'), /ne permet pas de trancher/)
  assert.equal(expliquerMotif('motif_inconnu_xyz'), 'motif_inconnu_xyz')
})

test('la vue normale n’affiche QUE la file humaine ; le reste est replié', () => {
  const md = rapportTriageMarkdown(projet, [f(), f(), aRevoir()], { nom: 'test' })
  assert.match(md, /## À vérifier humainement/)
  // Le cas à revoir est déplié, avec ses deux lectures et sa raison.
  assert.match(md, /Deut\.23\./)
  assert.match(md, /se contredisent/)
  // Les auto-acceptées existent mais sont dans un bloc replié.
  assert.match(md, /<details>/)
  assert.match(md, /<summary>Auto-acceptées[^<]*\(2\)<\/summary>/)
  // Le compte est juste et honnête sur le dénominateur.
  assert.match(md, /\| corrections proposées \| \*\*3\*\* \|/)
  assert.match(md, /\| \*\*à vérifier humainement\*\* \| \*\*1\*\* \|/)
})

test('en mode audit, toutes les décisions sont dépliées', () => {
  const md = rapportTriageMarkdown(projet, [f(), aRevoir()], { nom: 'test', mode: 'audit' })
  assert.ok(!md.includes('<details>'))
  assert.match(md, /## Auto-acceptées/)
})

test('la file est ordonnée du plus difficile au plus simple', () => {
  const dur = aRevoir({ page: 9 })
  const simple = aRevoir({ page: 4 })
  simple.triage = { ...simple.triage, review_priority: 5 }
  const md = rapportTriageMarkdown(projet, [simple, dur], { nom: 'test' })
  assert.ok(md.indexOf('p.9 L1') < md.indexOf('p.4 L1'), 'le cas le plus difficile doit venir en premier')
})

test('sans rien à vérifier, le rapport le dit franchement', () => {
  const md = rapportTriageMarkdown(projet, [f()], { nom: 'test' })
  assert.match(md, /Rien à vérifier/)
})

test('les filtres retiennent bien chaque famille de cas', () => {
  const a = f(), h = aRevoir()
  const s = f({ triage: { ...f().triage, classe: 'STRUCTURAL' } })
  const c = f({ triage: { ...f().triage, risk_flags: ['diacritique'] } })
  assert.ok(passeFiltre(h, 'a-verifier') && !passeFiltre(a, 'a-verifier'))
  assert.ok(passeFiltre(a, 'auto-acceptees') && !passeFiltre(h, 'auto-acceptees'))
  assert.ok(passeFiltre(h, 'references-nombres'))
  assert.ok(passeFiltre(s, 'structure'))
  assert.ok(passeFiltre(c, 'caracteres-speciaux'))
  assert.ok(passeFiltre(a, 'toutes') && passeFiltre(h, 'toutes'))
})

test('le rapport affiche les taux, sans jamais masquer le dénominateur', () => {
  const md = rapportTriageMarkdown(projet, [f(), f(), f(), aRevoir()], { nom: 'test' })
  assert.match(md, /Taux de relecture humaine : \*\*25 %\*\*/)
  assert.match(md, /résolution automatique : 75 %/)
})
