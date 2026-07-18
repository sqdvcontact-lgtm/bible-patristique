// Audit des traductions françaises du dépôt bible_databases (lecture seule).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/formats/json'
const DEUTERO = ['Tobit','Judith','Wisdom','Sirach','Baruch','I Maccabees','II Maccabees']

const fichiers = readdirSync(DIR).filter(f => f.startsWith('Fre') && f.endsWith('.json'))

const lignes = []
for (const f of fichiers) {
  const d = JSON.parse(readFileSync(join(DIR, f), 'utf8'))
  const books = d.books.map(b => b.name)
  const nb = books.length
  let versets = 0
  for (const b of d.books) for (const c of b.chapters) versets += c.verses.length
  const at = books.includes('Genesis') || books.includes('Psalms')
  const nt = books.includes('Matthew') || books.includes('Revelation of John')
  const deut = DEUTERO.filter(x => books.includes(x))
  const couverture = at && nt ? 'AT+NT' : at ? 'AT seul' : nt ? 'NT seul' : '?'
  const incipit = (nomLivre) => {
    const b = d.books.find(x => x.name === nomLivre)
    const t = b?.chapters?.[0]?.verses?.[0]?.text ?? '—'
    return t.slice(0, 48)
  }
  lignes.push({
    gen: incipit('Genesis'), jhn: incipit('John'),
    fichier: f.replace('.json',''),
    nom: d.translation || '',
    livres: nb,
    couverture,
    deutero: deut.length ? `oui (${deut.length})` : 'non',
    versets,
    premier: books[0],
    dernier: books[books.length - 1],
  })
}

lignes.sort((a,b) => b.versets - a.versets)
for (const l of lignes) {
  console.log(`\n■ ${l.fichier}  —  ${l.versets.toLocaleString('fr')} v.`)
  console.log(`   ${l.nom}`)
  console.log(`   ${l.couverture} · ${l.livres} livres · deutéro: ${l.deutero} · [${l.premier} → ${l.dernier}]`)
  console.log(`   Gn 1:1 : ${l.gen}`)
  console.log(`   Jn 1:1 : ${l.jhn}`)
}
