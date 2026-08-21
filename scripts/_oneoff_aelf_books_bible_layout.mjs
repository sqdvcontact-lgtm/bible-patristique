import fs from 'node:fs'

const path = 'app/components/BibleLayout.tsx'
let s = fs.readFileSync(path, 'utf8')
const before = `    // On demande la LISTE DES LIVRES, pas tous les versets pour en déduire la liste : l'API
    // plafonne à 1 000 lignes, si bien que la version précédente ne voyait jamais que les deux
    // premiers livres de la Bible et grisait tous les autres.
    supabase
      .from('livres_par_traduction')
      .select('livre')
      .eq('trad_id', trad)`
const after = `    // Les éditions historiques prennent leur disponibilité dans la projection AELF,
    // augmentée des matières hors axe. Un livre historique comme SUS ou BEL reste donc
    // accessible même lorsqu'il n'est pas un livre autonome de la spine AELF.
    supabase
      .from('v_aelf_bible_books_by_translation')
      .select('livre')
      .eq('trad_id', trad)`
const i = s.indexOf(before)
if (i < 0) throw new Error('Bloc livres_par_traduction introuvable')
if (s.indexOf(before, i + before.length) >= 0) throw new Error('Bloc livres_par_traduction non unique')
s = s.slice(0, i) + after + s.slice(i + before.length)
if (s.includes(".from('livres_par_traduction')")) throw new Error('Lecture legacy livres_par_traduction résiduelle')
fs.writeFileSync(path, s)
console.log('Disponibilité des livres migrée vers AELF + hors axe.')
