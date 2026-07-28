// Lecture intégrale de l'Homélie XVI au peuple d'Antioche (A0014O0038,
// segments 1643-1743). Les références [[284]] à [[308]], ainsi que quatre
// références omises ou absorbées par l'OCR, sont reconstruites et réancrées.
//
//   node scripts/chrysostome-antioche-hom16-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom16-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// Règle appliquée : la passe mécanique ne produit que du type 1 ou une cible
// « à constituer ». Ici, tous les types 2 (reprise), 3 (commentaire suivi) et
// 4 (écho) proviennent exclusivement de la lecture intégrale. Aucun type 4
// n'est retenu dans cette homélie.

const plage = (debut, fin, canon, motif) => Array.from(
  { length: fin - debut + 1 }, (_, i) => [debut + i, canon, 3, motif],
)
const suite = (prefixe, debut, fin) => Array.from(
  { length: fin - debut + 1 }, (_, i) => `${prefixe}.${debut + i}`,
)

// [segment_numero, canon_id, type, motif]
const VERSETS = [
  [1644, '1CO.6.1', 2, 'reprise fondue de l’interdiction faite aux fidèles de plaider devant les païens ; référence absente de l’OCR et restituée en note'],
  ...suite('JOB.1', 13, 19).map((c) => [1649, c, 2, 'reprise narrative des messagers annonçant à Job la perte de ses biens et de ses enfants ; note [[284]] réancrée']),
  [1650, 'JOB.1.21', 1, 'citation directe de Job : le Seigneur a donné et ôté, que son nom soit béni ; note [[284]]'],
  [1654, 'MAT.7.26', 1, 'citation annoncée de la maison bâtie sur le sable ; note [[285]]'],
  [1655, 'MAT.7.27', 1, 'suite directe de la citation : pluie, vents, assaut et chute de la maison'],
  [1660, 'ZEC.5.1', 2, 'reprise explicite de la vision de la faucille volante commentée dans l’homélie précédente ; référence absorbée « Zach. s. »'],
  [1660, 'ZEC.5.2', 2, 'reprise explicite de la vision de la faucille volante commentée dans l’homélie précédente'],
  [1660, 'ZEC.5.4', 2, 'reprise explicite de la faucille qui détruit la maison du blasphémateur ; référence absorbée « Zach. s. »'],
  [1670, 'EXO.23.13', 1, 'citation condensée de la défense de jurer par le nom des dieux étrangers ; le fac-similé confirme [[286]] « Exod. 23. »'],
  [1670, 'MAT.5.34', 1, 'citation directe de l’interdiction évangélique de jurer ; note [[287]]'],
  [1673, 'MAT.5.34', 1, 'répétition directe de l’interdiction évangélique de jurer'],
  [1674, 'PHM.1.1', 1, 'citation du lemme de l’homélie : Paul prisonnier de Jésus-Christ et Timothée son frère ; note [[288]]'],
  [1675, '2CO.12.2', 2, 'reprise du ravissement de Paul jusqu’au troisième ciel ; note [[289]] déplacée sur son véritable passage'],
  [1675, '2CO.12.4', 2, 'reprise de l’entrée de Paul au paradis et de l’audition des secrets divins ; note [[289]]'],
  [1688, 'ACT.26.28', 1, 'citation directe de la parole d’Agrippa, appelé Festus dans la traduction : presque persuadé de devenir chrétien'],
  [1690, 'ACT.26.29', 1, 'citation directe du souhait de Paul : tous chrétiens, mais sans ses chaînes ; référence éditoriale Act. 26 restituée'],
  [1691, 'EPH.4.1', 1, 'citation annoncée de Paul prisonnier exhortant à marcher dignement ; note [[290]]'],
  [1691, '2TI.2.9', 2, 'rappel des chaînes de Paul à Timothée ; note [[291]]'],
  [1691, 'PHM.1.1', 2, 'rappel du titre de prisonnier employé devant Philémon ; note [[292]]'],
  [1691, 'ACT.28.20', 2, 'rappel des chaînes portées pour l’espérance d’Israël devant les Juifs ; note [[293]]'],
  [1691, 'PHP.1.14', 2, 'rappel des chaînes de Paul aux Philippiens ; note [[294]]'],
  [1693, 'PHP.1.14', 2, 'reprise explicite des frères enhardis par les chaînes de Paul à annoncer l’Évangile'],
  [1695, '1CO.9.21', 2, 'reprise fondue de Paul se faisant comme sans loi avec ceux qui sont sans loi ; note [[295]]'],
  [1696, 'MAT.9.16', 1, 'citation annoncée du morceau neuf cousu sur un vieux vêtement ; note [[296]] réancrée'],
  [1696, 'MAT.9.17', 1, 'citation annoncée du vin nouveau dans de vieilles outres ; note [[296]]'],
  [1696, 'MRK.2.21', 1, 'parallèle éditorial de la citation du morceau neuf ; note [[297]]'],
  [1696, 'MRK.2.22', 1, 'parallèle éditorial de la citation du vin nouveau ; note [[297]]'],
  [1696, 'LUK.5.36', 1, 'parallèle éditorial de la citation du morceau neuf ; la note imprimée [[298]] « Luc. 15. » est fautive'],
  [1696, 'LUK.5.37', 1, 'parallèle éditorial de la citation du vin nouveau ; la note imprimée [[298]] « Luc. 15. » est fautive'],
  [1696, 'LUK.5.38', 1, 'suite du parallèle éditorial du vin nouveau ; la note imprimée [[298]] « Luc. 15. » est fautive'],
  [1700, 'COL.1.24', 1, 'citation annoncée de Paul accomplissant ce qui manque aux souffrances du Christ ; référence Coloss. 1 absorbée par l’OCR et restituée'],
  [1701, 'PHP.1.29', 1, 'citation annoncée : il est donné non seulement de croire au Christ, mais de souffrir pour lui ; note [[299]] réancrée'],
  [1701, 'ROM.5.3', 1, 'citation annoncée de Paul se glorifiant dans les tribulations ; note [[300]] réancrée'],
  [1703, '2CO.12.10', 1, 'citation directe de Paul se plaisant dans faiblesses, outrages et persécutions pour que demeure la puissance du Christ ; note [[301]] reconstruite'],
  [1704, '2CO.11.30', 2, 'paraphrase de Paul ne plaçant sa gloire que dans ses faiblesses ; note [[302]] reconstruite'],
  ...suite('2CO.11', 23, 27).map((c) => [1705, c, 2, 'reprise condensée de la liste des prisons, coups, périls et naufrages de Paul ; note [[303]]']),
  [1718, '2CO.4.17', 1, 'citation annoncée de la légère souffrance qui prépare une éternité de gloire ; note [[304]] réancrée et complétée'],
  [1723, '2TI.2.9', 1, 'citation directe : Paul est captif comme un criminel, mais la parole de Dieu ne l’est pas ; référence omise par l’OCR et restituée'],
  [1724, 'ROM.5.3', 2, 'reprise de la tribulation qui exerce et produit la patience ; note [[305]] réancrée'],
  [1730, 'JHN.16.22', 1, 'début de la citation annoncée : le Christ reverra ses disciples ; note [[306]]'],
  [1731, 'JHN.16.22', 1, 'fin de la citation : leur joie ne pourra être ravie ; note [[306]] réancrée à la fin de la phrase'],
  [1734, 'PSA.111.9', 1, 'citation directe de l’aumône dispersée aux pauvres et de la justice éternelle ; note [[307]] reconstruite « Psal. 111. »'],
  [1734, 'LUK.12.33', 1, 'citation condensée du trésor céleste inaccessible au voleur et à la corruption ; note [[308]]'],
]

