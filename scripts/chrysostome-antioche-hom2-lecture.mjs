// Lecture intégrale de l'Homélie II au peuple d'Antioche (A0014O0038,
// segments 226-377). Les notes [[36]] à [[50]] sont résolues par le contenu.
// Les types 2, 3 et 4 sont des décisions de lecture, jamais une extraction.
//
//   node scripts/chrysostome-antioche-hom2-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom2-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// [segment_numero, canon_id, type, motif, fiabilite?, arbitrage_requis?]
const L = [
  [227, 'JOB.2.12', 2, 'les amis de Job déchirent leurs vêtements, jettent de la cendre et pleurent ; note [[36]]'],
  [229, 'JOB.2.3', 3, 'les épreuves de Job manifestent et accroissent sa justice'],
  [230, 'JOB.2.13', 2, 'les amis de Job gardent plusieurs jours le silence devant sa douleur'],
  [235, 'ISA.1.30', 1, 'citation : la cité comme un térébinthe sans feuilles et un jardin sans eau'],
  [243, 'GEN.4.12', 4, 'Antioche éprouve, comme Caïn, la condition du fugitif privé de repos'],
  [243, 'GEN.4.14', 4, 'la peur continuelle de Caïn éclaire celle des habitants traqués'],
  [249, 'AMO.8.9', 1, 'citation : le soleil se couche en plein midi'],
  [253, 'JER.9.9', 1, 'citation appelant montagnes et collines à se lamenter'],
  [253, 'JER.9.16', 1, 'citation appelant les pleureuses habiles'],
  [253, 'JER.9.17', 1, 'citation : les yeux deviennent des fontaines de larmes'],
  [258, 'EXO.6.9', 2, 'les Israélites accablés par la servitude n’écoutent plus Moïse'],
  [262, 'MAT.7.24', 2, 'le fidèle est fondé sur la pierre'],
  [263, 'MAT.7.25', 2, 'le torrent des afflictions ne renverse pas celui qui est fondé sur la pierre'],
  [278, '1TH.5.11', 1, 'citation : édifiez-vous les uns les autres ; note [[37]]'],
  [280, 'MAT.25.18', 3, 'application de la parabole au talent enfoui ; note [[38]]'],
  [280, 'MAT.25.27', 3, 'le talent confié doit fructifier'],
  [281, 'MAT.25.18', 3, 'interprétation du talent : corriger et avertir son prochain'],
  [281, 'MAT.25.27', 3, 'interprétation de la multiplication du talent par l’édification d’autrui'],
  [283, '1TI.6.17', 1, 'citation du lemme de l’homélie : avertir les riches de ne pas être orgueilleux ; note [[39]]'],
  [284, 'LUK.16.20', 3, 'Lazare pauvre dans ce monde mais riche dans l’autre ; note [[40]]'],
  [284, 'LUK.16.25', 3, 'le renversement eschatologique de Lazare et du riche'],
  [285, '1CO.2.9', 1, 'citation des biens que l’œil n’a pas vus et que l’oreille n’a pas entendus ; note [[41]]'],
  [286, 'LUK.16.24', 3, 'le riche réduit à demander une goutte d’eau'],
  [290, 'PSA.48.7', 1, 'citation contre ceux qui se confient dans leurs forces et leurs richesses ; note [[42]]'],
  [291, 'PSA.38.7', 1, 'citation : il amasse et ne sait pour qui ; note [[43]] imprimée fautivement « Ps. 33 »'],
  [300, 'LUK.18.20', 3, 'Jésus commence par proposer au riche les commandements accessibles ; note [[44]]'],
  [301, 'LUK.18.22', 1, 'citation : vendre ses biens et les distribuer aux pauvres'],
  [305, 'GEN.18.1', 3, 'Abraham riche mais détaché, sous sa tente aux chênes de Mambré ; note [[45]] placée trois segments plus tôt'],
  [306, 'GEN.18.1', 3, 'la tente d’Abraham sous le chêne de Mambré'],
  [307, 'GEN.18.2', 3, 'Abraham reçoit les visiteurs célestes'],
  [308, 'GEN.18.4', 3, 'hospitalité d’Abraham sous l’arbre'],
  [308, 'GEN.18.5', 3, 'Abraham offre du pain aux voyageurs'],
  [308, 'GEN.18.8', 3, 'Abraham sert ses hôtes sous l’arbre'],
  [309, 'MAT.25.36', 2, 'le Christ nu est négligé tandis que les murs sont ornés'],
  [313, 'LUK.16.9', 2, 'bâtir au ciel des tabernacles capables de recevoir autrui'],
  [315, 'MAT.6.20', 3, 'le Christ reçoit et garde les trésors déposés au ciel'],
  [321, 'EPH.3.17', 4, 'l’âme devient une demeure où le Christ habite'],
  [346, 'PRO.27.7', 1, 'citation : le rassasié méprise le miel, l’affamé trouve doux l’amer ; note [[46]]'],
  [347, 'PSA.80.17', 1, 'citation : rassasiés du miel sorti du rocher'],
  [348, 'EXO.17.6', 3, 'explication du miel du rocher par l’eau que Moïse en fait sortir'],
  [352, 'ECC.5.11', 1, 'citation : le sommeil du travailleur est doux ; note [[47]] imprimée fautivement « Eccl. 2 »'],
  [358, 'GEN.2.15', 3, 'le travail précède la chute : Adam est placé dans le jardin pour le cultiver ; note [[48]] imprimée « Gen. 1 »'],
  [359, 'GEN.3.23', 3, 'l’oisiveté d’Adam opposée à son expulsion vers le travail de la terre'],
  [359, '1TH.2.9', 2, 'Paul travaille nuit et jour sans relâche'],
  [359, '2CO.12.2', 3, 'Paul laborieux est néanmoins ravi au troisième ciel'],
  [365, 'JOB.2.3', 3, 'Job dépouillé demeure intègre et remporte la victoire sur Satan'],
  [372, '2KI.2.11', 3, 'Élie est ravi au ciel ; note [[50]] « Reg. 2 »'],
  [372, '2KI.2.13', 3, 'Élisée recueille le manteau laissé par Élie'],
  [374, '1CO.11.24', 4, 'le Christ laisse à ses disciples sa chair donnée pour eux'],
  [375, '1CO.10.16', 4, 'communication de la chair et du sang du Christ dans l’Eucharistie'],
]

