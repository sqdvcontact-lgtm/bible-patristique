import { test } from 'node:test'
import assert from 'node:assert/strict'

import { choisirOeuvre, jetonsTitre } from '../src/ia/enrichissement.mjs'

// Bug utilisateur : après « Convoquer IA », l'œuvre affichait « aucune correspondance » alors que
// la notice « Discours 38-41 » existait au catalogue avec le titre EXACT. Deux causes : les nombres
// étaient jetés (filtre ≥5 lettres), et il fallait 2 jetons communs — impossible sur un titre court.
const CATALOGUE = [
  { titre: 'Discours 38-41' },
  { titre: 'Discours 1-5' },
  { titre: 'Homélies sur l’Hexaéméron' },
  { titre: 'Confessions' },
  { titre: 'La Consolation de la philosophie' },
]

test('jetonsTitre : les NOMBRES sont significatifs (ils discriminent)', () => {
  assert.deepEqual([...jetonsTitre('Discours 38-41')], ['discours', '38', '41'])
  assert.deepEqual([...jetonsTitre('Confessions')], ['confessions'])
})

test('titre court à nombres : « Discours 38-41 » se rapproche enfin', () => {
  assert.equal(choisirOeuvre(CATALOGUE, 'Discours 38-41').titre, 'Discours 38-41')
})

test('les nombres départagent deux titres voisins', () => {
  assert.equal(choisirOeuvre(CATALOGUE, 'Discours 1-5').titre, 'Discours 1-5')
})

test('titre d’un seul mot : correspondance exacte admise', () => {
  assert.equal(choisirOeuvre(CATALOGUE, 'Confessions').titre, 'Confessions')
})

test('titre long : correspondance normale', () => {
  assert.equal(choisirOeuvre(CATALOGUE, 'La Consolation de la philosophie').titre, 'La Consolation de la philosophie')
})

test('NON-RÉGRESSION : pas de faux positif « Hexaéméron » (le garde-fou tient)', () => {
  assert.equal(choisirOeuvre(CATALOGUE, 'Homélies, discours et lettres choisis'), null)
})

test('NON-RÉGRESSION : un titre trop vague ne s’accroche à rien', () => {
  assert.equal(choisirOeuvre(CATALOGUE, 'Discours'), null)
  assert.equal(choisirOeuvre(CATALOGUE, 'Sermons'), null)
})

test('un nombre commun seul ne suffit pas à rapprocher', () => {
  assert.equal(choisirOeuvre([{ titre: 'Homélie 38 sur les Actes' }], 'Discours 38-41'), null)
})

test('catalogue vide ou titre vide : aucun rattachement', () => {
  assert.equal(choisirOeuvre([], 'Discours 38-41'), null)
  assert.equal(choisirOeuvre(CATALOGUE, ''), null)
})
