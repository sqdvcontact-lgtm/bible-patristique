// Lecture intégrale de l'Homélie X au peuple d'Antioche (A0014O0038,
// segments 1111-1204). Les références éditoriales [[185]] à [[211]] sont
// réancrées par le contenu et contrôlées sur le fac-similé des pages 177-179.
//
//   node scripts/chrysostome-antioche-hom10-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom10-lecture.mjs --write

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
  [1135, '1CO.2.15', 1, 'citation : l’homme spirituel juge de tout et n’est jugé de personne ; note [[186]] réancrée'],
  [1136, '1CO.15.36', 1, 'citation : la semence ne revit qu’après être morte ; note [[187]]'],
  [1154, 'PSA.103.24', 1, 'citation des œuvres admirables de Dieu, toutes faites avec sagesse ; note [[188]]'],
  [1158, 'ROM.1.21', 1, 'citation : pensées égarées et intelligence obscurcie ; note [[189]] réancrée'],
  [1158, 'ROM.1.22', 1, 'citation : devenus fous en se disant sages'],

  [1160, 'ACT.2.43', 2, 'reprise des prodiges et merveilles opérés par les Apôtres ; note [[190]] réancrée'],
  [1162, '2CO.12.6', 1, 'citation : Paul pourrait se glorifier mais se retient afin de ne pas être surestimé ; note [[191]] réancrée'],
  [1162, '2CO.4.7', 1, 'citation du trésor conservé dans des vaisseaux d’argile ; note [[192]]'],
  [1165, '1TI.5.23', 1, 'citation du conseil de prendre un peu de vin pour l’estomac ; note [[193]] réancrée'],
  [1166, '2TI.4.20', 1, 'citation : Trophime laissé malade à Milet'],
  [1166, 'PHP.2.27', 2, 'reprise d’Épaphrodite malade jusqu’au bord de la mort ; note [[194]] réancrée'],
  [1167, 'ACT.14.11', 2, 'allusion aux Lycaoniens prenant Paul et Barnabé pour des dieux à cause d’un miracle ; [[195]] corrigé de « Matt. 14 » en « Act. 14 »'],

  [1169, 'PSA.18.2', 1, 'citation : les cieux publient la gloire de Dieu ; note [[196]] réancrée'],
  [1169, 'PSA.103.5', 2, 'reprise de la terre fondée fermement par Dieu ; note [[197]] « Ibid. 103 » restituée sur le fac-similé'],
  [1169, 'PSA.101.26', 1, 'citation : la terre fondée et les cieux ouvrages des mains de Dieu ; note [[199]] réancrée'],
  [1170, 'PSA.101.27', 1, 'citation : les cieux périront, mais le Seigneur demeure ; même note [[199]]'],
  [1170, 'PSA.18.6', 1, 'citation du soleil semblable à l’époux et au géant dans sa carrière ; note [[200]] « Ibid. 18 » reconstruite'],
  [1172, 'SIR.43.4', 2, 'rapprochement éditorial avec l’éclat aveuglant du soleil ; note [[198]] « Eccli. 43 » corrigée et réancrée'],
  [1175, 'EXO.16.4', 2, 'rappel de la manne, pain que Dieu fait pleuvoir dans le désert par sa parole'],
  [1178, 'JER.23.24', 1, 'citation : Dieu remplit le ciel et la terre ; note [[202]] corrigée de « Jerem. 3 » en « Jerem. 23 »'],
  [1178, 'PSA.15.2', 1, 'citation : Dieu n’a aucun besoin de nos biens ; note [[203]] réancrée'],
  [1179, 'ACT.17.24', 2, 'reprise fondue du Dieu qui a fait le monde et qui est Seigneur du ciel et de la terre ; note [[204]]'],
  [1179, 'ACT.17.25', 2, 'reprise fondue du Dieu qui donne la vie à tous et n’a besoin de rien ; note [[204]]'],

  [1185, 'ROM.8.18', 1, 'citation : les souffrances présentes ne sont pas comparables à la gloire préparée'],
  [1186, 'ROM.8.19', 1, 'citation : la création attend la révélation des enfants de Dieu ; note [[205]] réancrée'],
  [1186, 'ROM.8.20', 1, 'citation : la création est assujettie à la vanité contre son gré ; note [[205]]'],
  [1189, 'ROM.8.21', 2, 'reprise de la création délivrée de la servitude de la corruption après la résurrection'],

  [1192, 'JOS.10.12', 2, 'reprise de l’ordre de Josué au soleil et à la lune ; note [[206]]'],
  [1192, 'ISA.38.8', 2, 'reprise du soleil retournant en arrière au temps d’Ézéchias ; note [[207]]'],
  [1193, '2KI.6.6', 2, 'reprise du fer rendu flottant par Élisée ; note [[208]]'],
  [1193, 'DAN.3.94', 2, 'reprise des trois jeunes gens sortis indemnes de la fournaise ; note [[209]]'],
  [1196, 'PRO.6.30', 1, 'citation du voleur poussé par la faim ; note [[210]] réancrée'],
  [1196, 'PRO.6.32', 1, 'citation de l’adultère qui se perd par sa folie ; note [[210]]'],
  [1199, 'LUK.18.2', 2, 'reprise du juge inique qui ne craignait ni Dieu ni les hommes ; note [[211]] corrigée de « Luc 13 » en « Luc 18 »'],
  [1199, 'LUK.18.5', 2, 'reprise de la veuve dont l’importunité finit par faire céder le juge ; note [[211]]'],
]

