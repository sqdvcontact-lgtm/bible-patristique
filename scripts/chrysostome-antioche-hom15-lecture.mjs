// Lecture intégrale de l'Homélie XV au peuple d'Antioche (A0014O0038,
// segments 1557-1642). Les références [[270]] à [[283]] et la référence du
// sommaire « Philem. » sont reconstruites et replacées en notes.
//
//   node scripts/chrysostome-antioche-hom15-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom15-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// La passe mécanique n'autorise que le type 1 ou une cible « à constituer ».
// Ici, types 2, 3 et 4 proviennent exclusivement de la lecture intégrale :
// reprise narrative, commentaire suivi et écho thématique restent distincts.

// [segment_numero, canon_id, type, motif]
const VERSETS = [
  [1573, 'ECC.7.2', 1, 'citation annoncée de la maison de deuil préférable à la maison de joie ; la note imprimée [[270]] « Eccl. 6 » est fautive'],
  [1578, 'ECC.1.2', 1, 'citation annoncée de la vanité des vanités ; note [[271]] complétée par le fac-similé'],
  [1578, 'ECC.12.8', 1, 'seconde occurrence éditorialement indiquée de la même sentence ; note [[271]] « Eccles. 1. & 12. »'],
  [1585, 'SIR.9.13', 1, 'citation annoncée de la marche au milieu des pièges et sur le bord des précipices ; notes [[P1]] et [[272]]'],
  [1595, 'GAL.6.14', 1, 'citation annoncée de Paul : le monde est crucifié pour lui ; note [[273]]'],
  [1595, 'COL.3.2', 1, 'exhortation paulinienne annoncée à ne songer qu’aux choses d’en haut ; note [[274]] portée par la suite au segment 1596'],
  [1596, 'COL.3.1', 1, 'suite de la citation : le Christ est assis à la droite de Dieu ; note [[274]]'],
  [1605, 'JOB.31.32', 2, 'reprise fondue de la porte de Job ouverte à tout voyageur ; note [[275]]'],
  [1606, 'JOB.1.21', 1, 'citation directe de Job : Dieu a donné et ôté, que son nom soit béni'],
  [1611, 'EPH.5.4', 2, 'conseil paulinien fondu dans le discours : éviter les paroles folles et les plaisanteries ; note [[276]]'],
  [1613, '1TI.5.6', 4, 'référence [[277]] « 1. Tim. 5 » conservée : la traduction française a supprimé la proposition sur la veuve qui vit dans les délices et demeure morte quoiqu’elle vive'],
  [1616, 'MAT.5.28', 2, 'reprise fondue de l’adultère déjà commis dans le cœur par le regard de convoitise ; note [[278]]'],
  [1618, 'PRO.6.2', 4, 'référence [[279]] « Prov. 6 » conservée : la traduction française omet la formule des lèvres prises au piège, mais maintient le développement sur la langue comme piège'],
  [1620, 'GAL.6.17', 2, 'paraphrase de Paul ne voulant plus être troublé par les Galates ; note [[280]]'],
  [1621, 'ZEC.5.1', 1, 'citation annoncée de la vision du rouleau volant, rendu « faulx volante » selon la tradition grecque ; note [[281]]'],
  [1621, 'ZEC.5.2', 1, 'suite de la citation : dimensions et question adressée au prophète'],
  [1622, 'ZEC.5.4', 1, 'suite de la citation : entrée dans la maison de celui qui jure et destruction du bois et des pierres'],
  [1627, 'GEN.4.8', 2, 'reprise narrative du meurtre d’Abel par Caïn, appliquée à celui qui impose un serment ; note [[282]]'],
  [1629, 'MAT.5.34', 1, 'citation directe de l’interdiction évangélique de jurer ; note [[283]]'],
]

