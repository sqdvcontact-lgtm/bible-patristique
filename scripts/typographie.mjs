// Passe typographique française sur le texte des versets. Générique et idempotente.
//   node scripts/typographie.mjs TR0001 [TR0003 …] [--dry]
// Règles : pas d'espace avant , ni . — pas d'espace après ( ni avant ) — espace unique —
// apostrophes courbes ; puis la composition de la charte § 3.2, par la fonction commune
// normaliserTypographieEdition (insécable avant le deux-points, fine avant ; ! ? et à
// l'intérieur des « », s long et ligatures développés).
// Les balises <i> sont préservées et ne comptent pas comme du texte.
//
// ⛔ Réservée aux éditions NON MÉDIÉVALES (charte § 3.2) : nommer une traduction ici, c'est
// déclarer son régime. Le témoin médiéval de la Bible 899 est refusé d'office.
//
// ⚠️ Le module importe un fichier TypeScript par son chemin : Node 24 en retire les types,
// sans outil de plus (le module visé n'emploie que de la syntaxe effaçable).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normaliserTypographieEdition } from '../app/lib/typographieEdition.ts'
const DRY = process.argv.includes('--dry')
const TRADS = process.argv.slice(2).filter(a => !a.startsWith('--'))
const TEMOINS_MEDIEVAUX = new Set(['TR0009'])
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
  // 3-4. ponctuation haute et guillemets : voir l'étape 10, qui suit la charte § 3.2.
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
  // 10. composition de la charte § 3.2 : la fonction commune des importeurs.
  return normaliserTypographieEdition(s)
}

// N'exécuter le traitement que si le script est lancé directement — sans quoi un simple
// import (par sacy-charge.mjs) prendrait ses arguments pour des identifiants de traduction.
const lanceDirectement = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())

if (lanceDirectement && TRADS.length) {
  const refuses = TRADS.filter(t => TEMOINS_MEDIEVAUX.has(t))
  if (refuses.length) throw new Error(`Témoin médiéval, typographie de transcription : ${refuses.join(', ')}`)
  // Le client ne s'ouvre qu'ici : importé par un chargeur ou par un test, le module ne lit rien.
  const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
    .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
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
