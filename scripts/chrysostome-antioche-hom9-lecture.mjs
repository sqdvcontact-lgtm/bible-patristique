// Lecture intégrale de l'Homélie IX au peuple d'Antioche (A0014O0038,
// segments 1023-1110). Les références éditoriales [[171]] à [[184]] sont
// réancrées par le contenu ; deux références marginales restées dans le corps
// deviennent les notes [[J1]] (Jean 13) et [[M1]] (Matthieu 5).
//
//   node scripts/chrysostome-antioche-hom9-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom9-lecture.mjs --write

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
  [1025, '2CO.6.12', 2, 'reprise de la parole paulinienne : tous les fidèles ont place dans le cœur du prédicateur'],

  [1033, 'JHN.13.31', 4, 'rappel du long discours commencé après la Cène ; référence marginale Jean 13 reconstruite en [[J1]]'],
  [1033, 'JHN.6.11', 2, 'rappel de la foule rassasiée dans le désert ; note [[171]] « Ibid. 6 »'],
  [1033, 'JHN.6.26', 2, 'rappel du discours donné après la multiplication des pains à la foule rassasiée'],

  [1052, 'ROM.1.18', 1, 'citation de la colère divine révélée contre ceux qui retiennent la vérité dans l’injustice ; [[172]] « Rom. 2 » corrigé par le contenu'],
  [1053, 'ROM.1.19', 2, 'reprise fondue : les païens ont connu ce qui peut conduire à la connaissance de Dieu'],
  [1054, 'ROM.1.20', 2, 'reprise fondue : la nature divine invisible se rend connaissable par les ouvrages créés'],
  [1055, 'WIS.13.5', 2, 'reprise fondue de la grandeur et de la beauté des créatures faisant connaître leur auteur ; note [[173]] réancrée'],
  [1055, 'PSA.18.2', 1, 'citation : les cieux annoncent la gloire de Dieu ; note [[174]]'],
  [1060, 'PSA.18.4', 2, 'reprise de la voix des cieux comprise de toutes les nations et de toutes les langues'],
  [1062, 'PSA.18.3', 2, 'reprise fondue du jour et de la nuit qui publient la gloire de Dieu'],

  [1077, 'PSA.23.2', 2, 'reprise du fondement de la terre sur les mers et les fleuves ; note [[177]] réancrée'],
  [1077, 'PSA.135.6', 2, 'reprise parallèle de la terre affermie sur les eaux ; note [[178]] réancrée'],
  [1081, 'JOB.26.7', 2, 'citation condensée dans la traduction française : la terre suspendue sur le néant ; note [[179]]'],
  [1081, 'PSA.94.4', 2, 'citation condensée dans la traduction française : les fondements de la terre dans la main de Dieu ; note [[180]]'],
  [1081, 'PSA.23.2', 2, 'nouvelle citation condensée de la terre fondée sur les mers ; note [[181]] déplacée depuis le feu'],
  [1084, 'PSA.148.4', 2, 'reprise des eaux situées au-dessus des cieux ; note [[182]] déplacée depuis le segment suivant'],
  [1089, 'JER.5.22', 1, 'citation de la mer contenue par une borne de sable ; note [[183]] réancrée'],

  [1098, 'PSA.18.2', 2, 'reprise adaptée : les cieux annoncent la gloire de leur Maître'],
  [1098, 'MAT.5.16', 1, 'citation : que votre lumière éclaire les hommes afin qu’ils glorifient le Père ; référence marginale reconstruite en [[M1]]'],
  [1099, 'MAT.5.44', 2, 'reprise fondue : les chrétiens prient pour leurs ennemis'],

  [1107, 'ZEC.5.1', 2, 'reprise selon la leçon grecque de la faux volante, correspondant au rouleau volant ; note [[184]] réancrée'],
  [1107, 'ZEC.5.3', 2, 'reprise de la malédiction volante dirigée contre celui qui jure'],
]