const plage = (debut, fin, canon, motif) => Array.from({ length: fin - debut + 1 }, (_, i) => [debut + i, canon, 3, motif])
const COMMENTAIRES = [
  ...plage(1572, 1584, 'ECC.7.2', 'commentaire suivi de la maison de deuil comme école de sobriété et de vertu, opposée à la maison de joie'),
  ...plage(1578, 1583, 'ECC.1.2', 'application de la vanité des vanités à la mortalité et à l’inconstance des biens présents'),
  ...plage(1578, 1583, 'ECC.12.8', 'application de la reprise finale de la vanité à la même méditation sur la mort'),
  ...plage(1585, 1601, 'SIR.9.13', 'commentaire suivi des pièges cachés sous les plaisirs, les biens, les honneurs et les regards'),
  ...plage(1608, 1618, 'SIR.9.13', 'reprise du commentaire des pièges : éviter non seulement le péché, mais aussi les occasions qui y conduisent'),
  ...plage(1594, 1596, 'GAL.6.14', 'commentaire de la hauteur spirituelle où les gloires terrestres paraissent méprisables et crucifiées'),
  ...plage(1595, 1597, 'COL.3.1', 'commentaire des choses d’en haut identifiées au Christ assis à la droite de Dieu'),
  ...plage(1595, 1597, 'COL.3.2', 'application de l’exhortation à rechercher les choses d’en haut pour échapper aux pièges terrestres'),
  ...plage(1605, 1607, 'JOB.31.32', 'commentaire de Job riche et hospitalier comme modèle du bon usage de l’opulence'),
  ...plage(1605, 1607, 'JOB.1.21', 'commentaire de Job pauvre et patient comme modèle du bon usage de l’épreuve'),
  ...plage(1609, 1612, 'EPH.5.4', 'commentaire des plaisanteries et paroles folles comme racine de paroles, de coups et de meurtres'),
  ...plage(1616, 1617, 'MAT.5.28', 'application de l’adultère du cœur à la nécessité de fuir les regards impudiques'),
  ...plage(1619, 1620, 'GAL.6.17', 'application pastorale de la parole de Paul à l’incapacité du prédicateur de délaisser ses enfants spirituels'),
  ...plage(1627, 1628, 'GEN.4.8', 'comparaison entre Caïn tuant Abel au désert et celui qui fait mourir spirituellement son frère dans l’église'),
  ...plage(1618, 1637, 'MAT.5.34', 'commentaire suivi de l’interdiction de jurer : châtiment des serments, homicide spirituel et refus d’imposer le serment'),
]

// [segment_numero, livre, chapitre, motif]
const CHAPITRES = [
  ...plageChapitre(1621, 1626, 'ZEC', 5, 'commentaire suivi de la faucille volante, de son caractère inévitable et de la ruine de la maison du jureur'),
]

