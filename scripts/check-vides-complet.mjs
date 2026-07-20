// Pour chaque verset TR0001 vide, vérifie si TR0002 (Segond) est rempli
// Si TR0002 vide → ligne fantôme (aucune traduction = verset inexistant)
// Si TR0002 rempli → vrai vide Sacy à corriger
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
  // Tous les vides TR0001 (hors livres entièrement absents)
  let allVides = []
  let from = 0
  while (true) {
    const { data } = await sb.from('versets')
      .select('livre,chapitre,verset,TR0001,TR0002')
      .or('TR0001.is.null,TR0001.eq.')
      .order('livre').order('chapitre').order('verset')
      .range(from, from + 999)
    allVides = allVides.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  // Séparer livres entièrement absents vs vides partiels
  const livresEntiers = ['1MA','2ES','SIR','JDT','1ES','WIS','EZA','LJE','S3Y','SUS','BEL','MAN','PS2','ODA','3MA','2MA','4MA','BAR','TOB','ESG','JUB','ENO','PSS']
  const videsPartiels = allVides.filter(v => !livresEntiers.includes(v.livre))

  const vraisVides = videsPartiels.filter(v => v.TR0002)
  const fantomes = videsPartiels.filter(v => !v.TR0002)

  console.log(`=== VRAIS VIDES SACY (TR0002 rempli) : ${vraisVides.length} ===`)
  for (const v of vraisVides) {
    const t2 = v.TR0002.slice(0, 90)
    console.log(`  ${v.livre} ${v.chapitre}:${v.verset} → ${t2}`)
  }

  console.log(`\n=== LIGNES FANTÔMES (pas de TR0002) : ${fantomes.length} ===`)
  // Grouper par livre+chapitre pour plus de lisibilité
  const groupes = {}
  for (const v of fantomes) {
    const key = `${v.livre} ch${v.chapitre}`
    if (!groupes[key]) groupes[key] = []
    groupes[key].push(v.verset)
  }
  for (const [key, versets] of Object.entries(groupes)) {
    console.log(`  ${key}: v${versets.join(', v')}`)
  }
}
main().catch(console.error)
