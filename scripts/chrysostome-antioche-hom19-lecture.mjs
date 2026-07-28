// Lecture intégrale de l'Homélie XIX au peuple d'Antioche (A0014O0038,
// segments 1926-2026). Les références [[342]] à [[351]] sont conservées ;
// deux références marginales absorbées par l'OCR sont restaurées en notes.
//
//   node scripts/chrysostome-antioche-hom19-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom19-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// Règle appliquée : les notes indiquent où regarder, jamais quelle cible ni
// quel type retenir. Tous les types 2 et 3 ci-dessous viennent de la lecture
// intégrale et de la confrontation sémantique avec versets_lecture.

// [segment_numero, canon_id, type, motif]
const VERSETS = [
  [1932, 'GEN.2.15', 2, 'reprise fondue de la vocation agricole d’Adam placé dans le paradis pour le cultiver et le garder'],
  [1938, 'ECC.1.2', 2, 'sentence de Salomon fondue dans le discours : tout n’est que vanité'],
  [1944, '1TI.6.8', 2, 'précepte paulinien fondu : ne rechercher que la nourriture et le vêtement ; note [[342]] imprimée fautivement « Tim. 1 »'],
  [1953, 'ZEC.5.1', 2, 'reprise narrative de la vision du rouleau volant, rendu « faulx » selon la leçon grecque ; référence marginale restaurée'],
  [1953, 'ZEC.5.2', 2, 'reprise des dimensions de vingt coudées sur dix du rouleau volant'],
  [1953, 'ZEC.5.3', 1, 'citation annoncée de la malédiction qui sort sur la face de la terre et frappe celui qui jure'],
  [1953, 'ZEC.5.4', 1, 'suite de la citation : entrée dans la maison du faux jureur et destruction du bois et des pierres'],
  [1956, 'GEN.19.24', 2, 'reprise narrative du feu céleste tombé sur Sodome'],
  [1956, 'GEN.19.25', 2, 'reprise narrative de la destruction de Sodome et de ses habitants'],
  [1958, 'GEN.19.28', 2, 'reprise de la terre de Sodome couverte de feu, de cendres et de fumée comme une fournaise'],
  [1965, 'EZK.17.2', 1, 'citation annoncée de l’ordre divin de proposer l’énigme et la parabole ; note [[343]]'],
  [1966, 'EZK.17.3', 1, 'citation de la grande aigle aux grandes ailes et aux longues plumes représentant le roi de Babylone'],
  [1967, 'EZK.17.3', 2, 'reprise fondue de l’aigle venant au Liban, interprété comme la Judée'],
  [1968, 'EZK.17.5', 1, 'citation de la semence prise dans la terre et plantée auprès de grandes eaux ; note [[344]]'],
  [1968, 'EZK.17.6', 1, 'suite de la citation : la semence devient une vigne basse dont les rameaux regardent l’aigle'],
  [1970, 'EZK.17.7', 1, 'citation de la vigne qui étend ses racines et ses rameaux vers une seconde aigle ; note [[345]]'],
  [1971, 'EZK.17.9', 1, 'citation de la pourriture des racines, du fruit abattu et des feuilles desséchées'],
  [1972, 'EZK.17.9', 1, 'suite de la citation : la vigne est arrachée sans une grande armée ni beaucoup de peuple'],
  [1973, 'EZK.17.12', 2, 'explication fondue de l’aigle comme roi de Babylone venu à Jérusalem'],
  [1973, 'EZK.17.13', 2, 'reprise de l’alliance imposée au prince de la race royale'],
  [1973, 'EZK.17.15', 2, 'reprise de la rupture du traité et de l’ambassade envoyée au roi d’Égypte'],
  [1974, 'EZK.17.16', 1, 'citation de la mort de Sédécias à Babylone pour avoir violé son serment'],
  [1974, 'EZK.17.18', 1, 'citation de la parole donnée puis méprisée par Sédécias'],
  [1974, 'EZK.17.19', 1, 'citation de l’alliance transgressée et du serment divin méprisé ; notes [[346]] et [[347]] matériellement fautives'],
  [1975, 'EZK.17.19', 1, 'citation : Dieu fait retomber sur la tête de Sédécias le serment méprisé et l’alliance transgressée'],
  [1975, 'EZK.17.20', 1, 'suite de la citation : le rets divin étendu sur Sédécias et son jugement à Babylone'],
  [1976, '2KI.25.1', 1, 'citation narrative annoncée : neuvième année de Sédécias, Nabuchodonosor assiège Jérusalem'],
  [1977, '2KI.25.2', 1, 'suite du récit : siège prolongé jusqu’à la onzième année de Sédécias'],
  [1977, '2KI.25.3', 1, 'suite du récit : famine insupportable et disparition du pain dans la ville'],
  [1980, 'JER.38.17', 1, 'citation du conseil de Jérémie : se rendre aux princes babyloniens pour sauver sa vie, sa maison et la ville ; référence marginale restaurée'],
  [1981, 'JER.38.18', 1, 'suite de la citation : refus de sortir, ville livrée et brûlée, fuite impossible'],
  [1982, 'JER.38.19', 2, 'réponse de Sédécias fondue dans le récit : crainte des transfuges juifs'],
  [1982, 'JER.38.20', 1, 'citation de Jérémie : ils ne le livreront pas, écouter Dieu fera vivre son âme ; note [[348]]'],
  [1983, 'JER.38.22', 1, 'citation de la révélation sur les femmes du palais et les mauvais conseillers de Sédécias'],
  [1984, 'JER.38.23', 1, 'suite de la citation : femmes et enfants livrés, roi capturé et ville brûlée'],
  [1986, '2KI.25.9', 2, 'reprise narrative de l’incendie du Temple, du palais et des maisons de Jérusalem'],
  [1987, '2KI.25.11', 2, 'reprise narrative de la déportation du peuple et des notables'],
  [1987, '2KI.25.13', 1, 'énumération des colonnes, bases et mer d’airain brisées par les Chaldéens'],
  [1987, '2KI.25.14', 1, 'suite de l’énumération : pots, bassins, fourches et vases du service'],
  [1987, '2KI.25.15', 1, 'suite de l’énumération : encensoirs et coupes d’or et d’argent'],
  [1989, '2KI.25.16', 2, 'reprise des deux colonnes et de leurs bases emportées par Nabuzardan'],
  [1989, '2KI.25.18', 1, 'énumération de Saraïas, du second prêtre et des trois portiers faits prisonniers'],
  [1989, '2KI.25.19', 1, 'suite de l’énumération : eunuque, familiers du roi, officier et soixante hommes'],
  [1990, '2KI.25.20', 1, 'Nabuzardan présente les prisonniers au roi de Babylone'],
  [1990, '2KI.25.21', 1, 'suite du récit : le roi de Babylone fait mourir les prisonniers'],
  [1993, '2KI.25.4', 2, 'reprise narrative de la fuite nocturne de Sédécias par la porte du désert'],
  [1993, '2KI.25.5', 2, 'reprise de la poursuite et de la capture de Sédécias par les Chaldéens'],
  [1993, '2KI.25.6', 2, 'reprise de la conduite de Sédécias devant le roi de Babylone'],
  [1994, '2KI.25.7', 2, 'reprise narrative de la mort des fils, de l’aveuglement et de l’envoi de Sédécias à Babylone'],
  [1996, 'EZK.12.13', 2, 'prophétie fondue : Sédécias sera conduit à Babylone sans la voir ; note [[349]] « Jere. 39 » croisée avec [[350]]'],
  [1996, 'JER.32.5', 2, 'prophétie fondue de Sédécias conduit à Babylone ; note [[350]] « Ezech. 12 » croisée avec [[349]]'],
  [2013, 'ZEC.5.1', 2, 'rappel condensé de la vision de la faux volante'],
  [2013, 'ZEC.5.3', 2, 'rappel de la malédiction dirigée contre celui qui jure'],
  [2013, 'ZEC.5.4', 2, 'rappel de la faux frappant la maison du faux jureur'],
  [2013, 'MAT.5.34', 2, 'rappel fondu de l’interdiction du simple serment par Jésus-Christ'],
  [2015, 'MAT.5.34', 1, 'citation annoncée de l’ordonnance du Christ : ne point jurer ; note [[351]]'],
]

