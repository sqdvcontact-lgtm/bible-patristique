import { test } from 'node:test'
import assert from 'node:assert/strict'

import * as zonesMod from '../src/zones.mjs'
const { mesuresPage, detecterMarginalia, detecterNotesBasPage, analyserZones } = zonesMod
import { annoterProjet } from '../src/structure.mjs'

// Géométrie calquée sur un imprimé réel à marginalia : « Discours panégyrique sur la Nativité »,
// Paris, Fed. Morel, 1604. Corps ≈ x[250..1070], hauteur de ligne ≈ 51 ; gloses en marge
// extérieure ≈ x 130, largeur ≈ 115. bbox = [x, y, largeur, hauteur].
function pageAvecMarge() {
  const corps = []
  for (let k = 0; k < 12; k++) corps.push({ bbox: [250, 200 + k * 60, 820, 51], dip: 'ligne de corps numéro ' + k })
  const marge = [
    { bbox: [132, 300, 114, 41], dip: 'Proprie¬' },
    { bbox: [132, 350, 116, 38], dip: 'té de la' },
    { bbox: [132, 400, 92, 41], dip: 'bonté' },
    { bbox: [132, 450, 108, 38], dip: 'diuine.' },
  ]
  return [...corps, ...marge]
}

test('mesuresPage : la colonne de corps ignore les gloses étroites', () => {
  const m = mesuresPage(pageAvecMarge())
  assert.equal(m.gauche, 250)
  assert.equal(m.droite, 1070)
  assert.equal(m.hMed, 51)
})

test('detecterMarginalia : reconnaît une bande de gloses en marge gauche', () => {
  const s = detecterMarginalia(pageAvecMarge())
  assert.equal(s.length, 4)
  assert.ok(s.every((x) => x.role === 'note_marginale' && x.regle === 'zone_marge'))
  assert.equal(s[0].preuves.cote, 'gauche')
  assert.equal(s[0].preuves.lignes_de_la_bande, 4)
})

test('detecterMarginalia : marge DROITE (page paire, marge extérieure)', () => {
  const lignes = []
  for (let k = 0; k < 12; k++) lignes.push({ bbox: [78, 200 + k * 60, 818, 54], dip: 'corps ' + k })
  lignes.push({ bbox: [895, 300, 113, 43], dip: 'Esa.22.' })
  lignes.push({ bbox: [896, 350, 111, 45], dip: 'Esa.40.' })
  const s = detecterMarginalia(lignes)
  assert.equal(s.length, 2)
  assert.equal(s[0].preuves.cote, 'droite')
})

test('AUCUN faux positif : une fin de paragraphe courte n’est pas une glose', () => {
  // Piège réel (Boèce p.78) : lignes courtes COMMENÇANT à la marge du corps → dans la colonne.
  const lignes = []
  for (let k = 0; k < 12; k++) lignes.push({ bbox: [184, 200 + k * 60, 924, 52], dip: 'corps ' + k })
  lignes.push({ bbox: [177, 920, 141, 49], dip: 'qui fon' })
  lignes.push({ bbox: [182, 980, 134, 34], dip: 'auoicnt' })
  assert.deepEqual(detecterMarginalia(lignes), [])
})

test('AUCUN faux positif : une glose isolée ne fait pas une bande', () => {
  const lignes = pageAvecMarge().filter((l) => l.bbox[0] !== 132)
  lignes.push({ bbox: [132, 300, 114, 41], dip: 'seule' })
  assert.deepEqual(detecterMarginalia(lignes), [])
})

test('AUCUN faux positif : folio et marque de cahier sont écartés', () => {
  const lignes = pageAvecMarge().filter((l) => l.bbox[0] !== 132)
  lignes.push({ bbox: [132, 300, 60, 44], dip: '12' })      // folio
  lignes.push({ bbox: [132, 350, 95, 53], dip: 'B ij' })    // marque de cahier
  assert.deepEqual(detecterMarginalia(lignes), [])
})

