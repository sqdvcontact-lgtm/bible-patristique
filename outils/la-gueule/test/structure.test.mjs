import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  annotationVide, ROLES, normaliserComparaison, similarite,
  detecterNumeroPage, detecterSignature, detecterLettrines, suggererNiveauTitre,
  detecterContinuations, classerBlancsPoesie, analyserBlocPoesie,
  detecterTitresCourants, detecterReclames, analyserVolume,
  annoterProjet, estHorsCorpsConfirme, extraireStructure,
} from '../src/structure.mjs'

test('§8 extraireStructure : annotations par page/ligne pour l’export JSON (classe CSS des blancs)', () => {
  const projet = { pages: { 19: { largeur: 1250, hauteur: 2050, lignes: [
    { bbox: [96, 400, 800, 55], dip: 'Un vers ici.', suggestion: { role_suggere: 'vers', blanc_poesie: 'petit', retrait_source_normalise: 0.0, statut: 'suggere' } },
    { bbox: [100, 500, 800, 55], dip: 'Sans suggestion.' },
  ] } } }
  const s = extraireStructure(projet)
  assert.equal(s['19'].length, 1) // seule la ligne annotée
  assert.equal(s['19'][0].role_suggere, 'vers')
  assert.equal(s['19'][0].classe_css, 'blanc-poesie-petit') // classe CSS, jamais de caractères ajoutés
})

test('§8 annoterProjet : attache la suggestion par ligne et préserve la confirmation humaine', () => {
  const projet = { pages: { 2: { largeur: 1250, hauteur: 2050, lignes: [
    L(600, 60, 60, 50, '2'), // n° de page centré en haut
    L(100, 400, 900, 55, 'Corps de la prose ordinaire ici présente.'),
  ] } } }
  annoterProjet(projet)
  assert.equal(projet.pages[2].lignes[0].suggestion.role_suggere, 'numero_page')
  assert.equal(projet.pages[2].lignes[0].suggestion.role_confirme, null)
  // décision humaine simulée → doit survivre à une nouvelle analyse
  projet.pages[2].lignes[0].suggestion.role_confirme = 'numero_page'
  annoterProjet(projet)
  assert.equal(projet.pages[2].lignes[0].suggestion.role_confirme, 'numero_page')
  assert.equal(projet.pages[2].lignes[0].suggestion.statut, 'confirme')
})

test('§8 estHorsCorpsConfirme : seul un rôle hors-corps CONFIRMÉ compte', () => {
  assert.equal(estHorsCorpsConfirme({ suggestion: { role_confirme: 'titre_courant' } }), true)
  assert.equal(estHorsCorpsConfirme({ suggestion: { role_suggere: 'titre_courant', role_confirme: null } }), false)
  assert.equal(estHorsCorpsConfirme({ suggestion: { role_confirme: 'corps' } }), false)
})

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

// ── §3/§4 poésie : continuations + blancs à 3 niveaux (tests d'acceptation §10) ──
// Poème réel de la page 19 (vers + deux continuations typographiques).
const POEME = [
  L(352, 1087, 669, 61, 'OY dont les premiers Vers n’ont parlé'),
  L(454, 1144, 194, 53, 'que de ioye,'),
  L(358, 1189, 660, 57, 'Ie ne puis éuiter les pleurs, où ie me noy'),
  L(357, 1241, 665, 56, 'Ie vois tous mes plaisirs changez par ma'),
  L(447, 1289, 145, 53, 'douleur,'),
  L(350, 1336, 672, 58, 'Et si i’escris des Vers, ie les dois au'),
  L(194, 1385, 163, 52, 'malheur;'),
  L(96, 1431, 879, 63, 'Les faueurs d’Appollon ne m’offrent que des'),
  L(97, 1484, 921, 57, 'Dans les eaux de mes yeux, mes graces sont'),
  L(101, 1580, 734, 56, 'Touchez de mes ennuys m’ont tousiours'),
  L(96, 1630, 755, 55, 'L’honneur dont autrefois il cherit mon'),
  L(94, 1680, 760, 56, 'Adoucit le chagrin, qui choque ma'),
  L(100, 1726, 869, 71, 'Quoy que tant de malheurs conduisent'),
]

test('§10 poésie p19 : « douleur, » et « malheur; » → continuation_typographique (blanc null)', () => {
  const cont = detecterContinuations(POEME)
  const d = cont.get(idx(POEME, 'douleur,'))
  const m = cont.get(idx(POEME, 'malheur;'))
  assert.equal(d?.role_suggere, 'continuation_typographique'); assert.equal(d.blanc_poesie, null)
  assert.equal(m?.role_suggere, 'continuation_typographique'); assert.equal(m.blanc_poesie, null)
  // « que de ioye, » (précédée d'un vers COMPLET « …parlé ») n'est PAS une continuation.
  assert.equal(cont.has(idx(POEME, 'que de ioye,')), false)
})

test('§10 poésie p19 : blancs petit/moyen/large aux bons vers', () => {
  const a = analyserBlocPoesie(POEME)
  assert.equal(a.get(idx(POEME, 'Les faueurs')).blanc_poesie, 'petit')   // x=96
  assert.equal(a.get(idx(POEME, 'Touchez')).blanc_poesie, 'petit')       // x=101
  assert.equal(a.get(idx(POEME, 'Ie ne puis')).blanc_poesie, 'moyen')    // x=358
  assert.equal(a.get(idx(POEME, 'Et si i’escris')).blanc_poesie, 'moyen')// x=350
  assert.equal(a.get(idx(POEME, 'que de ioye,')).blanc_poesie, 'large')  // x=454 (amas isolé, faible confiance)
  // les continuations n'ont pas de niveau de blanc
  assert.equal(a.get(idx(POEME, 'douleur,')).blanc_poesie, null)
  assert.equal(a.get(idx(POEME, 'malheur;')).blanc_poesie, null)
})

