import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  marqueDeNote, appelsDansLigne, apparierNotesImprimees,
  numeroterAncrages, poserAppel, notesDeLaPage,
} from '../src/notes-ancrage.mjs'
import { ancrerNotesIA } from '../src/ia/controle.mjs'
import { fournisseurMock } from '../src/ia/mock.mjs'

test('marqueDeNote : lit l’appel imprimé en tête d’une note', () => {
  assert.equal(marqueDeNote('(1) Sardanapale, roi d’Assyrie…'), '1')
  assert.equal(marqueDeNote('a) Voyez plus haut'), 'a')
  assert.equal(marqueDeNote('* Note de l’imprimeur'), null) // sans délimiteur : non reconnu, tant pis
  assert.equal(marqueDeNote('Propriété de la bonté divine'), null)
})

test('appelsDansLigne : repère l’appel dans le corps', () => {
  assert.deepEqual(appelsDansLigne('il fut plus mol que Sardanapale (1) et'), ['1'])
  assert.deepEqual(appelsDansLigne('texte sans appel'), [])
})

test('appariement MÉCANIQUE : une note à appel imprimé se rattache sans IA', () => {
  const corps = [{ i: 3, texte: 'plus mol que Sardanapale (1) qui' }, { i: 4, texte: 'mourut dans les délices.' }]
  const notes = [{ i: 20, texte: '(1) Sardanapale, roi d’Assyrie…', role: 'note_bas_page' }]
  const { ancrages, restantes } = apparierNotesImprimees(corps, notes)
  assert.equal(ancrages.length, 1)
  assert.equal(ancrages[0].corps_i, 3)
  assert.equal(ancrages[0].methode, 'appel_imprime')
  assert.equal(ancrages[0].certitude, 'certaine')
  assert.equal(restantes.length, 0)
})

test('appariement : une marque AMBIGUË n’est jamais tranchée au hasard', () => {
  const corps = [{ i: 1, texte: 'un (1) ici' }, { i: 2, texte: 'et un autre (1) là' }]
  const notes = [{ i: 9, texte: '(1) la note', role: 'note_bas_page' }]
  const { ancrages, restantes } = apparierNotesImprimees(corps, notes)
  assert.equal(ancrages.length, 0)
  assert.equal(restantes[0].ambigu, true) // laissée à la passe sémantique
})

test('appariement : une glose de marge (sans appel) part vers la passe sémantique', () => {
  const notes = [{ i: 11, texte: 'Propriété de la bonté divine', role: 'note_marginale' }]
  const { ancrages, restantes } = apparierNotesImprimees([{ i: 1, texte: 'du corps' }], notes)
  assert.equal(ancrages.length, 0)
  assert.equal(restantes.length, 1)
})

test('numeroterAncrages : numérotation continue et GLOBALE, dans l’ordre de lecture', () => {
  const out = numeroterAncrages([
    { page: 8, corps_i: 2, note_i: 30 },
    { page: 7, corps_i: 9, note_i: 20 },
    { page: 7, corps_i: 3, note_i: 19 },
  ])
  assert.deepEqual(out.map((a) => [a.page, a.corps_i, a.numero]), [[7, 3, 1], [7, 9, 2], [8, 2, 3]])
})

test('poserAppel : l’appel suit le mot annoté, sans espace (§13.3)', () => {
  const r = poserAppel('plus mol que Sardanapale qui mourut', 4, 'Sardanapale')
  assert.equal(r.texte, 'plus mol que Sardanapale[[4]] qui mourut')
  assert.equal(r.place, 'apres_groupe')
})

test('poserAppel : devant un guillemet fermant, l’appel reste À L’INTÉRIEUR', () => {
  const r = poserAppel('il dit : « les sarments »', 3)
  assert.equal(r.texte, 'il dit : « les sarments[[3]] »')
  assert.equal(r.place, 'avant_fermant')
})

