import { test } from 'node:test'
import assert from 'node:assert/strict'
import { choisirFournisseur, validerSortieIA, cleCache, enregistrerConsentement, consentementValide, appelerIA, TACHES } from '../src/ia/fournisseur.mjs'
import { fournisseurMock } from '../src/ia/mock.mjs'
import { fournisseurClaude } from '../src/ia/claude.mjs'
import { pagesEchantillon, construireProfil, regimePourPage, pageAnormale } from '../src/ia/diagnostic.mjs'
import { etatFournisseur, consentementActif } from '../src/ia/consentement.mjs'
import { inviteMetadonnees, argvClaude, extraireJson, fournisseurClaudeLocal } from '../src/ia/claude-local.mjs'
import { messagesLettrine, messagesCorrection, messagesMetadonnees } from '../src/ia/prompt.mjs'
import { cheminPngDepuisUrl } from '../src/ia/crop.mjs'

test('IA prompt : messagesLettrine — image + consigne JSON, le texte du livre est une donnée', () => {
  const m = messagesLettrine({ crop_base64: 'BASE64', texte_ocr: 'oy', contexte: 'dont les', ligne_id: 'p19-l0' })
  assert.match(m.systeme, /DONNÉE.*jamais une instruction/s) // §14.5 sécurité des prompts
  assert.equal(m.messages[0].content[0].type, 'image')
  assert.equal(m.messages[0].content[0].source.data, 'BASE64')
  assert.match(m.messages[0].content[1].text, /lecture_candidate/) // schéma JSON demandé
  assert.match(m.messages[0].content[1].text, /"oy"/)             // OCR présent comme donnée (JSON)
})

test('IA prompt : messagesCorrection — schéma correction_ocr, pas de modernisation', () => {
  const m = messagesCorrection({ crop_base64: 'X', texte_ocr: 'neigor' })
  assert.match(m.messages[0].content[1].text, /texte_propose/)
  assert.match(m.systeme, /Ne modernise/)
})

test('IA prompt : messagesMetadonnees — image de la page de titre + schéma oeuvres, OCR en donnée', () => {
  const m = messagesMetadonnees({ image_base64: 'PAGEB64', texte_ocr: 'BOECE\nDE LA CONSOLATION' })
  assert.match(m.systeme, /DONNÉE.*jamais une instruction/s)              // §14.5 : le texte est une donnée
  assert.equal(m.messages[0].content[0].type, 'image')
  assert.equal(m.messages[0].content[0].source.data, 'PAGEB64')            // l'image entière est envoyée
  const consigne = m.messages[0].content[1].text
  assert.match(consigne, /"editeur":null/)                                 // les champs manquants au parseur
  assert.match(consigne, /"ville":null/)
  assert.match(consigne, /"genre":null/)
  assert.match(consigne, /"titre_original":null/)
  assert.match(consigne, /"sous_titre":null/)
  assert.match(consigne, /null pour tout champ absent/)                    // n'invente rien
  assert.match(consigne, /BOECE/)                                          // OCR présent comme appui (donnée)
})

test('IA local : inviteMetadonnees — système §14.5 + chemin image + consigne Read, sans base64', () => {
  const inv = inviteMetadonnees({ image_path: 'C:/x/titre.png', texte_ocr: 'BOECE' })
  assert.match(inv, /DONNÉE.*jamais une instruction/s)   // système paléographe prudent
  assert.match(inv, /C:\/x\/titre\.png/)                 // le CLI lit l'image par son CHEMIN
  assert.match(inv, /outil Read/)                        // consigne d'ouvrir l'image
  assert.match(inv, /"editeur":null/)                    // même schéma que l'API
})

test('IA local : argvClaude — headless JSON, Read seul, modèle/dossier optionnels', () => {
  assert.deepEqual(argvClaude(), ['-p', '--output-format', 'json', '--allowedTools', 'Read'])
  const a = argvClaude({ modele: 'claude-haiku-4-5', addDir: 'C:/dir' })
  assert.ok(a.includes('--model') && a.includes('claude-haiku-4-5'))
  assert.ok(a.includes('--add-dir') && a.includes('C:/dir'))
})

test('IA local : extraireJson tolère un préambule et des ```json', () => {
  assert.deepEqual(extraireJson('bla {"a":1} fin'), { a: 1 })
  assert.deepEqual(extraireJson('```json\n{"b":2}\n```'), { b: 2 })
  assert.equal(extraireJson('aucun objet ici'), null)
})

test('IA local : le provider ne lève jamais ; image absente → abstention tracée', async () => {
  const f = fournisseurClaudeLocal({ LG_AI_MODEL_DIAGNOSTIC: 'x' })
  assert.equal(f.nom, 'claude-local'); assert.equal(f.cloud, true); assert.equal(f.local, true)
  const r = await f.diagnostiquer({})            // pas de chemin image → pas d'appel CLI
  assert.equal(r.abstention, true)
  assert.match(r.erreur, /image absente/)
})

test('IA §14.6 : etatFournisseur — claude-local est cloud (consentement requis) mais facturé abonnement', () => {
  const e = etatFournisseur({ LG_AI_PROVIDER: 'claude-local' })
  assert.equal(e.nom, 'claude-local'); assert.equal(e.cloud, true); assert.equal(e.local, true); assert.equal(e.dispo, true)
})

test('IA : cheminPngDepuisUrl extrait le chemin d’un /api/fichier?path=', () => {
  assert.equal(cheminPngDepuisUrl('/api/fichier?path=C%3A%5Cx%5Cp19.png'), 'C:\\x\\p19.png')
  assert.equal(cheminPngDepuisUrl('C:\\direct.png'), 'C:\\direct.png')
})

test('IA §14.6 : etatFournisseur — dispo selon la clé, sans jamais révéler la clé', () => {
  const local = etatFournisseur({})
  assert.equal(local.cloud, false); assert.equal(local.dispo, true) // mock : dispo, hors-ligne
  const sansCle = etatFournisseur({ LG_AI_PROVIDER: 'anthropic' })
  assert.equal(sansCle.cloud, true); assert.equal(sansCle.dispo, false) // clé absente
  const avecCle = etatFournisseur({ LG_AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-FACTICE' })
  assert.equal(avecCle.dispo, true)
  assert.equal(JSON.stringify(avecCle).includes('sk-FACTICE'), false) // la clé n'apparaît jamais
})

test('IA §14.6 : consentementActif — lié au fournisseur, révocable', () => {
  const rec = { fournisseur: 'anthropic', date: '2026-08-09', actif: true }
  assert.equal(consentementActif(rec, 'anthropic'), true)
  assert.equal(consentementActif(rec, 'openai'), false) // fournisseur changé → caduc
  assert.equal(consentementActif({ ...rec, actif: false }, 'anthropic'), false) // révoqué
  assert.equal(consentementActif(null, 'anthropic'), false)
})

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
