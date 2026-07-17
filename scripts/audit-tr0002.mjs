import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://oucotpxcjalwgetylfbz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y290cHhjamFsd2dldHlsZmJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMyODUyOCwiZXhwIjoyMDk2OTA0NTI4fQ.qAzdbqG1xqL3zkZ9I-pEwlk5Nek8778-Ph0-HkNxPr0'
)

async function main() {
  let allVides = [], from = 0
  while (true) {
    const { data } = await sb.from('versets')
      .select('livre,chapitre,verset,TR0001,TR0002')
      .or('TR0002.is.null,TR0002.eq.')
      .order('livre').order('chapitre').order('verset')
      .range(from, from + 999)
    allVides = allVides.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  // Livres entièrement absents du canon Protestant (Segond ne les a pas)
  const livresAbsents = ['1MA','2ES','SIR','JDT','1ES','WIS','EZA','LJE','S3Y','SUS','BEL','MAN','PS2','ODA','3MA','2MA','4MA','BAR','TOB','ESG','JUB','ENO','PSS']
  const videsPartiels = allVides.filter(v => !livresAbsents.includes(v.livre))

  // Fantômes : TR0001 aussi vide → verset n'existe dans aucune tradition
  const fantomes = videsPartiels.filter(v => !v.TR0001)
  // Vrais vides Segond : TR0001 rempli mais TR0002 vide
  const vraisVides = videsPartiels.filter(v => v.TR0001)

  console.log(`Total vides TR0002 : ${allVides.length}`)
  console.log(`  dont livres absents (deutérocanoniques) : ${allVides.length - videsPartiels.length}`)
  console.log(`  fantômes (TR0001 aussi vide) : ${fantomes.length}`)
  console.log(`  vrais vides Segond : ${vraisVides.length}`)

  if (vraisVides.length > 0) {
    console.log(`\n=== VRAIS VIDES TR0002 (Segond) ===`)
    // Grouper par livre
    const parLivre = {}
    for (const v of vraisVides) {
      if (!parLivre[v.livre]) parLivre[v.livre] = []
      parLivre[v.livre].push(`${v.chapitre}:${v.verset}`)
    }
    for (const [livre, refs] of Object.entries(parLivre)) {
      console.log(`  ${livre}: ${refs.join(', ')}`)
    }
  }

  if (fantomes.length > 0) {
    console.log(`\n=== FANTÔMES (ni TR0001 ni TR0002) ===`)
    const parLivre = {}
    for (const v of fantomes) {
      const key = `${v.livre} ch${v.chapitre}`
      if (!parLivre[key]) parLivre[key] = []
      parLivre[key].push(v.verset)
    }
    for (const [key, versets] of Object.entries(parLivre)) {
      console.log(`  ${key}: v${versets.join(', v')}`)
    }
  }
}
main().catch(console.error)
