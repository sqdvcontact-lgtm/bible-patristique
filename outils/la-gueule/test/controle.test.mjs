import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { intervention, niveauRisque, chargerCatalogue, controlerDeterministe } from '../src/ia/controle.mjs'

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
