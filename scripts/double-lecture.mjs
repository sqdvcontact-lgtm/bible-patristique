// Compare deux transcriptions INDÉPENDANTES des mêmes pages.
//   node scripts/double-lecture.mjs <fichier_production> <fichier_relecture> <page…>
//   ex : node scripts/double-lecture.mjs esd_5.json esd_CTRL.json 599 600 601 602
//
// Pourquoi : les contrôles automatiques ne voient que ce qui est MAL FORMÉ — une césure
// ouverte, une balise déséquilibrée, un numéro qui saute. Ils ne voient jamais ce qui est
// MAL LU : un mot juste en français mais faux sur la page. Seule une seconde lecture
// indépendante le révèle.
//
// ⚠️ Le désaccord dit OÙ regarder, jamais QUI a raison : les deux cas rencontrés le
// 18/07/2026 ont exigé le fac-similé, et c'est la relecture qui avait tort les deux fois.
// Elle avait notamment « corrigé » une coquille authentique de l'édition (« Touses » →
// « Toutes ») — exactement ce qu'une édition critique ne doit pas faire.
import { readFileSync } from 'node:fs'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'

const [FA, FB, ...pagesArg] = process.argv.slice(2)
if (!FA || !FB || !pagesArg.length) {
  console.error('usage : <production.json> <relecture.json> <page…>')
  process.exit(1)
}
const PAGES = pagesArg.map(Number)

const charger = f => {
  const m = new Map()
  for (const p of JSON.parse(readFileSync(D + f, 'utf8')).pages) {
    if (!PAGES.includes(p.pageImp)) continue
    for (const v of p.versets || []) {
      const k = `${v.livre || '?'} ${v.ch},${v.v}`
      const t = (v.texte || '').replace(/^\s*\[\s*suite\s*\]\s*/i, '').trim()
      m.set(k, (m.get(k) ? m.get(k) + ' ' : '') + t)
    }
  }
  return m
}

const A = charger(FA), B = charger(FB)

// Comparaison sur le texte nu : ni balises, ni accents, ni ponctuation, ni casse.
// On cherche les divergences de LECTURE, pas de présentation.
const nu = s => s.replace(/<\/?i>/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const clefs = [...new Set([...A.keys(), ...B.keys()])].sort()
let identiques = 0
const absentsA = [], absentsB = [], divergents = []

for (const k of clefs) {
  const a = A.get(k), b = B.get(k)
  if (a === undefined) { absentsA.push(k); continue }
  if (b === undefined) { absentsB.push(k); continue }
  if (nu(a) === nu(b)) { identiques++; continue }
  const ma = nu(a).split(' '), mb = nu(b).split(' ')
  const setB = new Set(mb), setA = new Set(ma)
  divergents.push({
    k, a, b,
    seulA: ma.filter(w => !setB.has(w)),
    seulB: mb.filter(w => !setA.has(w)),
    ecart: Math.abs(ma.length - mb.length),
  })
}

console.log(`╔═ DOUBLE LECTURE — pages ${PAGES.join(', ')}\n`)
console.log(`  versets vus par ${FA.padEnd(16)} : ${A.size}`)
console.log(`  versets vus par ${FB.padEnd(16)} : ${B.size}`)
console.log(`  communs et IDENTIQUES              : ${identiques}`)
console.log(`  communs mais DIVERGENTS            : ${divergents.length}`)
console.log(`  vus par la relecture seule         : ${absentsA.length}${absentsA.length ? ' → ' + absentsA.join(' ') : ''}`)
console.log(`  vus par la production seule        : ${absentsB.length}${absentsB.length ? ' → ' + absentsB.join(' ') : ''}`)

const comparables = identiques + divergents.length
if (comparables) console.log(`\n  accord mot pour mot : ${(100 * identiques / comparables).toFixed(1)} %`)
if (absentsA.length || absentsB.length)
  console.log('  ⚠ un verset vu par un seul lecteur est plus grave qu\'une divergence de mot')

divergents.sort((x, y) => y.ecart - x.ecart)
for (const d of divergents.slice(0, 15)) {
  console.log(`\n── ${d.k}  (écart de ${d.ecart} mot${d.ecart > 1 ? 's' : ''})`)
  console.log(`   ${FA} : ${d.a.replace(/<\/?i>/g, '').slice(0, 150)}`)
  console.log(`   ${FB} : ${d.b.replace(/<\/?i>/g, '').slice(0, 150)}`)
  if (d.seulA.length) console.log(`   seulement ${FA} : ${d.seulA.slice(0, 12).join(' ')}`)
  if (d.seulB.length) console.log(`   seulement ${FB} : ${d.seulB.slice(0, 12).join(' ')}`)
}
if (divergents.length > 15) console.log(`\n… et ${divergents.length - 15} autres divergences`)