const COMMENTAIRES = [
  ...plage(1649, 1651, 'JOB.1.21', 'application suivie de la patience et de l’action de grâces de Job à la peur des habitants d’Antioche'),
  ...plage(1654, 1656, 'MAT.7.26', 'commentaire de la maison sur le sable appliqué à ceux que la seule appréhension du danger renverse'),
  ...plage(1654, 1656, 'MAT.7.27', 'commentaire de la chute de la maison sous les vents et les torrents'),
  ...plage(1661, 1673, 'MAT.5.34', 'commentaire suivi de l’interdiction de jurer : obéissance à la loi divine et correction des habitudes'),
  ...plage(1674, 1724, 'PHM.1.1', 'commentaire suivi du lemme « Paul enchaîné pour Jésus-Christ » : gloire des chaînes, condescendance envers Agrippa et valeur des épreuves'),
  ...plage(1675, 1676, '2CO.12.2', 'comparaison entre le ravissement reçu gratuitement et les chaînes qui témoignent du zèle de Paul'),
  ...plage(1686, 1692, 'ACT.26.28', 'commentaire de la défense de Paul devant Agrippa, nommé Festus dans la traduction, et de sa presque-conversion'),
  ...plage(1688, 1702, 'ACT.26.29', 'commentaire de la restriction « excepté ces chaînes » comme condescendance envers un auditeur encore faible'),
  ...plage(1696, 1699, 'MAT.9.16', 'application du vieux vêtement à l’âme encore non renouvelée d’Agrippa/Festus'),
  ...plage(1696, 1699, 'MAT.9.17', 'application des vieilles outres à la faiblesse de l’auditeur non encore formé à la foi'),
  ...plage(1696, 1699, 'MRK.2.21', 'commentaire du parallèle éditorial du vieux vêtement'),
  ...plage(1696, 1699, 'MRK.2.22', 'commentaire du parallèle éditorial des vieilles outres'),
  ...plage(1696, 1699, 'LUK.5.36', 'commentaire du parallèle lucanien malgré le chapitre erroné de la note imprimée'),
  ...plage(1696, 1699, 'LUK.5.37', 'commentaire du parallèle lucanien du vin nouveau malgré le chapitre erroné de la note imprimée'),
  ...plage(1703, 1706, '2CO.12.10', 'commentaire de la gloire de Paul dans les faiblesses et les persécutions'),
  ...plage(1704, 1706, '2CO.11.30', 'commentaire de la préférence de Paul pour la gloire tirée de ses infirmités'),
  ...plage(1704, 1706, '2CO.11.23', 'commentaire de la comparaison de Paul avec les autres apôtres par le nombre de ses souffrances'),
  ...plage(1717, 1719, '2CO.4.17', 'commentaire de la légèreté des souffrances présentes au regard de la gloire éternelle'),
  ...plage(1723, 1724, '2TI.2.9', 'commentaire de la parole de Dieu demeurée libre tandis que Paul est enchaîné'),
  ...plage(1724, 1725, 'ROM.5.3', 'application de la patience produite par l’adversité'),
  ...plage(1730, 1735, 'JHN.16.22', 'commentaire de la joie vertueuse que nul bien terrestre ni adversaire ne peut ravir'),
  ...plage(1734, 1735, 'PSA.111.9', 'application de la justice éternelle promise à l’aumône'),
  ...plage(1734, 1735, 'LUK.12.33', 'application du trésor céleste qui met le fruit des bonnes œuvres à l’abri'),
  ...plage(1736, 1741, 'MAT.5.34', 'reprise finale du commentaire : s’abstenir des serments et aider les autres à les quitter'),
]

