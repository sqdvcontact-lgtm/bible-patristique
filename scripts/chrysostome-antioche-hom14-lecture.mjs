// Lecture intégrale de l'Homélie XIV au peuple d'Antioche (A0014O0038,
// segments 1457-1556). Les références [[257]] à [[269]], deux références
// marginales absorbées par l'OCR et leurs appels sont reconstruits.
//
//   node scripts/chrysostome-antioche-hom14-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom14-lecture.mjs --write

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
  [1457, 'PSA.93.19', 1, 'citation directe des consolations proportionnées à la multitude des douleurs ; la note imprimée [[257]] « Psal. 39 » est fautive'],
  [1460, '2CO.1.8', 1, 'citation annoncée de la tribulation de Paul en Asie ; la note imprimée [[258]] « 2. Cor. 2 » est fautive'],
  [1461, '2CO.1.9', 1, 'suite de la citation : arrêt de mort reçu en soi-même'],
  [1464, '2CO.1.9', 1, 'reprise textuelle annoncée de la réponse de mort et de la confiance en Dieu qui ressuscite les morts'],
  [1470, 'MAT.14.9', 2, 'reprise narrative du serment d’Hérode qui le contraint à livrer la tête de Jean'],
  [1470, 'MAT.14.10', 2, 'reprise narrative de la décollation de Jean sur l’ordre d’Hérode'],
  [1481, '1SA.14.14', 2, 'reprise narrative de la première défaite infligée par Jonathan aux Philistins ; note [[259]]'],
  [1481, '1SA.14.15', 2, 'reprise narrative de la fuite et de l’effroi des Philistins'],
  [1482, '1SA.14.24', 2, 'reprise narrative du serment imprudent de Saül imposant le jeûne à l’armée'],
  [1488, '1SA.14.25', 2, 'reprise narrative de la forêt où le miel couvrait la terre ; note [[260]] corrigée par le fac-similé'],
  [1488, '1SA.14.26', 2, 'reprise narrative du peuple qui voit le miel sans oser y goûter'],
  [1494, '1SA.14.27', 2, 'reprise narrative complète de Jonathan goûtant le miel avec sa baguette et retrouvant la vue'],
  [1495, 'JDG.11.30', 2, 'reprise narrative du vœu inconsidéré de Jephté ; note [[261]]'],
  [1495, 'JDG.11.31', 2, 'reprise narrative de la promesse d’immoler le premier être venu à sa rencontre'],
  [1495, 'JDG.11.34', 2, 'reprise narrative de la fille unique courant la première au-devant de Jephté ; note [[262]]'],
  [1495, 'JDG.11.35', 2, 'reprise narrative de la douleur du père lié par son vœu'],
  [1498, 'JDG.11.40', 2, 'reprise narrative de la commémoration annuelle de la fille de Jephté par les vierges d’Israël'],
  [1499, 'GEN.22.12', 2, 'reprise du sacrifice d’Isaac interrompu par Dieu ; référence marginale [[G1]] retrouvée dans le corps OCR'],
  [1503, '1SA.14.27', 1, 'citation annoncée : après le miel, les yeux de Jonathan furent éclairés ; note [[263]]'],
  [1504, '1SA.14.28', 1, 'discours biblique repris directement : le soldat rapporte à Jonathan le serment de son père'],
  [1504, '1SA.14.29', 1, 'discours biblique repris directement : Jonathan juge que son père a ruiné ses troupes'],
  [1505, '1SA.14.36', 1, 'discours biblique repris directement : Saül propose de marcher contre les Philistins'],
  [1506, '1SA.14.36', 1, 'suite directe du même verset : le prêtre propose de consulter Dieu'],
  [1509, 'NUM.31.16', 4, 'écho à la séduction d’Israël par les femmes, attribuée au conseil de Balaam ; le texte homilétique transpose Moab en Madian'],
  [1510, 'NUM.25.1', 2, 'reprise narrative d’Israël entraîné à l’impureté avec les filles de Moab'],
  [1510, 'NUM.25.3', 2, 'reprise narrative de la perte de la faveur divine après l’attachement à Béelphégor'],
  [1511, 'PRO.5.3', 1, 'citation directe des lèvres de la prostituée plus douces que le miel ; note [[264]]'],
  [1511, 'PRO.5.4', 1, 'suite de la citation : fin amère comme l’absinthe et tranchante comme le glaive'],
  [1515, 'PRO.5.15', 1, 'citation annoncée : boire les eaux de sa citerne et les ruisseaux de son puits ; note [[266]]'],
  [1516, 'PRO.5.19', 1, 'citation annoncée : la biche aimée demeure auprès de son époux'],
  [1520, '1SA.14.36', 1, 'reprise directe de la parole du prêtre : approchons-nous du Seigneur'],
  [1520, '1SA.14.37', 1, 'citation directe de la consultation de Saül et du silence de Dieu'],
  [1522, '1SA.14.38', 1, 'discours biblique repris directement : rassembler le peuple et découvrir le coupable'],
  [1522, '1SA.14.39', 1, 'citation directe du second serment de Saül condamnant même Jonathan'],
  [1527, '1SA.14.41', 2, 'reprise narrative du sort qui retient Saül et Jonathan'],
  [1527, '1SA.14.42', 2, 'reprise narrative du second tirage qui désigne Jonathan'],
  [1528, '1SA.14.43', 1, 'citation directe de l’aveu de Jonathan sur le miel goûté avec sa baguette'],
  [1529, '1SA.14.44', 1, 'citation directe du serment par lequel Saül condamne Jonathan à mourir le jour même'],
  [1531, '1SA.14.45', 1, 'citation directe du serment contraire du peuple qui sauve Jonathan ; note [[267]]'],
  [1552, 'SIR.23.10', 1, 'citation directe du serviteur battu et de l’homme qui jure sans cesse ; note [[268]] corrigée en « Eccl. 23 »'],
  [1553, 'ACT.11.26', 2, 'reprise historique du nom de chrétiens donné pour la première fois à Antioche ; note [[269]]'],
]