test('§4 blancs : jamais de seuil px codé en dur — calcul par bloc (retrait normalisé)', () => {
  // Le même poème décalé de +500 px en x doit donner les MÊMES classes (aucune constante absolue).
  const decale = POEME.map((l) => L(l.bbox[0] + 500, l.bbox[1], l.bbox[2], l.bbox[3], l.dip))
  const a = analyserBlocPoesie(decale)
  assert.equal(a.get(idx(decale, 'Les faueurs')).blanc_poesie, 'petit')
  assert.equal(a.get(idx(decale, 'Ie ne puis')).blanc_poesie, 'moyen')
  assert.equal(a.get(idx(decale, 'que de ioye,')).blanc_poesie, 'large')
})

// ── §6 titres courants par répétition (parité) ───────────────────────────────
test('§6 : titre courant répété (même parité) → titre_courant ; tête unique → non', () => {
  const tete = (t) => ({ largeur: 1250, hauteur: 2050, lignes: [L(238, 38, 631, 69, t), L(100, 350, 900, 55, 'Corps de la page qui remplit la mesure ordinaire ici.')] })
  const pages = [
    { num: 2, ...tete('de la Philosophie. Liure V.') },
    { num: 4, ...tete('de la Philoſophie. Liure V.') }, // variante ſ
    { num: 6, ...tete('de la Philosophie. Liure V.') },
    { num: 8, ...tete('de la Philosophie. Liure V.') },
    { num: 3, ...tete('DISCOURS PARTICVLIER ET VNIQVE') }, // tête unique
  ]
  const m = detecterTitresCourants(pages)
  assert.equal(m.get(2)?.get(0)?.role_suggere, 'titre_courant')
  assert.equal(m.get(6)?.get(0)?.role_suggere, 'titre_courant')
  assert.equal(m.get(2).get(0).export_corps, false)
  assert.ok(!m.get(3) || !m.get(3).get(0)) // la tête unique n'est pas un titre courant
})

// ── §7 réclames (mot en bas repris au début de la page suivante) ─────────────
test('§7 : réclame si le mot du bas est repris au début de la page suivante ; sinon non', () => {
  const avecReclame = [
    { num: 1, largeur: 1250, hauteur: 2050, lignes: [L(100, 300, 800, 55, 'corps de la page une ici.'), L(900, 1850, 130, 50, 'Toutefois')] },
    { num: 2, largeur: 1250, hauteur: 2050, lignes: [L(238, 38, 631, 69, 'de la Philosophie. Liure V.'), L(100, 350, 900, 55, 'Toutefois les bien-faits de sa douce bonté')] },
  ]
  const m = detecterReclames(avecReclame)
  assert.equal(m.get(1)?.get(1)?.role_suggere, 'reclame')

  const sansReclame = [
    { num: 1, largeur: 1250, hauteur: 2050, lignes: [L(100, 300, 800, 55, 'corps.'), L(900, 1850, 130, 50, 'Toutefois')] },
    { num: 2, largeur: 1250, hauteur: 2050, lignes: [L(100, 350, 900, 55, 'Autre chose sans rapport aucun ici.')] },
  ]
  assert.ok(!detecterReclames(sansReclame).get(1)) // aucun report → pas de réclame
})

// ── §9 orchestration : composition de toutes les suggestions sur la page 19 ───
test('§9 analyserVolume p19 : chaque ligne reçoit la bonne suggestion composée', () => {
  const anns = analyserVolume([{ num: 19, ...P19 }]).get(19)
  const a = (p) => anns[idx(P19.lignes, p)]
  assert.equal(a('8').role_suggere, 'numero_page')
  assert.equal(a('POESIE I.').role_suggere, 'titre'); assert.equal(a('POESIE I.').niveau_suggere, 2)
  assert.equal(a('OY dont').role_suggere, 'lettrine_candidate')
  assert.equal(a('OY dont').blanc_poesie, 'moyen')          // lettrine ET vers
  assert.equal(a('Les faueurs').role_suggere, 'vers'); assert.equal(a('Les faueurs').blanc_poesie, 'petit')
  assert.equal(a('que de ioye,').blanc_poesie, 'large')
  assert.equal(a('douleur,').role_suggere, 'continuation_typographique')
  assert.equal(a('B').role_suggere, 'signature'); assert.equal(a('B').export_corps, false)
  assert.equal(a('2').role_suggere, 'signature')
})

test('§10 : « de la Philosophie. Liure I. » (titre courant, ligne longue) → AUCUNE suggestion', () => {
  const page = { largeur: 1250, hauteur: 2034, lignes: [
    L(238, 38, 631, 69, 'de la Philosophie. Liure I.'),
    L(96, 200, 940, 55, 'Texte courant de la prose qui remplit la mesure ordinaire ici.'),
  ] }
  // ligne longue ET ne commence pas par LIVRE → pas de niveau (et hors-corps traité avant en amont)
  assert.equal(suggererNiveauTitre(page.lignes[0], page, { lignes: page.lignes }), null)
})