const plage = (debut, fin, canon, motif) => Array.from(
  { length: fin - debut + 1 }, (_, i) => [debut + i, canon, 3, motif],
)
const plageChapitre = (debut, fin, livre, chapitre, motif) => Array.from(
  { length: fin - debut + 1 }, (_, i) => [debut + i, livre, chapitre, motif],
)

const COMMENTAIRES = [
  [1932, 'GEN.2.15', 3, 'application de la vocation agricole d’Adam à la dignité spirituelle du travail des paysans'],
  [1938, 'ECC.1.2', 3, 'application de la vanité de toute chose au mépris du luxe et de la fausse sagesse'],
  [1944, '1TI.6.8', 3, 'application de la suffisance de la nourriture et du vêtement à la simplicité des familles rurales'],
  ...plage(1953, 1955, 'ZEC.5.4', 'commentaire de la destruction durable de la maison du faux jureur comme avertissement aux générations suivantes'),
  ...plage(1956, 1958, 'GEN.19.24', 'commentaire du feu de Sodome comme châtiment rendu durablement visible'),
  ...plage(1956, 1958, 'GEN.19.25', 'commentaire de la destruction de Sodome comme avertissement contre la répétition de son péché'),
  [1958, 'GEN.19.28', 3, 'commentaire de la fumée et des cendres de Sodome comme témoignage visible plus frappant que les paroles'],
  ...plage(1965, 1967, 'EZK.17.3', 'explication de la première aigle comme Nabuchodonosor et du Liban comme la Judée'),
  ...plage(1968, 1969, 'EZK.17.6', 'explication de la vigne basse comme Jérusalem placée sous l’alliance du roi de Babylone'),
  ...plage(1970, 1971, 'EZK.17.7', 'explication de la seconde aigle comme roi d’Égypte vers lequel Sédécias se détourne'),
  ...plage(1971, 1972, 'EZK.17.9', 'commentaire de l’arrachage de la vigne comme châtiment divin de la perfidie'),
  ...plage(1973, 1975, 'EZK.17.19', 'explication insistante du malheur de Sédécias par le serment méprisé et l’alliance transgressée'),
  ...plage(1976, 1979, '2KI.25.1', 'commentaire du long siège de Jérusalem comme délai miséricordieux accordé à Sédécias pour réparer sa faute'),
  ...plage(1980, 1985, 'JER.38.17', 'commentaire du conseil de Jérémie comme dernière possibilité de sauver Sédécias, sa maison et Jérusalem'),
  ...plage(1980, 1985, 'JER.38.18', 'commentaire du refus de Sédécias et de l’incendie annoncé de Jérusalem'),
  ...plage(1986, 1992, '2KI.25.9', 'commentaire de l’incendie de Jérusalem et du Temple comme effet du faux serment de Sédécias'),
  ...plage(1987, 1992, '2KI.25.13', 'commentaire de la destruction et de l’enlèvement des objets sacrés malgré la sainteté du Temple'),
  ...plage(1993, 1995, '2KI.25.7', 'commentaire du supplice de Sédécias comme exemple public de la gravité du parjure'),
  ...plage(1996, 1997, 'EZK.12.13', 'conciliation de la prophétie : Sédécias est conduit à Babylone mais ne la voit pas après son aveuglement'),
  ...plage(1996, 1997, 'JER.32.5', 'conciliation de la prophétie annonçant la conduite de Sédécias captif à Babylone'),
  ...plage(1998, 2025, 'MAT.5.34', 'commentaire et application suivis de l’interdiction évangélique de jurer : vaincre l’habitude, mémoriser le précepte et en faire la règle d’Antioche'),
]

