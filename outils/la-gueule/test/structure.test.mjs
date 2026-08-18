import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  annotationVide, ROLES, normaliserComparaison, similarite,
  detecterNumeroPage, detecterSignature, detecterLettrines, suggererNiveauTitre,
  detecterContinuations, classerBlancsPoesie, analyserBlocPoesie,
  detecterTitresCourants, detecterReclames, analyserVolume,
  annoterProjet, estHorsCorpsConfirme, extraireStructure, detecterFiligrane,
  corrigerLettrine, integrerInitiale,
} from '../src/structure.mjs'

// ── Passe 3 Q1 : provenance des corrections de lettrine ──
test('Q1 : « oy » + validation humaine « M » → « Moy », omission_ocr, aucune marque publique', () => {
  const a = corrigerLettrine({ texte_ocr: '', texte_valide: 'M', visible_dans_source: true, crop_contient_lettrine: true })
  assert.equal(a.type_correction, 'omission_ocr')
  assert.equal(a.restitution_editoriale, false)
  assert.equal(a.afficher_marque_critique, false)
  assert.equal(a.interdit_entrainement, undefined) // crop montre la lettrine → éligible
  assert.equal(integrerInitiale('oy', a.texte_valide), 'Moy') // sans crochets
})

test('Q1 : « Euripe » + « L’ » → « L’Euripe », omission_ocr', () => {
  const a = corrigerLettrine({ texte_valide: 'L’', visible_dans_source: true, crop_contient_lettrine: true })
  assert.equal(a.type_correction, 'omission_ocr')
  assert.equal(integrerInitiale('Euripe', a.texte_valide), 'L’Euripe')
})

test('Q1 : crop sans lettrine → interdit_entrainement = true (omission mais non éligible)', () => {
  const a = corrigerLettrine({ texte_valide: 'M', visible_dans_source: true, crop_contient_lettrine: false })
  assert.equal(a.type_correction, 'omission_ocr')
  assert.equal(a.interdit_entrainement, true)
})

test('Q1 : caractère conjecturé sans lecture image → restitution_editoriale + interdit_entrainement', () => {
  const a = corrigerLettrine({ texte_valide: 'M', visible_dans_source: false })
  assert.equal(a.type_correction, 'restitution_editoriale')
  assert.equal(a.restitution_editoriale, true)
  assert.equal(a.afficher_marque_critique, true)
  assert.equal(a.interdit_entrainement, true)
  assert.equal(a.origine_lecture, 'conjecture')
})

test('Q1 : aucune lettre n’est proposée automatiquement (texte_valide = saisie humaine seule)', () => {
  const a = corrigerLettrine({ texte_valide: '', visible_dans_source: true })
  assert.equal(a.texte_valide, '') // rien n'est inventé à partir du sens du mot
})

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
  // §3.1 : un folio n'est confirmé que par cohérence multi-pages (séquence 2-3-4, même position).
  const page = (n) => ({ largeur: 1250, hauteur: 2050, lignes: [
    L(600, 60, 60, 50, String(n)), // n° de page centré en haut
    L(100, 400, 900, 55, 'Corps de la prose ordinaire ici présente.'),
  ] })
  const projet = { pages: { 2: page(2), 3: page(3), 4: page(4) } }
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

// ── §6.2 région de titre (page de titre p19, données réelles) ────────────────
const P19FULL = { num: 19, largeur: 1250, hauteur: 2034, lignes: [
  L(188, 141, 69, 66, 'Ri'),
  L(348, 159, 9, 36, '8'),
  L(915, 353, 47, 75, '(2'),
  L(513, 446, 91, 51, 'LA'),
  L(113, 515, 901, 105, 'CONSOLATION'),
  L(438, 642, 231, 67, 'DE LA'),
  L(189, 732, 721, 73, 'PHILOSOPHIE.'),
  L(264, 832, 571, 70, 'LIVRE PREMIER.'),
  L(361, 978, 381, 62, 'POESIE I.'),
  L(352, 1087, 669, 61, 'OY dont les premiers Vers n’ont parlé'),
  L(96, 1431, 879, 63, 'Les faueurs d’Appollon ne m’offrent que des'),
] }

