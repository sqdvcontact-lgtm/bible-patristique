// SUITE D'INTÉGRATION — teste le RUNTIME réel (serveur HTTP, WSL, moteurs, exports),
// pas seulement des fonctions pures. Lancement : `npm run test:integration`.
//
// Classification honnête :
//   - réussi  : l'assertion passe ;
//   - échoué  : l'assertion échoue (le test est rouge) ;
//   - NON EXÉCUTÉ : une dépendance (WSL, kraken, tesseract, poppler) manque → le test est
//     SAUTÉ avec la cause exacte (jamais déclaré réussi artificiellement).
//
// Fixtures réelles et reproductibles : test/integration/fixtures/ (+ MANIFEST.json, SHA-256).

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, writeFile, mkdir, rm, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { demarrer } from '../src/serve.mjs'

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = join(ICI, '..')
const FIXT = join(ICI, 'fixtures')
const PDF_FIXT = join(FIXT, 'boece-p143.pdf')
const PORT = 4771 // port dédié aux tests (évite l'instance de dev sur 4599)
const NOM = '__itest__' // préfixe des artefacts de test (nettoyés à la fin)

// ── Détection des dépendances AU MOMENT DU TEST (WSL réchauffé) ──────────────
// Détecter au chargement du module est trompeur : un WSL FROID peut se déclarer absent.
// On réchauffe puis on sonde une fois, en cache. Chaque test WSL saute avec CAUSE exacte.
const wsl = (script) => spawnSync('wsl.exe', ['-e', 'bash', '-c', script], { encoding: 'utf8' })
let _tools = null
function outils() {
  if (_tools) return _tools
  wsl('true') // réchauffe la distribution (démarrage à froid)
  const ok = wsl('true').status === 0
  _tools = {
    wsl: ok,
    tesseract: ok && wsl('command -v tesseract >/dev/null').status === 0,
    kraken: ok && wsl('command -v kraken >/dev/null').status === 0,
    poppler: ok && wsl('command -v pdftoppm >/dev/null').status === 0,
  }
  return _tools
}
const causeWsl = () => outils().wsl ? null : 'WSL indisponible'
const causeTess = () => { const t = outils(); return !t.wsl ? 'WSL indisponible' : !t.tesseract ? 'tesseract absent' : !t.poppler ? 'poppler absent' : null }
const causeKraken = () => { const t = outils(); return !t.wsl ? 'WSL indisponible' : !t.kraken ? 'kraken absent' : !t.poppler ? 'poppler absent' : null }

// ── Serveur de test ─────────────────────────────────────────────────────────
let serveur, base
before(async () => {
  const r = await demarrer({ port: PORT })
  serveur = r.serveur
  assert.ok(serveur, `port ${PORT} déjà pris — impossible d'isoler le serveur de test`)
  base = `http://127.0.0.1:${PORT}`
})
after(async () => {
  serveur?.close()
  // Nettoyage des artefacts de test.
  await rm(join(RACINE, 'projets', NOM + '.json'), { force: true }).catch(() => {})
  for (const suf of ['.segments.json', '.docx', '.supabase.sql', '.txt', '.md']) await rm(join(RACINE, 'exports', NOM + suf), { force: true }).catch(() => {})
  await rm(join(RACINE, 'exports', NOM + '-xml'), { recursive: true, force: true }).catch(() => {})
  await rm(join(RACINE, 'exports', 'entrainement', NOM), { recursive: true, force: true }).catch(() => {})
})

const jget = async (p) => { const r = await fetch(base + p); return { code: r.status, corps: await r.json().catch(() => null) } }
const jpost = async (p, body) => { const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { code: r.status, corps: await r.json().catch(() => null) } }

// Projet fixture EN MÉMOIRE : une page « terminée » avec une correction humaine, une page en erreur.
const projetFixture = () => ({
  kind: 'imprime', chemin: PDF_FIXT, page: 1, total: 2,
  meta: { auteur: 'Boèce', titre: 'La Consolation de la philosophie', trad_auteur: 'Ceriziers' },
  pages: {
    1: {
      pngUrl: '/api/fichier?path=' + encodeURIComponent(PDF_FIXT), largeur: 1000, hauteur: 1400,
      etat: 'termine', ocr: { moteur: 'tesseract', langue: 'fra', dpi: 300, page: 1 },
      lignes: [
        { bbox: [100, 200, 400, 40], ocr0: 'de le Philefophie', dip: 'de la Philosophie', texte: 'de la Philosophie', confiance: 0.7, titre: { niveau: 1, texte: 'de la Philosophie' } },
        { bbox: [100, 250, 400, 40], ocr0: 'Ornere', dip: 'Homère parle du Soleil', texte: 'Homère parle du Soleil', confiance: 0.6 },
      ],
    },
    2: { etat: 'erreur', erreur: 'OCR imprimé ancien (page 2) : timeout' },
  },
})

