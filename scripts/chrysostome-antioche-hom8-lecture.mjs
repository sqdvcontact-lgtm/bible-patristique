// Lecture intégrale de l'Homélie VIII au peuple d'Antioche (A0014O0038,
// segments 959-1022). Les références éditoriales [[158]] à [[170]] sont
// réancrées par le contenu ; la référence marginale « Genes. I. » restée dans
// le corps au segment 959 devient la note [[G1]].
//
//   node scripts/chrysostome-antioche-hom8-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom8-lecture.mjs --write

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
  [959, 'GEN.1.1', 1, 'citation récapitulative : au commencement Dieu créa le ciel et la terre ; référence marginale reconstruite en [[G1]]'],
  [965, 'GEN.9.2', 1, 'citation non annotée : les animaux de la terre craindront l’homme'],
  [972, 'GEN.3.8', 1, 'citation selon la leçon patristique : Dieu se promenait à midi dans le paradis ; correction de [[158]] « Genes. 5 »'],

  [977, 'PRO.28.1', 1, 'citation de la première proposition : l’impie fuit sans être poursuivi ; note [[159]] réancrée'],
  [978, 'PRO.28.1', 2, 'seconde proposition fondue dans le discours : le juste a l’assurance d’un lion ; note [[160]] réancrée'],
  [978, '1KI.18.17', 1, 'citation de la question d’Achab à Élie : pourquoi troublez-vous Israël ?'],
  [979, '1KI.18.18', 1, 'citation de la réponse d’Élie : ce n’est pas moi, mais vous et la maison de votre père ; note [[161]] corrigée en 3 Reg. 18'],

  [980, '2KI.2.8', 2, 'rappel du manteau d’Élie qui divise les eaux du Jourdain ; note [[162]] corrigée en 4 Reg. 2'],
  [980, '2KI.2.15', 2, 'rappel de l’esprit d’Élie reposant sur Élisée, devenu un second Élie'],
  [981, '2KI.2.8', 2, 'reprise du manteau d’Élie ouvrant un chemin à travers le Jourdain'],
  [981, '2KI.2.14', 2, 'reprise du manteau recueilli par Élisée qui partage à nouveau le Jourdain'],
  [981, 'DAN.3.94', 4, 'les chaussures des trois jeunes gens éteignant les flammes développent le motif des vêtements demeurés intacts ; note [[163]] « Dan. 3.22 »'],
  [982, '2KI.6.6', 2, 'reprise du bâton d’Élisée qui fait surnager le fer ; note [[164]] corrigée en 4 Reg. 6'],
  [982, 'EXO.14.16', 2, 'reprise de la verge de Moïse qui divise les eaux de la mer ; note [[165]] réancrée'],
  [982, 'EXO.17.6', 2, 'reprise non annotée de la verge de Moïse frappant le rocher'],
  [982, 'ACT.19.12', 2, 'reprise des vêtements de Paul qui guérissent les malades ; note [[166]] réancrée'],
  [982, 'ACT.5.15', 2, 'reprise non annotée de l’ombre de Pierre couvrant les malades'],
  [982, 'ACT.5.16', 2, 'suite de la reprise : les malades placés sous l’ombre de Pierre sont guéris'],

  [986, 'ACT.16.25', 2, 'reprise de la voix de Paul et Silas priant dans la prison ; note [[167]]'],
  [986, 'ACT.16.26', 2, 'reprise du séisme qui ébranle les fondements et fait tomber les liens'],
  [988, 'ACT.16.26', 2, 'rappel des liens des prisonniers rompus et des murailles ébranlées'],
  [988, 'ACT.16.29', 2, 'rappel du geôlier épouvanté devant Paul et Silas'],
  [988, 'ACT.16.34', 2, 'rappel de la conversion du geôlier, gagné à Jésus-Christ'],

  [992, 'PSA.1.4', 1, 'citation : les impies sont comme la poussière ou la paille emportée par le vent'],
  [995, 'PSA.124.1', 1, 'citation : ceux qui espèrent en Dieu ressemblent à la montagne de Sion, inébranlable ; note [[168]]'],
  [997, 'JOB.1.12', 4, 'rappel des assauts permis au diable contre Job sans qu’il puisse l’ébranler'],
  [997, 'JOB.2.6', 4, 'suite du rappel des assauts du diable contre la constance de Job'],

  [1018, 'JAS.5.12', 3, 'application de l’interdiction de jurer à l’obéissance due au commandement divin ; note [[170]] déplacée depuis les impôts'],
]

