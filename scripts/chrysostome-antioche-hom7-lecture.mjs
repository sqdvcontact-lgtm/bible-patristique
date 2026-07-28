// Lecture intégrale de l'Homélie VII au peuple d'Antioche (A0014O0038,
// segments 895-958). Les notes [[150]] à [[157]] sont réancrées sur les
// propositions qu'elles documentent ; [[156]] « Isaie 4 » est rétablie en
// « Isaie 6 » sur la citation effectivement présente aux segments 949-950.
//
//   node scripts/chrysostome-antioche-hom7-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom7-lecture.mjs --write

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
  [897, 'ROM.5.12', 2, 'reprise fondue : le péché a introduit la mort dans le monde'],
  [898, 'DAN.3.50', 4, 'rappel des trois jeunes gens que les flammes de la fournaise épargnèrent'],
  [899, 'PSA.106.16', 2, 'reprise fondue des portes d’airain brisées et des verrous de fer mis en pièces'],

  [904, 'GEN.1.1', 1, 'citation : au commencement Dieu créa le ciel et la terre ; note [[150]] réancrée'],
  [904, 'GEN.1.2', 1, 'suite de la citation : terre vide, ténèbres sur la face de l’abîme'],
  [907, 'GEN.1.1', 2, 'reprise fondue de Dieu créant le ciel et la terre ; note [[151]] « Ibid. » réancrée'],
  [909, 'GEN.1.26', 1, 'citation : faisons l’homme à notre image et ressemblance'],
  [922, 'HEB.12.9', 2, 'reprise des pères qui châtient leurs enfants et demeurent reconnus comme pères'],
  [924, 'HEB.12.9', 3, 'application à Dieu de l’analogie des pères terrestres qui corrigent leurs enfants'],
  [933, 'GEN.3.9', 1, 'citation : Adam, où es-tu ? ; note [[152]] réancrée'],
  [935, '1SA.20.27', 2, 'reprise en discours indirect de Saül demandant où est le fils de Jessé ; note [[153]]'],
  [936, 'JHN.7.11', 1, 'citation directe non annotée des Juifs : où est « celui-là » ?'],
  [937, 'GEN.3.9', 1, 'répétition de la citation : Adam, où es-tu ?'],
  [938, 'GEN.3.9', 1, 'nouvelle répétition de la citation : Adam, où es-tu ? ; note [[154]] réancrée'],

  [946, 'GAL.4.24', 1, 'citation des deux femmes figurant les deux alliances, dont celle du Sinaï engendre la servitude ; note [[155]] réancrée'],
  [949, 'ISA.6.1', 1, 'citation : le Seigneur assis sur un trône élevé ; note [[156]] rétablie au bon passage'],
  [949, 'ISA.6.2', 1, 'suite de la citation : le Seigneur environné de séraphins'],
  [950, 'ISA.6.3', 1, 'citation : Saint, Saint, Saint, la terre remplie de sa gloire'],
  [950, 'ISA.6.3', 3, 'application de la révérence des séraphins à la manière de prononcer le nom divin'],
  [954, 'MAT.5.36', 2, 'reprise adaptée de l’interdiction de jurer par soi-même ; note [[157]] réancrée'],
]

