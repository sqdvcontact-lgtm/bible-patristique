import { test } from 'node:test'
import assert from 'node:assert/strict'
import { admissibleGroundTruth, grouperFamilles, echantillonner, regleEchantillonnage, classerValidation } from '../src/ia/validation.mjs'

const f = (o) => ({ statut: 'propose_ia', niveau_risque: 'R0', ...o })

test('validation §11.7 : ground-truth strict — seuls confirme/modifie humain', () => {
  assert.equal(admissibleGroundTruth('confirme_humain'), true)
  assert.equal(admissibleGroundTruth('modifie_humain'), true)
  assert.equal(admissibleGroundTruth('accepte_regle_validee'), false)  // règle : texte candidat, pas GT
  assert.equal(admissibleGroundTruth('accepte_echantillonnage'), false)
  assert.equal(admissibleGroundTruth('applique_deterministe'), false)
})

test('validation : grouperFamilles — par règle, risque = maximum', () => {
  const fam = grouperFamilles([f({ regle: 'long_s', niveau_risque: 'R2' }), f({ regle: 'long_s', niveau_risque: 'R3' }), f({ regle: 'folio', niveau_risque: 'R1' })])
  const ls = fam.find((x) => x.cle === 'long_s')
  assert.equal(ls.nb, 2)
  assert.equal(ls.risque, 'R3') // max des risques de la famille
  assert.equal(fam.length, 2)
})

test('validation : echantillonner — les moins sûrs d’abord, étalé sur les pages, ≤ n', () => {
  const occ = [
    f({ page: 1, confiance_modele: 0.9 }), f({ page: 1, confiance_modele: 0.4 }),
    f({ page: 2, confiance_modele: 0.6 }), f({ page: 3, confiance_modele: 0.2 }),
  ]
  const e = echantillonner(occ, 3)
  assert.equal(e.length, 3)
  assert.ok(e.includes(occ[3])) // la plus basse confiance (0.2) est incluse
  assert.ok(new Set(e.map((x) => x.page)).size >= 2) // étalé sur plusieurs pages
})

test('validation §11.3 : règle d’échantillonnage 0→accepter, 1→étendre(15), ≥2→détaillé', () => {
  assert.deepEqual(regleEchantillonnage(0), { action: 'proposer_acceptation', taille: 5 })
  assert.deepEqual(regleEchantillonnage(1), { action: 'etendre', taille: 15 })
  assert.equal(regleEchantillonnage(2).action, 'controle_detaille')
})

test('validation §11.1 : R4→blocage, R3→critique, indéterminé→non résolu, R0-R2→familles, déterministe→auto', () => {
  const c = classerValidation([
    f({ niveau_risque: 'R4', statut: 'bloquant', regle: 'page_vide' }),
    f({ niveau_risque: 'R3', regle: 'lettre_partielle' }),
    f({ statut: 'indetermine', regle: 'ambigu' }),
    f({ niveau_risque: 'R1', regle: 'long_s' }),   // R1 → échantillonnage (famille)
    f({ niveau_risque: 'R0', regle: 'long_s' }),   // R0 → famille (pas de clic individuel)
    f({ statut: 'applique_deterministe', regle: 'ligne_vide' }),
  ])
  assert.equal(c.blocages.length, 1)
  assert.equal(c.critiques.length, 1)
  assert.equal(c.non_resolus.length, 1)
  assert.equal(c.automatiques.length, 1)
  assert.equal(c.familles.length, 1) // R0 + R1 « long_s » regroupés en une famille
  assert.equal(c.familles[0].nb, 2)
})
