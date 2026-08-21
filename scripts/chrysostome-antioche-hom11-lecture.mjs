// Lecture intégrale de l'Homélie XI au peuple d'Antioche (A0014O0038,
// segments 1205-1283). Les références éditoriales [[212]] à [[221]] et la
// référence marginale « Exod. 5 » sont réancrées après contrôle du fac-similé.
//
//   node scripts/chrysostome-antioche-hom11-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom11-lecture.mjs --write

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
  [1205, '2CO.4.6', 2, 'reprise fondue de Dieu faisant sortir la lumière des ténèbres'],
  [1206, 'EZK.18.23', 2, 'reprise fondue de la volonté divine : conversion du pécheur plutôt que sa perte'],

  [1213, 'JOB.2.11', 2, 'rappel de la venue des amis de Job après ses malheurs ; note [[212]]'],
  [1213, 'JOB.2.12', 2, 'rappel des cris et des vêtements déchirés des amis de Job ; note [[212]]'],
  [1213, 'JOB.2.13', 2, 'rappel des amis assis en silence auprès de Job à cause de sa douleur extrême ; note [[212]]'],
  [1214, 'EXO.6.9', 2, 'reprise des Israélites incapables d’écouter Moïse à cause de leur affliction et de leurs travaux ; référence marginale [[E1]] « Exod. 5 » corrigée sémantiquement'],
  [1215, 'JHN.13.36', 1, 'citation de la question des disciples : « Où allez-vous, Seigneur ? » ; note [[213]]'],
  [1216, 'JHN.16.5', 1, 'citation : Jésus va au Père et personne ne lui demande où il va ; note [[214]]'],

  [1224, 'GEN.3.5', 2, 'reprise de la promesse mensongère du démon qui fait aspirer l’homme à la divinité ; note [[215]] réancrée'],
  [1226, 'GEN.4.8', 4, 'écho narratif à la mort d’Abel, fils d’Adam mort avant son père, comme leçon de la mortalité humaine'],
  [1229, 'ISA.14.13', 1, 'citation du roi qui place son trône sur les étoiles ; note [[216]] réancrée'],
  [1229, 'ISA.14.14', 1, 'citation du roi qui veut s’égaler au Très-Haut ; note [[216]]'],
  [1229, 'ISA.14.11', 1, 'citation de la pourriture pour couche et des vers pour couverture ; note [[217]] réancrée'],
  [1230, 'EZK.28.9', 1, 'citation adressée au roi de Tyr : il n’est qu’un homme devant ceux qui le tueront ; [[218]] corrigé de l’OCR « Ezech. 18 » en « Ezech. 28 »'],

  [1237, 'GEN.2.7', 2, 'reprise de l’homme façonné par Dieu avec la terre dont on fait aussi les briques et les tuiles'],
  [1256, 'GEN.1.28', 2, 'reprise de la domination de l’homme sur tous les animaux par la raison reçue de Dieu'],
  [1263, '1CO.12.21', 1, 'citation : la tête ne peut dire à la main qu’elle n’a pas besoin d’elle ; la note imprimée [[219]] « 2. Cor. 12 » est corrigée par le contenu'],

  [1276, 'ISA.58.4', 1, 'citation des jeûnes mêlés de débats et de querelles ; note [[220]]'],
  [1276, 'ISA.58.5', 1, 'citation interrogative sur l’inutilité d’un tel jeûne ; note [[220]]'],
  [1279, '2CO.6.14', 1, 'citation : aucune ressemblance entre la lumière et les ténèbres ; note [[221]] réancrée'],
  [1279, '2CO.6.15', 1, 'citation : aucun rapport entre le Christ et Bélial ; note [[221]]'],
]

// Cette homélie est le troisième jour du commentaire de Ps 18,2 : à partir du
// segment 1220, Chrysostome applique au corps humain le principe déjà établi
// pour le monde, beauté qui conduit au Créateur et faiblesse qui interdit
// l'idolâtrie. Les sous-commentaires sont ensuite bornés par leurs transitions.
const COMMENTAIRES = [
  ...Array.from({ length: 55 }, (_, i) => [1220 + i, 'PSA.18.2', 3,
    'commentaire suivi de Ps 18,2 appliqué au corps humain : beauté et sagesse de l’ouvrage manifestent le Créateur, tandis que sa fragilité réprime l’idolâtrie']),

  ...Array.from({ length: 11 }, (_, i) => [1223 + i, 'GEN.3.5', 3,
    'commentaire de Gn 3,5 : la promesse de devenir comme des dieux entraîne mortalité et infirmités afin de guérir l’orgueil humain']),
  [1230, 'ISA.14.13', 3, 'commentaire de l’orgueil du roi qui veut élever son trône au-dessus des astres malgré sa mortalité'],
  [1230, 'ISA.14.14', 3, 'commentaire de la prétention du roi à s’égaler au Très-Haut malgré sa corruption future'],
  [1231, 'EZK.28.9', 3, 'conclusion du rapprochement avec le roi de Tyr : la mortalité corporelle coupe la racine de l’idolâtrie et de l’orgueil'],

  ...Array.from({ length: 19 }, (_, i) => [1234 + i, 'GEN.2.7', 3,
    'commentaire de l’homme façonné du limon : la sagesse du Créateur éclate dans l’organisation du corps formé d’une matière humble']),
  ...Array.from({ length: 16 }, (_, i) => [1253 + i, 'GEN.1.28', 3,
    'commentaire de la domination humaine sur les animaux : la raison et l’art compensent les avantages physiques des bêtes']),
  ...Array.from({ length: 2 }, (_, i) => [1262 + i, '1CO.12.21', 3,
    'commentaire de l’interdépendance des membres : les parties fortes et nobles du corps ont besoin des plus faibles']),

  ...Array.from({ length: 2 }, (_, i) => [1276 + i, 'ISA.58.4', 3,
    'application d’Is 58,4 : le jeûne reste vain lorsque la conduite et la langue demeurent mauvaises']),
  ...Array.from({ length: 2 }, (_, i) => [1276 + i, 'ISA.58.5', 3,
    'application d’Is 58,5 : l’observance extérieure du jeûne ne suffit pas sans conversion']),
  ...Array.from({ length: 8 }, (_, i) => [1275 + i, 'MAT.5.34', 3,
    'commentaire suivi de l’interdiction évangélique de jurer : correction fraternelle et préparation à la communion pascale']),
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1205).lte('segment_numero', 1283).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 79) throw new Error(`79 segments attendus, ${segments.length} trouvés`)
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

