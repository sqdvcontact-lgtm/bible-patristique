import { test } from 'node:test'
import assert from 'node:assert/strict'

import { altoPage, pageXml } from '../src/echange.mjs'

const LIGNES = [
  { bbox: [100, 200, 300, 40], dip: 'Première ligne & suite', confiance: 0.87 },
  { bbox: [100, 250, 320, 40], dip: 'Seconde ligne' },
  { bbox: [100, 300, 300, 40], dip: '' },        // vide → ignorée
  { dip: 'sans coordonnées' },                    // sans bbox → ignorée
]

test('altoPage : ALTO v4 valide, une String par ligne utile, WC et échappement XML', () => {
  const x = altoPage({ image: 'p0001.png', largeur: 1000, hauteur: 1400, lignes: LIGNES })
  assert.match(x, /alto\/ns-v4#/)
  assert.match(x, /<fileName>p0001\.png<\/fileName>/)
  assert.match(x, /<Page ID="page_1" PHYSICAL_IMG_NR="1" WIDTH="1000" HEIGHT="1400">/)
  assert.match(x, /CONTENT="Première ligne &amp; suite"/) // & échappé
  assert.match(x, /WC="0.870"/)                             // confiance
  assert.match(x, /HPOS="100" VPOS="200" WIDTH="300" HEIGHT="40"/)
  assert.equal((x.match(/<TextLine\b/g) || []).length, 2)  // 2 lignes utiles seulement
})

test('pageXml : PAGE PRImA valide, Coords en polygone, TextEquiv/Unicode, région englobante', () => {
  const x = pageXml({ image: 'p0001.png', largeur: 1000, hauteur: 1400, lignes: LIGNES, date: '2026-08-08T10:00:00Z' })
  assert.match(x, /PAGE\/gts\/pagecontent\/2019-07-15/)
  assert.match(x, /imageFilename="p0001\.png" imageWidth="1000" imageHeight="1400"/)
  assert.match(x, /<Unicode>Seconde ligne<\/Unicode>/)
  assert.match(x, /points="100,200 400,200 400,240 100,240"/) // bbox → polygone horaire
  assert.match(x, /<Created>2026-08-08T10:00:00Z<\/Created>/)
  assert.equal((x.match(/<TextLine\b/g) || []).length, 2)
  // Région englobante = union des lignes utiles (y 200..290, x 100..420).
  assert.match(x, /<TextRegion id="region_1"[^>]*>\s*<Coords points="100,200 420,200 420,290 100,290"\/>/)
})

test('altoPage : couche choisie (ocr0) plutôt que dip', () => {
  const x = altoPage({ lignes: [{ bbox: [0, 0, 10, 10], dip: 'corrigé', ocr0: 'brut' }], couche: 'ocr0' })
  assert.match(x, /CONTENT="brut"/)
})

test('§8 rôles de structure portés : ALTO (Tags/TAGREFS) et PAGE (custom)', () => {
  const lignes = [
    { bbox: [100, 50, 900, 40], dip: 'de la Philosophie. Liure V.', suggestion: { role_confirme: 'titre_courant' } },
    { bbox: [100, 200, 300, 40], dip: 'Un vers ici.', suggestion: { role_suggere: 'vers', blanc_poesie: 'petit' } },
  ]
  const alto = altoPage({ image: 'p.png', largeur: 1250, hauteur: 2050, lignes })
  assert.match(alto, /<OtherTag ID="role_titre_courant" TYPE="structure" LABEL="titre_courant"\/>/)
  assert.match(alto, /<TextLine ID="line_1" TAGREFS="role_titre_courant"/)
  const page = pageXml({ image: 'p.png', largeur: 1250, hauteur: 2050, lignes })
  assert.match(page, /custom="structure \{role:titre_courant;\}"/)
  assert.match(page, /custom="structure \{role:vers;blanc:petit;\}"/)
})

test('altoPage : page sans ligne utile reste un ALTO bien formé', () => {
  const x = altoPage({ image: 'vide.png', largeur: 100, hauteur: 100, lignes: [] })
  assert.match(x, /<TextBlock ID="block_1">/)
  assert.equal((x.match(/<TextLine\b/g) || []).length, 0)
})
