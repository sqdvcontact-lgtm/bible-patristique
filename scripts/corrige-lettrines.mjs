// Applique aux versets déjà chargés la règle de lib-lettrines.mjs.
//
// La règle est branchée dans la fusion, donc vraie pour tout ce qui sera rechargé ; mais
// recharger les 66 livres pour une capitale serait disproportionné. On corrige donc en base,
// EN IMPORTANT LA MÊME LISTE — une correction en base qui recopierait la règle finirait par
// diverger du pipeline, et c'est exactement ainsi qu'une correction « ne tient pas ».
//
//   node scripts/corrige-lettrines.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { corrigeLettrineElidee } from './lib-lettrines.mjs'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const maj = []
for (const L of ['A','E','I','O','U','Y']){
  const { data } = await sb.from('versets_v2').select('id,livre,ch_orig,v_orig,texte')
    .eq('trad_id','TR0001').like('texte', `_’${L}%`).limit(1000)
  for (const r of data || []){
    const t = corrigeLettrineElidee(r.texte)
    if (t !== r.texte) maj.push({ ...r, neuf: t })
  }
}
console.log(`${DRY?'[DRY] ':''}${maj.length} versets à corriger`)
for (const m of maj.slice(0, 8)) console.log(`  ${m.livre} ${m.ch_orig},${m.v_orig} : ${m.texte.slice(0,28)} → ${m.neuf.slice(0,28)}`)
if (!DRY && maj.length){
  writeFileSync(D + `avant_lettrines_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(maj, null, 1))
  for (const m of maj){
    const { error } = await sb.from('versets_v2').update({ texte: m.neuf }).eq('id', m.id)
    if (error){ console.error('  ERR ' + error.message); break }
  }
  console.log('  écrit — état antérieur sauvegardé')
}
