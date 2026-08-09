import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ocrPage, argsPretraitement } from '../src/wsl.mjs'

test('argsPretraitement : vide par défaut (aucun prétraitement = bon scan intact)', () => {
  assert.equal(argsPretraitement(), '')
  assert.equal(argsPretraitement({}), '')
})

test('argsPretraitement : null ne plante pas (l’atelier envoie pretraitement:null)', () => {
  // Régression « Cannot read properties of null (reading 'demiPage') » : le défaut = {} ne couvre
  // que undefined, pas null. La page échouait à l’OCR pour ce seul motif.
  assert.equal(argsPretraitement(null), '')
})

test('argsPretraitement : drapeaux connus → options ImageMagick, dans l’ordre', () => {
  const s = argsPretraitement({ gris: true, binariser: true, deskew: true, rogner: true })
  assert.match(s, /-colorspace Gray/); assert.match(s, /-deskew/); assert.match(s, /-lat/); assert.match(s, /-trim/)
  assert.ok(s.indexOf('-deskew') < s.indexOf('-lat')) // redressement avant binarisation
})

test('argsPretraitement : demi-page gauche / droite', () => {
  assert.match(argsPretraitement({ demiPage: 'gauche' }), /-gravity West -crop 50%/)
  assert.match(argsPretraitement({ demiPage: 'droite' }), /-gravity East/)
})

test('argsPretraitement : valeurs inconnues ignorées (pas d’injection shell)', () => {
  assert.equal(argsPretraitement({ demiPage: '; rm -rf /', bidon: true, gris: 0 }), '')
})

// Ces cas sont REJETÉS avant tout appel à WSL (validation synchrone en tête de ocrPage) :
// ils n'exécutent donc ni pdftoppm ni kraken — sûrs à lancer hors environnement Linux.
// ocrPage est asynchrone → la validation rejette la promesse (assert.rejects).

test('page non entière est refusée (pas d’injection dans le script)', async () => {
  await assert.rejects(
    ocrPage({ kind: 'imprime', pdfWin: 'x.pdf', servedDirWin: 'out', page: '1 && rm -rf /', lang: 'fra' }),
    /page invalide/,
  )
})

test('dpi hors bornes est refusé', async () => {
  await assert.rejects(
    ocrPage({ kind: 'imprime', pdfWin: 'x.pdf', servedDirWin: 'out', page: 1, dpi: 99999, lang: 'fra' }),
    /dpi invalide/,
  )
})

test('langue hors liste blanche est refusée', async () => {
  await assert.rejects(
    ocrPage({ kind: 'imprime', pdfWin: 'x.pdf', servedDirWin: 'out', page: 1, lang: 'fra; evil' }),
    /langue OCR non autorisée/,
  )
})

test('modèle Kraken avec métacaractères est refusé', async () => {
  await assert.rejects(
    ocrPage({ kind: 'manuscrit', imageWin: 'x.png', modele: 'modele; rm -rf /' }),
    /modèle Kraken invalide/,
  )
})
