import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  caracteresAnciensIntroduits,
  comparerLigne,
  analyserComparaison,
  comparaisonMarkdown,
} from '../src/comparaison.mjs'

test('caracteresAnciensIntroduits repère un « ſ » ajouté par l’IA', () => {
  assert.deepEqual(caracteresAnciensIntroduits('la splendeur', 'la ſplendeur'), ['ſ'])
  assert.deepEqual(caracteresAnciensIntroduits('la ſplendeur', 'la ſplendeur'), []) // déjà présent des deux côtés
  assert.deepEqual(caracteresAnciensIntroduits('estre', 'être'), []) // « ê » n’est pas un caractère ancien
})

test('comparerLigne ignore une ligne inchangée', () => {
  assert.equal(comparerLigne({ ocr0: 'texte', dip: 'texte' }, 0), null)
})

test('comparerLigne rapporte une correction IA et le ſ ajouté', () => {
  const l = {
    ocr0: 'Soleil de Iustice', dip: 'Soleil de Iuſtice', confiance: 0.72,
    corrections: [{ type: 'correction_ocr', origine: 'ia', modele: 'sonnet', statut: 'applique_candidate', validation_humaine: false, certitude: 'certaine', annulee: false }],
  }
  const c = comparerLigne(l, 3)
  assert.equal(c.i, 3)
  assert.equal(c.meca, 'Soleil de Iustice')
  assert.equal(c.ia, 'Soleil de Iuſtice')
  assert.equal(c.modifieTexte, true)
  assert.equal(c.origine, 'ia')
  assert.equal(c.modele, 'sonnet')
  assert.equal(c.certitude, 'certaine')
  assert.deepEqual(c.caracteresAnciens, ['ſ'])
})

test('comparerLigne rapporte un reclassement hors-corps sans changer le texte', () => {
  const l = {
    ocr0: 'SARA AE ASIA', dip: 'SARA AE ASIA',
    suggestion: { role_confirme: 'ornement', export_corps: false },
    corrections: [{ type: 'reclassement_role', origine: 'ia', role_apres: 'ornement', annulee: false }],
  }
  const c = comparerLigne(l, 1)
  assert.equal(c.modifieTexte, false)
  assert.equal(c.reclasseVers, 'ornement')
  assert.equal(c.horsCorps, true)
})

test('comparerLigne ne restitue rien pour une correction annulée', () => {
  const l = { ocr0: 'a', dip: 'a', corrections: [{ type: 'correction_ocr', annulee: true }] }
  assert.equal(comparerLigne(l, 0), null)
})

test('analyserComparaison résume les gestes IA et ignore les entrées non océrisées', () => {
  const projet = {
    pages: {
      1: { lignes: [
        { ocr0: 'Iustice', dip: 'Iuſtice', confiance: 0.7, corrections: [{ type: 'correction_ocr', origine: 'ia', validation_humaine: false, annulee: false }] },
        { ocr0: 'clair', dip: 'clair' },
      ] },
      2: {}, // vignette : pas de tableau `lignes` → ignorée
    },
  }
  const { resume, pages } = analyserComparaison(projet)
  assert.equal(resume.pages, 1)
  assert.equal(resume.lignes, 2)
  assert.equal(resume.modifiees, 1)
  assert.equal(resume.auto, 1)
  assert.equal(resume.avec_s_long, 1)
  assert.equal(resume.confiance_faible, 1)
  assert.equal(pages.length, 1)
  assert.equal(pages[0].lignes.length, 1)
})

test('comparaisonMarkdown produit un rapport lisible', () => {
  const projet = { meta: { titre: 'Test' }, pages: { 1: { lignes: [
    { ocr0: 'Iustice', dip: 'Iuſtice', corrections: [{ type: 'correction_ocr', origine: 'ia', modele: 'sonnet', annulee: false }] },
  ] } } }
  const md = comparaisonMarkdown(projet, { nom: 'test', date: '2026-08-10' })
  assert.match(md, /# Contrôle OCR/)
  assert.match(md, /## Synthèse/)
  assert.match(md, /introduit un « ſ » : \*\*1\*\*/)
  assert.match(md, /méca : Iustice/)
  assert.match(md, /IA {3}: Iuſtice/)
  assert.match(md, /⚠ſ/)
})
