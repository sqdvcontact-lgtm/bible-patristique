import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))


const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

// exec_sql ne retourne pas de SELECT — on interroge directement l'API REST
async function main() {
  // 1. Récupérer tous les versets (livre + TR0001) pour analyse locale
  console.log('Chargement des versets…')
  let allVersets = []
  let from = 0
  const batchSize = 1000
  while (true) {
    const { data, error } = await sb.from('versets')
      .select('id_verset, livre, chapitre, ref, TR0001')
      .range(from, from + batchSize - 1)
      .limit(batchSize)
    if (error) throw new Error(error.message)
    allVersets = allVersets.concat(data)
    process.stdout.write(`\r  ${allVersets.length} versets chargés…`)
    if (data.length < batchSize) break
    from += batchSize
  }
  process.stdout.write('\n')
  console.log(`${allVersets.length} versets chargés.\n`)

  // Grouper par livre
  const livreMap = {}
  for (const v of allVersets) {
    if (!livreMap[v.livre]) livreMap[v.livre] = { total: 0, vides: 0, remplis: 0 }
    livreMap[v.livre].total++
    if (v.TR0001 === '' || v.TR0001 == null) livreMap[v.livre].vides++
    else livreMap[v.livre].remplis++
  }

  // Ordonner par premier id_verset
  const livresOrdres = [...new Set(allVersets.map(v => v.livre))]
  const parLivre = livresOrdres.map(l => ({ livre: l, ...livreMap[l] }))

  console.log('\n=== COUVERTURE SACY PAR LIVRE ===')
  let totalVides = 0
  let totalRemplis = 0
  const livresVides = []
  const livresPartiels = []

  for (const row of parLivre) {
    const pct = row.total > 0 ? Math.round((row.remplis / row.total) * 100) : 0
    totalVides += parseInt(row.vides)
    totalRemplis += parseInt(row.remplis)
    if (parseInt(row.vides) > 0 && parseInt(row.remplis) === 0) {
      livresVides.push(row.livre)
      console.log(`  ABSENT   ${row.livre.padEnd(8)} total=${row.total}`)
    } else if (parseInt(row.vides) > 0) {
      livresPartiels.push(row.livre)
      console.log(`  PARTIEL  ${row.livre.padEnd(8)} total=${row.total} | vides=${row.vides} | remplis=${row.remplis} | ${pct}%`)
    }
  }

  console.log(`\nRÉSUMÉ :`)
  console.log(`  Versets remplis  : ${totalRemplis}`)
  console.log(`  Versets vides    : ${totalVides}`)
  console.log(`  Couverture Sacy  : ${Math.round(totalRemplis / (totalRemplis + totalVides) * 100)}%`)
  console.log(`\nLivres totalement absents (${livresVides.length}) : ${livresVides.join(', ')}`)
  console.log(`Livres partiellement couverts (${livresPartiels.length}) : ${livresPartiels.join(', ')}`)

  // 2. Détail chapitres pour les livres partiels (depuis les données déjà chargées)
  if (livresPartiels.length > 0) {
    console.log('\n=== CHAPITRES PARTIELS ===')
    for (const livre of livresPartiels) {
      const chapMap = {}
      for (const v of allVersets.filter(v => v.livre === livre)) {
        if (!chapMap[v.chapitre]) chapMap[v.chapitre] = { total: 0, vides: 0 }
        chapMap[v.chapitre].total++
        if (v.TR0001 === '' || v.TR0001 == null) chapMap[v.chapitre].vides++
      }
      const chapAvecVides = Object.entries(chapMap).filter(([, c]) => c.vides > 0)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([ch, c]) => `ch${ch}(${c.vides}/${c.total})`).join(', ')
      console.log(`  ${livre} : ${chapAvecVides}`)
    }
  }

  // 3. Anomalies textuelles (depuis les données chargées)
  console.log('\n=== ANOMALIES TEXTUELLES ===')
  const versetsRemplis = allVersets.filter(v => v.TR0001 && v.TR0001 !== '')

  const avecHtml = versetsRemplis.filter(v => /<[a-zA-Z/]/.test(v.TR0001))
  console.log(`  Balises HTML résiduelles : ${avecHtml.length}`)
  for (const v of avecHtml.slice(0, 5)) console.log(`    ${v.ref} : ${v.TR0001.slice(0, 100)}`)

  const avecNumero = versetsRemplis.filter(v => /^[0-9]+ /.test(v.TR0001))
  console.log(`  Texte commençant par un numéro : ${avecNumero.length}`)
  for (const v of avecNumero.slice(0, 5)) console.log(`    ${v.ref} : ${v.TR0001.slice(0, 100)}`)

  const tresLongs = versetsRemplis.filter(v => v.TR0001.length > 1500)
    .sort((a, b) => b.TR0001.length - a.TR0001.length)
  console.log(`  Versets > 1500 car. : ${tresLongs.length}`)
  for (const v of tresLongs.slice(0, 5)) console.log(`    ${v.ref} : ${v.TR0001.length} car.`)

  // 4. Contrôle qualitatif
  const livresCibles = ['GEN', 'PSA', 'ISA', 'MAT', 'JOH', 'ROM']
  const exemples = versetsRemplis.filter(v => livresCibles.includes(v.livre))
  const selection = exemples.sort(() => Math.random() - 0.5).slice(0, 5)
  console.log('\n=== CONTRÔLE QUALITATIF ===')
  for (const v of selection) console.log(`  ${v.ref} : ${v.TR0001.slice(0, 130)}`)
}

main().catch(console.error)