const plage = (debut, fin, canon, motif) => Array.from({ length: fin - debut + 1 }, (_, i) => [debut + i, canon, 3, motif])
const COMMENTAIRES = [
  ...plage(1459, 1467, '2CO.1.8', 'commentaire suivi de l’affliction apostolique comme remède providentiel à la confiance en soi'),
  ...plage(1459, 1467, '2CO.1.9', 'commentaire suivi de l’arrêt de mort qui apprend à placer sa confiance en Dieu seul'),
  ...plage(1468, 1555, 'MAT.5.34', 'commentaire suivi de l’interdiction évangélique de jurer et des désordres produits par les serments'),
  ...plage(1469, 1471, 'MAT.14.9', 'commentaire de la mort de Jean-Baptiste comme fruit du serment d’Hérode'),
  ...plage(1469, 1471, 'MAT.14.10', 'commentaire de la tête de Jean-Baptiste devenue avertissement contre les serments'),
  ...plage(1482, 1487, '1SA.14.24', 'commentaire de l’imprudence du serment de Saül et des parjures qu’il rend possibles'),
  ...plage(1488, 1494, '1SA.14.27', 'commentaire du miel, de l’obéissance de l’armée et de la transgression innocente de Jonathan'),
  ...plage(1503, 1504, '1SA.14.27', 'commentaire des yeux éclairés de Jonathan comme blâme de la décision de Saül'),
  ...plage(1495, 1500, 'GEN.22.12', 'contraste entre le vœu de Jephté accompli et le sacrifice d’Isaac interrompu par Dieu'),
  ...plage(1509, 1510, 'NUM.31.16', 'commentaire moral de la séduction qui vainquit Israël lorsque les armes avaient échoué'),
  ...plage(1511, 1514, 'PRO.5.3', 'commentaire de la douceur trompeuse des lèvres de la femme impudique'),
  ...plage(1511, 1514, 'PRO.5.4', 'commentaire de l’amertume et du péril cachés sous les caresses de la femme impudique'),
  ...plage(1515, 1517, 'PRO.5.15', 'commentaire de la citerne propre comme image de la fidélité conjugale'),
  ...plage(1516, 1517, 'PRO.5.19', 'commentaire de la biche aimée comme figure de l’épouse légitime'),
  ...plage(1520, 1521, '1SA.14.37', 'commentaire du silence de Dieu comme manifestation clémente de son mécontentement'),
  ...plage(1522, 1526, '1SA.14.39', 'commentaire du second serment de Saül, qui le lie avant même la découverte du coupable'),
  ...plage(1527, 1530, '1SA.14.44', 'commentaire du troisième serment de Saül et de la sentence précipitée contre Jonathan'),
  ...plage(1530, 1538, '1SA.14.45', 'commentaire du serment contraire du peuple, du salut de Jonathan et des parjures qui en résultent'),
  [1552, 'SIR.23.10', 3, 'application de l’avertissement du Siracide à l’habitude de jurer et au parjure inévitable'],
  ...plage(1553, 1555, 'ACT.11.26', 'application à Antioche : devenir l’origine de l’abandon des serments comme elle fut celle du nom chrétien'),
]

// [segment_numero, livre, chapitre, motif] : une histoire suivie appelle une
// cible de chapitre, sans multiplier artificiellement tous ses versets.
const CHAPITRES = [
  ...plageChapitre(1480, 1494, '1SA', 14, 'commentaire suivi du serment de Saül, du miel et de la transgression de Jonathan en 1 Samuel 14'),
  ...plageChapitre(1501, 1508, '1SA', 14, 'reprise du commentaire suivi de Jonathan, puis de la consultation religieuse avant la bataille'),
  ...plageChapitre(1520, 1540, '1SA', 14, 'commentaire suivi du silence de Dieu, des sorts, de la condamnation et du salut de Jonathan'),
  ...plageChapitre(1495, 1500, 'JDG', 11, 'commentaire suivi du vœu de Jephté et de son accomplissement sur sa fille'),
]