test('detecterNotesBasPage : bloc en pied, petit corps, détaché par un blanc', () => {
  const lignes = []
  for (let k = 0; k < 12; k++) lignes.push({ bbox: [100, 200 + k * 60, 800, 52], dip: 'corps ' + k })
  // décrochement franc (200 px) puis deux lignes en petit corps
  lignes.push({ bbox: [100, 1120, 700, 34], dip: '(1) Sardanapale, roi d’Assyrie…' })
  lignes.push({ bbox: [100, 1165, 500, 34], dip: 'mourut dans les délices.' })
  const s = detecterNotesBasPage(lignes)
  assert.equal(s.length, 2)
  assert.ok(s.every((x) => x.role === 'note_bas_page' && x.regle === 'zone_pied'))
})

test('detecterNotesBasPage : une fin de chapitre courte n’est PAS une note (même corps)', () => {
  const lignes = []
  for (let k = 0; k < 12; k++) lignes.push({ bbox: [100, 200 + k * 60, 800, 52], dip: 'corps ' + k })
  lignes.push({ bbox: [100, 1120, 400, 52], dip: 'Fin du premier livre.' }) // même hauteur → pas une note
  assert.deepEqual(detecterNotesBasPage(lignes), [])
})

test('annoterProjet : les gloses deviennent des SUGGESTIONS hors-corps, jamais des décisions', () => {
  const projet = { pages: { 7: { lignes: pageAvecMarge() } } }
  annoterProjet(projet)
  const gloses = projet.pages[7].lignes.filter((l) => l.suggestion?.role_suggere === 'note_marginale')
  assert.equal(gloses.length, 4)
  assert.equal(gloses[0].suggestion.statut, 'suggere')       // jamais « confirme » d'office
  assert.equal(gloses[0].suggestion.role_confirme, null)
  assert.equal(gloses[0].suggestion.export_corps, false)
})

test('annoterProjet : une décision humaine n’est jamais écrasée', () => {
  const lignes = pageAvecMarge()
  lignes[lignes.length - 1].suggestion = { role_confirme: 'corps', statut: 'confirme' }
  const projet = { pages: { 7: { lignes } } }
  annoterProjet(projet)
  assert.equal(lignes[lignes.length - 1].suggestion.role_confirme, 'corps')
})

test('analyserZones : marginalia et notes de pied ne se recouvrent pas', () => {
  const z = analyserZones(pageAvecMarge())
  const iMarge = new Set(z.marginalia.map((s) => s.i))
  assert.ok(z.notes_bas_page.every((s) => !iMarge.has(s.i)))
})

// Le modèle de vision ne reçoit que l'index et le texte : il voit la page mais ne peut pas relier
// une glose vue dans la marge à un numéro de ligne. On lui transmet donc la position MESURÉE.
test('situerLignes : la manchette est située en marge et en petit corps', () => {
  const s = zonesMod.situerLignes(pageAvecMarge())
  assert.deepEqual(s.get(5), { zone: 'corps', corps: 'normal' })   // ligne du milieu = corps
  assert.equal(s.get(12).zone, 'marge-gauche')                     // la glose
  assert.equal(s.get(12).corps, 'petit')
})

test('situerLignes : marge droite, et bandes de tête / de pied', () => {
  const lignes = []
  for (let k = 0; k < 12; k++) lignes.push({ bbox: [78, 200 + k * 60, 818, 54], dip: 'corps ' + k })
  lignes.push({ bbox: [895, 300, 113, 43], dip: 'Esa.22.' })       // marge droite
  lignes.push({ bbox: [400, 1400, 90, 40], dip: '12' })            // folio, tout en bas
  const s = zonesMod.situerLignes(lignes)
  assert.equal(s.get(12).zone, 'marge-droite')
  assert.equal(s.get(0).zone, 'haut')                              // première ligne du bloc
  assert.equal(s.get(13).zone, 'bas')                              // folio en pied
})

test('situerLignes : la marge PRIME sur la bande de tête ou de pied', () => {
  // Une manchette placée tout en haut reste une manchette : c'est sa position latérale qui compte.
  const lignes = []
  for (let k = 0; k < 12; k++) lignes.push({ bbox: [250, 200 + k * 60, 820, 51], dip: 'corps ' + k })
  lignes.push({ bbox: [132, 200, 110, 40], dip: 'Esa.40.' })
  const s = zonesMod.situerLignes(lignes)
  assert.equal(s.get(12).zone, 'marge-gauche')
})
