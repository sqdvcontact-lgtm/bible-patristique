import { test } from 'node:test'
import assert from 'node:assert/strict'

import { detecterScission, appliquerScission } from '../src/scission.mjs'
import { interventionsScission, interventionsDepuisRelecture } from '../src/ia/controle.mjs'

// Règle éditoriale (utilisateur) : la ligne d'une note doit être ENTIÈRE. Quand la reconnaissance
// fond la manchette dans la ligne de corps, on ne tronque pas — on scinde. Cas réels du Discours
// de 1604, relevés dans le rapport de comparaison.
test('les amputations réelles sont reconnues comme des scissions', () => {
  const cas = [
    ['Solennisons donc ceste feste, non com-Solemi¬', 'Solennisons donc ceste feste, non com-', 'Solemi¬'],
    ['dainement, ains surmondainement: & dott estre', 'dainement, ains surmondainement: &', 'dott estre'],
    ['ne chacouillons point nos oreilles: n’ef-parures', 'ne chatouillons point nos oreilles: n’ef-', 'parures'],
    ['qui se plaisent aux fumées, & conse-idolatnie.', 'qui se plaisent aux fumées, & conse-', 'idolatnie.'],
    ['ment vn estranger peut noutrir ceux du Sermon', 'ment vn estranger peut noutrir ceux du', 'Sermon'],
  ]
  for (const [avant, apres, marge] of cas) {
    const r = detecterScission(avant, apres)
    assert.ok(r, 'scission attendue : ' + avant)
    assert.equal(r.marge, marge)
    assert.equal(r.corps, apres)
  }
})

test('une simple correction de lettre n’est PAS une scission', () => {
  assert.equal(detecterScission('nom est appellé, l’Ange du grand conseit', 'nom est appellé, l’Ange du grand conseil'), null)
  assert.equal(detecterScission('naiure', 'nature'), null)
})

test('un fragment trop long n’est pas une manchette : on ne touche à rien', () => {
  const avant = 'du corps ordinaire suivi de beaucoup trop de texte pour une glose de marge'
  assert.equal(detecterScission(avant, 'du corps ordinaire suivi'), null)
})

test('un retrait de pure ponctuation n’est pas une note', () => {
  assert.equal(detecterScission('une ligne de corps ,,,', 'une ligne de corps'), null)
})

test('scission DÉCLARÉE par le modèle', () => {
  const lignes = [{ dip: 'Solennisons donc ceste feste, non com-Solemi¬' }]
  const sortie = { scissions: [{ i: 0, corps: 'Solennisons donc ceste feste, non com-', marge: 'Solemi¬', confiance: 0.9 }] }
  const { interventions, lignesScindees } = interventionsScission(sortie, { page: 10, lignes })
  assert.equal(interventions.length, 1)
  assert.equal(interventions[0].type, 'scission_marge')
  assert.equal(interventions[0].marge, 'Solemi¬')
  assert.equal(interventions[0].niveau_risque, 'R3')     // structurel
  assert.equal(interventions[0].certitude, 'incertaine') // jamais en aveugle
  assert.ok(lignesScindees.has(0))
})

test('amputation NON déclarée → reprise en scission, la note n’est pas perdue', () => {
  const lignes = [{ dip: 'les ruës: nerepaissons point nos yeux, habitsce' }]
  const sortie = { corrections: [{ i: 0, texte_corrige: 'les ruës: nerepaissons point nos yeux,', certitude: 'certaine' }] }
  const { interventions } = interventionsScission(sortie, { page: 10, lignes })
  assert.equal(interventions.length, 1)
  assert.equal(interventions[0].marge, 'habitsce')
  assert.match(interventions[0].preuves[0], /retranchée/)
})

test('la ligne scindée n’est PAS aussi corrigée (sinon la note disparaîtrait à nouveau)', () => {
  const lignes = [{ dip: 'les ruës: nerepaissons point nos yeux, habitsce' }]
  const sortie = { corrections: [{ i: 0, texte_corrige: 'les ruës: nerepaissons point nos yeux,', certitude: 'certaine' }] }
  const { lignesScindees } = interventionsScission(sortie, { page: 10, lignes })
  const corr = interventionsDepuisRelecture(sortie, { page: 10, lignes, ignorer: lignesScindees })
  assert.deepEqual(corr, [])
})

test('appliquerScission : la note devient une LIGNE ENTIÈRE, ocr0 intact', () => {
  const projet = { pages: { 10: { lignes: [
    { dip: 'Solennisons donc ceste feste, non com-Solemi¬', ocr0: 'Solennisons donc ceste feste, non com-Solemi¬' },
    { dip: 'ligne suivante' },
  ] } } }
  const r = appliquerScission(projet, 10, 0, { corps: 'Solennisons donc ceste feste, non com-', marge: 'Solemi¬' })
  assert.equal(r.ok, true)
  const L = projet.pages[10].lignes
  assert.equal(L.length, 3)                                   // une ligne de plus
  assert.equal(L[0].dip, 'Solennisons donc ceste feste, non com-')
  assert.equal(L[0].ocr0, 'Solennisons donc ceste feste, non com-Solemi¬')  // la machine n'est pas réécrite
  assert.equal(L[1].dip, 'Solemi¬')                           // la note, ENTIÈRE
  assert.equal(L[1].suggestion.role_suggere, 'note_marginale')
  assert.equal(L[1].suggestion.export_corps, false)
  assert.equal(L[1].scinde_de, 0)                             // traçable
  assert.equal(L[2].dip, 'ligne suivante')                    // l'ordre est préservé
})

test('appliquerScission est idempotente', () => {
  const projet = { pages: { 10: { lignes: [{ dip: 'corps-marge' }] } } }
  appliquerScission(projet, 10, 0, { corps: 'corps-', marge: 'marge' })
  const r2 = appliquerScission(projet, 10, 0, { corps: 'corps-', marge: 'marge' })
  assert.equal(r2.statut, 'deja_applique')
  assert.equal(projet.pages[10].lignes.length, 2)
})
