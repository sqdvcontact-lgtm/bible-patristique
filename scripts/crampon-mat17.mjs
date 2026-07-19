// Crampon, Mt 17 : rendre au créneau 27 le verset qui lui manque.
//
// LE DERNIER CRÉNEAU VIDE EST UNE SIGNATURE. Trois fois déjà elle a désigné la même chose —
// PSA 49, PSA 100, JHN 11,57 — : une traduction qui court un cran trop bas parce qu'elle
// réunit deux versets du canon quelque part en amont.
//
// Ici Crampon (comme Sacy) garde dans son v. 14 l'arrivée de l'homme ET sa supplication
// (« Seigneur, ayez pitié de mon fils qui est lunatique »), que le canon compte séparément
// en 14 et 15. La Segond, elle, les sépare — c'est ELLE qui suit la division du canon.
// On scinde donc Crampon au même endroit et l'on décale la suite d'un cran.
//
//   node scripts/crampon-mat17.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const COUPE = 'Seigneur, ayez pitié de mon fils'

const { data } = await sb.from('versets_v2').select('id,canon_id,texte')
  .eq('trad_id','TR0003').eq('livre','MAT').eq('ch_orig',17)
const par = new Map(data.map(r => [+r.canon_id.split('.')[2], r]))
if (par.get(27)?.texte){ console.error('le créneau 27 n’est PAS vide — rien fait'); process.exit(1) }
const v14 = par.get(14)
const i = v14.texte.indexOf(COUPE)
if (i < 0){ console.error('point de coupe introuvable — rien fait'); process.exit(1) }

// On descend depuis la fin pour ne pas écraser une valeur pas encore lue.
const maj = []
for (let n = 27; n >= 16; n--) maj.push({ id: par.get(n).id, texte: par.get(n - 1).texte })
maj.push({ id: par.get(15).id, texte: v14.texte.slice(i).trim() })
maj.push({ id: v14.id,        texte: v14.texte.slice(0, i).trim() })

console.log(`${DRY?'[DRY] ':''}Mt 17 — ${maj.length} versets décalés d’un cran`)
console.log(`   14 : …${v14.texte.slice(0, i).trim().slice(-46)}`)
console.log(`   15 : ${v14.texte.slice(i).trim().slice(0, 56)}`)
if (!DRY){
  writeFileSync(D + 'avant_crampon_MAT17.json', JSON.stringify(data, null, 1))
  for (const m of maj){
    const { error } = await sb.from('versets_v2').update({ texte: m.texte }).eq('id', m.id)
    if (error){ console.error('  ERR ' + error.message); break }
  }
  console.log('  écrit — état antérieur sauvegardé')
}
