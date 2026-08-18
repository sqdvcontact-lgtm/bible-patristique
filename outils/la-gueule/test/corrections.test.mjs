import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appliquerCorrection, annulerCorrection, appliquerDansProjet, appliquerGroupe, appliquerReclassement, annulerReclassement } from '../src/corrections.mjs'
import { estHorsCorpsConfirme } from '../src/structure.mjs'

test('correction : appliquer écrit dip, préserve ocr0, journalise l’entrée', () => {
  const l = { ocr0: 'bommes', dip: 'bommes', bbox: [1, 2, 3, 4] }
  const r = appliquerCorrection(l, { avant: 'bommes', apres: 'hommes', origine: 'ia', modele: 'sonnet', regle: 'relecture_page', date: '2026-08-09' })
  assert.equal(r.ok, true)
  assert.equal(l.dip, 'hommes')          // le candidat courant est corrigé
  assert.equal(l.ocr0, 'bommes')         // l'OCR original est intact
  assert.equal(l.corrections.length, 1)
  assert.equal(l.corrections[0].avant, 'bommes')
  assert.equal(l.corrections[0].apres, 'hommes')
  assert.equal(l.corrections[0].statut, 'applique_candidate')
  assert.equal(l.corrections[0].validation_humaine, false)
})

test('correction : ocr0 est posé si absent, jamais réécrit ensuite', () => {
  const l = { dip: 'seulemeni' } // pas d'ocr0 (cas limite)
  appliquerCorrection(l, { avant: 'seulemeni', apres: 'seulement' })
  assert.equal(l.ocr0, 'seulemeni')      // filet : original figé à la 1re édition
  appliquerCorrection(l, { avant: 'seulement', apres: 'seulement.' })
  assert.equal(l.ocr0, 'seulemeni')      // toujours l'original, jamais l'intermédiaire
  assert.equal(l.dip, 'seulement.')
})

test('correction : CONFLIT — dip modifié entre-temps n’est jamais écrasé', () => {
  const l = { ocr0: 'bommes', dip: 'bonnes' } // un humain a déjà changé le texte
  const r = appliquerCorrection(l, { avant: 'bommes', apres: 'hommes' })
  assert.equal(r.ok, false)
  assert.equal(r.conflit, true)
  assert.equal(r.attendu, 'bommes')
  assert.equal(r.actuel, 'bonnes')
  assert.equal(l.dip, 'bonnes')          // inchangé : aucune écriture silencieuse
  assert.equal(l.corrections, undefined)
})

test('correction : idempotence — réappliquer une correction déjà faite ne rejournalise pas', () => {
  const l = { ocr0: 'bommes', dip: 'hommes' }
  const r = appliquerCorrection(l, { avant: 'bommes', apres: 'hommes' })
  assert.equal(r.ok, true)
  assert.equal(r.statut, 'deja_applique')
  assert.equal(l.corrections, undefined) // rien ajouté
})

test('correction : une correction VIDE est refusée (sauf autorisation explicite)', () => {
  const l = { ocr0: 'x', dip: 'x' }
  assert.equal(appliquerCorrection(l, { avant: 'x', apres: '' }).ok, false)
  assert.equal(l.dip, 'x')
  const r = appliquerCorrection(l, { avant: 'x', apres: '', autoriserVide: true })
  assert.equal(r.ok, true)
  assert.equal(l.dip, '')
})

test('correction : annuler restaure la valeur candidate précédente, sans toucher ocr0', () => {
  const l = { ocr0: 'bommes', dip: 'bommes' }
  appliquerCorrection(l, { id: 'c1', avant: 'bommes', apres: 'hommes' })
  const r = annulerCorrection(l, 'c1')
  assert.equal(r.ok, true)
  assert.equal(l.dip, 'bommes')          // texte candidat restauré
  assert.equal(l.ocr0, 'bommes')         // original jamais touché
  assert.equal(l.corrections[0].annulee, true) // l'historique conserve la correction annulée
})

