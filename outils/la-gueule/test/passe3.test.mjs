import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paginationSource, paginationInferree, metadonneesPage, metadonneesPagesProjet } from '../src/structure.mjs'
import { sortieVision, autoriserAppel, demanderAvisVisuel, MODES_VISION } from '../src/vision.mjs'

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

// ── Passe 3 Q-IA : architecture du lecteur de vision (aucun appel réel) ──
test('IA : sortie par défaut = candidat, jamais autorité, non validée', () => {
  const s = sortieVision({ modele: 'x', sortie_transcription: 'M' })
  assert.equal(s.statut, 'candidat')
  assert.equal(s.validation_humaine, false)
  assert.equal(s.inference_contextuelle, false) // visuel_strict
  assert.equal(s.interdit_entrainement, false)
})

test('IA : le mode contextuel force inference_contextuelle ET interdit_entrainement', () => {
  const s = sortieVision({ mode: 'contextuel', sortie_transcription: 'Moy' })
  assert.equal(s.inference_contextuelle, true)
  assert.equal(s.interdit_entrainement, true)
})

test('IA : le module peut s’abstenir (indéterminé)', () => {
  const s = sortieVision({ mode: 'visuel_strict', sortie_transcription: 'M', classe_region: 'lettrine', abstention: true })
  assert.equal(s.abstention, true)
  assert.equal(s.sortie_transcription, '')
  assert.equal(s.classe_region, null)
})

test('IA : un appel cloud exige un consentement explicite', () => {
  assert.equal(autoriserAppel({ fournisseur: 'cloud', consentement_cloud: false }).ok, false)
  assert.equal(autoriserAppel({ fournisseur: 'cloud', consentement_cloud: true }).ok, true)
  assert.equal(autoriserAppel({ fournisseur: 'local' }).ok, true)
})

test('IA : le stub demanderAvisVisuel n’interrompt jamais l’OCR (abstention, pas d’exception)', async () => {
  const r = await demanderAvisVisuel({ mode: 'visuel_strict' })
  assert.equal(r.abstention, true)
  assert.equal(r.non_configure, true)
  assert.equal(r.statut, 'candidat')
})

test('IA : un mode inconnu est refusé', () => {
  assert.throws(() => sortieVision({ mode: 'devinette' }))
  assert.ok(MODES_VISION.includes('visuel_strict') && MODES_VISION.includes('contextuel'))
})