// ── TIER 1 : sans WSL (toujours exécutés) ───────────────────────────────────

test('serveur : page d’accueil servie (HTTP 200 HTML)', async () => {
  const r = await fetch(base + '/')
  assert.equal(r.status, 200)
  assert.match(await r.text(), /<!doctype html>/i)
})

test('serveur : lié à 127.0.0.1 seulement (non exposé au réseau)', () => {
  assert.equal(serveur.address().address, '127.0.0.1')
})

test('/api/doctor répond en JSON', async () => {
  const { code, corps } = await jget('/api/doctor')
  assert.equal(code, 200)
  assert.equal(typeof corps, 'object')
})

test('persistance : save → load conserve corrections humaines et états de page', async () => {
  const projet = projetFixture()
  const s = await jpost('/api/projet/save', { nom: NOM, projet })
  assert.equal(s.code, 200); assert.ok(s.corps.ok)
  const l = await jget('/api/projet/load?nom=' + NOM)
  assert.equal(l.code, 200)
  const p = l.corps.projet
  assert.equal(p.pages['1'].lignes[0].dip, 'de la Philosophie') // correction conservée
  assert.equal(p.pages['1'].lignes[0].ocr0, 'de le Philefophie') // OCR original conservé
  assert.equal(p.pages['1'].etat, 'termine')
  assert.equal(p.pages['2'].etat, 'erreur') // état d'erreur conservé → relance possible
  assert.match(p.pages['2'].erreur, /timeout/)
})