test('§6.2 région de titre p19 : mots centrés → paratexte ; fragments de marge → ornement ; « 8 » jamais folio', () => {
  const anns = analyserVolume([P19FULL]).get(19)
  const a = (p) => anns[idx(P19FULL.lignes, p)]
  for (const mot of ['LA', 'CONSOLATION', 'DE LA', 'PHILOSOPHIE.']) assert.equal(a(mot).role_suggere, 'paratexte_titre_candidate', mot)
  for (const frag of ['Ri', '(2']) assert.equal(a(frag).role_suggere, 'ornement_candidate', frag)
  assert.equal(a('8').role_suggere, 'ornement_candidate')     // fragment de la région
  assert.notEqual(a('8').role_suggere, 'numero_page')         // JAMAIS folio (§3.2)
  assert.equal(a('POESIE I.').role_suggere, 'titre')          // le titre de section n'est PAS absorbé
  assert.equal(a('POESIE I.').niveau_suggere, 2)
})

// ── §6.3 réclame : coin bas-droite repris page suivante (fixture 2 pages sûres) ─
test('§6.3 réclame : « d’artifice » bas-droit repris p21 → reclame ; signature plus basse ignorée', () => {
  const p20 = { num: 20, largeur: 1250, hauteur: 2030, lignes: [
    L(256, 1600, 916, 57, 'foible, pour la suiure. Ses habits n’auoient rien'),
    L(1018, 1802, 156, 65, 'd’artifice'),   // réclame, coin bas-droit
    L(706, 1955, 27, 58, 'B'),              // signature, plus basse
  ] }
  const p21 = { num: 21, largeur: 1250, hauteur: 2017, lignes: [
    L(238, 40, 631, 69, 'de la Philosophie. Liure I.'),
    L(90, 300, 920, 55, 'd’artifice, & sa robe estoit d’une matiere'),
  ] }
  const a20 = analyserVolume([p20, p21]).get(20)
  const r = a20[idx(p20.lignes, 'd’artifice')]
  assert.equal(r.role_suggere, 'reclame')
  assert.ok(r.preuves.similarite >= 0.9)
  assert.equal(r.preuves.page_cible, 21)
  assert.notEqual(a20[idx(p20.lignes, 'B')].role_suggere, 'reclame') // pas la ligne la plus basse
})

test('§6.3 réclame : sans correspondance texte → reclame_candidate_geometrique (non confirmée)', () => {
  const p1 = { num: 1, largeur: 1250, hauteur: 2050, lignes: [L(100, 300, 800, 55, 'corps.'), L(1000, 1900, 150, 50, 'Toutefois')] }
  const p2 = { num: 2, largeur: 1250, hauteur: 2050, lignes: [L(100, 350, 900, 55, 'Autre chose sans rapport.')] }
  const a1 = analyserVolume([p1, p2]).get(1)
  assert.equal(a1[idx(p1.lignes, 'Toutefois')].role_suggere, 'reclame_candidate_geometrique')
})

// ── §3.1 folio : cohérence séquentielle / répétition multi-pages ──────────────
test('§3.1 folio : une séquence de numéros (même position) confirme numero_page ; un nombre isolé est rejeté', () => {
  const corps = () => L(100, 400, 900, 55, 'Corps du texte courant sur cette page.')
  const foliotee = (n) => ({ num: n, largeur: 1250, hauteur: 2050, lignes: [L(1100, 1850, 40, 45, String(n)), corps()] })
  const pages = [foliotee(40), foliotee(41), foliotee(42)]
  const p40 = analyserVolume(pages).get(40)
  assert.equal(p40[0].role_suggere, 'numero_page')     // confirmé par la suite 40-41-42
  assert.equal(p40[0].export_corps, false)
  assert.ok(/folio\/geometrie/.test(p40[0].regle))
  assert.ok(p40[0].preuves.familles.includes('sequence'))
  // le même nombre, SEUL sur une page, ne devient pas un folio
  const solo = analyserVolume([foliotee(40)]).get(40)
  assert.notEqual(solo[0].role_suggere, 'numero_page')
})

