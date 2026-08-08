import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parserMetadonnees, titreSansAuteur, typographieProbable } from '../src/metadonnees.mjs'

test('typographieProbable : date ancienne → ancien ; postérieure → moderne', () => {
  assert.equal(typographieProbable({ date_publication: '1636' }).ancien, true)
  assert.equal(typographieProbable({ date_publication: '1872' }).ancien, false)
})

test('typographieProbable : s long fréquent dans le CORPS (date en romain absente) → ancien', () => {
  // Ce que Tesseract sort d'un CORPS XVIIᵉ : le ſ minuscule ressort en « f » devant t/p/c…
  const corps = "il n'eft pas jufte que le refte s'eftablit ; c'eft ainfi que tout paffe"
  assert.equal(typographieProbable({ texteCorps: corps, date_publication: null }).ancien, true)
})

test('typographieProbable : corps propre, pas de date → moderne', () => {
  assert.equal(typographieProbable({ texteCorps: 'ceci est un texte moderne tout à fait normal et propre' }).ancien, false)
})

test('auteur : « Saint X » repéré dans le texte', () => {
  const m = parserMetadonnees({ pdfTitle: 'Œuvres de Saint Basile le Grand' })
  assert.equal(m.auteur, 'Saint Basile')
})

test('titre : la mention d’auteur est retirée du titre', () => {
  const m = parserMetadonnees({ pdfTitle: 'Œuvres de Saint Basile le Grand' })
  assert.equal(m.titre, 'Œuvres') // « de Saint Basile le Grand » écarté
})

test('titre : cas réel « … de saint Basile-le-Grand »', () => {
  const m = parserMetadonnees({ pdfTitle: 'Homélies, discours et lettres choisis de saint Basile-le-Grand' })
  assert.equal(m.titre, 'Homélies, discours et lettres choisis')
  assert.match(m.auteur, /^Saint Basile/)
})

test('titreSansAuteur : ne coupe pas un titre qui PARLE d’un saint', () => {
  // Auteur = Jean Chrysostome ; « sur saint Matthieu » fait partie du titre, à conserver.
  assert.equal(
    titreSansAuteur('Homélies sur saint Matthieu', 'Saint Jean Chrysostome'),
    'Homélies sur saint Matthieu',
  )
})

test('titre sans PDF-title : meilleure ligne OCR de la page de titre, auteur retiré', () => {
  const m = parserMetadonnees({ texteTitre: 'BIBLIOTHÈQUE CHOISIE\nLes Confessions de saint Augustin\nPARIS 1858' })
  assert.equal(m.auteur, 'Saint Augustin')
  assert.equal(m.titre, 'Les Confessions')
})

test('repli sur l’auteur du PDF si pas de « Saint … »', () => {
  const m = parserMetadonnees({ pdfTitle: 'Homélies diverses', pdfAuthor: 'Jean Chrysostome' })
  assert.equal(m.auteur, 'Jean Chrysostome')
})

test('traducteur → trad_auteur : « traduction … par … »', () => {
  const m = parserMetadonnees({ texteTitre: 'traduction nouvelle par M. l’abbé Auger, chanoine' })
  assert.equal(m.trad_auteur, 'M. l’abbé Auger')
})

test('langues : langue_originale (latin/grec) + langue_trad = français', () => {
  const m = parserMetadonnees({ texteTitre: 'texte latin en regard de la traduction française' })
  assert.equal(m.langue_originale, 'latin')
  assert.equal(m.langue_trad, 'français')
})

test('date_publication : millésime ancien (texte), pas la numérisation', () => {
  const m = parserMetadonnees({ texteTitre: 'PARIS, 1858. — Ouvrage numérisé en 2010', creationDate: '2010' })
  assert.equal(m.date_publication, '1858')
})

test('ville + éditeur : « PARIS. — LIBRAIRIE … »', () => {
  const m = parserMetadonnees({ texteTitre: 'PARIS. — LIBRAIRIE VICTOR PALMÉ\n1858' })
  assert.equal(m.ville, 'PARIS')
  assert.match(m.editeur, /LIBRAIRIE VICTOR PALMÉ/)
})
