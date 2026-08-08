import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  annotationVide, ROLES, normaliserComparaison, similarite,
  detecterNumeroPage, detecterSignature, detecterLettrines, suggererNiveauTitre,
} from '../src/structure.mjs'

const L = (x, y, w, h, t) => ({ bbox: [x, y, w, h], dip: t })
const idx = (lignes, prefixe) => lignes.findIndex((l) => (l.dip || '').startsWith(prefixe))

// Données RÉELLES (coordonnées exactes) — Boèce Ceriziers 1646.
const P19 = { largeur: 1250, hauteur: 2034, lignes: [
  L(348, 159, 9, 36, '8'),
  L(264, 832, 571, 70, 'LIVRE PREMIER.'),
  L(361, 978, 381, 62, 'POESIE I.'),
  L(352, 1087, 669, 61, 'OY dont les premiers Vers n’ont parlé'),
  L(454, 1144, 194, 53, 'que de ioye,'),
  L(358, 1189, 660, 57, 'Ie ne puis éuiter les pleurs, où ie me noy'),
  L(357, 1241, 665, 56, 'Ie vois tous mes plaisirs changez par ma'),
  L(447, 1289, 145, 53, 'douleur,'),
  L(350, 1336, 672, 58, 'Et si i’escris des Vers, ie les dois au'),
  L(194, 1385, 163, 52, 'malheur;'),
  L(96, 1431, 879, 63, 'Les faueurs d’Appollon ne m’offrent que des'),
  L(97, 1484, 921, 57, 'Dans les eaux de mes yeux, mes graces sont'),
  L(96, 1630, 755, 55, 'L’honneur dont autrefois il cherit mon enfan'),
  L(100, 1726, 869, 71, 'Quoy que tant de malheurs conduisent à gran'),
  L(700, 1780, 31, 59, 'B'),
  L(785, 1792, 14, 45, '2'),
] }

const P22 = { largeur: 1250, hauteur: 2021, lignes: [
  L(479, 602, 435, 63, 'II. POESIE.'),
  L(327, 703, 499, 58, 'E! Dieu que cette pure flame,'),
  L(230, 752, 686, 62, 'TI Qui brilloit au fond de nostre Ame:'),
  L(229, 802, 481, 56, 'Se couure d’vne espaisse nuit,'),
  L(230, 851, 479, 58, 'Depuis qu’vne morne tristesse'),
] }

const P143 = { largeur: 1250, hauteur: 2050, lignes: [
  L(357, 158, 428, 69, 'II. POESIE.'),
  L(190, 253, 408, 53, 'Omere nomme le Soleil,'),
  L(97, 306, 545, 51, 'LI Le Createur de la lumiere,'),
  L(97, 357, 522, 53, 'Le tout voyant, le nompareil,'),
  L(956, 55, 66, 69, '141'),
] }

// ── §1 modèle commun ─────────────────────────────────────────────────────────
test('annotationVide : forme + rôles', () => {
  const a = annotationVide()
  assert.equal(a.statut, 'suggere'); assert.equal(a.role_confirme, null); assert.equal(a.export_corps, true)
  for (const r of ['corps', 'titre', 'vers', 'continuation_typographique', 'titre_courant', 'numero_page', 'signature', 'reclame', 'paratexte_titre', 'ornement', 'bruit', 'indetermine']) assert.ok(ROLES.includes(r))
})

// ── §6 normalisation ─────────────────────────────────────────────────────────
test('normaliserComparaison : ſ→s, minuscules, ponctuation retirée (comparaison SEULEMENT)', () => {
  assert.equal(normaliserComparaison('de la Philoſophie. Liure V.'), 'de la philosophie liure v')
  assert.ok(similarite('de la Philoſophie. Liure V.', 'de la Philosophie. Livre V') > 0.85)
})

