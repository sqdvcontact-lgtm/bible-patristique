// Vérification du document Giguet (FreLXXGiguet) avant intégration. Lecture seule.
import { readFileSync } from 'node:fs'

const F = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/formats/json/FreLXXGiguet.json'
const d = JSON.parse(readFileSync(F, 'utf8'))

const estVide = t => !t || !t.trim()
const TITRE = /^(\s*)(Psaume|Cantique|Pour être chanté|Pour la fin|Alleluia|All[ée]luia|Prière|Ode|Hymne|Louez|Aux enfants|De David|Sur les|Sur l|Sur la|Sur le|Prophétie|Chant| Psaume)/i

// ── 1. Complétude par livre (AT non vide) ────────────────────────────────────
console.log('=== COMPLÉTUDE (livres AT non vides) ===')
let totV = 0, totVide = 0
const vides = []
for (const b of d.books) {
  let n = 0, nv = 0
  for (const c of b.chapters) for (const v of c.verses) { n++; if (estVide(v.text)) nv++ }
  const nonVide = n - nv
  if (nonVide === 0) continue // NT vide etc.
  totV += nonVide; totVide += nv
  if (nv > 0) vides.push(`${b.name}: ${nv} vides / ${n}`)
}
console.log(`Total versets AT non vides : ${totV.toLocaleString('fr')}`)
console.log(`Versets vides intercalés : ${totVide}`)
if (vides.length) { console.log('Livres avec trous :'); vides.forEach(x => console.log('  ' + x)) }
else console.log('Aucun trou intercalé.')

// ── 2. Qualité du texte ──────────────────────────────────────────────────────
console.log('\n=== QUALITÉ ===')
let html = 0, commenceNum = 0, tresLong = 0, mojibake = 0
const exHtml = []
for (const b of d.books) for (const c of b.chapters) for (const v of c.verses) {
  const t = v.text || ''
  if (/<[a-z/]/i.test(t)) { html++; if (exHtml.length < 3) exHtml.push(`${b.name} ${c.chapter}:${v.verse} → ${t.slice(0,60)}`) }
  if (/^\s*\d+\s/.test(t)) commenceNum++
  if (t.length > 1200) tresLong++
  if (/[�]/.test(t)) mojibake++
}
console.log(`Balises HTML : ${html}${exHtml.length ? ' (ex. ' + exHtml.join(' | ') + ')' : ''}`)
console.log(`Commence par un numéro : ${commenceNum}`)
console.log(`Très longs (>1200) : ${tresLong} · caractères de remplacement (mojibake) : ${mojibake}`)

// ── 3. Suscriptions des psaumes ──────────────────────────────────────────────
console.log('\n=== PSAUMES : traitement des suscriptions ===')
const psa = d.books.find(b => b.name === 'Psalms')
console.log(`Nombre de psaumes : ${psa.chapters.length}`)
let titreV1 = 0, contenuV1 = 0
const titres = [], contenus = []
for (const c of psa.chapters) {
  const v1 = c.verses[0]?.text || ''
  if (TITRE.test(v1)) { titreV1++; titres.push(c.chapter) }
  else { contenuV1++; contenus.push(c.chapter) }
}
console.log(`v.1 = suscription : ${titreV1} psaumes`)
console.log(`v.1 = contenu     : ${contenuV1} psaumes → ${contenus.join(', ')}`)

// ── 4. Comparaison de comptes de versets vs attendu (échantillon psaumes) ────
console.log('\n=== COMPTES DE VERSETS (psaumes-clés, num. grecque) ===')
for (const n of [1, 2, 3, 4, 5, 6, 9, 50, 75, 76, 90, 118, 150, 151]) {
  const c = psa.chapters.find(x => x.chapter === n)
  if (c) console.log(`  Ps ${n} : ${c.verses.length} v. · v1: ${(c.verses[0]?.text||'').slice(0,52)}`)
}