function plageChapitre(debut, fin, livre, chapitre, motif) {
  return Array.from({ length: fin - debut + 1 }, (_, i) => [debut + i, livre, chapitre, motif])
}

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1557).lte('segment_numero', 1642).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 86) throw new Error(`86 segments attendus, ${segments.length} trouvés`)
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
console.log(`${OEUVRE}, Homélie XV : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 86 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, livre, chapitre, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of ['P1', ...Array.from({ length: 14 }, (_, i) => String(270 + i))])
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
const deplacer = (marqueur, numero, ancre) => corriger(numero, ancre, `${ancre}[[${marqueur}]]`)

// Nettoyage limité aux corruptions OCR et aux réclames de bas de page certaines.
corriger(1557, 'Je tçay', 'Je sçay')
corriger(1557, 'ri gueur', 'rigueur')
corriger(1558, 'qu’on ditoit', 'qu’on diroit')
corriger(1559, 'Ces defordres', 'Ces desordres')
corriger(1560, 'Qui seroit linsensé', 'Qui seroit l’insensé')
corriger(1560, 'dans Hh une', 'dans une')
corriger(1565, 'la crainte veil lant', 'la crainte veillant')
corriger(1566, 'se court son prochain', 'secourt son prochain')
corriger(1571, 'est venuë forsdre', 'est venuë fondre')
corriger(1572, 'Ne laissons donc pomt', 'Ne laissons donc point')
corriger(1574, 'de lajoye', 'de la joye')
corriger(1575, 'd’envic', 'd’envie')
corriger(1577, 'de linfirmité', 'de l’infirmité')
corriger(1578, 'Cesdernieres', 'Ces dernieres')
corriger(1579, 'tristesse vant mieux que celle dejoye', 'tristesse vaut mieux que celle de joye')
corriger(1587, "Quand' la ruïne", 'Quand la ruïne')
corriger(1587, 'judicieusement lo mot', 'judicieusement le mot')
corriger(1587, 'Hh iij Les Enfans', 'Les Enfans')
corriger(1593, 'le mĩ lieu de l’air', 'le milieu de l’air')
corriger(1595, 'nous exhorte a ne songer', 'nous exhorte à ne songer')
corriger(1596, 'qu’entendil', 'qu’entend-il')
corriger(1596, 'C’est Je sus-Christ', 'C’est Jesus-Christ')
corriger(1599, 'bien dos douleurs', 'bien des douleurs')
corriger(1600, 'si nous souvenions', 'si nous nous souvenions')
corriger(1605, 'toûjours victorieux, victorieux, dans', 'toûjours victorieux, dans')
corriger(1613, 'on n’épargne ni vous, ni brigandages', 'on n’épargne ni vols, ni brigandages')
corriger(1622, 'large de dix Cette faulx', 'large de dix. Cette faulx')
corriger(1625, 'Cest afin', 'C’est afin')
corriger(1635, 'une mjure', 'une injure')
corriger(1637, '& a vôtre exemple', '& à vôtre exemple')
corriger(1637, 'a jurer', 'à jurer')
corriger(1637, 'obciflez à ses ordonnances', 'obeïssez à ses ordonnances')
corriger(1637, 'écrite Li iuj au Livre', 'écrite au Livre')
corriger(1642, 'dans, tous les siecles', 'dans tous les siecles')

deplacer('270', 1573, 'Il vaut mieux, dit-il, aller dans la maison de douleur, qu’en celle de joye')
deplacer('271', 1578, 'Vanité des vanitez, tout ce qui est au monde n’est que vanité')
deplacer('P1', 1585, 'vous marchez au milieu des pieges, & que vous courez sur le bord des précipices')
deplacer('272', 1585, 'vous marchez au milieu des pieges, & que vous courez sur le bord des précipices[[P1]]')
deplacer('273', 1595, 'le monde est crucifié en luy')
deplacer('274', 1596, 'Jesus-Christ assis à la droite de Dieu son Pere')
deplacer('275', 1605, 'sa porte êtoit ouverte à tous venans')
deplacer('276', 1611, 'de n’user jamais de paroles folles & enjoüées')
deplacer('277', 1613, 'on opprime & la veuve & l’orphelin')
deplacer('278', 1616, 'est adultere dans le cœur')
deplacer('279', 1618, 'c’est un piege dangereux')
deplacer('280', 1620, 'prendre part aux interests des Galates')
deplacer('281', 1622, 'en renversera le bois & les pierres')
deplacer('282', 1627, 'vous pire que Caïn')
deplacer('283', 1629, 'Je vous defends de jurer')

const notesAttendues = new Map([
  [1573, '[[270]] Eccl. 6.'],
  [1578, '[[271]] Eccles. 1. & 12.'],
  [1585, '[[P1]] Philem.\n[[272]] Eccles. 9.'],
  [1595, '[[273]] Galat. 6.'],
  [1596, '[[274]] Coloss. 3.'],
  [1605, '[[275]] Job. 31.'],
  [1611, '[[276]] Ephes. 5.'],
  [1613, '[[277]] 1. Tim. 5.'],
  [1616, '[[278]] Matt. 5.'],
  [1618, '[[279]] Prov. 6.'],
  [1620, '[[280]] Galat. 6.'],
  [1622, '[[281]] Zach. 5.'],
  [1627, '[[282]] Genes. 4.'],
  [1629, '[[283]] Matt. 5.'],
])

const appels = segments.flatMap((s) => [...s.segment_texte_corrige.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = [...notesAttendues.values()].flatMap((n) => [...n.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 15 || definitions.length !== 15 || new Set(appels).size !== 15
  || appels.some((m) => !definitions.includes(m)) || definitions.some((m) => !appels.includes(m)))
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)

if (!WRITE) {
  console.log('15 appels/15 définitions de notes reconstruits (--dry : rien écrit)')
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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XV',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
