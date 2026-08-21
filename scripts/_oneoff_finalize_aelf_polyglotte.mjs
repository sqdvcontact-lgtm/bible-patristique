import fs from 'node:fs'

const path = 'app/polyglotte/page.tsx'
let s = fs.readFileSync(path, 'utf8')

const oldBlock = `      // Un count par traduction pour savoir laquelle est migrée dans versets_v2 —
      // mais TOUS EN PARALLÈLE (auparavant : un await par traduction, en cascade).
      const comptes = await Promise.all(liste.map(t =>
        supabase.from("versets_v2").select("trad_id", { count: "exact", head: true }).eq("trad_id", t.trad_id)
          .then(({ count }) => count ?? 0)
      ));`
const newBlock = `      // Une traduction n'est proposée que si elle possède au moins une cellule projetée
      // sur la spine AELF. On ne déduit plus sa lisibilité de la seule présence de lignes
      // dans versets_v2 : une source non alignée ne doit pas paraître disponible.
      const comptes = await Promise.all(liste.map(t =>
        supabase.from("v_aelf_polyglotte_cells").select("trad_id", { count: "exact", head: true }).eq("trad_id", t.trad_id)
          .then(({ count }) => count ?? 0)
      ));`

const i = s.indexOf(oldBlock)
if (i === -1) throw new Error('Bloc de disponibilité legacy introuvable')
if (s.indexOf(oldBlock, i + oldBlock.length) !== -1) throw new Error('Bloc de disponibilité legacy non unique')
s = s.slice(0, i) + newBlock + s.slice(i + oldBlock.length)

if (s.includes('supabase.from("versets_canon")')) throw new Error('Lecture directe versets_canon encore présente')
if (s.includes('supabase.from("versets_v2")')) throw new Error('Lecture directe versets_v2 encore présente')
fs.writeFileSync(path, s)
console.log('Disponibilité des traductions basculée sur la projection AELF.')