test('poserAppel : repli en fin de ligne si le groupe est introuvable', () => {
  const r = poserAppel('une ligne quelconque', 7, 'mot-absent')
  assert.equal(r.texte, 'une ligne quelconque[[7]]')
  assert.equal(r.place, 'fin_de_ligne')
})

test('notesDeLaPage : sépare corps et notes selon le rôle', () => {
  const lignes = [
    { dip: 'du corps' },
    { dip: 'Estoille', suggestion: { role_suggere: 'note_marginale' } },
    { dip: '12', suggestion: { role_confirme: 'numero_page' } },
  ]
  const { corps, notes } = notesDeLaPage(lignes)
  assert.deepEqual(corps.map((c) => c.i), [0])
  assert.deepEqual(notes.map((n) => n.i), [1])   // le folio n'est ni corps ni note
})

test('ancrerNotesIA : le mécanique suffit, AUCUN appel au modèle', async () => {
  const projet = { pages: { 7: { lignes: [
    { dip: 'plus mol que Sardanapale (1) qui' },
    { dip: '(1) Sardanapale, roi d’Assyrie…', suggestion: { role_suggere: 'note_bas_page' } },
  ] } } }
  let appels = 0
  const faux = { ...fournisseurMock(), async notes() { appels++; return { type: 'ancrage_notes', statut: 'candidat', abstention: true, ancrages: [] } } }
  const r = await ancrerNotesIA(projet, { fournisseur: faux, consentement: true, preparerCharge: async () => ({}) })
  assert.equal(appels, 0)                        // aucune dépense inutile
  assert.equal(r.meta.ancrages_mecaniques, 1)
  assert.equal(r.interventions.length, 1)
  assert.equal(r.interventions[0].type, 'ancrage_note')
  assert.equal(r.interventions[0].numero_note, 1)
  assert.equal(r.interventions[0].niveau_risque, 'R1')
})

test('ancrerNotesIA : une glose de marge déclenche la passe sémantique', async () => {
  const projet = { pages: { 7: { lignes: [
    { dip: 'l’estoille conduisit les mages' },
    { dip: 'Estoille', suggestion: { role_suggere: 'note_marginale' } },
  ] } } }
  const faux = {
    ...fournisseurMock(),
    async notes() {
      return { type: 'ancrage_notes', statut: 'candidat', abstention: false,
        ancrages: [{ lignes_note: [1], corps_i: 0, apres: 'estoille', certitude: 'certaine', confiance: 0.9 }] }
    },
  }
  const r = await ancrerNotesIA(projet, { fournisseur: faux, consentement: true, preparerCharge: async () => ({ image_path: 'x' }) })
  assert.equal(r.meta.ancrages_ia, 1)
  const iv = r.interventions[0]
  assert.equal(iv.corps_i, 0)
  assert.equal(iv.apres, 'estoille')
  assert.equal(iv.numero_note, 1)
  assert.equal(iv.niveau_risque, 'R3')           // structurel : jamais appliqué en aveugle
})

test('ancrerNotesIA : « rien de sûr » (corps_i null) ne produit AUCUN rattachement', async () => {
  const projet = { pages: { 7: { lignes: [
    { dip: 'du corps' },
    { dip: 'Glose', suggestion: { role_suggere: 'note_marginale' } },
  ] } } }
  const faux = {
    ...fournisseurMock(),
    async notes() { return { type: 'ancrage_notes', statut: 'candidat', abstention: false, ancrages: [{ lignes_note: [1], corps_i: null, motif: 'aucun rapport clair' }] } },
  }
  const r = await ancrerNotesIA(projet, { fournisseur: faux, consentement: true, preparerCharge: async () => ({ image_path: 'x' }) })
  assert.deepEqual(r.interventions, [])
})

test('ancrerNotesIA : le mock s’abstient — aucune invention par défaut', async () => {
  const projet = { pages: { 7: { lignes: [
    { dip: 'du corps' },
    { dip: 'Glose', suggestion: { role_suggere: 'note_marginale' } },
  ] } } }
  const r = await ancrerNotesIA(projet, { fournisseur: fournisseurMock(), consentement: true, preparerCharge: async () => ({ image_path: 'x' }) })
  assert.deepEqual(r.interventions, [])
})