test('correction : appliquerDansProjet — localise page + index ; refusée si ligne absente', () => {
  const projet = { pages: { 7: { lignes: [{ ocr0: 'a', dip: 'a' }, { ocr0: 'bommes', dip: 'bommes' }] } } }
  const r = appliquerDansProjet(projet, 7, 1, { avant: 'bommes', apres: 'hommes' })
  assert.equal(r.ok, true)
  assert.equal(projet.pages[7].lignes[1].dip, 'hommes')
  assert.equal(appliquerDansProjet(projet, 7, 9, { avant: 'x', apres: 'y' }).ok, false) // hors bornes
})

test('correction : appliquerGroupe — applique chacune et recense les conflits', () => {
  const projet = { pages: { 1: { lignes: [
    { ocr0: 'bommes', dip: 'bommes' },
    { ocr0: 'seulemeni', dip: 'MODIFIÉ À LA MAIN' }, // conflit attendu
    { ocr0: 'ciel', dip: 'ciel' },
  ] } } }
  const bilan = appliquerGroupe(projet, [
    { page: 1, index: 0, avant: 'bommes', apres: 'hommes' },
    { page: 1, index: 1, avant: 'seulemeni', apres: 'seulement' }, // conflit (dip ≠ avant)
    { page: 1, index: 2, avant: 'ciel', apres: 'ciel' },           // déjà bon
  ])
  assert.equal(bilan.appliquees, 1)
  assert.equal(bilan.deja, 1)
  assert.equal(bilan.conflits.length, 1)
  assert.equal(bilan.conflits[0].index, 1)
  assert.equal(projet.pages[1].lignes[0].dip, 'hommes')
  assert.equal(projet.pages[1].lignes[1].dip, 'MODIFIÉ À LA MAIN') // jamais écrasé
})

test('reclassement : une ligne d’ornement passe hors-corps (source conservée, texte intact)', () => {
  const l = { ocr0: 'SARA AE ASIA', dip: 'SARA AE ASIA', bbox: [1,2,3,4], suggestion: { role_suggere: 'corps', role_confirme: null } }
  const r = appliquerReclassement(l, { role_avant: 'corps', role_apres: 'ornement', origine: 'ia', regle: 'relecture_role' })
  assert.equal(r.ok, true)
  assert.equal(l.suggestion.role_confirme, 'ornement')
  assert.equal(l.suggestion.export_corps, false)   // exclu du corps exporté
  assert.equal(estHorsCorpsConfirme(l), true)       // vu comme hors-corps par le pipeline d’export
  assert.equal(l.dip, 'SARA AE ASIA')               // texte NON supprimé (reste en source)
  assert.equal(l.ocr0, 'SARA AE ASIA')              // OCR original intact
  assert.equal(l.corrections[0].type, 'reclassement_role')
})

test('reclassement : idempotent, et conflit si un rôle humain différent existe déjà', () => {
  const l = { dip: 'x', suggestion: { role_confirme: 'ornement' } }
  assert.equal(appliquerReclassement(l, { role_apres: 'ornement' }).statut, 'deja_applique')
  const r = appliquerReclassement(l, { role_avant: 'corps', role_apres: 'bruit' }) // attend 'corps', trouve 'ornement'
  assert.equal(r.ok, false); assert.equal(r.conflit, true)
  assert.equal(l.suggestion.role_confirme, 'ornement') // jamais écrasé
})

test('reclassement : annuler restaure le rôle précédent et réintègre au corps', () => {
  const l = { dip: 'Ligne de corps', suggestion: { role_confirme: null } }
  appliquerReclassement(l, { id: 'r1', role_avant: 'corps', role_apres: 'ornement' })
  assert.equal(estHorsCorpsConfirme(l), true)
  const r = annulerReclassement(l, 'r1')
  assert.equal(r.ok, true)
  assert.equal(l.suggestion.role_confirme, null)     // rôle restauré
  assert.equal(l.suggestion.export_corps, true)      // réintégré au corps
  assert.equal(estHorsCorpsConfirme(l), false)
  assert.equal(l.corrections[0].annulee, true)       // historique conservé
})