// Commentaires suivis vers des versets déterminés. Le long développement sur
// la création est expressément annoncé comme commentaire de Ps 18,2.
const COMMENTAIRES = [
  ...Array.from({ length: 2 }, (_, i) => [1051 + i, 'ROM.1.18', 3,
    'commentaire de Rm 1,18 : réponse de Paul aux païens et annonce de la colère contre l’impiété']),
  ...Array.from({ length: 2 }, (_, i) => [1052 + i, 'ROM.1.19', 3,
    'commentaire de Rm 1,19 : possibilité pour les païens de connaître Dieu sans Écriture']),
  ...Array.from({ length: 3 }, (_, i) => [1053 + i, 'ROM.1.20', 3,
    'commentaire de Rm 1,20 : les réalités invisibles de Dieu sont connues par ses ouvrages']),

  ...Array.from({ length: 44 }, (_, i) => [1055 + i, 'PSA.18.2', 3,
    'commentaire suivi de « Les cieux annoncent la gloire de Dieu » : la création entière rend son auteur connaissable']),
  ...Array.from({ length: 2 }, (_, i) => [1060 + i, 'PSA.18.4', 3,
    'commentaire de la langue universelle et muette des cieux, intelligible à tous les peuples']),
  ...Array.from({ length: 6 }, (_, i) => [1062 + i, 'PSA.18.3', 3,
    'commentaire du jour et de la nuit qui se transmettent la connaissance dans un ordre immuable']),

  ...Array.from({ length: 4 }, (_, i) => [1077 + i, 'PSA.23.2', 3,
    'commentaire de la terre fondée sur les mers et les fleuves malgré la fluidité de l’eau']),
  ...Array.from({ length: 4 }, (_, i) => [1077 + i, 'PSA.135.6', 3,
    'commentaire parallèle de la terre affermie sur les eaux par la puissance divine']),
  [1081, 'JOB.26.7', 3, 'rapprochement scripturaire sur la terre suspendue au néant, invoqué comme preuve de la puissance divine'],
  [1081, 'PSA.94.4', 3, 'rapprochement scripturaire sur les fondements de la terre tenus dans la main de Dieu'],
  [1081, 'PSA.23.2', 3, 'nouveau rapprochement scripturaire sur la terre fondée au-dessus des mers'],
  ...Array.from({ length: 2 }, (_, i) => [1084 + i, 'PSA.148.4', 3,
    'commentaire des eaux au-dessus des cieux, maintenues contre leur mouvement naturel']),
  ...Array.from({ length: 4 }, (_, i) => [1086 + i, 'JER.5.22', 3,
    'commentaire de Jr 5,22 : la faible borne de sable manifeste la puissance qui contient la mer']),
  ...Array.from({ length: 3 }, (_, i) => [1098 + i, 'MAT.5.16', 3,
    'application de Mt 5,16 : la conduite des chrétiens conduit les païens à glorifier leur Père']),
  ...Array.from({ length: 2 }, (_, i) => [1107 + i, 'ZEC.5.3', 3,
    'application de la malédiction volante contre le serment : la garder en mémoire et corriger aussi les autres']),
  [1107, 'ZEC.5.4', 3, 'application domestique de la malédiction qui entre dans la maison de celui qui jure'],
]

