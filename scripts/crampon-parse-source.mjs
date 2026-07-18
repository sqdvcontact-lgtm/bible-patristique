// Extrait le texte verset par verset des pages Crampon de JesusMarie.com, enregistrées
// localement. Cette édition « suit la Vulgate » (mention en tête de page) et numérote
// chaque verset : elle donne donc le découpage que la numérisation FreCrampon a perdu.
//   node scripts/crampon-parse-source.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const SCRATCH = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/'
const D = SCRATCH + 'sacy/'

const SOURCES = [['TOB', 'crampon_tobie.html'], ['JDT', 'crampon_judith.html']]

// Un numéro de verset est un entier valant exactement le précédent + 1. Ce critère de
// SUITE est ce qui le distingue d'un nombre du texte (« quatre-vingt-dix-neuf ans »,
// « 1 000 hommes ») : un nombre quelconque ne tombe pas pile sur le rang attendu.
function versetsDuChapitre(corps) {
  const versets = []
  let attendu = 1
  let reste = corps
  for (;;) {
    const debutMotif = new RegExp('(?:^|\\s)' + attendu + '\\s')
    const m = reste.match(debutMotif)
    if (!m) break
    const debut = m.index + m[0].length
    const suivantMotif = new RegExp('(?:^|\\s)' + (attendu + 1) + '\\s')
    const apres = reste.slice(debut)
    const m2 = apres.match(suivantMotif)
    versets.push({ v: attendu, texte: (m2 ? apres.slice(0, m2.index) : apres).trim() })
    if (!m2) break
    reste = apres.slice(m2.index)
    attendu++
  }
  return versets
}

for (const [CODE, fichier] of SOURCES) {
  const html = readFileSync(SCRATCH + fichier, 'utf8')
  const txt = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/\s+/g, ' ')
    .trim()

  const blocs = txt.split(/Chapitre\s+(\d+)/)
  const livre = {}
  for (let i = 1; i < blocs.length; i += 2) livre[+blocs[i]] = versetsDuChapitre(blocs[i + 1])

  const chs = Object.keys(livre).map(Number).sort((a, b) => a - b)
  const total = chs.reduce((a, c) => a + livre[c].length, 0)
  console.log(`${CODE} : ${chs.length} chapitres · ${total} versets`)
  console.log('   ' + chs.map(c => c + ':' + livre[c].length).join(' '))
  const vides = chs.filter(c => livre[c].some(v => !v.texte))
  if (vides.length) console.log('   ⚠ versets vides aux chapitres ' + vides.join(', '))
  writeFileSync(D + `crampon_${CODE}_source.json`, JSON.stringify(livre, null, 1))
}
console.log('\nécrit dans le dossier de travail.')
