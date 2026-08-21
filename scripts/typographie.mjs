// Passe typographique française sur le texte des versets. Générique et idempotente.
//   node scripts/typographie.mjs TR0001 [TR0003 …] [--dry]
// Règles : pas d'espace avant , ni . — insécable avant ; : ! ? et à l'intérieur des « » —
// pas d'espace après ( ni avant ) — espace unique — apostrophes courbes.
// Les balises <i> sont préservées et ne comptent pas comme du texte.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const TRADS = process.argv.slice(2).filter(a => !a.startsWith('--'))
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const NBSP = ' '
const ESP = '[ \\t\\u00A0\\u202F\\u2009]'      // toute forme d'espace

export function corrigerTypographie(t) {
  if (!t) return t
  let s = t
  // 1. espaces multiples (toutes formes) → une seule espace ordinaire
  s = s.replace(new RegExp(ESP + '{2,}', 'g'), ' ')
  // 2. pas d'espace AVANT virgule ni point (règle française)
  s = s.replace(new RegExp(ESP + '+([,.])', 'g'), '$1')
  // 3. insécable AVANT ; : ! ? — on normalise d'abord ce qui précède
  s = s.replace(new RegExp(ESP + '*([;:!?])', 'g'), NBSP + '$1')
  // 4. insécable à l'intérieur des guillemets français
  s = s.replace(new RegExp('«' + ESP + '*', 'g'), '«' + NBSP)
  s = s.replace(new RegExp(ESP + '*»', 'g'), NBSP + '»')
  // 5. parenthèses : pas d'espace intérieure
  s = s.replace(new RegExp('\\(' + ESP + '+', 'g'), '(')
  s = s.replace(new RegExp(ESP + '+\\)', 'g'), ')')
  // 6. une espace APRÈS virgule/point si un mot suit immédiatement
  s = s.replace(/([,.])([A-Za-zÀ-ÿ])/g, '$1 $2')
  // 7. apostrophes courbes
  s = s.replace(/'/g, '’')
  // 8. pas d'espace parasite autour des balises d'italique
  s = s.replace(new RegExp('<i>' + ESP + '+', 'g'), '<i>')
  s = s.replace(new RegExp(ESP + '+</i>', 'g'), '</i> ')
  // 9. nettoyage des bords
  s = s.replace(new RegExp('^' + ESP + '+|' + ESP + '+$', 'g'), '')
  s = s.replace(new RegExp(ESP + '{2,}', 'g'), ' ')
  return s
}

// N'exécuter le traitement que si le script est lancé directement — sans quoi un simple
// import (par sacy-charge.mjs) prendrait ses arguments pour des identifiants de traduction.
const lanceDirectement = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())

if (lanceDirectement && TRADS.length) {
  for (const tid of TRADS) {
    const V = await all(sb.from('versets_v2').select('id,livre,ch_orig,v_orig,texte').eq('trad_id', tid).order('canon_id'))
    const upd = []
    for (const v of V) { const n = corrigerTypographie(v.texte); if (n !== v.texte) upd.push({ id: v.id, texte: n, avant: v.texte, ref: `${v.livre} ${v.ch_orig},${v.v_orig}` }) }
    console.log(`${DRY ? '[DRY] ' : ''}${tid} — ${upd.length} versets à corriger sur ${V.length}`)
    upd.slice(0, 6).forEach(u => {
      console.log(`   ${u.ref}`)
      console.log(`     avant : ${u.avant.slice(0, 88)}`)
      console.log(`     après : ${u.texte.slice(0, 88)}`)
    })
    if (!DRY) {
      for (let i = 0; i < upd.length; i += 25)
        await Promise.all(upd.slice(i, i + 25).map(u => sb.from('versets_v2').update({ texte: u.texte }).eq('id', u.id)))
      // contrôle
      const ap = await all(sb.from('versets_v2').select('texte').eq('trad_id', tid).order('id'))
      const c = re => ap.reduce((a, r) => a + ((r.texte || '').match(re) || []).length, 0)
      console.log(`   après : espace avant virgule ${c(/ ,/g)} · avant point ${c(/ \./g)} · ` +
        `« ; » sans insécable ${c(new RegExp('[^' + NBSP + '\\s];', 'g'))} · espaces doubles ${c(/  +/g)}`)
    }
  }
}