const rows = [...VERSETS, ...COMMENTAIRES].map(([numero, canon_id, type, motif]) => ({
  segment_id: parNumero.get(numero)?.id, canon_id, livre: null, chapitre: null,
  type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
}))
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')
const cleLien = (l) => `${l.segment_id}|${l.canon_id}|${l.type}`
if (new Set(rows.map(cleLien)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie XI : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 79 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of ['E1', ...Array.from({ length: 10 }, (_, i) => String(212 + i))]) {
    segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
  }
}
const deplacer = (marqueur, numero, ancre) => {
  const segment = parNumero.get(numero)
  if (!segment.segment_texte_corrige.includes(ancre)) throw new Error(`Ancre introuvable au segment ${numero} : ${ancre}`)
  segment.segment_texte_corrige = segment.segment_texte_corrige.replace(ancre, `${ancre}[[${marqueur}]]`)
}

// La référence « Exod. 5 » était absorbée dans le corps ; le fac-similé en
// confirme la forme, tandis que le contenu correspond à Ex 6,9.
parNumero.get(1214).segment_texte_corrige = parNumero.get(1214).segment_texte_corrige.replace('Israël Exod. y. accablez', 'Israël accablez')
parNumero.get(1241).segment_texte_corrige = parNumero.get(1241).segment_texte_corrige.replace('les Aa iij poils', 'les poils')
parNumero.get(1252).segment_texte_corrige = parNumero.get(1252).segment_texte_corrige.replace('car ¡en ay dit', 'car j’en ay dit')
parNumero.get(1259).segment_texte_corrige = parNumero.get(1259).segment_texte_corrige
  .replace('d’avoir d’avoir', 'd’avoir').replace('armnes', 'armes')
parNumero.get(1265).segment_texte_corrige = parNumero.get(1265).segment_texte_corrige.replace('incultes. y a d’autres', 'incultes. Il y a d’autres')
parNumero.get(1266).segment_texte_corrige = parNumero.get(1266).segment_texte_corrige.replace('pas ainfi', 'pas ainsi')
parNumero.get(1269).segment_texte_corrige = parNumero.get(1269).segment_texte_corrige.replace('avantage qtui', 'avantage qui')
parNumero.get(1275).segment_texte_corrige = parNumero.get(1275).segment_texte_corrige.replace('jusques à ce que jobtienne', 'jusques à ce que j’obtienne')

deplacer('212', 1213, 'se placerent auprés de luy sans rien dire')
deplacer('E1', 1214, 'ne pouvoient prêter l’oreille aux paroles de Moïse')
deplacer('213', 1215, 'où allez-vous, Seigneur')
deplacer('214', 1216, 'Je vay, dit-il, a mon Pere, & personne ne me demande où je vay')
deplacer('215', 1224, 'eu la hardiesse d’aspirer à la Divinité')
deplacer('216', 1229, 'je m’égaleray au Tres-haut')
deplacer('217', 1229, 'les vers te serviront de couverture')
deplacer('218', 1230, 'le fer qui te percera le sein, te-le fera bien connoître')
deplacer('219', 1263, 'la tête, de quelque excellence qu’elle se vente, ne dira pas à la main, Je me passeray bien de vous')
deplacer('220', 1276, 'Que servent vos jûnes, puis qu’ils n’empeschent ni vos debats, ni vos querelles')
deplacer('221', 1279, 'quel rapport de Jesus-Christ avec Belial')

const notesAttendues = new Map([
  [1213, '[[212]] Job. 2.'],
  [1214, '[[E1]] Exod. 5.'],
  [1215, '[[213]] Jean. 13.'],
  [1216, '[[214]] Jean. 16.'],
  [1224, '[[215]] Genes. 3.'],
  [1229, '[[216]] Esaie 14.\n[[217]] Ibid.'],
  [1230, '[[218]] Ezech. 28.'],
  // Le fac-similé porte réellement « 2. Cor. 12. » ; l’erreur de l’édition
  // est conservée dans la note, mais le lien vise sémantiquement 1 Co 12,21.
  [1263, '[[219]] 2. Cor. 12.'],
  [1276, '[[220]] Esaïe 58.'],
  [1279, '[[221]] 2. Cor. 6.'],
])

const appels = segments.flatMap((s) => [...s.segment_texte_corrige.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = [...notesAttendues.values()].flatMap((n) => [...n.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 11 || definitions.length !== 11 || new Set(appels).size !== 11
  || appels.some((m) => !definitions.includes(m)) || definitions.some((m) => !appels.includes(m))) {
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)
}

if (!WRITE) {
  console.log('11 appels/11 définitions de notes reconstruits (--dry : rien écrit)')
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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XI',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
