import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { estEntete, joindreLignes, suggererCesure, detecterCesureCandidate, grouperParagraphes, metaPagesOcr, empreinteFichier, altoEntrainement, construireSegments, exporterEntrainement, construireManifesteBanc, exporterBanc } from '../src/projet.mjs'

test('exporterEntrainement : refuse un projet marqué interdit_entrainement (donnée contaminée)', async () => {
  const projet = { _garde: { interdit_entrainement: true, motif: 'origine Tesseract, confusions ſ→f' }, pages: {} }
  await assert.rejects(() => exporterEntrainement('__contamine__', projet), /interdit_entrainement/)
})

test('construireManifesteBanc : ne compte que les lignes valide_humain (hors incertaines)', () => {
  const projet = { _garde: { valide_humain: true }, pages: {
    19: { valide_humain: true, ocr: { moteur: 'kraken', modele: 'catmus-print' }, lignes: [
      { bbox: [0, 0, 10, 10], dip: 'abcd', valide_humain: true },              // comptée (4 car)
      { bbox: [0, 0, 10, 10], dip: 'xy', valide_humain: true, incertain: true }, // exclue (incertaine)
      { bbox: [0, 0, 10, 10], dip: 'ef', valide_humain: false },                // exclue (non validée)
    ] },
    20: { valide_humain: false, lignes: [{ bbox: [0, 0, 10, 10], dip: 'zzz', valide_humain: true }] }, // page non validée → exclue
  } }
  const m = construireManifesteBanc(projet)
  assert.equal(m.valide_humain, true)
  assert.equal(m.pages.length, 1)
  assert.equal(m.pages[0].page, 19)
  assert.equal(m.pages[0].nbLignes, 1)
  assert.equal(m.pages[0].nbCaracteres, 4)
  assert.equal(m.nbLignesTotal, 1)
})

test('exporterBanc : refuse un banc non valide_humain (validation humaine requise)', async () => {
  await assert.rejects(() => exporterBanc('__banc__', { _garde: { valide_humain: false }, pages: {} }), /valide_humain/)
})

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

test('construireSegments : lignes émises en désordre (n° de page en dernier) → ordre de lecture haut→bas', () => {
  // Kraken émet parfois le numéro de page EN DERNIER alors qu'il est en HAUT de page.
  const projet = { pages: { 1: { lignes: [
    { bbox: [100, 200, 300, 40], texte: 'Premiere ligne du corps ici.' },
    { bbox: [100, 250, 300, 40], texte: 'qui se poursuit juste apres.' },
    { bbox: [100, 500, 300, 40], texte: 'Un second paragraphe plus bas.' },
    { bbox: [100, 58, 40, 30], texte: '25' }, // n° de page, émis en dernier, situé en haut
  ] } } }
  const segs = construireSegments(projet, { couche: 'texte', recenserNotes: false })
  assert.ok(segs[0].segment_texte.startsWith('Premiere ligne')) // corps d'abord, dans l'ordre
  assert.ok(segs[segs.length - 1].segment_texte.startsWith('Un second')) // puis le paragraphe du bas
  assert.ok(!segs.some((s) => s.segment_texte.trim() === '25')) // le n° de page est évacué
})

