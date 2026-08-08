// Rapport des suggestions de structure sur un projet, page par page — MATÉRIEL pour évaluer
// FP/FN. L'analyse ne produit que des SUGGESTIONS ; la colonne « verdict » est à remplir À LA MAIN
// (correct / faux positif / faux négatif). Rien n'est modifié dans la source.
//   node bancs/rapport-suggestions-structure.mjs <nom-de-projet>
import { chargerProjet } from '../src/projet.mjs'
import { annoterProjet } from '../src/structure.mjs'

const nom = process.argv[2]
if (!nom) { console.error('Usage : node bancs/rapport-suggestions-structure.mjs <nom-de-projet>'); process.exit(2) }
const projet = annoterProjet(await chargerProjet(nom))

const totaux = {}
console.log(`# Suggestions de structure — projet « ${nom} »\n`)
console.log('Chaque suggestion est à valider à la main (verdict : ✓ correct / FP faux positif).')
console.log('Les faux NÉGATIFS (structure réelle non suggérée) sont à relever page par page.\n')

for (const num of Object.keys(projet.pages).map(Number).sort((a, b) => a - b)) {
  const lignes = projet.pages[num].lignes || []
  const sugg = lignes.map((l, i) => ({ i, l })).filter((x) => x.l.suggestion && x.l.suggestion.role_suggere)
  if (!sugg.length) continue
  const parRole = {}
  for (const { l } of sugg) { const r = l.suggestion.role_suggere; parRole[r] = (parRole[r] || 0) + 1; totaux[r] = (totaux[r] || 0) + 1 }
  console.log(`## Page ${num} — ${sugg.length} suggestion(s) : ${Object.entries(parRole).map(([r, n]) => `${r}×${n}`).join(', ')}`)
  for (const { i, l } of sugg) {
    const s = l.suggestion
    const det = (s.niveau_suggere ? `T${s.niveau_suggere} ` : '') + (s.blanc_poesie ? `[${s.blanc_poesie}] ` : '')
    console.log(`  L${String(i).padStart(2)}  ${s.role_suggere.padEnd(24)} ${det}| ${(l.dip || '').slice(0, 46)}   ⟶ verdict: ____`)
  }
  console.log('')
}
console.log('## Totaux par rôle')
for (const [r, n] of Object.entries(totaux).sort((a, b) => b[1] - a[1])) console.log(`  ${r.padEnd(24)} ${n}`)
console.log('\nRappel : rien n\'est appliqué au corps sans confirmation humaine (role_confirme).')
