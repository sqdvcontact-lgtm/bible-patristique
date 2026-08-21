// Affiche côte à côte le texte référent canon (Crampon TR0003) et Giguet extrait,
// pour un livre + chapitres donnés, afin de localiser fusions/omissions à la main.
// Usage : node scripts/compare-book.mjs EZR 1 2 4 5
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const [code, ...chs] = process.argv.slice(2)
const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))

for (const chS of chs) {
  const ch = +chS
  // référent canon
  const { data } = await sb.from('versets_v2').select('canon_id,v_orig,texte')
    .eq('trad_id','TR0003').eq('livre',code).eq('ch_orig',ch).order('v_orig')
  const gc = gig[code].find(c=>c.ch===ch)
  const G = gc ? gc.versets : []
  console.log(`\n===== ${code} ${ch} — canon ${data.length} v. / Giguet ${G.length} v. =====`)
  const n = Math.max(data.length, G.length)
  for (let i=0;i<n;i++){
    const c = data[i], g = G[i]
    console.log(`C${c?c.v_orig:'–'}: ${c?c.texte.slice(0,58):''}`)
    console.log(`G${g?g.v:'–'}: ${g?g.text.slice(0,58):''}`)
    console.log('')
  }
}
