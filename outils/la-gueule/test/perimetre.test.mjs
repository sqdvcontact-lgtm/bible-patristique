import { test } from 'node:test'
import assert from 'node:assert/strict'
import { completudeLot } from '../src/perimetre.mjs'

test('périmètre : dix pages traitées sur 589 → lot terminé (le document n’entre pas dans le calcul)', () => {
  const lot = [1,2,3,4,5,6,7,8,9,10]
  const etats = Object.fromEntries(lot.map(n => [n, { faite: true }]))
  const c = completudeLot(lot, etats)
  assert.equal(c.total, 10)
  assert.equal(c.faites, 10)
  assert.equal(c.manquantes, 0)
  assert.equal(c.termine, true)      // les 579 autres pages ne comptent pas
})

test('périmètre : une page en erreur → « terminé avec erreurs », pas « en cours »', () => {
  const lot = [1,2,3]
  const c = completudeLot(lot, { 1:{faite:true}, 2:{faite:true}, 3:{erreur:true} })
  assert.equal(c.manquantes, 0)
  assert.equal(c.termine, true)
  assert.equal(c.avecErreurs, true)
  assert.equal(c.erreurs, 1)
})

test('périmètre : une page exclue par le tri est résolue (ne bloque pas le lot)', () => {
  const c = completudeLot([1,2,3], { 1:{faite:true}, 2:{exclue:true}, 3:{faite:true} })
  assert.equal(c.exclues, 1)
  assert.equal(c.manquantes, 0)
  assert.equal(c.termine, true)
})

test('périmètre : une page ni faite ni en erreur ni exclue reste manquante → « en cours »', () => {
  const c = completudeLot([1,2,3], { 1:{faite:true}, 2:{faite:true} }) // page 3 non traitée
  assert.equal(c.manquantes, 1)
  assert.equal(c.termine, false)
})

test('périmètre : priorité faite > erreur > exclue (jamais compté deux fois)', () => {
  const c = completudeLot([1], { 1:{faite:true, erreur:true, exclue:true} })
  assert.equal(c.faites, 1)
  assert.equal(c.erreurs, 0)
  assert.equal(c.exclues, 0)
  assert.equal(c.total, 1)
})