// L'homélie reprend expressément l'explication de Ps 18,2 commencée dans
// l'Homélie IX : beauté et ordre de la création manifestent le Créateur, tandis
// que ses faiblesses interdisent de la diviniser.
const COMMENTAIRES = [
  ...Array.from({ length: 69 }, (_, i) => [1126 + i, 'PSA.18.2', 3,
    'commentaire suivi de Ps 18,2 : la création manifeste son auteur par sa beauté et son ordre, sans être elle-même divine']),
  ...Array.from({ length: 3 }, (_, i) => [1162 + i, '2CO.4.7', 3,
    'commentaire de 2 Co 4,7 : la faiblesse corporelle des Apôtres manifeste que leur puissance vient de Dieu']),
  [1171, 'PSA.18.6', 3, 'commentaire de la beauté du soleil comparé à l’époux qui sort de sa chambre nuptiale'],
  ...Array.from({ length: 3 }, (_, i) => [1182 + i, 'ROM.8.20', 3,
    'introduction au commentaire de Rm 8,20 : la création entière est corruptible et assujettie à la vanité']),
  ...Array.from({ length: 2 }, (_, i) => [1187 + i, 'ROM.8.20', 3,
    'explication de Rm 8,20 : la vanité désigne la corruption à laquelle Dieu a soumis la création à cause des hommes']),
  [1189, 'ROM.8.21', 3, 'explication de Rm 8,21 : la création sera délivrée de la corruption avec les corps ressuscités'],
  [1197, 'PRO.6.30', 3, 'explication de Pr 6,30 : le voleur peut au moins invoquer sa pauvreté, malgré l’insuffisance de cette excuse'],
  [1197, 'PRO.6.32', 3, 'explication de Pr 6,32 : l’adultère se précipite sans nécessité dans sa faute'],
]

