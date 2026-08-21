import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { creerCacheIA, empreinteImage, viderCacheIA } from '../src/ia/cache.mjs'
import { cleCache, appelerIA } from '../src/ia/fournisseur.mjs'

const dossier = () => mkdtempSync(join(tmpdir(), 'lg-cache-'))

test('le cache rend la réponse enregistrée, marquée comme resservie', () => {
  const c = creerCacheIA({ dir: dossier() })
  assert.equal(c.has('abc'), false)
  c.set('abc', { type: 'relecture_page', statut: 'candidat', abstention: false, corrections: [1] })
  assert.equal(c.has('abc'), true)
  const v = c.get('abc')
  assert.deepEqual(v.corrections, [1])
  assert.equal(v._cache, true)   // une réponse resservie ne passe pas pour un appel neuf
})

test('une ABSTENTION ou une ERREUR n’est jamais mise en cache (accidents rejouables)', () => {
  const c = creerCacheIA({ dir: dossier() })
  c.set('k1', { abstention: true, statut: 'candidat' })
  c.set('k2', { erreur: 'CLI introuvable', statut: 'candidat' })
  assert.equal(c.has('k1'), false)
  assert.equal(c.has('k2'), false)
})

test('cache désactivé : jamais de lecture ni d’écriture', () => {
  const c = creerCacheIA({ dir: dossier(), actif: false })
  c.set('abc', { statut: 'candidat', abstention: false, x: 1 })
  assert.equal(c.has('abc'), false)
  assert.equal(c.get('abc'), undefined)
})

test('la clé change dès que l’image, le texte, le prompt ou le modèle changent', () => {
  const base = { tache: 'page', sha256_image: 'AAA', prompt: 'P', version_prompt: 'v2', modele: 'opus' }
  const k = cleCache(base)
  assert.notEqual(k, cleCache({ ...base, sha256_image: 'BBB' })) // page retouchée
  assert.notEqual(k, cleCache({ ...base, prompt: 'P2' }))        // OCR corrigé → prompt différent
  assert.notEqual(k, cleCache({ ...base, version_prompt: 'v3' }))// prompt réécrit
  assert.notEqual(k, cleCache({ ...base, modele: 'sonnet' }))    // modèle changé
  assert.equal(k, cleCache({ ...base }))                         // identique → même clé
})

test('appelerIA sert le cache SANS appeler le fournisseur', async () => {
  const c = creerCacheIA({ dir: dossier() })
  let appels = 0
  const faux = { page: async () => { appels++; return { type: 'relecture_page', statut: 'candidat', abstention: false, corrections: [] } } }
  await appelerIA(faux, 'page', {}, { cache: c, cacheCle: 'K' })
  assert.equal(appels, 1)
  const b = await appelerIA(faux, 'page', {}, { cache: c, cacheCle: 'K' })
  assert.equal(appels, 1)          // second appel : aucune dépense
  assert.equal(b._cache, true)
})

test('empreinteImage suit le contenu du fichier, et vaut null s’il est illisible', () => {
  const d = dossier(), f = join(d, 'img.png')
  writeFileSync(f, 'AAA')
  const a = empreinteImage(f)
  writeFileSync(f, 'BBB')
  assert.notEqual(a, empreinteImage(f))
  assert.equal(empreinteImage(join(d, 'absent.png')), null)
})

test('viderCacheIA retire les entrées', () => {
  const d = dossier(), c = creerCacheIA({ dir: d })
  c.set('a1b2', { statut: 'candidat', abstention: false, x: 1 })
  const r = viderCacheIA(d)
  assert.equal(r.n, 1)
  assert.equal(c.has('a1b2'), false)
})
