// Affiche un psaume de Sacy en regard du référent, pour trancher À L'ŒIL.
//
// POURQUOI CET OUTIL. Le score de contenu (Jaccard) est inutilisable dans le psautier :
// Sacy traduit la Vulgate, le référent l'hébreu, et le vocabulaire diverge trop
// (« Yahweh » / « le Seigneur », « sanctuaire » / « santuaire »). Mais la STRUCTURE, elle,
// se lit sans effort dès qu'on met les deux colonnes côte à côte : on voit tout de suite que
// le référent a réuni deux versets là où l'édition en fait deux.
//
// C'est la leçon des psaumes 133 et 122 : l'algorithme proposait « souder 1+2 », je l'avais
// écarté en croyant à un artefact systématique — c'était la bonne réponse, et il a suffi de
// regarder pour le voir. L'outil qui manquait n'était pas un meilleur score, c'était un
// affichage lisible.
//
//   node scripts/psautier-regard.mjs 133 122 86 …
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const LARG = parseInt(process.env.LARG || '78')
const S = JSON.parse(readFileSync(D + 'sir_SIR_transcrit.json', 'utf8'))

for (const arg of process.argv.slice(2)){
  const c = parseInt(arg)
  const { data } = await sb.from('versets_v2').select('canon_id,texte')
    .eq('trad_id','TR0003').eq('livre','SIR').like('canon_id', `SIR.${c}.%`)
  const ref = data.sort((a,b)=>+a.canon_id.split('.')[2] - +b.canon_id.split('.')[2])
  const sac = S.filter(v => v.ch === c).sort((a,b)=>a.v-b.v)
  console.log(`\n${'═'.repeat(LARG)}\nPSAUME ${c}   —   Sacy : ${sac.filter(v=>v.v>0).length} versets` +
              `${sac.some(v=>v.v===0)?' + suscription':''}   |   référent : ${ref.length} créneaux`)
  console.log('─'.repeat(LARG))
  const n = Math.max(sac.length, ref.length)
  for (let i = 0; i < n; i++){
    const a = sac[i], b = ref[i]
    console.log(`  S ${a ? String(a.v).padStart(3) : '   '} │ ${a ? a.texte.replace(/<\/?i>/g,'').slice(0,LARG-12) : ''}`)
    console.log(`  R ${b ? String(b.canon_id.split('.')[2]).padStart(3) : '   '} │ ${b ? (b.texte||'').slice(0,LARG-12) : ''}`)
    console.log('')
  }
}
