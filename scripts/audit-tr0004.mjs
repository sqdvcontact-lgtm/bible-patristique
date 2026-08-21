import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  let allVides = [], from = 0
  while (true) {
    const { data } = await sb.from('versets')
      .select('livre,chapitre,verset,TR0001,TR0002,TR0003,TR0004')
      .or('TR0004.is.null,TR0004.eq.')
      .order('livre').order('chapitre').order('verset')
      .range(from, from + 999)
    allVides = allVides.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  // La Vulgate contient les deutérocanoniques, mais pas ces livres très spécifiques
  const livresAbsents = ['2ES','EZA','LJE','S3Y','MAN','PS2','ODA','3MA','4MA','ESG','JUB','ENO','PSS','1ES']
  const videsPartiels = allVides.filter(v => !livresAbsents.includes(v.livre))

  // Fantômes : aucune des 3 autres traductions n'a de contenu
  const fantomes = videsPartiels.filter(v => !v.TR0001 && !v.TR0002 && !v.TR0003)
  // Vrais vides : au moins une autre traduction a du contenu
  const vraisVides = videsPartiels.filter(v => v.TR0001 || v.TR0002 || v.TR0003)

  console.log(`Total vides TR0004 : ${allVides.length}`)
  console.log(`  dont livres absents : ${allVides.length - videsPartiels.length}`)
  console.log(`  fantômes : ${fantomes.length}`)
  console.log(`  vrais vides Vulgate : ${vraisVides.length}`)

  if (vraisVides.length > 0) {
    console.log(`\n=== VRAIS VIDES TR0004 ===`)
    const parLivre = {}
    for (const v of vraisVides) {
      if (!parLivre[v.livre]) parLivre[v.livre] = []
      parLivre[v.livre].push(`${v.chapitre}:${v.verset}`)
    }
    for (const [livre, refs] of Object.entries(parLivre)) {
      console.log(`  ${livre}: ${refs.join(', ')}`)
    }
  }

  if (fantomes.length > 0 && fantomes.length <= 20) {
    console.log(`\n=== FANTÔMES ===`)
    for (const v of fantomes) console.log(`  ${v.livre} ${v.chapitre}:${v.verset}`)
  } else if (fantomes.length > 20) {
    console.log(`\n(${fantomes.length} fantômes — trop nombreux à lister)`)
  }
}
main().catch(console.error)
