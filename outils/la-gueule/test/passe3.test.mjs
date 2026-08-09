import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paginationSource, paginationInferree, metadonneesPage } from '../src/structure.mjs'
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
