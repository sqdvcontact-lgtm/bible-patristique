// Lecture intégrale de l'Homélie XII au peuple d'Antioche (A0014O0038,
// segments 1284-1382). Les références [[222]] à [[249]] et deux références
// marginales absorbées par l'OCR sont reconstruites et replacées en notes.
//
//   node scripts/chrysostome-antioche-hom12-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom12-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// [segment_numero, canon_id, type, motif]
const VERSETS = [
  [1286, 'SIR.18.25', 2, 'reprise fondue : se souvenir de la famine au temps de l’abondance ; note [[222]] imprimée « Eccl. 28 »'],
  [1287, '1TI.1.12', 1, 'citation de Paul rendant grâces au Christ qui l’a fortifié ; note [[223]]'],
  [1287, '1TI.1.13', 1, 'citation de Paul autrefois blasphémateur et persécuteur, mais traité avec miséricorde ; note [[223]]'],
  [1299, 'PSA.18.2', 2, 'rappel du lemme des trois jours précédents : les cieux racontent la gloire de Dieu ; note [[224]]'],
  [1299, 'ROM.1.20', 2, 'reprise de la connaissance du Créateur invisible par les créatures visibles ; note [[225]]'],
  [1302, 'PSA.103.2', 1, 'citation du ciel étendu comme une peau ; note [[226]]'],
  [1302, 'JER.51.15', 2, 'parallèle éditorial sur la terre affermie par la sagesse de Dieu ; note [[227]]'],
  [1305, 'MAT.5.45', 2, 'reprise du soleil levé et de la pluie donnée aux bons comme aux méchants ; note [[228]]'],
  [1306, 'PRO.6.6', 2, 'invitation à apprendre de la fourmi ; note [[229]] réancrée sur le début de l’exemple'],
  [1314, 'MAT.10.16', 2, 'reprise de la simplicité de la colombe ; [[233]] corrigé par le fac-similé en « Matt. 10 »'],
  [1314, 'MAT.6.26', 1, 'citation des oiseaux nourris par le Père céleste ; note [[230]]'],
  [1315, 'JER.8.7', 1, 'citation de l’hirondelle et de la tourterelle connaissant leur temps, contrairement au peuple ; note [[231]]'],
  [1315, 'ISA.1.3', 4, 'écho à l’inattention d’Israël figurée par le bœuf et l’âne : la note [[232]] subsiste mais la phrase parallèle est omise dans cette traduction'],
  [1316, 'PSA.13.3', 2, 'reprise du venin sous les lèvres ; première cible de la note composite [[234]]'],
  [1316, 'PSA.139.4', 2, 'reprise du venin des serpents sous les lèvres ; seconde cible de [[234]], rétablie par le fac-similé'],
  [1325, 'SIR.3.22', 2, 'reprise de l’interdiction de sonder ce qui dépasse l’homme ; note [[235]] imprimée « Eccles. 7 »'],
  [1326, 'SIR.3.23', 2, 'condensation de la limite imposée aux recherches humaines ; note [[236]] « Eccli. 3 »'],
  [1332, 'EXO.20.13', 1, 'citation du commandement de ne pas tuer ; note [[237]]'],
  [1332, 'DEU.5.17', 1, 'citation parallèle du commandement de ne pas tuer ; note [[238]]'],
  [1333, 'EXO.20.11', 1, 'citation du repos divin au septième jour ; note [[239]]'],
  [1334, 'DEU.5.15', 1, 'citation du souvenir de l’esclavage en Égypte ; note [[240]] imprimée « Deut. 24 »'],
  [1337, 'GEN.3.12', 1, 'citation d’Adam rejetant la faute sur la femme ; note [[241]] imprimée « Genes. 2 »'],
  [1337, 'GEN.3.13', 2, 'reprise de la femme rejetant la faute sur le serpent ; note [[241]]'],
  [1338, 'GEN.3.10', 1, 'citation d’Adam qui se cache parce qu’il est nu'],
  [1338, 'GEN.3.11', 1, 'citation de la question divine révélant la transgression'],
  [1340, 'GEN.4.3', 2, 'reprise de l’offrande de Caïn faite avec les fruits de la terre'],
  [1340, 'GEN.4.4', 2, 'reprise parallèle de l’offrande d’Abel'],
  [1343, 'GEN.4.8', 1, 'citation de l’invitation de Caïn à sortir dans la campagne ; note [[242]]'],
  [1344, 'GEN.4.9', 1, 'citation de la question divine sur Abel et de la réponse de Caïn'],
  [1345, 'GEN.4.13', 1, 'citation de Caïn jugeant son crime trop grand pour être pardonné'],
  [1351, 'ROM.2.14', 1, 'citation des nations sans Loi accomplissant naturellement ce que la Loi commande ; note [[243]] imprimée « Rom. 3 »'],
  [1351, 'ROM.2.15', 1, 'citation de la loi écrite dans les cœurs et du témoignage de la conscience ; note [[243]]'],
  [1351, 'ROM.2.16', 1, 'citation du jugement des pensées au jour où Dieu jugera les secrets ; note [[243]]'],
  [1352, 'ROM.2.12', 1, 'citation de ceux qui ont péché sans la Loi et périront sans la Loi ; référence marginale [[R1]] « Ibid. » extraite du corps'],
  [1354, 'ROM.2.10', 1, 'citation de la gloire, de l’honneur et de la paix pour celui qui fait le bien'],
  [1355, 'ROM.2.9', 1, 'citation de l’affliction et du désespoir pour tout homme qui fait le mal'],
  [1358, 'ROM.1.32', 2, 'reprise de ceux qui connaissent la justice de Dieu et savent les pécheurs dignes de mort ; [[R2]] « Rom. 1 » réancré'],
  [1362, 'ROM.2.3', 1, 'citation de celui qui condamne autrui tout en commettant les mêmes fautes ; note [[244]]'],
  [1364, 'ROM.2.4', 1, 'citation du mépris des richesses de la bonté et de la patience divines ; note [[245]]'],
  [1365, 'ROM.2.5', 1, 'citation du cœur impénitent amassant un trésor de colère ; note [[245]]'],
  [1365, 'ROM.2.6', 1, 'citation de Dieu rendant à chacun selon ses œuvres ; note [[245]]'],
  [1370, 'JER.7.25', 2, 'reprise adaptée des prophètes envoyés dès le matin ; note [[246]]'],
  [1370, 'JER.7.26', 2, 'reprise adaptée du peuple qui n’écoute pas les envoyés de Dieu ; note [[246]]'],
  [1373, 'MAT.25.26', 1, 'citation du mauvais serviteur déclaré méchant et paresseux ; note [[247]] imprimée « Matt. 18 »'],
  [1373, 'MAT.25.27', 1, 'citation de l’argent qui aurait dû être confié aux banquiers ; note [[247]]'],
  [1375, 'MAT.25.18', 2, 'reprise du serviteur qui enfouit le talent reçu'],
  [1377, 'MAT.25.21', 1, 'citation de l’entrée du bon serviteur dans la joie de son maître ; note [[248]]'],
  [1381, 'EZK.18.23', 2, 'reprise de la volonté divine de voir le pécheur se convertir plutôt que mourir ; note [[249]]'],
]

