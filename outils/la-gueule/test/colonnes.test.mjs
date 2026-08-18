import { test } from 'node:test'
import assert from 'node:assert/strict'

import { detecterColonnes, segmenterColonnes } from '../src/colonnes.mjs'

// Page large de 1000. Colonne gauche x≈80..430 (centre <500), droite x≈560..910 (centre ≥500).
const G = (y, t) => ({ bbox: [80, y, 350, 36], texte: t })
const D = (y, t) => ({ bbox: [560, y, 350, 36], texte: t })
const PLEIN = (y, t) => ({ bbox: [100, y, 800, 40], texte: t }) // enjambe la gouttière

test('detecterColonnes : deux colonnes nettes → gouttière au centre', () => {
  const r = detecterColonnes([G(100, 'a'), G(140, 'b'), D(100, 'c'), D(140, 'd')], 1000)
  assert.equal(r.colonnes, 2)
  assert.ok(r.gouttiere >= 430 && r.gouttiere <= 560) // dans la gouttière réelle (bord droit gauche → bord gauche droite)
})

test('detecterColonnes : texte pleine largeur → une seule colonne', () => {
  const r = detecterColonnes([PLEIN(100, 'x'), PLEIN(150, 'y'), PLEIN(200, 'z'), PLEIN(250, 'w')], 1000)
  assert.equal(r.colonnes, 1)
  assert.equal(r.gouttiere, null)
})

test('segmenterColonnes : bande pleine largeur puis gauche puis droite', () => {
  const lignes = [
    D(160, 'droite haut'), G(160, 'gauche haut'), // ordre OCR mêlé exprès
    PLEIN(80, 'TITRE PLEINE LARGEUR'),
    G(200, 'gauche bas'), D(200, 'droite bas'),
  ]
  const pistes = segmenterColonnes(lignes, 1000)
  // Attendu : [titre plein], [colonne gauche], [colonne droite]
  assert.deepEqual(pistes.map((p) => p.colonne), [null, 0, 1])
  assert.equal(pistes[0].lignes[0].texte, 'TITRE PLEINE LARGEUR')
  assert.deepEqual(pistes[1].lignes.map((l) => l.texte), ['gauche haut', 'gauche bas'])
  assert.deepEqual(pistes[2].lignes.map((l) => l.texte), ['droite haut', 'droite bas'])
})

test('segmenterColonnes : une colonne → une seule piste, lignes inchangées', () => {
  const lignes = [PLEIN(100, 'a'), PLEIN(150, 'b')]
  const pistes = segmenterColonnes(lignes, 1000)
  assert.equal(pistes.length, 1)
  assert.equal(pistes[0].lignes, lignes) // même référence : aucun réagencement
})
