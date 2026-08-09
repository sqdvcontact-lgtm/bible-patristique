import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  distanceEdition,
  tauxErreur,
  evaluerModele,
  comparerQualite,
  entreeModele,
  meilleurModele,
  normaliserTypographie,
} from '../src/modeles.mjs'

test('normaliserTypographie : neutralise l’espacement de la ponctuation haute (comparaison)', () => {
  const N = normaliserTypographie
  // espace simple / fine (U+202F) / insecable (U+00A0) avant ; : ! ? -> supprimee
  assert.equal(N('pleurs ;'), 'pleurs;')
  assert.equal(N('pleurs\u202F;'), 'pleurs;')
  assert.equal(N('pleurs\u00A0;'), 'pleurs;')
  assert.equal(N('quoi ?'), 'quoi?')
  assert.equal(N('Dieu !'), 'Dieu!')
  assert.equal(N('ceci : cela'), 'ceci: cela')
  // guillemets francais : espace interieure neutralisee
  assert.equal(N('\u00AB\u202Fmot\u202F\u00BB'), '\u00ABmot\u00BB')
  // idempotence + ne touche a rien d’autre
  assert.equal(N(N('pleurs\u202F;')), 'pleurs;')
  assert.equal(N('un mot, deux mots.'), 'un mot, deux mots.')
  // cle de la mesure : identiques avec/sans espace -> 0 erreur
  assert.equal(N('mot\u202F;'), N('mot;'))
})

test('distanceEdition : cas connus', () => {
  assert.equal(distanceEdition(Array.from('kitten'), Array.from('sitting')), 3)
  assert.equal(distanceEdition(Array.from(''), Array.from('abc')), 3)
  assert.equal(distanceEdition(Array.from('abc'), Array.from('abc')), 0)
})

test('tauxErreur : CER par caractère', () => {
  // « chat » → « chit » : 1 substitution sur 4 caractères = 0,25
  assert.equal(tauxErreur('chat', 'chit'), 0.25)
  assert.equal(tauxErreur('', ''), 0)
  assert.equal(tauxErreur('', 'x'), 1)
})

test('tauxErreur : WER par mot', () => {
  // 1 mot faux sur 3 = 0,333…
  const wer = tauxErreur('le chat noir', 'le chien noir', { mots: true })
  assert.ok(Math.abs(wer - 1 / 3) < 1e-9)
})

test('evaluerModele : CER/WER au niveau du corpus', () => {
  const r = evaluerModele([
    { reference: 'abcd', hypothese: 'abcd' }, // 0 erreur / 4 car
    { reference: 'abcd', hypothese: 'abxd' }, // 1 erreur / 4 car
  ])
  assert.equal(r.nbLignes, 2)
  assert.equal(r.nbCaracteres, 8)
  assert.equal(r.cer, 1 / 8) // corpus : 1 substitution sur 8 caractères
})

test('comparerQualite : sans référence mesurée, on adopte comme socle', () => {
  const d = comparerQualite({ cer: 0.1 }, { cer: null })
  assert.equal(d.adopter, true)
})

test('comparerQualite : candidat non évalué → refus', () => {
  const d = comparerQualite({ cer: null }, { cer: 0.1 })
  assert.equal(d.adopter, false)
})

test('comparerQualite : n’adopte que si CER nettement plus bas', () => {
  // gain 0,04 > marge 0,005 → adopte
  assert.equal(comparerQualite({ cer: 0.06 }, { cer: 0.10 }).adopter, true)
  // candidat pire → refuse
  assert.equal(comparerQualite({ cer: 0.12 }, { cer: 0.10 }).adopter, false)
  // gain sous la marge → refuse (on garde la référence)
  assert.equal(comparerQualite({ cer: 0.098 }, { cer: 0.10 }).adopter, false)
})

test('entreeModele : forme complète avec valeurs par défaut', () => {
  const e = entreeModele({ version: 'imprime-v1', chemin: '/m/x.mlmodel' })
  assert.equal(e.version, 'imprime-v1')
  assert.equal(e.statut, 'candidat')
  assert.equal(e.cer, null)
  assert.equal(e.base, null)
})

test('meilleurModele : CER mesuré le plus bas parmi socle/adopté', () => {
  const registre = {
    modeles: [
      { version: 'a', statut: 'socle', cer: 0.09 },
      { version: 'b', statut: 'adopte', cer: 0.05 },
      { version: 'c', statut: 'candidat', cer: 0.01 }, // écarté : pas adopté
      { version: 'd', statut: 'adopte', cer: null }, // écarté : non mesuré
    ],
  }
  assert.equal(meilleurModele(registre).version, 'b')
  assert.equal(meilleurModele({ modeles: [] }), null)
})