// [segment_numero, livre, chapitre, motif]
const CHAPITRES = [
  ...plageChapitre(1953, 1955, 'ZEC', 5, 'commentaire suivi de la faux volante et de la maison détruite du faux jureur'),
  ...plageChapitre(1965, 1975, 'EZK', 17, 'commentaire suivi de la parabole des deux aigles, de la vigne et du serment de Sédécias'),
  ...plageChapitre(1976, 1979, '2KI', 25, 'commentaire suivi du siège de Jérusalem sous Sédécias'),
  ...plageChapitre(1980, 1985, 'JER', 38, 'commentaire suivi du dernier conseil donné par Jérémie à Sédécias'),
  ...plageChapitre(1986, 1995, '2KI', 25, 'reprise du commentaire suivi de la prise de Jérusalem, de sa destruction et du supplice de Sédécias'),
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1926).lte('segment_numero', 2026).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 101) throw new Error(`101 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))

const cibles = [...new Set([...VERSETS, ...COMMENTAIRES].map((l) => l[1]))]
const { data: versets, error: erreurVersets } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles)
if (erreurVersets) throw erreurVersets
const presentes = new Set((versets ?? []).map((v) => v.id_verset))
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

for (const [, livre, chapitre] of CHAPITRES) {
  const { count, error } = await sb.from('versets_canon').select('id', { count: 'exact', head: true })
    .eq('livre', livre).eq('ch_canon', chapitre)
  if (error) throw error
  if (!count) throw new Error(`Chapitre cible absent : ${livre}.${chapitre}`)
}

const rows = [
  ...[...VERSETS, ...COMMENTAIRES].map(([numero, canon_id, type, motif]) => ({
    segment_id: parNumero.get(numero)?.id, canon_id, livre: null, chapitre: null,
    type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
  ...CHAPITRES.map(([numero, livre, chapitre, motif]) => ({
    segment_id: parNumero.get(numero)?.id, canon_id: null, livre, chapitre,
    type: 3, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
]
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')
const cleLien = (l) => `${l.segment_id}|${l.canon_id ?? `${l.livre}.${l.chapitre}`}|${l.type}|${l.motif}`
if (new Set(rows.map(cleLien)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie XIX : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 101 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, livre, chapitre, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of ['H19Z', 'H19J', ...Array.from({ length: 10 }, (_, i) => String(342 + i))])
    segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
}
const corriger = (numero, avant, apres) => {
  const segment = parNumero.get(numero)
  if (!segment.segment_texte_corrige.includes(avant)) {
    if (segment.segment_texte_corrige.includes(apres)) return
    throw new Error(`Correction introuvable au segment ${numero} : ${avant}`)
  }
  segment.segment_texte_corrige = segment.segment_texte_corrige.replace(avant, apres)
}
const appeler = (marqueur, numero, ancre) => corriger(numero, ancre, `${ancre}[[${marqueur}]]`)

// Extraction de deux références marginales absorbées dans le corps par l'OCR.
corriger(1953, 'le Prophete Zach. s. leur dit', 'le Prophete leur dit')
corriger(1980, 'Le Prophete a eu devant moy cette pensée, car il dit a Sedecias, Si vous allez trouver le General des Terem. Babyloniens', 'Le Prophete a eu devant moy cette pensée, car il dit a Sedecias, Si vous allez trouver le General des Babyloniens')

appeler('H19Z', 1953, 'en renversera le bois & les pierres')
appeler('342', 1944, 'à S. Paul')
appeler('343', 1965, 'qui luy annonça son mal-heur')
appeler('344', 1968, 'de la semence')
appeler('345', 1970, 'Cette vigne s’attacha')
appeler('346', 1974, 'causé tous ses')
appeler('347', 1974, 'au milieu')
appeler('H19J', 1980, 'Le Prophete a eu devant moy cette pensée')
appeler('348', 1982, 'Ils ne le feront pas')
appeler('349', 1996, 'Sedecias ne')
appeler('350', 1996, 'ce Prince y seroit conduit')
appeler('351', 2015, 'souvenez-vous de')

const notesAttendues = new Map([
  [1944, '[[342]] Tim. 1.'],
  [1953, '[[H19Z]] Zach. 5.'],
  [1965, '[[343]] Ezech.17'],
  [1968, '[[344]] Ibid. 6.'],
  [1970, '[[345]] Ibid.'],
  [1974, '[[346]] Ezech. 7.\n[[347]] 1. Rois.'],
  [1980, '[[H19J]] Jerem. 38.'],
  [1982, '[[348]] Ibid'],
  [1996, '[[349]] Jere. 39.\n[[350]] Ezech. 12.'],
  [2015, '[[351]] Matt. 5.'],
])

const appels = segments.flatMap((s) => [...s.segment_texte_corrige.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = [...notesAttendues.values()].flatMap((n) => [...n.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 12 || definitions.length !== 12 || new Set(appels).size !== 12
  || appels.some((m) => !definitions.includes(m)) || definitions.some((m) => !appels.includes(m)))
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)

if (!WRITE) {
  console.log('12 appels/12 définitions de notes reconstruits (--dry : rien écrit)')
  process.exit(0)
}

for (const segment of segments) {
  const notes = notesAttendues.get(segment.segment_numero) ?? null
  if (segment.segment_texte_corrige !== segment.segment_texte || notes !== segment.notes) {
    const { error } = await sb.from('segments').update({ segment_texte: segment.segment_texte_corrige, notes }).eq('id', segment.id)
    if (error) throw error
  }
}
for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XIX',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