test('construireSegments : ligne hors-corps CONFIRMÉE exclue du corps (source intacte) ; suggestion non confirmée conservée', () => {
  const projet = { pages: { 1: { largeur: 1250, hauteur: 2050, lignes: [
    { bbox: [238, 38, 631, 69], texte: 'de la Philosophie. Liure V.', suggestion: { role_confirme: 'titre_courant' } },
    { bbox: [100, 300, 900, 55], texte: 'Le vrai corps du texte ici présent.' },
  ] } } }
  const segs = construireSegments(projet, { couche: 'texte', recenserNotes: false })
  assert.ok(!segs.some((s) => /Philosophie/.test(s.segment_texte))) // titre courant confirmé → hors corps
  assert.ok(segs.some((s) => s.segment_texte.startsWith('Le vrai corps')))
  assert.equal(projet.pages[1].lignes[0].texte, 'de la Philosophie. Liure V.') // source jamais modifiée

  // Non confirmée → PAS exclue (rien d'automatique).
  const projet2 = { pages: { 1: { largeur: 1250, hauteur: 2050, lignes: [
    { bbox: [238, 38, 631, 69], texte: 'de la Philosophie. Liure V.', suggestion: { role_suggere: 'titre_courant', role_confirme: null } },
    { bbox: [100, 300, 900, 55], texte: 'Le vrai corps ici.' },
  ] } } }
  assert.ok(construireSegments(projet2, { couche: 'texte', recenserNotes: false }).some((s) => /Philosophie/.test(s.segment_texte)))
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

test('joindreLignes (Q2) : césure « ¬ » supprimée et mot recollé (§14.3)', () => {
  const lignes = [{ texte: 'ser¬' }, { texte: 'uante' }, { texte: 'de' }]
  assert.equal(joindreLignes(lignes, 'texte'), 'seruante de') // « ser¬ »+« uante » → « seruante »
  assert.equal(joindreLignes([{ texte: 'souhai¬' }, { texte: 'tez' }, { texte: 'bien' }], 'texte'), 'souhaitez bien')
})

test('joindreLignes (Q2) : trait LEXICAL « - » conservé au recollage', () => {
  const lignes = [{ texte: 'arc-' }, { texte: 'en-ciel' }]
  assert.equal(joindreLignes(lignes, 'texte'), 'arc-en-ciel') // le tiret lexical subsiste
})

test('joindreLignes (Q2) : césure marquée ambiguë → NON jointe (on ne décide rien)', () => {
  const lignes = [{ texte: 'ser¬', cesure: { ambigu: true } }, { texte: 'uante' }]
  assert.equal(joindreLignes(lignes, 'texte'), 'ser¬ uante') // laissé tel quel, jonction par espace
})

test('joindreLignes : lignes simples jointes par une espace', () => {
  const lignes = [{ texte: 'Bonjour' }, { texte: 'le' }, { texte: 'monde' }]
  assert.equal(joindreLignes(lignes, 'texte'), 'Bonjour le monde')
})

test('suggererCesure (Q2) : « - » en fin de ligne + suite en minuscule → suggère « ¬ »', () => {
  assert.equal(suggererCesure('ser-', 'uante'), true)
  assert.equal(suggererCesure('arc-', 'En-ciel'), false) // suite en capitale → pas une coupure de mot
  assert.equal(suggererCesure('fin.', 'Autre'), false)   // pas de trait en fin
})

// ── Passe 4 §4.4 : césure dépendante de la provenance du moteur ──
const geoOK = { largeur: 1000 }
const lgD = (dip, bbox) => ({ dip, bbox })
test('césure §4 : Kraken + « mot- » → pas de candidate (le trait reste lexical par défaut)', () => {
  assert.equal(detecterCesureCandidate(lgD('mot-', [100, 100, 800, 50]), lgD('suite', [100, 160, 300, 50]), { ...geoOK, moteur_source: 'kraken-catmus-print' }), null)
})
test('césure §4 : Tesseract + « ser- » puis « uante » → cesure_candidate', () => {
  const c = detecterCesureCandidate(lgD('faire vne ser-', [100, 100, 800, 50]), lgD('uante de la', [100, 160, 300, 50]), { ...geoOK, moteur_source: 'tesseract', ligne_suivante_id: 'p1-l4' })
  assert.ok(c)
  assert.equal(c.role_suggere, 'cesure_typographique')
  assert.equal(c.glyphe_source, '-')
  assert.equal(c.marque_ground_truth_proposee, '¬')
  assert.equal(c.moteur_source, 'tesseract')
  assert.equal(c.jointure_confirmee, false)
})
test('césure §4 : après confirmation → « seruante » ; avant → aucune jointure de mot', () => {
  // avant confirmation : « - » lexical → le mot n'est PAS recomposé
  assert.notEqual(joindreLignes([{ dip: 'ser-' }, { dip: 'uante' }], 'dip'), 'seruante')
  // après confirmation (- → ¬), la jointure recompose
  assert.equal(joindreLignes([{ dip: 'ser¬' }, { dip: 'uante' }], 'dip'), 'seruante')
})
test('césure §4 : mot composé réel → trait conservé après refus de la suggestion', () => {
  assert.equal(joindreLignes([{ dip: 'arc-' }, { dip: 'en-ciel' }], 'dip'), 'arc-en-ciel')
})
test('césure §4 : moteur inconnu → suggestion de confiance réduite', () => {
  const inc = detecterCesureCandidate(lgD('ser-', [100, 100, 800, 50]), lgD('uante', [100, 160, 300, 50]), { ...geoOK, moteur_source: 'inconnu' })
  const tes = detecterCesureCandidate(lgD('ser-', [100, 100, 800, 50]), lgD('uante', [100, 160, 300, 50]), { ...geoOK, moteur_source: 'tesseract' })
  assert.equal(inc.moteur_source, 'inconnu')
  assert.ok(inc.confiance < tes.confiance)
})
test('césure §4 : capitale en tête de la ligne suivante → aucune suggestion', () => {
  assert.equal(detecterCesureCandidate(lgD('ser-', [100, 100, 800, 50]), lgD('Uante', [100, 160, 300, 50]), { ...geoOK, moteur_source: 'tesseract' }), null)
})
test('césure §4 : blanc de paragraphe → aucune suggestion', () => {
  assert.equal(detecterCesureCandidate(lgD('ser-', [100, 100, 800, 50]), lgD('uante', [100, 300, 300, 50]), { ...geoOK, moteur_source: 'tesseract' }), null)
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