// Deux formulations sont manifestement scripturaires mais ne fournissent pas
// d'indice suffisant pour choisir honnêtement entre leurs loci parallèles.
const NON_RESOLUS = [
  [1023, 2, 'Formule « séparé de corps, présent en esprit » ; candidats 1 Co 5,3 et Col 2,5, sans indice discriminant.'],
  [1029, 2, 'Image de la semence tombée sur les rochers et les épines ; candidats Mt 13,5-7, Mc 4,5-7 et Lc 8,6-7, sans indice discriminant.'],
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1023).lte('segment_numero', 1110).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 88) throw new Error(`88 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))

const cibles = [...new Set([...VERSETS, ...COMMENTAIRES].map((l) => l[1]))]
const presentes = new Set()
for (let i = 0; i < cibles.length; i += 200) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles.slice(i, i + 200))
  if (error) throw error
  for (const v of data ?? []) presentes.add(v.id_verset)
}
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const rows = [
  ...[...VERSETS, ...COMMENTAIRES].map(([numero, canon_id, type, motif]) => ({
    segment_id: parNumero.get(numero)?.id, canon_id, livre: null, chapitre: null,
    type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
  ...NON_RESOLUS.map(([numero, type, motif]) => ({
    segment_id: parNumero.get(numero)?.id, canon_id: null, livre: null, chapitre: null,
    type, fiabilite: 'à constituer', motif, provenance: 'lecture', arbitrage_requis: true,
  })),
]
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')

const cleLien = (l) => l.canon_id
  ? `${l.segment_id}|${l.canon_id}|${l.type}`
  : `${l.segment_id}|sans-cible|${l.type}|${l.motif}`
const cles = rows.map(cleLien)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie IX : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · ${NON_RESOLUS.length} à constituer · 88 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of ['J1', 'M1', ...Array.from({ length: 14 }, (_, i) => String(171 + i))]) {
    segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
  }
}
const deplacer = (marqueur, numero, ancre) => {
  for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
  const segment = parNumero.get(numero)
  if (!segment.segment_texte_corrige.includes(ancre)) throw new Error(`Ancre introuvable au segment ${numero} : ${ancre}`)
  segment.segment_texte_corrige = segment.segment_texte_corrige.replace(ancre, `${ancre}[[${marqueur}]]`)
}

// Deux références marginales avaient été absorbées par l'OCR dans le corps.
parNumero.get(1033).segment_texte_corrige = parNumero.get(1033).segment_texte_corrige
  .replace('Jesus-Christ n’eust Jean iu point employé', 'Jesus-Christ n’eust point employé')
  .replace('cette. Cene mystique', 'cette Cene mystique')
parNumero.get(1051).segment_texte_corrige = parNumero.get(1051).segment_texte_corrige
  .replace('au com mencement', 'au commencement')
parNumero.get(1078).segment_texte_corrige = parNumero.get(1078).segment_texte_corrige
  .replace('d’animaux. ayent', 'd’animaux ayent')
parNumero.get(1098).segment_texte_corrige = parNumero.get(1098).segment_texte_corrige
  .replace('un legitime sujet Matt, s. d’admiration', 'un legitime sujet d’admiration')

deplacer('J1', 1033, 'tant de longs discours aprés cette Cene mystique')
deplacer('171', 1033, 'il ne luy eust pas encore communiqué l’aliment de sa parole')
deplacer('172', 1051, 'c’est la pensée de S. Paul')
deplacer('173', 1055, 'celuy qui les a formez')
deplacer('174', 1055, 'Les Cieux annoncent la gloire du Toutpuissant')
deplacer('175', 1061, 'tous les peuples ne se servent pas d’un même idiome')
deplacer('176', 1065, 'la nuit n’a pas gagné un moment de temps sur le jour')
deplacer('178', 1077, 'les Mers & les Fleuves ne servent de fondement à la Terre')
deplacer('181', 1081, 'ce frêle fondement sur lequel la Terre est appuyée')
deplacer('180', 1081, 'ce frêle fondement sur lequel la Terre est appuyée')
deplacer('179', 1081, 'ce frêle fondement sur lequel la Terre est appuyée')
deplacer('177', 1077, 'les Mers & les Fleuves ne servent de fondement à la Terre')
deplacer('182', 1084, 'Les Eaux servent au Ciel de couverture')
deplacer('183', 1089, 'moy qui n’ay établi que du sable pour les bornes de l’Ocean')
deplacer('M1', 1098, 'afin qu’en voyant vos bonnes œuvres, ils en loüent vôtre Pere qui est dans les Cieux')
deplacer('184', 1107, 'cette faux volante, dont il est parlé dans le Prophete')

const notesAttendues = new Map([
  [1033, '[[J1]] Jean 13.\n[[171]] Ibid. 6.'],
  [1051, '[[172]] Rom. 2.'],
  [1055, '[[173]] Sap. 13.\n[[174]] Psal. 18.'],
  [1061, '[[175]] Psal. 18.'],
  [1065, '[[176]] Ibidem.'],
  [1077, '[[177]] Psal. 23.\n[[178]] Ibid. 135.'],
  [1081, '[[179]] Job. 26.\n[[180]] Psal. 94.\n[[181]] Psal. 23.'],
  [1084, '[[182]] Psal. 148.'],
  [1089, '[[183]] Hier. 5.'],
  [1098, '[[M1]] Matth. 5.'],
  [1107, '[[184]] Zach. 5.'],
])

if (!WRITE) {
  console.log('16 appels/16 définitions de notes reconstruits (--dry : rien écrit)')
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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie IX',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
