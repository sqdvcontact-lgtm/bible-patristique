import { test } from 'node:test'
import assert from 'node:assert/strict'

import { detecterLangue, numeroSection, apparierParagraphes } from '../src/bilingue.mjs'

test('detecterLangue : français vs latin sur un bloc entier', () => {
  assert.equal(detecterLangue('La félicité éternelle où réside votre âme véritable, dans la paix.'), 'fr')
  assert.equal(detecterLangue('Et est non quod cum per ad ex nec sed autem enim virtus animus meus.'), 'la')
})

test('numeroSection : « 5° », « 12. », « 3) » ; sinon null', () => {
  assert.equal(numeroSection('5° Il faut plutôt quitter'), 5)
  assert.equal(numeroSection('12. Ceci est un début'), 12)
  assert.equal(numeroSection('3) Autre chose'), 3)
  assert.equal(numeroSection('Sans numéro de section'), null)
  assert.equal(numeroSection('V. En chiffres romains'), null) // non géré : renvoie null
})

test('apparierParagraphes : par l’ordre, longueur = max des deux', () => {
  const paires = apparierParagraphes(['La', 'Lb'], ['Fa', 'Fb', 'Fc'])
  assert.equal(paires.length, 3)
  assert.deepEqual(paires[0], { paragraphe: null, fr: 'Fa', la: 'La' })
  assert.deepEqual(paires[2], { paragraphe: null, fr: 'Fc', la: '' }) // latin manquant → ''
})

test('apparierParagraphes : le n° de section alimente `paragraphe`', () => {
  const paires = apparierParagraphes(['5° textus latinus'], ['5° texte français'])
  assert.equal(paires[0].paragraphe, 5)
})

test('resync par section : un paragraphe coupé d’un côté ne décale plus le reste', () => {
  const la = ['1° la', '2° lb', '3° lc']
  const fr = ['1° fa', 'suite de fa sans numéro', '2° fb', '3° fc'] // section 1 coupée en deux
  const paires = apparierParagraphes(la, fr)
  assert.equal(paires.length, 3)
  assert.equal(paires[0].paragraphe, 1)
  assert.match(paires[0].fr, /1° fa suite de fa/)
  assert.equal(paires[2].paragraphe, 3)
  assert.equal(paires[2].fr, '3° fc') // toujours aligné sur le latin 3
  assert.equal(paires[2].la, '3° lc')
})

test('resync par section : section manquante d’un côté → colonne vide, sans dérive', () => {
  const la = ['1° la', '2° lb', '3° lc']
  const fr = ['1° fa', '3° fc'] // le français n’a pas la section 2
  const paires = apparierParagraphes(la, fr)
  assert.equal(paires.length, 3)
  assert.deepEqual(paires[1], { paragraphe: 2, fr: '', la: '2° lb' })
  assert.equal(paires[2].fr, '3° fc')
  assert.equal(paires[2].la, '3° lc')
})