function plageChapitre(debut, fin, livre, chapitre, motif) {
  return Array.from({ length: fin - debut + 1 }, (_, i) => [debut + i, livre, chapitre, motif])
}

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1457).lte('segment_numero', 1556).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 100) throw new Error(`100 segments attendus, ${segments.length} trouvés`)
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
console.log(`${OEUVRE}, Homélie XIV : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 100 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, livre, chapitre, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of ['R1', 'G1', ...Array.from({ length: 13 }, (_, i) => String(257 + i))])
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

// Nettoyage limité aux corruptions OCR certaines constatées sur le fac-similé.
corriger(1457, 'consolarions se sont Tepanduës', 'consolations se sont répanduës')
corriger(1462, 'orage à fait', 'orage a fait')
corriger(1465, 'quedtes mal-heurs', 'que ces mal-heurs')
corriger(1472, 'la plus pluspart', 'la pluspart')
corriger(1472, 'de vm ou de colere', 'de vin ou de colere')
corriger(1484, 'un grande multitude', 'une grande multitude')
corriger(1484, 'cette tencontre', 'cette rencontre')
corriger(1486, 'd’un jerment', 'd’un serment')
corriger(1487, 'qu’om les aide', 'qu’on les aide')
corriger(1488, 'la defenfe', 'la defense')
corriger(1489, 'son iij Souverain', 'son Souverain')
corriger(1491, 'un lerment', 'un serment')
corriger(1494, 'baguette mnnocemment', 'baguette innocemment')
corriger(1498, 'Et qu’ainfi ne soit', 'Et qu’ainsi ne soit')
corriger(1499, 'il Genesazen empescha', 'il en empescha')
corriger(1512, 'naime point', 'n’aime point')
corriger(1517, 'ne relpire', 'ne respire')
corriger(1517, 'la confideration', 'la consideration')
corriger(1519, 'je n entreprends', 'je n’entreprends')
corriger(1519, 'soit univerfel', 'soit universel')
corriger(1524, 'sans connoissance de causes Peut-on', 'sans connoissance de cause. Peut-on')
corriger(1524, 'de plus mnique', 'de plus inique')
corriger(1525, 'silence serà cause', 'silence sera cause')
corriger(1525, 'livrer a nos ennemis', 'livrer à nos ennemis')
corriger(1528, 'ma bagueite', 'ma baguette')
corriger(1528, 'l’ay portés', 'l’ay portée')
corriger(1529, 'Aiust Dieu', 'Ainsi Dieu')
corriger(1531, 'le Jauveur d’Ifraël', 'le Sauveur d’Israël')
corriger(1531, 'à la renverfe', 'à la renverse')
corriger(1532, 'trois fermens', 'trois sermens')
corriger(1533, 'le meurtte', 'le meurtre')
corriger(1533, 'J’assassinat', 'l’assassinat')
corriger(1536, 'manquer a fa parole', 'manquer à sa parole')
corriger(1549, 'Nous qui somtnes', 'Nous qui sommes')
corriger(1549, 'la dêlivrance', 'la délivrance')
corriger(1552, 'Le serviteur que l’on but', 'Le serviteur que l’on bat')
corriger(1552, 'Et J’homme qui jure', 'Et l’homme qui jure')

deplacer('257', 1457, 'vos consolations se sont répanduës dans mon ame')
deplacer('258', 1461, 'nous avons eu en nous mêmes la réponse de mort')
deplacer('R1', 1460, 'mes Freres')
deplacer('259', 1481, 'mit le reste en fuïte')
deplacer('260', 1488, 'non sans se licentier à quelque murmure')
deplacer('261', 1495, 'le meurtrier de son Fils')
deplacer('262', 1495, 'la funeste avanture de Jephté')
deplacer('G1', 1499, 'il en empescha l’execution')
deplacer('263', 1503, 'ses yeux virent')
deplacer('264', 1511, 'plus dangereuses que le glaive')
deplacer('265', 1515, 'une femme impudique')
deplacer('266', 1515, 'les eaux de nos cisternes, & les ruisseaux de nos puits')
deplacer('267', 1530, 'Mais voicy le Peuple qui s’oppose à Saül')
deplacer('268', 1552, 'sera toûjours remply d’iniquité')
deplacer('269', 1553, 'dans Antioche à prendre le nom de Chrétiens')

const notesAttendues = new Map([
  [1457, '[[257]] Psal. 39.'],
  [1460, '[[R1]] 1. Reg. 14.'],
  [1461, '[[258]] 2. Cor. 2.'],
  [1481, '[[259]] 1. Reg. 14.'],
  [1488, '[[260]] 1. Reg. 14.'],
  [1495, '[[261]] Judic. 11.\n[[262]] Ibid.'],
  [1499, '[[G1]] Genes. 22.'],
  [1503, '[[263]] 1. Reg. 14.'],
  [1511, '[[264]] Prov. 5.'],
  [1515, '[[265]] Prov. 5.\n[[266]] Ibid.'],
  [1530, '[[267]] 1. Reg. 14.'],
  [1552, '[[268]] Eccl. 23.'],
  [1553, '[[269]] Act. 11.'],
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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XIV',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
