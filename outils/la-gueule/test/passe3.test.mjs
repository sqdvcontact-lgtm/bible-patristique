import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paginationSource, paginationInferree, metadonneesPage, metadonneesPagesProjet } from '../src/structure.mjs'

// ── Passe 3 Q4 : métadonnées de page ──
test('Q4 : un folio ajouté à la main reste hors corps mais consultable', () => {
  const p = paginationSource({ valeur: '19', origine: 'ajout_humain' })
  assert.equal(p.valeur, '19')
  assert.equal(p.origine, 'ajout_humain')
  assert.equal(p.visible_dans_source, true)
  assert.equal(p.export_corps, false)
  assert.equal(p.affichage_public, 'marge')
})

test('Q4 : pagination_source et page_pdf ne sont jamais confondues', () => {
  const m = metadonneesPage({ page_pdf: 5, pagination_source: paginationSource({ valeur: '19' }) })
  assert.equal(m.page_pdf, 5)
  assert.equal(m.pagination_source.valeur, '19')
  assert.notEqual(String(m.page_pdf), m.pagination_source.valeur) // deux repères distincts
})

test('Q4 : une pagination inférée ne crée aucune ligne OCR ni ground-truth', () => {
  const inf = paginationInferree({ valeur: '20' })
  assert.equal(inf.origine, 'inference')
  assert.equal(inf.ground_truth, false)
  assert.equal(inf.export_corps, false)
  assert.equal(inf.affichage_public, 'interface_editoriale') // jamais présentée comme un folio imprimé
})

test('Q4 : propagation — métadonnées de page construites depuis les rôles confirmés', () => {
  const projet = { pages: { 45: { lignes: [
    { dip: 'de la Philosophie. Livre I.', bbox: [200, 40, 600, 60], suggestion: { role_confirme: 'titre_courant' } },
    { dip: 'corps du texte', bbox: [100, 300, 800, 55], suggestion: null },
    { dip: 'B', bbox: [700, 1950, 30, 50], suggestion: { role_confirme: 'signature' } },
    { dip: 'd’artifice', bbox: [1000, 1900, 150, 50], suggestion: { role_confirme: 'reclame' } },
    { dip: '45', bbox: [1100, 60, 40, 45], ajout_humain: true, suggestion: { role_confirme: 'numero_page' } },
  ] } } }
  const m = metadonneesPagesProjet(projet)['45']
  assert.equal(m.page_pdf, 45)
  assert.equal(m.pagination_source.valeur, '45')
  assert.equal(m.pagination_source.origine, 'ajout_humain') // folio ajouté à la main
  assert.equal(m.pagination_source.export_corps, false)
  assert.equal(m.titre_courant.length, 1)
  assert.equal(m.marques_cahier.length, 1)
  assert.equal(m.marques_cahier[0].texte, 'B') // rôle interne signature → marque de cahier
  assert.equal(m.reclames.length, 1)
})

test('Q4 : une page sans hors-corps confirmé n’émet aucune métadonnée', () => {
  const projet = { pages: { 3: { lignes: [{ dip: 'que du corps', bbox: [1, 2, 3, 4], suggestion: null }] } } }
  assert.deepEqual(metadonneesPagesProjet(projet), {})
})
