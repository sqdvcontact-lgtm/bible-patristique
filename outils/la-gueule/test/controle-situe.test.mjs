import { test } from 'node:test'
import assert from 'node:assert/strict'

import { controlerDeterministe } from '../src/ia/controle.mjs'
import { classerValidation } from '../src/ia/validation.mjs'

// Retour utilisateur : « dans la famille confiance faible, les indications ne sont pas assez
// précises, et le clic ne renvoie sur aucune ligne ». Cause : le signalement ne transportait ni le
// TEXTE ni la BOÎTE de la ligne — l'atelier ne pouvait donc afficher qu'une citation vide.
const projet = () => ({ pages: { 7: { lignes: [
  { dip: 'ligne sûre', confiance: 0.95, bbox: [100, 100, 500, 50] },
  { dip: 'ligne douteuse', confiance: 0.42, bbox: [100, 160, 500, 50] },
  { dip: 'ligne douteuse', confiance: 0.88, bbox: [100, 220, 500, 50] },
  { dip: '', confiance: 0.9, bbox: [100, 280, 500, 50] },
] } } })

test('confiance faible : le signalement porte le texte, la boîte et une preuve lisible', () => {
  const { findings } = controlerDeterministe(projet())
  const f = findings.find((x) => x.regle === 'confiance_faible')
  assert.equal(f.page, 7)
  assert.deepEqual(f.ligne_ids, [1])
  assert.equal(f.texte_original, 'ligne douteuse')          // ← était vide
  assert.deepEqual(f.bbox, [100, 160, 500, 50])             // ← était []
  assert.match(f.preuves[0], /42 %/)                        // indication précise
})

test('doublon : porte lui aussi son texte et sa boîte', () => {
  const f = controlerDeterministe(projet()).findings.find((x) => x.regle === 'doublon')
  assert.equal(f.texte_original, 'ligne douteuse')
  assert.equal(f.bbox.length, 4)
  assert.match(f.preuves[0], /identique/)
})

test('ligne vide : localisée, pour qu’on puisse aller la voir', () => {
  const f = controlerDeterministe(projet()).findings.find((x) => x.regle === 'ligne_vide')
  assert.deepEqual(f.ligne_ids, [3])
  assert.equal(f.bbox.length, 4)
})

test('les occurrences d’une famille restent navigables (page + ligne + bbox)', () => {
  const { findings } = controlerDeterministe(projet())
  const fam = classerValidation(findings).familles.find((f) => f.cle === 'confiance_faible')
  assert.ok(fam.occurrences.length >= 1)
  for (const o of fam.occurrences) {
    assert.equal(typeof o.page, 'number')
    assert.ok(Array.isArray(o.ligne_ids) && o.ligne_ids.length)
    assert.equal(o.bbox.length, 4)
    assert.ok(String(o.texte_original).length > 0)
  }
})

test('un signalement SANS proposition reste une FAMILLE (pas une décision ligne à ligne)', () => {
  const { findings } = controlerDeterministe(projet())
  const val = classerValidation(findings)
  const fam = val.familles.find((f) => f.cle === 'confiance_faible')
  assert.ok(fam, 'confiance_faible doit rester une famille échantillonnable')
  for (const o of fam.occurrences) {
    assert.equal(typeof o.page, 'number')
    assert.ok(Array.isArray(o.ligne_ids) && o.ligne_ids.length)
    assert.equal(o.bbox.length, 4)
    assert.ok(String(o.texte_original).length > 0)   // navigable ET lisible
  }
})

test('le charabia se RECLASSE en ornement, il ne se vide pas (§31.4)', () => {
  const p = { pages: { 3: { lignes: [{ dip: 'Cocc oc sc coc oiccccccscsc', confiance: 0.9, bbox: [10, 10, 300, 40] }] } } }
  const f = controlerDeterministe(p).findings.find((x) => x.regle === 'charabia_ornement')
  assert.equal(f.type, 'reclassement_role')
  assert.equal(f.role_apres, 'ornement')
  assert.equal(f.texte_original, 'Cocc oc sc coc oiccccccscsc')  // le texte reste en source
  assert.notEqual(f.texte_candidat, '')                           // plus de « suppression »
})

test('aPayloadConcret : un candidat vide n’est pas une proposition', async () => {
  const { aPayloadConcret } = await import('../src/ia/validation.mjs')
  assert.equal(aPayloadConcret({ texte_original: 'abc', texte_candidat: '' }), false)
  assert.equal(aPayloadConcret({ texte_original: 'abc', texte_candidat: '   ' }), false)
  assert.equal(aPayloadConcret({ texte_original: 'abc', texte_candidat: 'abd' }), true)
})