// ── §9 orchestration : composition de toutes les suggestions sur la page 19 ───
test('§9 analyserVolume p19 : chaque ligne reçoit la bonne suggestion composée', () => {
  const anns = analyserVolume([{ num: 19, ...P19 }]).get(19)
  const a = (p) => anns[idx(P19.lignes, p)]
  assert.notEqual(a('8').role_suggere, 'numero_page') // §3.1 : un nombre isolé (1 page) n'est jamais promu folio
  assert.equal(a('POESIE I.').role_suggere, 'titre'); assert.equal(a('POESIE I.').niveau_suggere, 2)
  assert.equal(a('OY dont').role_suggere, 'lettrine_candidate')
  assert.equal(a('OY dont').blanc_poesie, 'moyen')          // lettrine ET vers
  assert.equal(a('Les faueurs').role_suggere, 'vers'); assert.equal(a('Les faueurs').blanc_poesie, 'petit')
  assert.equal(a('que de ioye,').blanc_poesie, 'large')
  assert.equal(a('douleur,').role_suggere, 'continuation_typographique')
  assert.equal(a('B').role_suggere, 'signature'); assert.equal(a('B').export_corps, false)
  assert.equal(a('2').role_suggere, 'signature')
})

// ── Corrections (retour de relecture) ────────────────────────────────────────
test('correction : le NUMÉRAL d’un titre (« I. » avant « PROSE. ») → titre, pas lettrine', () => {
  const page = { num: 20, largeur: 1250, hauteur: 2030, lignes: [
    L(600, 60, 60, 50, '20'),
    L(560, 300, 44, 55, 'I.'),           // numéral détaché, juste au-dessus du titre
    L(479, 362, 300, 63, 'PROSE.'),      // titre de section
    L(100, 440, 900, 55, 'Omme ie discourois ainsi à part moy, & que'),
  ] }
  const anns = analyserVolume([page]).get(20)
  const a = (p) => anns[idx(page.lignes, p)]
  assert.equal(a('I.').role_suggere, 'titre')     // rattaché au titre
  assert.equal(a('I.').niveau_suggere, 2)         // hérite du niveau de « PROSE. »
  assert.notEqual(a('I.').role_suggere, 'lettrine_candidate')
  assert.equal(a('PROSE.').role_suggere, 'titre')
})

test('correction : filigrane « Digitized by Google » → bruit (hors-corps)', () => {
  const a = detecterFiligrane({ bbox: [100, 1900, 300, 40], dip: 'Digitized by Google' })
  assert.ok(a); assert.equal(a.role_suggere, 'bruit'); assert.equal(a.export_corps, false)
  assert.equal(detecterFiligrane({ bbox: [0, 0, 10, 10], dip: 'texte normal' }), null)
  assert.equal(detecterFiligrane({ bbox: [0, 0, 10, 10], dip: '00gl.' }), null) // §6.4 : « 00gl. » seul JAMAIS bruit auto
  // via l'orchestration : la ligne filigrane est hors-corps
  const page = { num: 26, largeur: 1250, hauteur: 2030, lignes: [
    L(100, 300, 900, 55, 'Corps de la prose ici présente.'),
    L(500, 1980, 260, 40, 'Digitized by Google'),
  ] }
  assert.equal(analyserVolume([page]).get(26)[1].role_suggere, 'bruit')
})

test('§10 : « de la Philosophie. Liure I. » (titre courant, ligne longue) → AUCUNE suggestion', () => {
  const page = { largeur: 1250, hauteur: 2034, lignes: [
    L(238, 38, 631, 69, 'de la Philosophie. Liure I.'),
    L(96, 200, 940, 55, 'Texte courant de la prose qui remplit la mesure ordinaire ici.'),
  ] }
  // ligne longue ET ne commence pas par LIVRE → pas de niveau (et hors-corps traité avant en amont)
  assert.equal(suggererNiveauTitre(page.lignes[0], page, { lignes: page.lignes }), null)
})