const plage = (debut, fin, canon, motif) => Array.from({ length: fin - debut + 1 }, (_, i) => [debut + i, canon, 3, motif])
const COMMENTAIRES = [
  ...plage(1299, 1329, 'PSA.18.2', 'commentaire suivi achevant l’exposé sur la création qui révèle la gloire du Créateur'),
  ...plage(1299, 1329, 'ROM.1.20', 'commentaire suivi de la connaissance du Dieu invisible à partir de la création visible'),
  ...plage(1306, 1310, 'PRO.6.6', 'commentaire moral de la fourmi, maîtresse de travail et de prévoyance'),
  ...plage(1322, 1326, 'SIR.3.22', 'commentaire sur les limites de la recherche humaine devant la Providence'),
  ...plage(1322, 1326, 'SIR.3.23', 'commentaire sur les réalités qui dépassent l’intelligence humaine'),
  ...plage(1330, 1366, 'ROM.2.15', 'commentaire suivi de la loi naturelle inscrite dans le cœur et attestée par la conscience'),
  ...plage(1336, 1339, 'GEN.3.10', 'commentaire de la conscience d’Adam qui l’accuse avant toute loi écrite'),
  ...plage(1337, 1339, 'GEN.3.12', 'commentaire de l’aveu incomplet d’Adam et du rejet de sa faute sur la femme'),
  ...plage(1340, 1342, 'GEN.4.3', 'commentaire des offrandes de Caïn et d’Abel comme preuve d’une connaissance naturelle du culte'),
  ...plage(1340, 1342, 'GEN.4.4', 'commentaire des offrandes de Caïn et d’Abel comme preuve d’une connaissance naturelle du culte'),
  ...plage(1343, 1345, 'GEN.4.8', 'commentaire du meurtre d’Abel, de l’interrogatoire de Caïn et de l’accusation de sa conscience'),
  ...plage(1352, 1353, 'ROM.2.12', 'commentaire de la perdition sans Loi comme preuve de la loi naturelle'),
  ...plage(1354, 1356, 'ROM.2.10', 'commentaire de la récompense promise à quiconque fait le bien, Juif ou Gentil'),
  ...plage(1355, 1357, 'ROM.2.9', 'commentaire de la peine promise à tout homme qui fait le mal, Juif ou Gentil'),
  ...plage(1358, 1361, 'ROM.1.32', 'commentaire de la connaissance naturelle du juste jugement de Dieu'),
  ...plage(1361, 1363, 'ROM.2.3', 'commentaire de l’homme condamné par son propre jugement lorsqu’il impute à autrui ses propres fautes'),
  ...plage(1363, 1364, 'ROM.2.4', 'commentaire de la bonté et de la patience divines qui invitent à la pénitence'),
  ...plage(1364, 1365, 'ROM.2.5', 'commentaire du cœur endurci qui amasse un trésor de colère'),
  ...plage(1365, 1366, 'ROM.2.6', 'commentaire du jugement qui rendra à chacun selon ses œuvres'),
  ...plage(1367, 1381, 'MAT.5.34', 'commentaire suivi de l’interdiction évangélique de jurer, reprise dans l’exhortation finale'),
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1284).lte('segment_numero', 1382).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 99) throw new Error(`99 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))

const cibles = [...new Set([...VERSETS, ...COMMENTAIRES].map((l) => l[1]))]
const { data: versets, error: erreurVersets } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles)
if (erreurVersets) throw erreurVersets
const presentes = new Set((versets ?? []).map((v) => v.id_verset))
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const rows = [...VERSETS, ...COMMENTAIRES].map(([numero, canon_id, type, motif]) => ({
  segment_id: parNumero.get(numero)?.id, canon_id, livre: null, chapitre: null,
  type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
}))
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')
const cleLien = (l) => `${l.segment_id}|${l.canon_id}|${l.type}`
if (new Set(rows.map(cleLien)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie XII : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 99 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of ['R1', 'R2', ...Array.from({ length: 28 }, (_, i) => String(222 + i))])
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

// Nettoyage limité aux corruptions OCR certaines rencontrées pendant la lecture.
corriger(1297, 'guvres', 'œuvres')
corriger(1298, 'ufage', 'usage')
corriger(1321, 'admirez di xu', 'admirez Dieu')
corriger(1323, 'se portassent à mer la Providence', 'se portassent à nier la Providence')
corriger(1328, 'j en', 'j’en')
corriger(1330, 'fon cœur', 'son cœur')
corriger(1335, 'tempsmais', 'temps; mais')
corriger(1336, 'En ce temps. là', 'En ce temps-là')
corriger(1342, 'naturelie', 'naturelle')
corriger(1347, 'meurttes', 'meurtres')
corriger(1348, 'ceuxlà', 'ceux-là')
corriger(1348, 'Inventeut', 'Inventeur')
corriger(1352, 'iid Que ceux', 'Que ceux')
corriger(1352, 'Rem. I. Que veulent', 'Que veulent')
corriger(1354, 'eun', 'un')
corriger(1364, 'endurcislement', 'endurcissement')
corriger(1364, 'tarrireras', 't’attireras')
corriger(1366, 'recompen ser', 'récompenser')
corriger(1368, 'japprehende', 'j’appréhende')
corriger(1370, 're proche', 'reproche')
corriger(1371, 'quelquuir', 'quelqu’un')
corriger(1380, '(de pieté', 'de pieté')
corriger(1381, 'tres-hum ble', 'tres-humble')

deplacer('222', 1286, 'faute au jour du pardon')
deplacer('223', 1287, 'son persecuteur & son ennemy')
deplacer('224', 1299, 'la gloire de l’Eternel')
deplacer('225', 1299, 'le Createur qui est invisible')
deplacer('226', 1302, 'Tu étends le Ciel comme une peau')
deplacer('227', 1302, 'La Terre est fixe')
deplacer('228', 1305, 'dans l’Evangile')
deplacer('229', 1306, 'L’industrie de la Fourmy nous apprend à travailler')
deplacer('233', 1314, 'simplicité de la Colombe')
deplacer('230', 1314, 'mon Pere celeste prend soin de leur nourriture')
deplacer('231', 1315, 'mon Peuple n’a pas connu les jugemens de Dieu')
deplacer('232', 1315, 'nous donnent de l’amour pour la vertu')
deplacer('234', 1316, 'le venin sous la langue')
deplacer('235', 1325, 'sonder les abîmes de la Sagesse divine')
deplacer('236', 1326, 'un jour ne suffiroit pas pour expliquer les desseins de la Providence')
deplacer('238', 1332, 'Vous ne tuërez point')
deplacer('237', 1332, 'Vous ne tuërez point')
deplacer('239', 1333, 'le Seigneur se reposa')
deplacer('240', 1334, 'vous fûtes esclaves en Egypte')
deplacer('241', 1337, 'rejette la faute sur le Serpent')
deplacer('242', 1343, 'Allons, luy dit-il, à la campagne')
deplacer('243', 1351, 'juger le secret des cœurs')
deplacer('R1', 1352, 'punis sans la Loy')
deplacer('R2', 1358, 'sont dignes de mort')
deplacer('244', 1362, 'penses-tu échaper à la justice Divine')
deplacer('245', 1365, 'selon ses œuvres')
deplacer('246', 1370, 'vous avez fermé l’oreille à leurs paroles')
deplacer('247', 1373, 'mon argent à interest')
deplacer('248', 1377, 'des affaires d’une plus grande importance')
deplacer('249', 1381, 'mais son changement')

const notesAttendues = new Map([
  [1286, '[[222]] Eccl. 28.'],
  [1287, '[[223]] 1. Tim. 1.'],
  [1299, '[[224]] Psal. 18.\n[[225]] Rom. 1.'],
  [1302, '[[226]] Psal. 103.\n[[227]] Hier. 51.'],
  [1305, '[[228]] Matth. 5.'],
  [1306, '[[229]] Prov. 6.'],
  [1314, '[[233]] Matt. 10.\n[[230]] Matt. 6.'],
  [1315, '[[231]] Hier. 8.\n[[232]] Esaie 1.'],
  [1316, '[[234]] Psal. 13. & 139.'],
  [1325, '[[235]] Eccles. 7.'],
  [1326, '[[236]] Eccli. 3.'],
  [1332, '[[237]] Exod. 20.\n[[238]] Deut. 5.'],
  [1333, '[[239]] Exod. 20.'],
  [1334, '[[240]] Deut. 24.'],
  [1337, '[[241]] Genes. 2.'],
  [1343, '[[242]] Genes. 4.'],
  [1351, '[[243]] Rom. 3.'],
  [1352, '[[R1]] Ibid.'],
  [1358, '[[R2]] Rom. 1.'],
  [1362, '[[244]] Rom. 2.'],
  [1365, '[[245]] Ibid.'],
  [1370, '[[246]] Jerem. 7.'],
  [1373, '[[247]] Matt. 18.'],
  [1377, '[[248]] Ibid. 25.'],
  [1381, '[[249]] Ezech. 18.'],
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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XII',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
