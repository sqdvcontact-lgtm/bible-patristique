import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { intervention, niveauRisque, chargerCatalogue, controlerDeterministe, interventionDepuisSortieIA, controlerIA } from '../src/ia/controle.mjs'
import { fournisseurMock } from '../src/ia/mock.mjs'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

test('contrôle : intervention — schéma de provenance, candidat non validé', () => {
  const iv = intervention({ page: 19, texte_original: 'oy', texte_candidat: 'Moy', regle: 'lettrine' })
  assert.equal(iv.statut, 'propose_ia')
  assert.equal(iv.validation_humaine, false)
  assert.equal(iv.texte_original, 'oy') // l'original est conservé, jamais écrasé
  assert.ok(Array.isArray(iv.historique))
})

test('contrôle : niveauRisque R0-R4 (la confiance ne suffit pas)', () => {
  assert.equal(niveauRisque({ bloquant: true }), 'R4')
  assert.equal(niveauRisque({ lettre_partielle: true }), 'R3')
  assert.equal(niveauRisque({ nouveau_motif: true }), 'R2')
  assert.equal(niveauRisque({ repetition_validee: true }), 'R1')
  assert.equal(niveauRisque({}), 'R0')
})

test('contrôle : le catalogue d’erreurs (fichier réel) se parse et porte des ids', () => {
  const txt = readFileSync(join(RACINE, 'controles', 'catalogue-erreurs-ocr.jsonl'), 'utf8')
  const cat = chargerCatalogue(txt)
  assert.ok(cat.length >= 20)
  assert.ok(cat.every((e) => e.id && e.risque && typeof e.actif === 'boolean'))
  assert.ok(cat.some((e) => e.id === 'ocr-long-s-tesseract'))
})

test('contrôle déterministe : confiance faible, ligne vide, doublon, page anormale → findings', () => {
  const projet = { pages: {
    1: { lignes: [
      { dip: 'Ligne correcte et longue.', bbox: [1, 2, 3, 4], confiance: 0.95 },
      { dip: '', bbox: [1, 60, 3, 4], confiance: 0.9 },              // ligne vide
      { dip: 'texte douteux ici présent', bbox: [1, 120, 3, 4], confiance: 0.5 }, // confiance faible
      { dip: 'texte douteux ici présent', bbox: [1, 180, 3, 4], confiance: 0.9 }, // doublon
    ] },
    2: { lignes: [{ dip: 'ab', bbox: [1, 2, 3, 4] }] }, // page anormalement courte
  } }
  const avant = JSON.stringify(projet)
  const { findings, compteurs } = controlerDeterministe(projet)
  assert.equal(compteurs.lignes_vides, 1)
  assert.equal(compteurs.confiance_faible, 1)
  assert.equal(compteurs.doublons, 1)
  assert.equal(compteurs.pages_anormales, 1)
  assert.ok(findings.some((f) => f.statut === 'bloquant'))  // page anormale = bloquant
  assert.equal(JSON.stringify(projet), avant)               // OCR brut immuable : le projet n'est pas modifié
})

test('contrôle IA : abstention → aucune intervention ; conjecture → R3 + interdit_entrainement', () => {
  assert.equal(interventionDepuisSortieIA({ type: 'lettrine', abstention: true }), null)
  const conj = interventionDepuisSortieIA({ type: 'lettrine', abstention: false, lecture_candidate: 'M', inference_contextuelle: true })
  assert.equal(conj.niveau_risque, 'R3')
  assert.equal(conj.interdit_entrainement, true)   // conjecture → jamais au ground-truth
  const img = interventionDepuisSortieIA({ type: 'lettrine', abstention: false, lecture_candidate: 'M', lecture_fondee_sur_image: true })
  assert.equal(img.niveau_risque, 'R2')
  assert.equal(img.lecture_fondee_sur_image, true)
  assert.equal(img.statut, 'propose_ia')           // candidat, jamais validé
})

test('contrôle IA : le mock s’abstient → 0 intervention (aucune fausse correction, sans réseau)', async () => {
  const projet = { pages: { 19: { lignes: [
    { dip: 'oy', bbox: [1, 2, 3, 4], suggestion: { role_suggere: 'lettrine_candidate' } },
    { dip: 'douteux', bbox: [1, 60, 3, 4], confiance: 0.4 },
  ] } } }
  const r = await controlerIA(projet, { fournisseur: fournisseurMock() })
  assert.equal(r.interventions.length, 0)
  assert.equal(await controlerIA(projet, {}).then((x) => x.interventions.length), 0) // sans fournisseur → 0
})

test('contrôle IA : un fournisseur qui lit produit une intervention candidate tracée', async () => {
  const faux = { async lettrine() { return { type: 'lettrine', abstention: false, lecture_candidate: 'M', lecture_fondee_sur_image: true, statut: 'candidat', confiance: 0.9, fournisseur: 'faux' } } }
  const projet = { pages: { 19: { lignes: [{ dip: 'oy', bbox: [1, 2, 3, 4], suggestion: { role_suggere: 'lettrine_candidate' } }] } } }
  const r = await controlerIA(projet, { fournisseur: faux, consentement: true })
  assert.equal(r.interventions.length, 1)
  assert.equal(r.interventions[0].texte_candidat, 'M')
  assert.equal(r.interventions[0].statut, 'propose_ia')
})
