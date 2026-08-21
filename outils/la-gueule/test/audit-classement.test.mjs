import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ligneCharabia, pageIgnorable, interventionsDepuisRelecture } from '../src/ia/controle.mjs'
import { reparerDerives } from '../src/typographie.mjs'
import { libelleRole } from '../src/comparaison.mjs'

// Audit du 2026-08-10 sur 35 pages réelles : la règle du charabia comptait les jetons « ultra-
// courts », c'est-à-dire les MOTS-OUTILS français — elle condamnait donc le français ordinaire.
test('② le français ordinaire n’est PLUS pris pour un ornement', () => {
  for (const t of [
    'la coagmentation du Ciel & de la terre',   // signalé par l'utilisateur
    'LA NATIVITÉ DE',                            // page de titre
    'M. DC. IV.',                                // la date, déjà protégée par le prompt
    'LA NAISSANCE DE N. S. 21',                  // titre courant
    'A LA TRES-SAINCTE',                         // dédicace
    'Esa.40.',                                   // manchette
    'de la ville, & du',
  ]) assert.equal(ligneCharabia(t), null, 'ne doit pas être du charabia : ' + t)
})

test('② le vrai charabia reste détecté', () => {
  assert.ok(ligneCharabia('Cocc oc sc coc oiccccccscsc'))   // répétition
  assert.ok(ligneCharabia('xz bd fgh kl mn'))               // fragments sans voyelle
  assert.ok(ligneCharabia('qrstvw'))                        // suite de consonnes
})

test('① une page d’avertissement de numériseur est reconnue (elle ne l’était jamais)', () => {
  const page = [
    { dip: 'Coogle' }, { dip: 'A propos de ce livre' },
    { dip: 'Ceci est une copie numérique d’un ouvrage conservé depuis des générations' },
    { dip: 'précaution par Google dans le cadre d’un projet visant à permettre' },
    { dip: 'Ce livre étant relativement ancien, il n’est plus protégé' },
    { dip: 'appartenir au domaine public signifie que le livre en question' },
    { dip: 'Consignes d’utilisation' },
  ]
  assert.match(String(pageIgnorable(page)), /numériseur/)
})

test('① une page d’œuvre n’est PAS prise pour un avertissement', () => {
  const page = Array.from({ length: 12 }, (_, k) => ({ dip: 'ligne de prose ordinaire numéro ' + k }))
  assert.equal(pageIgnorable(page), null)
})

// ⑥ Dérives mesurées sur la passe réelle : 6 virgules changées en point devant une minuscule,
// 2 espaces insérées avant un point, 6 césures ¬ perdues, 4 apostrophes dégradées.
test('⑥ la césure ¬ est rétablie (sinon le mot est coupé à l’export)', () => {
  const r = reparerDerives('amollistons point par vn vestement mi¬', 'amollissons point par vn vestement mi-')
  assert.match(r.texte, /mi¬$/)
  assert.ok(r.reparees.some((x) => /césure/.test(x)))
})

test('⑥ l’apostrophe typographique est rétablie (charte §3.2)', () => {
  const r = reparerDerives('n’ayons esgard a ce qui est', "n'ayons esgard à ce qui est")
  assert.match(r.texte, /n’ayons/)
  assert.match(r.texte, /à ce qui est/)   // la correction utile est conservée
})

test('⑥ l’espace avant un point est retirée, la virgule rétablie', () => {
  const r = reparerDerives('ptement auec luy, c’est vne belle chose', 'ptement auec luy . c’est vne belle chose')
  assert.equal(r.texte, 'ptement auec luy, c’est vne belle chose')
})

test('⑥ un point LÉGITIME n’est pas touché', () => {
  const r = reparerDerives('fin de phrase. Et une autre', 'fin de phrase. Et une autre')
  assert.equal(r.texte, 'fin de phrase. Et une autre')
  assert.deepEqual(r.reparees, [])
})

test('⑥ une proposition redressée passe en « incertaine » (elle repasse sous les yeux)', () => {
  const lignes = [{ dip: 'vn vestement mi¬' }]
  const sortie = { corrections: [{ i: 0, texte_corrige: 'vn vestement mi-', certitude: 'certaine' }] }
  const out = interventionsDepuisRelecture(sortie, { page: 1, lignes })
  assert.equal(out.length, 0) // « mi- » redressé en « mi¬ » = identique à l'OCR → plus de correction
})

test('④ « signature » ne s’affiche plus : c’est une marque de cahier', () => {
  assert.equal(libelleRole('signature'), 'marque de cahier')
  assert.equal(libelleRole('numero_page'), 'numéro de page')
  assert.equal(libelleRole('note_marginale'), 'note en marge')
})
