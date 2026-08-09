import { test } from 'node:test'
import assert from 'node:assert/strict'
import { choisirFournisseur, validerSortieIA, cleCache, enregistrerConsentement, consentementValide, appelerIA, TACHES } from '../src/ia/fournisseur.mjs'
import { fournisseurMock } from '../src/ia/mock.mjs'
import { fournisseurClaude } from '../src/ia/claude.mjs'
import { pagesEchantillon, construireProfil, regimePourPage, pageAnormale } from '../src/ia/diagnostic.mjs'

test('IA : choisirFournisseur — mock par défaut, anthropic si configuré', () => {
  assert.equal(choisirFournisseur({}).nom, 'mock')
  assert.equal(choisirFournisseur({ LG_AI_PROVIDER: 'anthropic' }).nom, 'anthropic')
})

test('IA : le mock est hors-ligne et s’abstient sur une lettrine (prudence)', async () => {
  const f = fournisseurMock()
  assert.equal(f.cloud, false)
  const r = await f.lettrine({})
  assert.equal(r.statut, 'candidat')
  assert.equal(r.abstention, true)
})

test('IA : validation de schéma — objet conforme accepté, prose libre rejetée', () => {
  assert.equal(validerSortieIA({ statut: 'candidat', abstention: false }).ok, true)
  assert.equal(validerSortieIA('une phrase libre').ok, false)     // prose → rejetée
  assert.equal(validerSortieIA({ statut: 'candidat' }).ok, false) // abstention manquante
})

test('IA : appelerIA remplace une sortie non conforme par une abstention', async () => {
  const faux = { async ligne() { return 'texte libre non conforme' } }
  const r = await appelerIA(faux, 'ligne', {})
  assert.equal(r.abstention, true)
  assert.match(r.erreur, /non conforme/)
})

test('IA : appelerIA ne lève jamais d’exception (panne fournisseur → abstention)', async () => {
  const panne = { async page() { throw new Error('boum') } }
  const r = await appelerIA(panne, 'page', {})
  assert.equal(r.abstention, true)
  assert.match(r.erreur, /indisponible/)
})

test('IA : cache — deuxième appel servi sans rappeler le fournisseur', async () => {
  let n = 0
  const compteur = { async page() { n++; return { type: 'controle_page', statut: 'candidat', abstention: false } } }
  const cache = new Map(), cle = 'k1'
  await appelerIA(compteur, 'page', {}, { cache, cacheCle: cle })
  await appelerIA(compteur, 'page', {}, { cache, cacheCle: cle })
  assert.equal(n, 1) // un seul appel réel
})

test('IA : cleCache change si le prompt ou le modèle change (invalidation)', () => {
  const a = cleCache({ tache: 'lettrine', modele: 'm', prompt: 'p1' })
  assert.equal(a, cleCache({ tache: 'lettrine', modele: 'm', prompt: 'p1' }))
  assert.notEqual(a, cleCache({ tache: 'lettrine', modele: 'm', prompt: 'p2' }))
  assert.notEqual(a, cleCache({ tache: 'lettrine', modele: 'm2', prompt: 'p1' }))
})

test('IA : consentement lié au fournisseur (invalide si le fournisseur change)', () => {
  const c = enregistrerConsentement('anthropic', '2026-08-09')
  assert.equal(consentementValide(c, 'anthropic'), true)
  assert.equal(consentementValide(c, 'openai'), false) // changement de fournisseur → consentement caduc
  assert.equal(consentementValide(null, 'anthropic'), false)
})

test('IA : Claude sans clé → indisponible ; sans consentement → abstention (JAMAIS d’appel réseau en test)', async () => {
  const sansCle = fournisseurClaude({}) // pas de ANTHROPIC_API_KEY
  assert.equal(sansCle.dispo, false)
  const r1 = await sansCle.lettrine({}, { consentement: true })
  assert.equal(r1.abstention, true)
  assert.match(r1.erreur, /clé/)
  // Avec une clé factice mais sans consentement → abstention, aucun fetch, aucune clé dans la sortie.
  const avecCle = fournisseurClaude({ ANTHROPIC_API_KEY: 'sk-FACTICE-xyz', LG_AI_MODEL_VISION: 'modele-x' })
  const r2 = await avecCle.lettrine({}, { consentement: false })
  assert.equal(r2.abstention, true)
  assert.match(r2.erreur, /consentement/)
  assert.equal(JSON.stringify(r2).includes('sk-FACTICE-xyz'), false) // aucune clé dans la sortie/journaux
})

test('IA : échantillon représentatif — couverture, corps, quarts, milieu, fin + atypiques', () => {
  const e = pagesEchantillon(586, { atypiques: [143] })
  assert.ok(e.includes(1) && e.includes(586))
  assert.ok(e.includes(293)) // milieu
  assert.ok(e.includes(143)) // page atypique
  assert.ok(e.every((p) => p >= 1 && p <= 586))
  assert.deepEqual(e, [...e].sort((a, b) => a - b)) // trié
})

test('Phase C : regimePourPage — choisit le régime dont la plage contient la page', () => {
  const profil = { regimes: [
    { pages_pdf: [1, 18], nature: 'paratexte', moteur: 'kraken', modele: 'CATMuS-Print' },
    { pages_pdf: [19, 586], nature: 'corps', moteur: 'kraken', modele: 'CATMuS-Print' },
  ] }
  assert.equal(regimePourPage(profil, 5).nature, 'paratexte')
  assert.equal(regimePourPage(profil, 300).nature, 'corps')
  assert.equal(regimePourPage(profil, 999), null) // hors plage
  assert.equal(regimePourPage(null, 5), null)     // pas de profil
})

test('Phase C : pageAnormale — vide ou anormalement courte est signalée', () => {
  assert.match(pageAnormale([]), /vide/)
  assert.match(pageAnormale([{ dip: 'ab' }]), /courte/)     // 2 caractères < seuil
  assert.equal(pageAnormale([{ dip: 'de la Philosophie. Liure V.' }]), null) // page normale
})

test('IA : profil de traitement — prétraitement inactif par défaut, structure complète', () => {
  const p = construireProfil({ document: { type: 'imprime_ancien', langues: ['fr'] }, phenomenes: { lettrines: true, poesie: true } })
  assert.equal(p.pretraitement.actif, false)
  assert.equal(p.document.type, 'imprime_ancien')
  assert.equal(p.phenomenes.lettrines, true)
  assert.equal(p.phenomenes.notes, false)
  assert.ok(Array.isArray(p.regimes))
})
