import { test } from 'node:test'
import assert from 'node:assert/strict'
import { etatLivraison, rapportGeneration } from '../src/ia/generation.mjs'

test('génération §12.4 : état de livraison selon blocages / réserves', () => {
  assert.equal(etatLivraison({ compteurs: { blocages: 1 } }), 'CANDIDAT_INCOMPLET')
  assert.equal(etatLivraison({ compteurs: { critiques: 2 } }), 'FINAL_CANDIDAT_AVEC_RESERVES')
  assert.equal(etatLivraison({ compteurs: { non_resolus: 1 } }), 'FINAL_CANDIDAT_AVEC_RESERVES')
  assert.equal(etatLivraison({ compteurs: { automatiques: 300 } }), 'FINAL_CANDIDAT')
  assert.equal(etatLivraison({}), 'FINAL_CANDIDAT')
})

test('génération §12.5 : rapport de provenance — jamais « validé humainement »', () => {
  const projet = { pages: { 19: { ocr: { moteur: 'kraken-catmus-print', modele: 'catmus-print-fondue-large' }, lignes: [] } } }
  const r = rapportGeneration({ projet, validation: { compteurs: { blocages: 1, corrections_totales: 5 } }, run_id: 'r1', date: '2026-08-09' })
  assert.equal(r.etat_livraison, 'CANDIDAT_INCOMPLET')
  assert.equal(r.pages_traitees, 1)
  assert.deepEqual(r.moteurs, ['kraken-catmus-print'])
  assert.equal(r.corrections.total, 5)
  assert.match(r.avertissement, /PROVISOIRE/)
  assert.equal(/valid[ée] humainement/i.test(JSON.stringify(r)), false) // ne prétend jamais la validation humaine
})
