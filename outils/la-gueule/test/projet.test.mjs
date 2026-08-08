import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { estEntete, joindreLignes, grouperParagraphes, metaPagesOcr, empreinteFichier, altoEntrainement, construireSegments } from '../src/projet.mjs'

// Lignes de corps (avec texte) et lignes-titres (avec `titre:{niveau,texte}`).
const corps = (y, texte, h = 40) => ({ bbox: [100, y, 280, h], texte })
const titre = (y, niveau, texte) => ({ bbox: [100, y, 280, 40], texte, titre: { niveau, texte } })

test('construireSegments : les titres de structure alimentent ref_niv, ferment le bloc, et persistent entre pages', () => {
  const projet = { pages: {
    1: { lignes: [
      titre(50, 1, 'Livre I'),
      titre(120, 2, 'Prose 1'),
      corps(200, 'Premier paragraphe de prose ici.'),
      corps(250, 'qui continue sur une seconde ligne.'),
      titre(340, 2, 'Mètre 1'),
      corps(420, 'Vers du poeme ici present.'),
    ] },
    2: { lignes: [
      corps(100, 'Suite au livre premier encore.'), // hérite Livre I / Mètre 1 (persistance inter-pages)
      titre(200, 1, 'Livre II'),                     // niv1 change → réinitialise niv2
      corps(300, 'Debut du second livre ici.'),
    ] },
  } }
  const segs = construireSegments(projet, { couche: 'texte', recenserNotes: false })
  assert.equal(segs.length, 4)
  assert.equal(segs[0].ref_niv1_texte, 'Livre I')
  assert.equal(segs[0].ref_niv2_texte, 'Prose 1')
  assert.ok(segs[0].segment_texte.startsWith('Premier paragraphe'))
  assert.equal(segs[1].ref_niv2_texte, 'Mètre 1') // le sous-niveau a changé
  assert.equal(segs[2].ref_niv1_texte, 'Livre I') // persiste sur la page 2
  assert.equal(segs[2].ref_niv2_texte, 'Mètre 1')
  assert.equal(segs[3].ref_niv1_texte, 'Livre II')
  assert.equal(segs[3].ref_niv2_texte, null) // réinitialisé par le nouveau niv1
  // Les lignes-titres ne polluent jamais le corps.
  assert.ok(!segs.some((s) => /Livre I|Prose 1|Mètre 1|Livre II/.test(s.segment_texte)))
})

test('construireSegments : double colonne → ordre de lecture gauche puis droite', () => {
  const projet = { pages: { 1: { largeur: 1000, hauteur: 1400, lignes: [
    { bbox: [560, 150, 350, 36], texte: 'Droite colonne premiere ligne.' }, // ordre OCR mêlé
    { bbox: [80, 150, 350, 36], texte: 'Gauche colonne premiere ligne.' },
    { bbox: [80, 190, 350, 36], texte: 'suite gauche seconde ligne.' },
    { bbox: [560, 190, 350, 36], texte: 'suite droite seconde ligne.' },
  ] } } }
  const segs = construireSegments(projet, { couche: 'texte', recenserNotes: false })
  assert.equal(segs.length, 2)
  assert.ok(segs[0].segment_texte.startsWith('Gauche')) // colonne gauche d'abord
  assert.ok(segs[1].segment_texte.startsWith('Droite')) // puis colonne droite
})

test('construireSegments : sans aucun titre, ref_niv restent nuls (texte plat)', () => {
  const projet = { pages: { 1: { lignes: [corps(100, 'Une phrase de prose simple ici.')] } } }
  const segs = construireSegments(projet, { couche: 'texte', recenserNotes: false })
  assert.equal(segs.length, 1)
  assert.equal(segs[0].ref_niv1_texte, null)
  assert.equal(segs[0].ref_niv5_texte, null)
})