// Commentaires suivis vers des versets déterminés, sans cible artificielle de chapitre.
const COMMENTAIRES = [
  ...Array.from({ length: 10 }, (_, i) => [959 + i, 'GEN.1.1', 3,
    'reprise du commentaire de Gn 1,1 : l’utilité consolante des éléments de la création']),
  ...Array.from({ length: 4 }, (_, i) => [972 + i, 'GEN.3.8', 3,
    'commentaire suivi de Dieu marchant dans le paradis : perception accordée à Adam pour l’humilier et l’amener au tribunal']),
  ...Array.from({ length: 16 }, (_, i) => [976 + i, 'PRO.28.1', 3,
    'commentaire suivi de Pr 28,1 : conscience craintive de l’impie et assurance du juste illustrée par Élie et Paul']),
  ...Array.from({ length: 2 }, (_, i) => [992 + i, 'PSA.1.4', 3,
    'commentaire de l’impie semblable à la paille livrée au vent de ses passions']),
  ...Array.from({ length: 4 }, (_, i) => [994 + i, 'PSA.124.1', 3,
    'commentaire du juste inébranlable comme la montagne de Sion, illustré par Job']),
  ...Array.from({ length: 4 }, (_, i) => [1015 + i, 'MAT.5.34', 3,
    'commentaire suivi de l’interdiction évangélique de jurer : possibilité et nécessité d’obéir']),
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 959).lte('segment_numero', 1022).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 64) throw new Error(`64 segments attendus, ${segments.length} trouvés`)
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
const cles = rows.map(cleLien)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie VIII : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 64 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of ['G1', ...Array.from({ length: 13 }, (_, i) => String(158 + i))]) {
    segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
  }
}
const deplacer = (marqueur, numero, ancre) => {
  for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
  const segment = parNumero.get(numero)
  if (!segment.segment_texte_corrige.includes(ancre)) throw new Error(`Ancre introuvable au segment ${numero} : ${ancre}`)
  segment.segment_texte_corrige = segment.segment_texte_corrige.replace(ancre, `${ancre}[[${marqueur}]]`)
}

// La référence marginale non balisée est retirée du corps avant de devenir une note.
parNumero.get(959).segment_texte_corrige = parNumero.get(959).segment_texte_corrige
  .replace('Dieu au commencement crea le ciel & la Genes. I. terre', 'Dieu au commencement crea le ciel & la terre')
deplacer('G1', 959, 'Dieu au commencement crea le ciel & la terre')
deplacer('158', 972, 'dans le Paradis terrestre')
deplacer('159', 977, 'fuït, quoy qu’on ne le poursuive point')
deplacer('160', 978, 'il a une confiance de lyon')
deplacer('161', 979, 'c’est vous & la maison de vôtre pere')
parNumero.get(979).segment_texte_corrige = parNumero.get(979).segment_texte_corrige.replace('per vertis', 'pervertis')
deplacer('162', 980, 'change Elisée en un second Elie')
deplacer('163', 981, 'la chaussure des trois Enfans de Babylone éteint les flâmes')
deplacer('164', 982, 'rend l’eau capable de porter le fer comme le bois')
deplacer('165', 982, 'fend les vagues de la mer')
deplacer('166', 982, 'les vêtemens de S. Paul guérissent les maladies')
deplacer('167', 986, 'mais avecque ses paroles')
deplacer('168', 995, 'sont inébranlables pour jamais')
deplacer('169', 1015, 'Dieu le défend')
deplacer('170', 1018, 'Dieu vous défend de jurer')

const notesAttendues = new Map([
  [959, '[[G1]] Genes. 1.'],
  [972, '[[158]] Genes. 3.'],
  [977, '[[159]] Prov. 28.'],
  [978, '[[160]] Ibid.'],
  [979, '[[161]] 3. Reg. 18.'],
  [980, '[[162]] 4. Reg. 2.'],
  [981, '[[163]] Dan. 3. 22.'],
  [982, '[[164]] 4. Reg. 6.\n[[165]] Exod. 14.\n[[166]] Act. 19.'],
  [986, '[[167]] Act. 16.'],
  [995, '[[168]] Psal. 124.'],
  [1015, '[[169]] Matth. 5.'],
  [1018, '[[170]] Jacob. 5.'],
])

if (!WRITE) {
  console.log('14 appels/14 définitions de notes reconstruits (--dry : rien écrit)')
  process.exit(0)
}

// Première attribution trop proche de la parole de Paul : le segment décrit le
// résultat, la conversion du geôlier attestée en Ac 16,34, non l'impératif d'Ac 16,31.
const { error: erreurAncienLien } = await sb.from('liens_bibliques').delete()
  .eq('segment_id', parNumero.get(988).id).eq('canon_id', 'ACT.16.31')
  .eq('type', 2).eq('provenance', 'lecture')
if (erreurAncienLien) throw erreurAncienLien

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
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie VIII',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
