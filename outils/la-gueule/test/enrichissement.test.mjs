import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parserEnv, normaliser, jetonsAuteur, choisirAuteur, choisirOeuvre, langueDeTitre } from '../src/ia/enrichissement.mjs'

test('enrichissement : langueDeTitre — script grec → grec ; latin/français → null', () => {
  assert.equal(langueDeTitre('Ὁμιλίαι θʹ εἰς τὴν Ἑξαήμερον'), 'grec')
  assert.equal(langueDeTitre('De consolatione philosophiae'), null)
  assert.equal(langueDeTitre(''), null)
})

test('enrichissement : parserEnv — KEY=VALUE, commentaires et guillemets', () => {
  const e = parserEnv('# commentaire\nNEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co\nSUPABASE_SERVICE_ROLE_KEY="sk-abc"\n\nVIDE=')
  assert.equal(e.NEXT_PUBLIC_SUPABASE_URL, 'https://x.supabase.co')
  assert.equal(e.SUPABASE_SERVICE_ROLE_KEY, 'sk-abc') // guillemets retirés
  assert.equal(e.VIDE, '')
})

test('enrichissement : normaliser — minuscules, sans accents ni ponctuation', () => {
  assert.equal(normaliser('La Consolation de la Philosophie.'), 'la consolation de la philosophie')
  assert.equal(normaliser('Boèce'), 'boece')
})

test('enrichissement : jetonsAuteur — retire titres et particules', () => {
  assert.deepEqual(jetonsAuteur('le P. de Ceriziers'), ['ceriziers'])
  assert.deepEqual(jetonsAuteur('saint Basile le Grand'), ['basile', 'grand'])
  assert.deepEqual(jetonsAuteur('Boèce'), ['boece'])
})

test('enrichissement : choisirAuteur — meilleur chevauchement sur nom / nom_original', () => {
  const lignes = [
    { id_auteur: 'A0064', nom: 'Boèce', nom_original: 'Anicius Manlius Severinus Boethius' },
    { id_auteur: 'A0001', nom: 'Basile de Césarée', nom_original: null },
  ]
  assert.equal(choisirAuteur(lignes, 'Boèce').id_auteur, 'A0064')
  assert.equal(choisirAuteur(lignes, 'saint Basile').id_auteur, 'A0001')
  assert.equal(choisirAuteur(lignes, 'Augustin'), null) // aucun jeton commun → pas de faux positif
})

test('enrichissement : choisirOeuvre — match sur jetons longs du titre', () => {
  const lignes = [
    { titre: 'La Consolation de la philosophie', titre_original: 'De consolatione philosophiae' },
    { titre: 'Les Confessions', titre_original: 'Confessiones' },
  ]
  assert.equal(choisirOeuvre(lignes, 'La Consolation de la philosophie').titre_original, 'De consolatione philosophiae')
  assert.equal(choisirOeuvre(lignes, 'Homélies sur l’Hexaéméron'), null) // rien de commun → null
})
