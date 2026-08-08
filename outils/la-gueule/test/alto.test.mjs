import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseAlto } from '../src/alto.mjs'

const XML = `<?xml version="1.0"?>
<alto><Layout><Page WIDTH="1000" HEIGHT="1400"><PrintSpace>
  <TextLine HPOS="100" VPOS="200" WIDTH="300" HEIGHT="40">
    <String CONTENT="l&#39;amour" HPOS="100" VPOS="200" WIDTH="140" HEIGHT="40">
      <Glyph CONTENT="X"/><Glyph CONTENT="Y"/>
    </String>
    <String CONTENT="&amp;c&#x65;" HPOS="250" VPOS="200" WIDTH="140" HEIGHT="40"/>
  </TextLine>
  <TextLine HPOS="100" VPOS="260" WIDTH="280" HEIGHT="38">
    <String CONTENT="seconde" HPOS="100" VPOS="260" WIDTH="120" HEIGHT="38"/>
    <String CONTENT="ligne" HPOS="230" VPOS="260" WIDTH="90" HEIGHT="38"/>
  </TextLine>
</PrintSpace></Page></Layout></alto>`

test('dimensions de la page', () => {
  const p = parseAlto(XML)
  assert.equal(p.largeur, 1000)
  assert.equal(p.hauteur, 1400)
})

test('une ligne = ses mots joints, entités décodées', () => {
  const p = parseAlto(XML)
  assert.equal(p.lignes.length, 2)
  assert.equal(p.lignes[0].texte, "l'amour &ce") // &#39; → ', &#x65; → e, &amp; → &
  assert.equal(p.lignes[1].texte, 'seconde ligne')
})

test('les <Glyph> ne fuient jamais dans le texte de ligne', () => {
  const p = parseAlto(XML)
  assert.ok(!p.lignes[0].texte.includes('X'))
  assert.ok(!p.lignes[0].texte.includes('Y'))
})

test('bbox = [HPOS, VPOS, WIDTH, HEIGHT] de la TextLine', () => {
  const p = parseAlto(XML)
  assert.deepEqual(p.lignes[0].bbox, [100, 200, 300, 40])
  assert.deepEqual(p.lignes[1].bbox, [100, 260, 280, 38])
})

test('sans coordonnées → bbox null, sans planter', () => {
  const p = parseAlto('<Page WIDTH="10" HEIGHT="10"><TextLine><String CONTENT="a"/></TextLine></Page>')
  assert.equal(p.lignes.length, 1)
  assert.equal(p.lignes[0].bbox, null)
  assert.equal(p.lignes[0].texte, 'a')
})

test('confiance = moyenne des WC, ou null si absente', () => {
  const p = parseAlto(XML)
  assert.equal(p.lignes[0].confiance, null) // XML sans WC
  const avec = parseAlto('<Page WIDTH="10" HEIGHT="10"><TextLine>' +
    '<String CONTENT="a" WC="0.90"/><String CONTENT="b" WC="0.70"/></TextLine></Page>')
  assert.equal(avec.lignes[0].confiance, 0.8) // (0.90 + 0.70) / 2
})
