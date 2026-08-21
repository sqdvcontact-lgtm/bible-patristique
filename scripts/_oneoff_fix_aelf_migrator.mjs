import fs from 'node:fs'

const path = 'scripts/_oneoff_migrate_polyglotte_aelf.mjs'
let s = fs.readFileSync(path, 'utf8')
const bad = '            id: l.aelf_entry_id ? `899:${l.alignment_order}:${l.aelf_entry_id}` : `899:extra:${l.alignment_order}`,'
const good = '            id: l.aelf_entry_id ? "899:" + l.alignment_order + ":" + l.aelf_entry_id : "899:extra:" + l.alignment_order,'
const first = s.indexOf(bad)
if (first === -1) throw new Error('Identifiant Bible899 à corriger introuvable')
if (s.indexOf(bad, first + bad.length) !== -1) throw new Error('Identifiant Bible899 non unique')
s = s.slice(0, first) + good + s.slice(first + bad.length)
fs.writeFileSync(path, s)
console.log('Migrateur AELF corrigé avant exécution.')
