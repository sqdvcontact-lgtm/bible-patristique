import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ETAPES, nouveauWorkflow, assurerWorkflow, majEtape, invaliderDependances } from '../src/workflow.mjs'

test('workflow : structure neuve — 5 étapes, non commencées, diagnostic active', () => {
  const wf = nouveauWorkflow()
  assert.equal(wf.version_schema, 1)
  assert.equal(wf.etape_active, 'diagnostic_ia')
  assert.deepEqual(Object.keys(wf.etapes), ETAPES)
  for (const e of ETAPES) assert.equal(wf.etapes[e].etat, 'non_commence')
})

test('workflow : assurerWorkflow infère l’état des anciens projets, sans rien détruire', () => {
  const projet = { pages: { 1: { lignes: [{ dip: 'x', bbox: [1, 2, 3, 4] }], valide_humain: true } }, meta: { titre: 'T' } }
  assurerWorkflow(projet)
  assert.equal(projet.workflow.etapes.ocr_local.etat, 'termine')        // pages océrisées
  assert.equal(projet.workflow.etapes.validation_ciblee.etat, 'a_verifier') // validation humaine existante
  assert.equal(projet.meta.titre, 'T')                                   // données conservées
  // idempotent : ne réécrase pas un workflow déjà présent
  projet.workflow.etapes.diagnostic_ia.etat = 'termine'
  assurerWorkflow(projet)
  assert.equal(projet.workflow.etapes.diagnostic_ia.etat, 'termine')
})

test('workflow : majEtape archive le run précédent (jamais d’écrasement silencieux)', () => {
  const wf = nouveauWorkflow()
  majEtape(wf, 'ocr_local', { etat: 'termine', run_id: 'run-1', version_sortie: 'v1' })
  majEtape(wf, 'ocr_local', { etat: 'termine', run_id: 'run-2', version_sortie: 'v2' })
  assert.equal(wf.etapes.ocr_local.run_id, 'run-2')
  assert.equal(wf.etapes.ocr_local.historique.length, 1)
  assert.equal(wf.etapes.ocr_local.historique[0].run_id, 'run-1')
})

test('workflow : invalidation — diagnostic périme les 4 suivantes ; validation périme la génération', () => {
  const wf = nouveauWorkflow()
  for (const e of ETAPES) wf.etapes[e].etat = 'termine'
  invaliderDependances(wf, 'diagnostic')
  assert.equal(wf.etapes.diagnostic_ia.etat, 'termine')       // amont intact
  assert.equal(wf.etapes.ocr_local.etat, 'perime')
  assert.equal(wf.etapes.generation_locale.etat, 'perime')

  const wf2 = nouveauWorkflow()
  for (const e of ETAPES) wf2.etapes[e].etat = 'termine'
  invaliderDependances(wf2, 'validation')
  assert.equal(wf2.etapes.controle_ia.etat, 'termine')        // amont intact
  assert.equal(wf2.etapes.validation_ciblee.etat, 'termine')
  assert.equal(wf2.etapes.generation_locale.etat, 'perime')  // seule la génération est périmée
})

test('workflow : invalidation ne touche pas une étape non commencée', () => {
  const wf = nouveauWorkflow()
  wf.etapes.ocr_local.etat = 'non_commence'
  invaliderDependances(wf, 'diagnostic')
  assert.equal(wf.etapes.ocr_local.etat, 'non_commence') // reste non commencé, pas « périmé »
})