const CHAPITRES = [
  [1686, 'ACT', 26, 2, 'reprise narrative condensée du discours de défense de Paul, de la vision sur le chemin de Damas et de l’accomplissement de la Loi et des Prophètes'],
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1643).lte('segment_numero', 1743).order('segment_numero')
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
  ...CHAPITRES.map(([numero, livre, chapitre, type, motif]) => ({
    segment_id: parNumero.get(numero)?.id, canon_id: null, livre, chapitre,
    type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
]
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')
const cleLien = (l) => `${l.segment_id}|${l.canon_id ?? `${l.livre}.${l.chapitre}`}|${l.type}|${l.motif}`
if (new Set(rows.map(cleLien)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie XVI : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
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
  for (const marqueur of [...Array.from({ length: 25 }, (_, i) => String(284 + i)), 'H16I', 'H16Z', 'H16A', 'H16C', 'H16T'])
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

// Nettoyage limité aux corruptions certaines rencontrées aux points d'ancrage.
corriger(1643, 'mais aussi y’ay rougi', 'mais aussi j’ay rougi')
corriger(1648, 'priez, gemiflez', 'priez, gemissez')
corriger(1650, 'beny a jamais', 'beny à jamais')
corriger(1654, 'ancre facrée', 'ancre sacrée')
corriger(1654, 'bâty sa maison fur le sable', 'bâty sa maison sur le sable')
corriger(1660, 'faulx Zach. s. détruisante', 'faulx détruisante')
corriger(1664, 'san répandre', 'sans répandre')
corriger(1665, 'il ne fert à rien', 'il ne sert à rien')
corriger(1670, 'Vous ne· jurerez point', 'Vous ne jurerez point')
corriger(1671, 'ce qui sregarde', 'ce qui regarde')
corriger(1671, 'nous soûmettons à ieur volonté', 'nous nous soûmettons à leur volonté')
corriger(1673, 'qu’on vous a leurs aujourd’huy', 'qu’on vous a leuës aujourd’huy')
corriger(1675, 'il ne pûr faire le vain', 'il ne pût faire le vain')
corriger(1684, 'l’amour de. Kk iij Jesus-Christ', 'l’amour de Jesus-Christ')
corriger(1684, 'se fortisie', 'se fortifie')
corriger(1692, 'sans qu’il lux en coûte', 'sans qu’il luy en coûte')
corriger(1694, 'methode, qui i.', 'methode, qui')
corriger(1701, 'jesuse Christ', 'Jesus-Christ')
corriger(1704, 'que les infirmitez', 'que dans les infirmitez')
corriger(1714, 'sommes rendds dignes', 'sommes rendus dignes')
corriger(1719, 'à table cettopensée', 'à table cette pensée')
corriger(1722, 'cest par eux', 'c’est par eux')
corriger(1723, 'disoitil', 'disoit-il')
corriger(1723, 'Or ne peut tenir', 'On ne peut tenir')
corriger(1727, 'que fervent tant de junes fans amendement', 'que servent tant de jûnes sans amendement')
corriger(1727, 'Javois un ennemy', 'J’avois un ennemy')
corriger(1727, '¡en ay quitté', 'j’en ay quitté')
corriger(1728, 'je ne fure plus', 'je ne jure plus')
corriger(1732, 'Yos dignitez', 'Vos dignitez')
corriger(1734, 'Ila placé', 'Il a placé')
corriger(1737, 'la jeunesle', 'la jeunesse')
corriger(1738, 'St on vous avoit', 'Si on vous avoit')

deplacer('H16I', 1644, 'S. Paul ne veut pas qu’un Fidele demande justice à un Payen')
deplacer('284', 1649, 'La constance du saint Homme Job')
deplacer('285', 1654, 'ressemble à l’homme fou')
deplacer('H16Z', 1660, 'de la faulx volante')
deplacer('286', 1670, 'Vous ne jurerez point')
deplacer('287', 1670, 'Vous ne jurerez point[[286]]')
deplacer('288', 1674, 'Paul enchaîné pour la cause de Jesus-Christ')
deplacer('289', 1675, 'son ravissement au Ciel')
deplacer('H16A', 1690, 'sans être chargez de chaînes, comme je le suis')
deplacer('290', 1691, 'les chaînes que je porte')
deplacer('291', 1691, 'à Timothée')
deplacer('292', 1691, 'à Philemon')
deplacer('293', 1691, 'aux Juifs')
deplacer('294', 1691, 'aux habitans de Philippes')
deplacer('295', 1695, 'avec ceux qui n’ont point de loy')
deplacer('296', 1696, 'dans de vieux tonneaux')
deplacer('297', 1696, 'dans de vieux tonneaux[[296]]')
deplacer('298', 1696, 'dans de vieux tonneaux[[296]][[297]]')
deplacer('H16C', 1700, 'ce qui manque aux souffrances de Jesus-Christ')
deplacer('299', 1701, 'mais souffrir pour luy')
deplacer('300', 1701, 'qu’il se glorifie en ses douleurs')
deplacer('301', 1703, 'afin que la vertu de Jesus-Christ habite en moy')
deplacer('302', 1704, 'dans les infirmitez')
deplacer('303', 1705, 'pour avoir été mis en prison')
deplacer('304', 1718, 'qu’une legere souffrance nous assure une eternite de contentemens')
deplacer('H16T', 1723, 'mais la parole de Dieu n’est point captive')
deplacer('305', 1724, 'Peut-on exercer la patience dans le bon-heur')
deplacer('306', 1731, 'personne ne vous ravira vôtre joye')
deplacer('307', 1734, 'sa justice durera autant que les Siecles')
deplacer('308', 1734, 'où les voleurs, ni la roüille n’ont point d’entrée')

const notesAttendues = new Map([
  [1644, '[[H16I]] 1. Cor. 6.'],
  [1649, '[[284]] Job. 1.'],
  [1654, '[[285]] Matt. 7.'],
  [1660, '[[H16Z]] Zach. 5.'],
  [1670, '[[286]] Exod. 23.\n[[287]] Matt. 5.'],
  [1674, '[[288]] Philem.'],
  [1675, '[[289]] 2. Cor. 12.'],
  [1690, '[[H16A]] Act. 26.'],
  [1691, '[[290]] Ephes. 4.\n[[291]] 2. Tim. 2.\n[[292]] Philem.\n[[293]] Act. 28.\n[[294]] Philip. 1.'],
  [1695, '[[295]] 1. Cor. 9.'],
  [1696, '[[296]] Matt. 9.\n[[297]] Marc. 2.\n[[298]] Luc. 15.'],
  [1700, '[[H16C]] Coloss. 1.'],
  [1701, '[[299]] Philip. 1.\n[[300]] Rom. 5.'],
  [1703, '[[301]] 2. Cor. 12.'],
  [1704, '[[302]] 2. Cor. 11.'],
  [1705, '[[303]] 2. Cor. 11.'],
  [1718, '[[304]] 2. Cor. 4.'],
  [1723, '[[H16T]] 2. Tim. 2.'],
  [1724, '[[305]] Rom. 5.'],
  [1731, '[[306]] Joan. 16.'],
  [1734, '[[307]] Psal. 111.\n[[308]] Luc. 12.'],
])

const appels = segments.flatMap((s) => [...s.segment_texte_corrige.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = [...notesAttendues.values()].flatMap((n) => [...n.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 30 || definitions.length !== 30 || new Set(appels).size !== 30
  || appels.some((m) => !definitions.includes(m)) || definitions.some((m) => !appels.includes(m)))
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)

if (!WRITE) {
  console.log('30 appels/30 définitions de notes reconstruits (--dry : rien écrit)')
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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XVI',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
