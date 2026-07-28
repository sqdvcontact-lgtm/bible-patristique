// Lecture intégrale de l'Homélie XIII au peuple d'Antioche (A0014O0038,
// segments 1383-1456). Les références [[250]] à [[256]] et trois références
// marginales absorbées par l'OCR sont reconstruites et replacées en notes.
//
//   node scripts/chrysostome-antioche-hom13-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom13-lecture.mjs --write

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
  [1383, 'JOB.1.21', 2, 'reprise fondue de l’exorde de Job : « Que le Seigneur soit béni »'],
  [1401, 'ECC.1.2', 1, 'citation annoncée de Salomon : vanité des vanités, tout est vanité ; note [[250]]'],
  [1401, 'ECC.12.8', 1, 'seconde occurrence éditorialement indiquée de la même sentence ; note [[250]] « Eccles. 1. & 12. »'],
  [1402, 'ISA.40.6', 1, 'citation annoncée de la gloire humaine semblable à la fleur des champs ; note [[251]]'],
  [1402, 'ISA.40.7', 1, 'suite de la citation : l’herbe sèche et la fleur tombe ; note [[251]]'],
  [1421, 'MAT.7.12', 1, 'citation de la règle d’or : faire aux autres ce que l’on veut recevoir ; note [[252]]'],
  [1423, 'TOB.4.16', 2, 'reprise métaphorique du précepte négatif : ne pas préparer à son frère ce que l’on hait ; [[253]] corrigé par le fac-similé de « Job. 4 » en « Tob. 4 »'],
  [1434, 'SIR.13.15', 1, 'citation annoncée du Sage : tout homme aime son prochain ; référence [[E1]] « Eccles. 13 » extraite du corps'],
  [1444, 'MAT.18.12', 2, 'reprise de la brebis perdue parmi les cent brebis ; référence marginale [[M1]] « Matt. 18 » extraite du corps'],
  [1444, 'MAT.18.13', 2, 'reprise de la joie du pasteur pour la brebis retrouvée plus que pour le reste du troupeau ; [[M1]]'],
  [1445, '1CO.5.1', 2, 'rappel de l’unique fornicateur de Corinthe ; référence marginale [[C1]] « 1. Cor. 5 » retrouvée sur le fac-similé'],
  [1452, 'ROM.2.6', 2, 'reprise de la responsabilité personnelle : Dieu veut que chacun soit artisan de son bonheur ; note [[255]] « Rom. 2 » réancrée'],
  [1455, 'JER.15.1', 2, 'reprise de Moïse et Samuel incapables d’intercéder pour le peuple rebelle ; note [[256]]'],
]

const plage = (debut, fin, canon, motif) => Array.from({ length: fin - debut + 1 }, (_, i) => [debut + i, canon, 3, motif])
const COMMENTAIRES = [
  ...plage(1401, 1404, 'ECC.1.2', 'application de la vanité des grandeurs humaines à la chute soudaine des notables d’Antioche'),
  ...plage(1402, 1404, 'ISA.40.6', 'application de la fleur des champs à la fragilité de la richesse, de la naissance et des secours humains'),
  ...plage(1402, 1404, 'ISA.40.7', 'application de l’herbe desséchée à la ruine soudaine des grandeurs humaines'),
  ...plage(1417, 1441, 'ROM.2.15', 'suite explicite du commentaire de la loi naturelle inscrite dans le cœur et attestée par la conscience'),
  ...plage(1421, 1424, 'MAT.7.12', 'commentaire de la règle d’or comme expression évangélique d’une loi déjà déposée dans la conscience'),
  ...plage(1423, 1424, 'TOB.4.16', 'commentaire du précepte négatif de Tobie, complément de la règle d’or'),
  ...plage(1432, 1434, 'SIR.13.15', 'commentaire de la sympathie naturelle entre les hommes, confirmée par le Sage'),
  [1444, 'MAT.18.12', 3, 'application de la recherche de la brebis perdue au petit nombre de fidèles qui jurent encore'],
  [1444, 'MAT.18.13', 3, 'application de la joie pour la brebis retrouvée à la conversion de tous les fidèles'],
  ...plage(1445, 1446, '1CO.5.1', 'commentaire de l’unique fornicateur de Corinthe comme exemple de la contagion d’un vice laissé sans correction'),
  ...plage(1452, 1455, 'ROM.2.6', 'commentaire de la responsabilité personnelle : nul ne peut accomplir les œuvres ni recevoir le jugement à la place d’un autre'),
  [1455, 'JER.15.1', 3, 'application de Jr 15,1 à l’impossibilité pour le prédicateur de sauver des auditeurs négligents'],
  ...plage(1442, 1455, 'MAT.5.34', 'commentaire suivi de l’interdiction évangélique de jurer dans l’exhortation finale'),
]