test('altoEntrainement : ALTO ketos avec transcription corrigée, coords, image ; lignes vides/sans bbox écartées', () => {
  const x = altoEntrainement('p0020.png', 1000, 1400, [
    { bbox: [100, 200, 300, 40], dip: 'texte corrigé & juste' },
    { bbox: [100, 250, 300, 40], dip: '' }, // vide → ignorée
    { dip: 'sans coordonnées' },             // sans bbox → ignorée
  ])
  assert.match(x, /<fileName>p0020\.png<\/fileName>/)
  assert.match(x, /CONTENT="texte corrigé &amp; juste"/) // XML échappé
  assert.match(x, /HPOS="100" VPOS="200" WIDTH="300" HEIGHT="40"/)
  assert.equal((x.match(/<TextLine/g) || []).length, 1) // seule la ligne avec bbox + texte
})

test('estEntete : titres courants et n° de page', () => {
  assert.equal(estEntete(''), true)
  assert.equal(estEntete('— 66 —'), true)
  assert.equal(estEntete('10'), true)
  assert.equal(estEntete('10 HOMÉLIE'), true)
  assert.equal(estEntete('HOMÉLIE 10'), true)
  assert.equal(estEntete('Digitized by Google'), true)
})

test('estEntete : une vraie phrase n’est pas un en-tête', () => {
  assert.equal(estEntete('soleil. Vous souhaitez la paix.'), false)
})

test('joindreLignes : mot coupé en fin de ligne recollé (§14.3)', () => {
  const lignes = [{ texte: 'souhai-' }, { texte: 'tez' }, { texte: 'bien' }]
  assert.equal(joindreLignes(lignes, 'texte'), 'souhaitez bien')
})

test('joindreLignes : lignes simples jointes par une espace', () => {
  const lignes = [{ texte: 'Bonjour' }, { texte: 'le' }, { texte: 'monde' }]
  assert.equal(joindreLignes(lignes, 'texte'), 'Bonjour le monde')
})

// Lignes avec coordonnées : y croissant, hauteur 40 (seuil de saut = 36).
const L = (y, texte, h = 40, x = 100) => ({ bbox: [x, y, 280, h], texte })

test('grouperParagraphes : le grand saut vertical sépare deux paragraphes', () => {
  const groupes = grouperParagraphes([
    L(200, 'Premier paragraphe de prose ici.'),
    L(250, 'qui continue sur une seconde ligne.'), // saut 10 → même paragraphe
    L(340, 'Second paragraphe distinct ici.'),     // saut 50 → nouveau paragraphe
  ])
  assert.equal(groupes.length, 2)
  assert.equal(groupes[0].length, 2)
  assert.equal(groupes[1].length, 1)
})

test('grouperParagraphes : titre courant en tête retiré avant regroupement', () => {
  const groupes = grouperParagraphes([
    L(100, '10 HOMÉLIE'), // en-tête → écarté
    L(200, 'Premier paragraphe de prose ici.'),
    L(250, 'qui continue sur une seconde ligne.'),
    L(340, 'Second paragraphe distinct ici.'),
  ])
  const total = groupes.reduce((n, g) => n + g.length, 0)
  assert.equal(total, 3) // l'en-tête ne compte pas
  assert.equal(groupes.length, 2)
})

test('metaPagesOcr : une entrée par page océrisée, triée, pages sans OCR ignorées', () => {
  const pages = {
    3: { ocr: { moteur: 'tesseract', langue: 'fra', dpi: 300 } },
    1: { ocr: { moteur: 'kraken', modele: 'CATMUS.mlmodel' } },
    2: { lignes: [] }, // pas d'OCR → ignorée
  }
  const m = metaPagesOcr(pages)
  assert.equal(m.length, 2)
  assert.deepEqual(m[0], { page: 1, moteur: 'kraken', modele: 'CATMUS.mlmodel' })
  assert.deepEqual(m[1], { page: 3, moteur: 'tesseract', langue: 'fra', dpi: 300 })
})

test('empreinteFichier : SHA-256 + taille ; null si le fichier manque', async () => {
  assert.equal(await empreinteFichier(join(tmpdir(), 'nexiste-pas-la-gueule.xyz')), null)
  const f = join(tmpdir(), `la-gueule-test-${process.pid}.txt`)
  await writeFile(f, 'abc')
  try {
    const e = await empreinteFichier(f)
    assert.equal(e.octets, 3)
    assert.equal(e.sha256, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  } finally { await unlink(f) }
})