// Les notes ne donnent que le chapitre, mais l'homélie vise des versets précis :
// elle ne commente donc pas artificiellement Genèse 1 ou 3 dans leur totalité.
const COMMENTAIRES_VERSET = [
  ...Array.from({ length: 5 }, (_, i) => [904 + i, 'GEN.1.1', 3,
    'commentaire suivi de « au commencement Dieu créa le ciel et la terre » comme parole de consolation']),
  ...Array.from({ length: 6 }, (_, i) => [909 + i, 'GEN.1.26', 3,
    'commentaire suivi de l’image et de la ressemblance comme souveraineté naturelle de l’homme']),
  ...Array.from({ length: 2 }, (_, i) => [925 + i, 'GEN.3.6', 3,
    'commentaire de la chute et de la désobéissance après les bienfaits de la création']),
  [927, 'GEN.3.8', 3, 'commentaire de Dieu qui vient lui-même trouver Adam caché après la faute'],
  ...Array.from({ length: 17 }, (_, i) => [927 + i, 'GEN.3.9', 3,
    'commentaire suivi de « Adam, où es-tu ? » : appel familier, invitation à parler, jugement et guérison']),
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 895).lte('segment_numero', 958).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 64) throw new Error(`64 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))

const cibles = [...new Set([...VERSETS, ...COMMENTAIRES_VERSET].map((l) => l[1]))]
const presentes = new Set()
for (let i = 0; i < cibles.length; i += 200) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles.slice(i, i + 200))
  if (error) throw error
  for (const v of data ?? []) presentes.add(v.id_verset)
}
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const versetRows = [...VERSETS, ...COMMENTAIRES_VERSET].map(([numero, canon_id, type, motif]) => ({
  segment_id: parNumero.get(numero)?.id, canon_id, livre: null, chapitre: null,
  type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
}))
const rows = versetRows
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')

const cleLien = (l) => `${l.segment_id}|${l.canon_id ?? `${l.livre}.${l.chapitre}`}|${l.type}`
const cles = rows.map(cleLien)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie VII : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 64 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, livre, chapitre, type').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

// Reconstruction des appels : ils se placent à la fin de la proposition qu'ils
// documentent, avant la ponctuation. L'opération est idempotente.
const placer = (numero, marqueur, ancre) => {
  const segment = parNumero.get(numero)
  let texte = segment.segment_texte.replaceAll(marqueur, '')
  if (!texte.includes(ancre)) throw new Error(`Ancre introuvable au segment ${numero} : ${ancre}`)
  texte = texte.replace(ancre, `${ancre}${marqueur}`)
  segment.segment_texte_corrige = texte
}
placer(904, '[[150]]', 'surface de l’abîme')
parNumero.get(904).segment_texte_corrige = parNumero.get(904).segment_texte_corrige.replace('los tenebres', 'les tenebres')
placer(907, '[[151]]', 'Dieu a creé le Ciel & la Terre')
placer(933, '[[152]]', 'Adam, où es-tu')
placer(935, '[[153]]', 'où est le fils de Jessé')
placer(938, '[[154]]', 'Adam, où es-tu')
placer(946, '[[155]]', 'est figurée par Agar')
parNumero.get(946).segment_texte_corrige = parNumero.get(946).segment_texte_corrige.replace('des éclairs', 'des esclaves')
parNumero.get(946).segment_texte_corrige = parNumero.get(946).segment_texte_corrige.replaceAll('[[156]]', '')
placer(950, '[[156]]', 'la Majesté de sa gloire')
parNumero.get(950).segment_texte_corrige = parNumero.get(950).segment_texte_corrige.replace('Caint, Saint, Saint', 'Saint, Saint, Saint')
placer(954, '[[157]]', 'par vôtre ame, ni par vôtre vie')

const notesAttendues = new Map([
  [904, '[[150]] Genes. 1.'],
  [907, '[[151]] Ibid.'],
  [933, '[[152]] Gen. 3.'],
  [935, '[[153]] 1. Reg. 20.'],
  [938, '[[154]] Genes.3.'],
  [946, '[[155]] Galat. 4.'],
  [950, '[[156]] Isaie 6.'],
  [954, '[[157]] Matt. 5.'],
])

if (!WRITE) {
  console.log('8 appels/8 définitions de notes reconstruits (--dry : rien écrit)')
  process.exit(0)
}

for (const [numero, notes] of notesAttendues) {
  const segment = parNumero.get(numero)
  const { error } = await sb.from('segments').update({
    segment_texte: segment.segment_texte_corrige,
    notes,
  }).eq('id', segment.id)
  if (error) throw error
}
// Le segment 946 ne doit plus conserver la définition déplacée de [[156]].
if (!notesAttendues.has(946)) throw new Error('Définition [[155]] manquante')

for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie VII',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