test('export quintuple : JSON + DOCX + SQL + TXT + Markdown produits', async () => {
  const { code, corps } = await jpost('/api/export', { nom: NOM, projet: projetFixture(), id_oeuvre: 'ITEST0001' })
  assert.equal(code, 200)
  const f = corps.fichiers
  for (const k of ['json', 'docx', 'sql', 'txt', 'md']) assert.ok(f[k], `chemin ${k} manquant`)
  assert.match(await readFile(f.docx).then((b) => b.toString('latin1', 0, 2)), /PK/) // DOCX = ZIP
  assert.match(await readFile(f.sql, 'utf8'), /insert into public\.segments/)
  assert.match(await readFile(f.md, 'utf8'), /## de la Philosophie/) // titre ref_niv1 (structure)
  assert.match(await readFile(f.txt, 'utf8'), /Homère parle du Soleil/)
})

test('export ALTO v4 + PAGE XML : fichiers bien formés', async () => {
  const { code, corps } = await jpost('/api/export/xml', { nom: NOM, projet: projetFixture(), couche: 'dip' })
  assert.equal(code, 200)
  assert.ok(corps.nbPages >= 1)
  const dir = corps.dossier
  const fichiers = await readdir(dir)
  const alto = await readFile(join(dir, fichiers.find((x) => x.endsWith('.alto.xml'))), 'utf8')
  const page = await readFile(join(dir, fichiers.find((x) => x.endsWith('.page.xml'))), 'utf8')
  assert.match(alto, /alto\/ns-v4#/)
  assert.match(page, /pagecontent\/2019-07-15/)
  assert.match(page, /<Unicode>de la Philosophie<\/Unicode>/)
})

test('doctrine : aucun code ne parle à une base active (pas de client SQL/DB dans src/)', async () => {
  const fichiers = await readdir(join(RACINE, 'src'))
  const suspects = /@supabase|createClient\s*\(|from ['"]pg['"]|require\(['"]pg['"]\)|mysql|mongodb|\.execute\(|pg\.Pool/
  const coupables = []
  for (const f of fichiers) {
    const src = await readFile(join(RACINE, 'src', f), 'utf8')
    if (suspects.test(src)) coupables.push(f)
  }
  assert.deepEqual(coupables, []) // le SQL est CONSTRUIT en chaîne (candidat), jamais EXÉCUTÉ
})

// ── TIER 2 : WSL / moteurs (sautés avec cause si absents) ────────────────────

test('Node → WSL : runBash exécute un script bash', async (t) => {
  const c = causeWsl(); if (c) return t.skip(c)
  const { runBash } = await import('../src/wsl.mjs')
  const r = await runBash('echo integration-ok')
  assert.equal(r.ok, true)
  assert.match(r.stdout, /integration-ok/)
})

// Mémoïse l'OCR Kraken (coûteux) pour le réutiliser (export entraînement).
let ocrKrakenMemo = null
const ocrFixture = async (moteur) => jpost('/api/atelier/ocr', { kind: 'imprime', pdfWin: PDF_FIXT, page: 1, dpi: 300, lang: 'fra', moteur })

test('OCR Tesseract fra : une vraie page produit des lignes', async (t) => {
  const c = causeTess(); if (c) return t.skip(c)
  const { code, corps } = await ocrFixture(undefined)
  assert.equal(code, 200)
  assert.ok(Array.isArray(corps.lignes) && corps.lignes.length > 0, 'aucune ligne')
  assert.equal(corps.ocr.moteur, 'tesseract')
})

test('OCR Kraken CATMuS-Print : une vraie page, et le ſ est lu correctement', async (t) => {
  const c = causeKraken(); if (c) return t.skip(c)
  const { code, corps } = await ocrFixture('kraken-print')
  assert.equal(code, 200)
  assert.ok(Array.isArray(corps.lignes) && corps.lignes.length > 0, 'aucune ligne')
  ocrKrakenMemo = corps
  const texte = corps.lignes.map((l) => l.texte).join(' ')
  // Preuve concrète : Kraken lit « Philosophie » (ſ→s), là où Tesseract lit « Philofophie ».
  assert.match(texte, /Philosophie/i)
})

test('repli GPU → CPU : présent dans le pipeline Kraken (le forçage réel n’est pas automatisable)', async () => {
  const src = await readFile(join(RACINE, 'src', 'wsl.mjs'), 'utf8')
  assert.match(src, /-d cuda:0/) // tentative GPU
  assert.match(src, /\|\| kraken -a/) // repli CPU si le GPU échoue
})

test('arrêt d’une tâche : /api/atelier/stop répond avec un compteur', async () => {
  const { code, corps } = await jpost('/api/atelier/stop', {})
  assert.equal(code, 200)
  assert.equal(typeof corps.arretes, 'number')
})

test('dossiers temporaires : aucun /tmp/lg.* résiduel après OCR', async (t) => {
  const c = causeWsl(); if (c) return t.skip(c)
  // (un OCR a normalement tourné avant ; sinon on en lance un léger via tesseract)
  if (!ocrKrakenMemo && !causeTess()) await ocrFixture(undefined)
  const r = wsl('ls -d /tmp/lg.* 2>/dev/null | wc -l')
  assert.equal(r.stdout.trim(), '0', 'des dossiers temporaires /tmp/lg.* subsistent')
})

test('export entraînement : une page validée avec image réelle → ALTO + manifeste', async (t) => {
  const c = causeKraken(); if (c) return t.skip(c)
  const oc = ocrKrakenMemo || (await ocrFixture('kraken-print')).corps
  // Construit un projet d'UNE page validée, avec une correction humaine simulée (test technique).
  const lignes = oc.lignes.map((l, i) => ({ ...l, ocr0: l.texte, dip: i === 0 ? l.texte + ' [corr]' : l.texte }))
  const projet = { kind: 'imprime', chemin: PDF_FIXT, meta: { titre: 'Fixture' },
    pages: { 1: { pngUrl: oc.pngUrl, largeur: oc.largeur, hauteur: oc.hauteur, ocr: oc.ocr, valide: true, lignes } } }
  const { code, corps } = await jpost('/api/export/entrainement', { nom: NOM, projet })
  assert.equal(code, 200)
  assert.ok(corps.nbPages >= 1, 'aucune page exportée')
  const dir = corps.dossier
  const fichiers = await readdir(dir)
  assert.ok(fichiers.some((f) => f.endsWith('.alto.xml')), 'ALTO manquant')
  assert.ok(fichiers.includes('manifeste.jsonl'), 'manifeste manquant')
})
