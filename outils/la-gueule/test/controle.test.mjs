import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { intervention, niveauRisque, chargerCatalogue, controlerDeterministe, interventionDepuisSortieIA, controlerIA, controlerPageIA, interventionsDepuisRelecture, interventionsReclassement, ligneCharabia, pageIgnorable } from '../src/ia/controle.mjs'
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
  assert.ok(findings.some((f) => f.regle === 'page_courte' && f.statut === 'avertissement')) // Phase 5 : page courte = avertissement, PAS blocage
  assert.ok(!findings.some((f) => f.statut === 'bloquant'))  // plus aucun blocage sur une simple page courte
  assert.equal(JSON.stringify(projet), avant)               // OCR brut immuable : le projet n'est pas modifié
})

test('contrôle déterministe : les coquilles non océrisées (tri IA / aperçu) sont hors contrôle', () => {
  const projet = { pages: {
    1: { lignes: [{ dip: 'Une vraie page océrisée avec du texte.', bbox: [1, 2, 3, 4], confiance: 0.95 }] },
    2: { triage: { type: 'garde', a_ocriser: false } },   // vignette du tri IA : pas de `lignes`
    3: { apercuUrl: '/x.png', pngUrl: '/x.png' },          // aperçu du PDF : pas de `lignes`
  } }
  const { compteurs, findings } = controlerDeterministe(projet)
  assert.equal(compteurs.pages, 1)                          // seule la page 1 est océrisée
  assert.equal(compteurs.pages_anormales, 0)                // les coquilles NE sont PAS signalées « page anormale »
  assert.ok(!findings.some((f) => f.page === 2 || f.page === 3))
})

test('contrôle : ligneCharabia repère l’OCR d’un bandeau ornemental, sans faux positif sur du texte', () => {
  assert.ok(ligneCharabia('Cocc oc sc coc oiccccccscsc'))          // le cas signalé
  assert.ok(ligneCharabia('llllllll mmmm'))                        // répétition de caractère
  assert.ok(ligneCharabia('a b c de fg'))                          // fragments ultra-courts
  assert.equal(ligneCharabia('OY dont les premiers Vers n’ont parlé'), null) // vrai vers → rien
  assert.equal(ligneCharabia('de la Philosophie. Livre I.'), null)         // vrai titre → rien
})

test('contrôle déterministe : une ligne charabia est comptée et signalée (R2)', () => {
  const projet = { pages: { 1: { lignes: [
    { dip: 'Ligne de vrai texte bien formée.', bbox: [1, 2, 3, 4], confiance: 0.95 },
    { dip: 'Cocc oc sc coc oiccccccscsc', bbox: [1, 60, 3, 4], confiance: 0.9 },
  ] } } }
  const { compteurs, findings } = controlerDeterministe(projet)
  assert.equal(compteurs.charabia, 1)
  assert.ok(findings.some((f) => f.regle === 'charabia_ornement' && f.niveau_risque === 'R2'))
})

test('contrôle : pageIgnorable — garde blanche, page Google, page d’ornement ; pas une page de texte', () => {
  assert.match(pageIgnorable([]), /garde/)                                        // page vide
  assert.match(pageIgnorable([{ dip: 'Digitized by Google' }]), /Google/)         // page Google
  assert.match(pageIgnorable([{ dip: 'Cocc oc sc coc oiccccccscsc' }]), /ornement/) // page de gravure
  assert.equal(pageIgnorable([{ dip: 'OY dont les premiers Vers n’ont parlé' }]), null) // vraie page → null
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

test('contrôle : interventionsDepuisRelecture — ne garde que les vraies corrections', () => {
  const lignes = [{ dip: 'Au commencement' }, { dip: 'Dicu créa' }, { dip: 'le ciel' }]
  const sortie = { abstention: false, corrections: [
    { i: 1, texte_ocr: 'Dicu créa', texte_corrige: 'Dieu créa', motif: 'lettre mal lue', confiance: 0.9 }, // vraie correction
    { i: 0, texte_ocr: 'Au commencement', texte_corrige: 'Au commencement' },                              // identique → écartée
    { i: 2, texte_corrige: '' },                                                                            // vide → écartée
    { i: 9, texte_corrige: 'hors page' },                                                                   // indice hors bornes → écartée
  ] }
  const ivs = interventionsDepuisRelecture(sortie, { page: 4, lignes, modele: 'sonnet', fournisseur: 'claude-local' })
  assert.equal(ivs.length, 1)
  assert.equal(ivs[0].texte_original, 'Dicu créa')
  assert.equal(ivs[0].texte_candidat, 'Dieu créa')
  assert.equal(ivs[0].ligne_ids[0], 1)
  assert.equal(ivs[0].regle, 'relecture_page')
  assert.equal(ivs[0].statut, 'propose_ia')
  assert.equal(ivs[0].lecture_fondee_sur_image, true)
})

test('contrôle : interventionsDepuisRelecture — abstention → aucune intervention', () => {
  assert.deepEqual(interventionsDepuisRelecture({ abstention: true, corrections: [{ i: 0, texte_corrige: 'x' }] }, { page: 1, lignes: [{ dip: 'a' }] }), [])
  assert.deepEqual(interventionsDepuisRelecture(null, { page: 1, lignes: [] }), [])
})

test('contrôle : controlerPageIA — une relecture par page océrisée, corrections récoltées', async () => {
  const projet = { pages: { 1: { lignes: [{ dip: 'Dicu' }] }, 2: { lignes: [{ dip: 'bon' }] } } }
  const vus = []
  const faux = { page: async (charge) => { vus.push(charge.n); return { abstention: false, corrections: charge.corr, statut: 'candidat', modele: 'sonnet', fournisseur: 'faux' } } }
  // preparerCharge fabrique une charge portant les corrections attendues (test déterministe, sans réseau).
  const preparerCharge = async (n, lignes) => ({ n, corr: n === 1 ? [{ i: 0, texte_ocr: 'Dicu', texte_corrige: 'Dieu' }] : [] })
  const r = await controlerPageIA(projet, { fournisseur: faux, consentement: true, preparerCharge })
  assert.equal(r.meta.pages_relues, 2)
  assert.equal(r.interventions.length, 1)
  assert.equal(r.interventions[0].texte_candidat, 'Dieu')
  assert.equal(r.interventions[0].page, 1)
})

test('contrôle : interventionsReclassement — classe une ligne non-textuelle, ignore rôle inconnu / abstention', () => {
  const lignes = [
    { dip: 'SARA AE ASIA', suggestion: { role_suggere: 'corps', role_confirme: null } }, // ornement lu en charabia
    { dip: 'Vrai texte de corps' },
  ]
  const sortie = { abstention: false, classifications: [
    { i: 0, role: 'ornement', motif: 'filet gravé' }, // valide
    { i: 1, role: 'zorglub' },                         // rôle inconnu → ignoré
    { i: 9, role: 'ornement' },                        // hors bornes → ignoré
  ] }
  const ivs = interventionsReclassement(sortie, { page: 7, lignes, modele: 'sonnet', fournisseur: 'claude-local' })
  assert.equal(ivs.length, 1)
  assert.equal(ivs[0].type, 'reclassement_role')
  assert.equal(ivs[0].role_avant, 'corps')
  assert.equal(ivs[0].role_apres, 'ornement')
  assert.equal(ivs[0].ligne_ids[0], 0)
  assert.equal(ivs[0].interdit_entrainement, true)
  assert.deepEqual(interventionsReclassement({ abstention: true, classifications: [{ i: 0, role: 'ornement' }] }, { page: 1, lignes }), [])
})
