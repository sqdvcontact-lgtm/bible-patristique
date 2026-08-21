import { test } from 'node:test'
import assert from 'node:assert/strict'

import { moderniserGlyphes, glyphesAnciens, contientGlyphesAnciens } from '../src/typographie.mjs'
import { consigneRelecturePage } from '../src/ia/prompt.mjs'
import { interventionsDepuisRelecture, interventionPageExclue } from '../src/ia/controle.mjs'

// Charte §14.3 — « Moderniser les caractères purement glyphiques lorsque l'identité du mot ne
// change pas, notamment le s long et certaines ligatures. Cette opération ne permet pas de
// moderniser l'orthographe, les désinences, le vocabulaire ou la casse porteuse de sens. »

test('moderniserGlyphes : s long et ligatures typographiques', () => {
  assert.equal(moderniserGlyphes('eſtre'), 'estre')
  assert.equal(moderniserGlyphes('Soleil de Iuſtice'), 'Soleil de Iustice')
  assert.equal(moderniserGlyphes('ﬁn ﬂeur eﬀet ﬅyle'), 'fin fleur effet style')
})

test('moderniserGlyphes : ne touche NI l’orthographe NI le vocabulaire NI la casse', () => {
  assert.equal(moderniserGlyphes('estre'), 'estre')       // jamais « être »
  assert.equal(moderniserGlyphes('sçavoir'), 'sçavoir')   // jamais « savoir »
  assert.equal(moderniserGlyphes('A LA TRES-SAINCTE'), 'A LA TRES-SAINCTE')
  assert.equal(moderniserGlyphes('M. DC. IV.'), 'M. DC. IV.')
})

test('moderniserGlyphes : æ/œ et abréviations sont des LETTRES, on les garde', () => {
  assert.equal(moderniserGlyphes('œuvre'), 'œuvre')
  assert.equal(moderniserGlyphes('Cæsar'), 'Cæsar')
  assert.equal(moderniserGlyphes('⁊et ẽ &'), '⁊et ẽ &')
})

test('moderniserGlyphes est idempotente', () => {
  const une = moderniserGlyphes('eſtre ﬁn')
  assert.equal(moderniserGlyphes(une), une)
})

test('glyphesAnciens / contientGlyphesAnciens', () => {
  assert.deepEqual(glyphesAnciens('eſtre ﬁn ſoleil'), ['ſ', 'ﬁ'])
  assert.equal(contientGlyphesAnciens('estre'), false)
})

test('prompt imprimé : impose la modernisation glyphique, interdit d’introduire un ſ', () => {
  const c = consigneRelecturePage([{ i: 0, t: 'eftre' }], { kind: 'imprime' })
  assert.match(c, /RÉGIME DE GRAPHIE — IMPRIMÉ ANCIEN/)
  assert.match(c, /le s long se transcrit « s »/)
  assert.match(c, /INTERDIT ABSOLU : introduire un « ſ »/)
  assert.match(c, /jamais « être »/)  // orthographe préservée
})

test('prompt manuscrit : transcription diplomatique, le ſ est conservé', () => {
  const c = consigneRelecturePage([{ i: 0, t: 'x' }], { kind: 'manuscrit' })
  assert.match(c, /TRANSCRIPTION DIPLOMATIQUE/)
  assert.match(c, /Ne modernise RIEN/)
})

test('prompt : protège la date de page de titre, la dédicace et les notes', () => {
  const c = consigneRelecturePage([{ i: 0, t: 'x' }])
  assert.match(c, /M\. DC\. IV\./)                 // la date ne doit pas être supprimée
  assert.match(c, /A LA TRES-SAINCTE/)             // la dédicace non plus
  assert.match(c, /note_marginale/)                // notes en marge reconnues
  assert.match(c, /note_bas_page/)
  assert.match(c, /NE JAMAIS SUPPRIMER/)
  assert.match(c, /"exclure":true/)                // page entière en un geste
})

test('garde-fou : une correction qui archaïse est modernisée et passée en « incertaine »', () => {
  const lignes = [{ dip: 'Soleil de Iustice' }]
  const sortie = { corrections: [{ i: 0, texte_corrige: 'Soleil de Iuſtice', certitude: 'certaine', confiance: 0.9 }] }
  const [iv] = interventionsDepuisRelecture(sortie, { page: 1, lignes })
  assert.equal(iv, undefined) // « Iuſtice » modernisé = « Iustice » = identique à l'OCR → aucune correction
})

test('garde-fou : la correction utile est gardée, l’archaïsme neutralisé', () => {
  const lignes = [{ dip: 'Soleil de Iuftice' }]
  const sortie = { corrections: [{ i: 0, texte_corrige: 'Soleil de Iuſtice', certitude: 'certaine', confiance: 0.9 }] }
  const [iv] = interventionsDepuisRelecture(sortie, { page: 1, lignes })
  assert.equal(iv.texte_candidat, 'Soleil de Iustice') // f → s, jamais ſ
  assert.equal(iv.certitude, 'incertaine')             // archaïsme proposé → soumis à l'humain
})

test('garde-fou : un manuscrit conserve la graphie diplomatique', () => {
  const lignes = [{ dip: 'Iuftice' }]
  const sortie = { corrections: [{ i: 0, texte_corrige: 'Iuſtice', certitude: 'certaine' }] }
  const [iv] = interventionsDepuisRelecture(sortie, { page: 1, lignes, kind: 'manuscrit' })
  assert.equal(iv.texte_candidat, 'Iuſtice')
})

test('garde-fou : jamais de suppression de ligne par correction vide', () => {
  const lignes = [{ dip: 'M. DC. IV.' }]
  const sortie = { corrections: [{ i: 0, texte_corrige: '', certitude: 'certaine' }] }
  assert.deepEqual(interventionsDepuisRelecture(sortie, { page: 1, lignes }), [])
})

test('page entière hors œuvre : une seule intervention', () => {
  const iv = interventionPageExclue({ page: { exclure: true, motif: 'feuillet blanc' } }, { page: 7 })
  assert.equal(iv.type, 'controle_page')
  assert.equal(iv.regle, 'page_exclure')
  assert.equal(iv.page, 7)
  assert.equal(interventionPageExclue({ page: { exclure: false } }, { page: 7 }), null)
})