// ── Maillon final : matérialiser l'appel à l'acceptation ─────────────────────
import { appliquerAncrage } from '../src/corrections.mjs'
import { interventionsLignesOmises } from '../src/ia/controle.mjs'

test('appliquerAncrage : pose [[n]] dans la LIGNE DE CORPS, pas dans la note', () => {
  const projet = { pages: { 7: { lignes: [
    { dip: 'plus mol que Sardanapale qui mourut', ocr0: 'plus mol que Sardanapale qui mourut' },
    { dip: '(1) Sardanapale, roi d’Assyrie…' },
  ] } } }
  const r = appliquerAncrage(projet, 7, { corps_i: 0, lignes_note: [1], numero: 4, apres: 'Sardanapale' })
  assert.equal(r.ok, true)
  assert.equal(projet.pages[7].lignes[0].dip, 'plus mol que Sardanapale[[4]] qui mourut')
  assert.equal(projet.pages[7].lignes[1].dip, '(1) Sardanapale, roi d’Assyrie…') // note NON réécrite
  assert.equal(projet.pages[7].lignes[1].note_numero, 4)                          // mais estampillée
})

test('appliquerAncrage : ocr0 intact, historique tracé, idempotent', () => {
  const projet = { pages: { 7: { lignes: [{ dip: 'texte annoté', ocr0: 'texte annoté' }, { dip: 'la note' }] } } }
  appliquerAncrage(projet, 7, { corps_i: 0, lignes_note: [1], numero: 2 })
  const l = projet.pages[7].lignes[0]
  assert.equal(l.ocr0, 'texte annoté')                       // l'OCR brut ne bouge jamais
  assert.equal(l.corrections.length, 1)
  assert.equal(l.corrections[0].type, 'ancrage_note')
  assert.equal(l.corrections[0].note_numero, 2)
  const r2 = appliquerAncrage(projet, 7, { corps_i: 0, lignes_note: [1], numero: 2 })
  assert.equal(r2.statut, 'deja_applique')                   // rejouer ne double pas l'appel
})

test('appliquerAncrage : refuse un numéro absent ou une ligne introuvable', () => {
  const projet = { pages: { 7: { lignes: [{ dip: 'x' }] } } }
  assert.equal(appliquerAncrage(projet, 7, { corps_i: 0, numero: 0 }).ok, false)
  assert.equal(appliquerAncrage(projet, 7, { corps_i: 9, numero: 1 }).ok, false)
})

test('interventionsLignesOmises : une ligne sautée est proposée en AJOUT, jamais en silence', () => {
  const sortie = { lignes_omises: [{ apres_i: 2, texte: 'ligne que l’OCR a sautée', confiance: 0.8 }] }
  const [iv] = interventionsLignesOmises(sortie, { page: 5, lignes: [{}, {}, {}] })
  assert.equal(iv.type, 'ligne_omise')
  assert.equal(iv.texte_candidat, 'ligne que l’OCR a sautée')
  assert.equal(iv.apres_i, 2)
  assert.equal(iv.niveau_risque, 'R3')          // ajoute du contenu
  assert.equal(iv.certitude, 'incertaine')      // toujours soumise à l'humain
  assert.equal(iv.interdit_entrainement, true)  // sans bbox → hors ground-truth
})

test('interventionsLignesOmises : texte vide ou index hors bornes → rien', () => {
  assert.deepEqual(interventionsLignesOmises({ lignes_omises: [{ apres_i: 0, texte: '  ' }] }, { page: 1, lignes: [{}] }), [])
  assert.deepEqual(interventionsLignesOmises({ lignes_omises: [{ apres_i: 99, texte: 'x' }] }, { page: 1, lignes: [{}] }), [])
})