// La note imprimée « Eccl. 29 » accompagne l’impossibilité d’accomplir des
// œuvres méritoires à la place d’autrui. Aucun verset de Si 29 ne correspond
// suffisamment : le manque est déclaré, et non forcé sur un créneau voisin.
const NON_RESOLUS = [[1452, 2,
  'Référence éditoriale [[254]] « Eccl. 29 » réellement imprimée, mais sans formulation correspondante identifiable dans Qohélet ou Siracide 29 ; cible à constituer']]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1383).lte('segment_numero', 1456).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 74) throw new Error(`74 segments attendus, ${segments.length} trouvés`)
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
for (const [numero, type, motif] of NON_RESOLUS) rows.push({
  segment_id: parNumero.get(numero)?.id, canon_id: null, livre: null, chapitre: null,
  type, fiabilite: 'à constituer', motif, provenance: 'lecture', arbitrage_requis: true,
})
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')
const cleLien = (l) => `${l.segment_id}|${l.canon_id ?? 'NULL'}|${l.type}|${l.motif}`
if (new Set(rows.map(cleLien)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie XIII : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · ${NON_RESOLUS.length} à constituer · 74 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of ['E1', 'M1', 'C1', ...Array.from({ length: 7 }, (_, i) => String(250 + i))])
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

// Nettoyage limité aux corruptions OCR certaines constatées pendant la lecture.
corriger(1384, 'nuit cternelle', 'nuit eternelle')
corriger(1387, 'Dd iII ', '')
corriger(1389, 'les veux au Ciel', 'les yeux au Ciel')
corriger(1395, 'par sæ déposition', 'par sa déposition')
corriger(1397, 'trembloient pouit leurs parens', 'trembloient pour leurs parens')
corriger(1398, 'la tyrannje de la hature', 'la tyrannie de la nature')
corriger(1405, 'disoisje', 'disois-je')
corriger(1411, 'cepenr dans', 'cependant')
corriger(1418, 'Dieu nous à inspiré', 'Dieu nous a inspiré')
corriger(1422, 'qu’on vous aimne', 'qu’on vous aime')
corriger(1431, 'Tune enseigne', 'l’une enseigne')
corriger(1434, 'Tout homme Eccles: ui: aime son prochain', 'Tout homme aime son prochain')
corriger(1440, 'Ec iij ', '')
corriger(1444, 'generale Mattus, conversion', 'generale conversion')
corriger(1450, 'sur l’arrain, où sur le bronze', 'sur l’airain, ou sur le bronze')
corriger(1452, 'vôtre falut', 'vôtre salut')

deplacer('250', 1401, 'Vanité des vanitez, tout n’est rien que vanité')
deplacer('251', 1402, 'elles tombent aussi-tost que les herbes sont sechées')
deplacer('252', 1421, 'Faites aux autres ce que vous voulez que l’on vous fasse')
deplacer('253', 1423, 'ne préparez point à vôtre frere l’absynthe que vous haïssez')
deplacer('E1', 1434, 'Tout homme aime son prochain')
deplacer('M1', 1444, 'tout le reste du troupeau')
deplacer('C1', 1445, 'si toute la ville eût eté pleine d’impuretez')
deplacer('254', 1452, 'il y a de l’impossibilité à ce souhait')
deplacer('255', 1452, 'chacun soit artisan de son bon-heur')
deplacer('256', 1455, 'd’excuser leur paresse')

const notesAttendues = new Map([
  [1401, '[[250]] Eccles. 1. & 12.'],
  [1402, '[[251]] Esaïe 40.'],
  [1421, '[[252]] Matt. 7.'],
  [1423, '[[253]] Tob. 4.'],
  [1434, '[[E1]] Eccles. 13.'],
  [1444, '[[M1]] Matt. 18.'],
  [1445, '[[C1]] 1. Cor. 5.'],
  [1452, '[[254]] Eccl. 29.\n[[255]] Rom. 2.'],
  [1455, '[[256]] Hier. 15.'],
])

const appels = segments.flatMap((s) => [...s.segment_texte_corrige.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = [...notesAttendues.values()].flatMap((n) => [...n.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 10 || definitions.length !== 10 || new Set(appels).size !== 10
  || appels.some((m) => !definitions.includes(m)) || definitions.some((m) => !appels.includes(m)))
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)

if (!WRITE) {
  console.log('10 appels/10 définitions de notes reconstruits (--dry : rien écrit)')
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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XIII',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