const NON_RESOLUS = [
  [1164, 2, 'Les Apôtres « ressuscitent les morts » sans personnage nommé ; candidats Ac 9,40 et Ac 20,10, sans indice discriminant.'],
  [1192, 2, 'Résumé composite des prodiges de Moïse sur l’air, la mer, la terre et les pierres ; candidats notamment Ex 10,13, Ex 14,21, Nb 16,31 et Ex 17,6, sans découpage sûr.'],
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1111).lte('segment_numero', 1204).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 94) throw new Error(`94 segments attendus, ${segments.length} trouvés`)
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
if (new Set(rows.map(cleLien)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie X : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · ${NON_RESOLUS.length} à constituer · 94 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (let marqueur = 185; marqueur <= 211; marqueur++) {
    segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
  }
}
const deplacer = (marqueur, numero, ancre) => {
  const segment = parNumero.get(numero)
  if (!segment.segment_texte_corrige.includes(ancre)) throw new Error(`Ancre introuvable au segment ${numero} : ${ancre}`)
  segment.segment_texte_corrige = segment.segment_texte_corrige.replace(ancre, `${ancre}[[${marqueur}]]`)
}

// Corrections OCR ponctuelles indispensables aux ancres et à la lecture.
parNumero.get(1134).segment_texte_corrige = parNumero.get(1134).segment_texte_corrige.replace('appar tient', 'appartient')
parNumero.get(1136).segment_texte_corrige = parNumero.get(1136).segment_texte_corrige
  .replace('a cme telle connexité', 'a une telle connexité').replace('n’enpeut', 'n’en peut')
parNumero.get(1155).segment_texte_corrige = parNumero.get(1155).segment_texte_corrige.replace('ost la cause', 'est la cause')
parNumero.get(1196).segment_texte_corrige = parNumero.get(1196).segment_texte_corrige.replace('proz iij digue', 'prodigue')
parNumero.get(1199).segment_texte_corrige = parNumero.get(1199).segment_texte_corrige.replace('opiniâ treté', 'opiniâtreté')

deplacer('185', 1113, 'mes chers Freres')
deplacer('186', 1135, 'l’homme spirituel juge de tout, & n’est jugé de personne')
deplacer('187', 1136, 'il faut que le grain se corrompe avant qu’il renaisse')
deplacer('188', 1154, 'que vos œuvres, Seigneur, sont admirables')
deplacer('189', 1158, 'ils sont devenus fols en disant qu’ils êtoient sages')
deplacer('190', 1160, 'les merveilles qu’ils operoient')
deplacer('191', 1162, 'de peur qu’on ne me prenne pour quelque chose de plus que je ne suis')
deplacer('192', 1162, 'Nous conservons ce tresor dans des vaisseaux d’argile')
deplacer('193', 1165, 'un peu de vin pour fortifier vôtre estomach')
deplacer('194', 1166, 'qu’Epaphrodite a été jusques au bord du tombeau')
deplacer('195', 1167, 'leurs miracles, & leurs prodiges')
deplacer('196', 1169, 'les Cieux publient la gloire de l’Eternel')
deplacer('197', 1169, 'c’est luy qui a formé la Terre')
deplacer('199', 1170, 'vous, Seigneur, vous durerez à jamais')
deplacer('200', 1170, 'comme un Geant dans sa carriere')
deplacer('198', 1172, 'il a toutefois ses éclypses')
// [[201]] était une note fantôme : le fac-similé porte une seule mention
// « Ibid. 18 », que l’OCR avait scindée en [[200]] « Ibid. » et [[201]] « Psal 1. ».
deplacer('202', 1178, 'il remplit le Ciel & la Terre de sa grandeur')
deplacer('203', 1178, 'vous n’avez que faire de mes biens')
deplacer('204', 1179, 'répand la vie dans toutes les creatures, & n’a disette de rien')
deplacer('205', 1186, 'mais a cause de celuy qui l’a assujetie en esperance')
deplacer('206', 1192, 'à la Lune vers la vallée d’Elon')
deplacer('207', 1192, 'commande au même Astre de retourner sur ses pas')
deplacer('208', 1193, 'l’Eau ne change-t-elle pas de nature au commandement d’Elisée')
deplacer('209', 1193, 'les trois Enfans ne sortent-ils pas victorieux de la fournaise')
deplacer('210', 1196, 'mais l’adultere se perd par sa folie')
deplacer('211', 1199, 'les reproches de la veuve ont eu le pouvoir de changer le mauvais Juge')

const notesAttendues = new Map([
  [1113, '[[185]] Il les appelle ἀγαπητοί.'],
  [1135, '[[186]] 1. Cor. 2.'],
  [1136, '[[187]] 1. Cor. 15.'],
  [1154, '[[188]] Psal. 103.'],
  [1158, '[[189]] Rom. 1.'],
  [1160, '[[190]] Act. 2.'],
  [1162, '[[191]] 2. Cor. 12.\n[[192]] Ibid. 4.'],
  [1165, '[[193]] 1. Tim. 5.'],
  [1166, '[[194]] Philip. 2.'],
  [1167, '[[195]] Act. 14.'],
  [1169, '[[196]] Psal. 18.\n[[197]] Ibid. 103.'],
  [1170, '[[199]] Psal. 101.\n[[200]] Ibid. 18.'],
  [1172, '[[198]] Eccli. 43.'],
  [1178, '[[202]] Jerem. 23.\n[[203]] Psal. 15.'],
  [1179, '[[204]] Actor. 17.'],
  [1186, '[[205]] Rom. 8.'],
  [1192, '[[206]] Josué 10.\n[[207]] Isaie 38.'],
  [1193, '[[208]] 4. Reg. 6.\n[[209]] Dan. 3.'],
  [1196, '[[210]] Prov. 6.'],
  [1199, '[[211]] Luc 18.'],
])

const appels = segments.flatMap((s) => [...s.segment_texte_corrige.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = [...notesAttendues.values()].flatMap((n) => [...n.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 26 || definitions.length !== 26 || new Set(appels).size !== 26
  || appels.some((m) => !definitions.includes(m)) || definitions.some((m) => !appels.includes(m))) {
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)
}

if (!WRITE) {
  console.log('26 appels/26 définitions de notes reconstruits (--dry : rien écrit)')
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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie X',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