// ── §4 lettrines / artefacts (tests d'acceptation §10) ───────────────────────
test('§10 p19 : « OY dont… » → lettrine_candidate, AUCUNE insertion de M, interdit_entrainement', () => {
  const m = detecterLettrines(P19.lignes)
  const i = idx(P19.lignes, 'OY dont')
  const a = m.get(i)
  assert.ok(a, 'ligne non annotée'); assert.equal(a.role_suggere, 'lettrine_candidate')
  assert.equal(a.interdit_entrainement, true)
  assert.equal(P19.lignes[i].dip, 'OY dont les premiers Vers n’ont parlé') // texte source INCHANGÉ (pas de « Moy »)
})

test('§10 p22 : « E! Dieu… » lettrine_candidate ; « TI Qui… » artefact_candidate', () => {
  const m = detecterLettrines(P22.lignes)
  assert.equal(m.get(idx(P22.lignes, 'E! Dieu'))?.role_suggere, 'lettrine_candidate')
  assert.equal(m.get(idx(P22.lignes, 'TI Qui'))?.role_suggere, 'artefact_candidate')
})

test('§10 p143 : « LI Le Createur… » artefact_candidate ; « 141 » numero_page (exclu à part)', () => {
  const m = detecterLettrines(P143.lignes)
  assert.equal(m.get(idx(P143.lignes, 'LI Le Createur'))?.role_suggere, 'artefact_candidate')
  const n = detecterNumeroPage(P143.lignes[idx(P143.lignes, '141')], P143)
  assert.ok(n); assert.equal(n.role_suggere, 'numero_page'); assert.equal(n.export_corps, false)
})

// ── §7 signatures (test d'acceptation §10 : B et 2) ──────────────────────────
test('§10 p19 : « B » et « 2 » → signature_candidate (hors corps)', () => {
  const b = detecterSignature(P19.lignes[idx(P19.lignes, 'B')], P19, { lignes: P19.lignes })
  const d = detecterSignature(P19.lignes[idx(P19.lignes, '2')], P19, { lignes: P19.lignes })
  assert.equal(b?.role_suggere, 'signature'); assert.equal(b.export_corps, false)
  assert.equal(d?.role_suggere, 'signature')
})

// ── §8 suggestions de niveaux de titre (tests d'acceptation §10) ─────────────
test('§10 : « POESIE I. » → suggestion T2 (vrai titre)', () => {
  const a = suggererNiveauTitre(P19.lignes[idx(P19.lignes, 'POESIE I.')], P19, { lignes: P19.lignes })
  assert.ok(a); assert.equal(a.role_suggere, 'titre'); assert.equal(a.niveau_suggere, 2)
})

test('§10 : « II. POESIE. » (numéral avant) → suggestion T2', () => {
  const a = suggererNiveauTitre(P22.lignes[idx(P22.lignes, 'II. POESIE.')], P22, { lignes: P22.lignes })
  assert.equal(a?.niveau_suggere, 2)
})

test('§10 : « LIVRE I. » (vrai titre, ligne courte) → suggestion T1', () => {
  const page = { largeur: 1250, hauteur: 2034, lignes: [
    L(500, 300, 200, 60, 'LIVRE I.'),
    L(96, 400, 940, 55, 'Texte courant de la prose qui remplit la mesure ordinaire.'),
    L(96, 455, 930, 55, 'et se poursuit sur plusieurs lignes bien pleines ici.'),
  ] }
  const a = suggererNiveauTitre(page.lignes[0], page, { lignes: page.lignes })
  assert.ok(a); assert.equal(a.niveau_suggere, 1)
})

test('§10 : « de la Philosophie. Liure I. » (titre courant, ligne longue) → AUCUNE suggestion', () => {
  const page = { largeur: 1250, hauteur: 2034, lignes: [
    L(238, 38, 631, 69, 'de la Philosophie. Liure I.'),
    L(96, 200, 940, 55, 'Texte courant de la prose qui remplit la mesure ordinaire ici.'),
  ] }
  // ligne longue ET ne commence pas par LIVRE → pas de niveau (et hors-corps traité avant en amont)
  assert.equal(suggererNiveauTitre(page.lignes[0], page, { lignes: page.lignes }), null)
})