// Commentaire suivi de 1 Tm 6,17 : chaque segment qui développe le lemme reçoit
// le verset commenté, conformément à la charte §9.6.
for (let numero = 284; numero <= 342; numero++) {
  let motif
  if (numero <= 292) motif = 'commentaire suivi de 1 Tm 6,17 : richesse du siècle présent et incertitude des biens'
  else if (numero <= 304) motif = 'commentaire suivi de 1 Tm 6,17 : l’orgueil, racine de l’attachement aux richesses'
  else if (numero <= 323) motif = 'commentaire suivi de 1 Tm 6,17 : bon usage des richesses, hospitalité et trésor céleste'
  else if (numero <= 330) motif = 'commentaire suivi de 1 Tm 6,17 : possession fragile et libéralité durable'
  else motif = 'commentaire suivi de 1 Tm 6,17 : Dieu donne les biens nécessaires et confie le superflu pour l’aumône'
  L.push([numero, '1TI.6.17', 3, motif])
}

// La note [[49]] ne permet pas de choisir honnêtement entre Pr 12,11, 12,24
// et 12,27 : le chapitre atteste le thème du travail, mais aucun verset unique.
const NON_RESOLUS = [[358, null, 3,
  'Référence éditoriale [[49]] « Prov. 12 » : le travail opposé à l’oisiveté ; candidats Pr 12,11, Pr 12,24 et Pr 12,27, sans indice discriminant.',
  'à constituer', true]]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, id_oeuvre, segment_numero').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 226).lte('segment_numero', 377).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 152) throw new Error(`152 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s.id]))

const cibles = [...new Set(L.map((l) => l[1]).filter(Boolean))]
const presentes = new Set()
for (let i = 0; i < cibles.length; i += 200) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles.slice(i, i + 200))
  if (error) throw error
  for (const v of data ?? []) presentes.add(v.id_verset)
}
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const rows = [...L, ...NON_RESOLUS].map(([numero, canon_id, type, motif, fiabilite = P, arbitrage_requis = false]) => ({
  segment_id: parNumero.get(numero), canon_id, type, fiabilite, motif,
  provenance: canon_id ? 'lecture' : 'editeur', arbitrage_requis,
}))
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie II : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · ${rows.filter((l) => l.fiabilite === 'à constituer').length} à constituer · 152 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type, fiabilite, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map((l) => l.canon_id
  ? `${l.segment_id}|${l.canon_id}|${l.type}`
  : `${l.segment_id}|sans-cible|${l.type}|${l.motif}`))
const aEcrire = rows.filter((l) => !deja.has(l.canon_id
  ? `${l.segment_id}|${l.canon_id}|${l.type}`
  : `${l.segment_id}|sans-cible|${l.type}|${l.motif}`))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

if (!WRITE) {
  console.log('(--dry : rien écrit)')
  process.exit(0)
}

for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie II',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus`)
