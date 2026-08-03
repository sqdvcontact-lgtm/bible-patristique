import { readFileSync, writeFileSync } from 'node:fs'

const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const textes = [
  [3100, 'dieux [[845]]', 'dieux[[845]]'],
  [3124, 'promesses [[853]]', 'promesses[[853]]'],
  [3127, '6. [<i>sic</i>]', '9.'],
  [3127, 'Gédéon [[854]]', 'Gédéon[[854]]'],
]
const notes = [
  [3100, '[[845]] Deu. XII, 29, 31', '[[845]] Deut. XII, 29, 31.'],
  [3103, '[[846]] Mat. XXIII, 35', '[[846]] Matt. XXIII, 35.'],
  [3104, '[[847]] Sag. III, 6\n[[848]] 2Ti. IV, 6', '[[847]] Sag. III, 6.\n[[848]] II Tim. IV, 6.'],
  [3106, '[[849]] Gen. XXII', '[[849]] Gen. XXII.'],
  [3112, '[[850]] 9, 17-19.', '[[850]] Hebr. XI, 17-19.'],
  [3117, '[[851]] Gen. XXIII, 3', '[[851]] Gen. XXIII, 3.'],
  [3119, '[[852]] Ib. XXXV, 2, 15', '[[852]] Ib. XXXVIII, 15.'],
  [3124, '[[853]] Heb XI, 32.', '[[853]] Hebr. XI, 32.'],
]

const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [numero, avant, apres] of textes) {
  const candidat = candidats.find((x) => x.segment_numero === numero)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Texte candidat non synchronisable ${numero}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((x) => x.first_segment_numero <= numero && x.last_segment_numero >= numero && x.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable ${numero}: ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}
for (const [numero, avant, apres] of notes) {
  const candidat = candidats.find((x) => x.segment_numero === numero)
  if (!candidat?.notes?.includes(avant)) throw new Error(`Note candidate non synchronisable ${numero}`)
  candidat.notes = candidat.notes.replace(avant, apres)
}
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log('✓ candidats Juges XLIX-A synchronisés')
