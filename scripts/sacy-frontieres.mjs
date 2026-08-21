// Établit les frontières de versification entre une transcription Sacy et le canon,
// par comparaison de contenu avec la Crampon. Sert à bâtir la table de correspondance.
//   node scripts/sacy-frontieres.mjs NUM nom_ 11 12 13 20 21 23 25 26
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const [CODE, PREFIXE, ...CHS] = process.argv.slice(2)
const S = JSON.parse(readFileSync(D+PREFIXE+'transcrit.json','utf8'))
const cr = new Map()
for (const r of await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').like('canon_id',CODE+'.%').order('canon_id')))
  cr.set(r.canon_id.split('.').slice(1).join('.'), r.texte)

// mots significatifs : noms propres et nombres, insensibles à la graphie
const STOP = new Set(['dans','pour','avec','tous','toute','leur','leurs','sera','seront','étoit','etoit','vous','nous','sont','fait','faire','ainsi','celui','cette','contre'])
const sig = t => new Set(((t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/f/g,'s')
  .toLowerCase().match(/[a-z]{5,}|\d+/g)||[]).filter(w=>!STOP.has(w)))
const jac = (a,b) => { if(!a.size||!b.size) return 0; let i=0; for(const w of a) if(b.has(w)) i++; return i/Math.min(a.size,b.size) }

for (const ch of CHS.map(Number)){
  const sv = S.filter(v=>v.ch===ch).sort((a,b)=>a.v-b.v)
  if (!sv.length){ console.log(`\n${CODE} ${ch} : absent de la transcription`); continue }
  console.log(`\n═══ ${CODE} ${ch} — Sacy ${sv.length} v.`)
  // pour chaque verset Sacy, meilleur candidat canon (chapitre ch-1, ch, ch+1)
  const cands = []
  for (const c of [ch-1, ch, ch+1])
    for (const [k,t] of cr) if (+k.split('.')[0] === c) cands.push({ ref:k, txt:t })
  for (const v of sv){
    if (v.v > 3 && v.v < sv.length - 2) continue      // on n'examine que les bords
    let best = null
    for (const c of cands){ const s = jac(sig(v.texte), sig(c.txt)); if(!best || s > best.s) best = { ref:c.ref, s } }
    if (best && best.s >= 0.30)
      console.log(`   v${String(v.v).padStart(2)} → ${CODE}.${best.ref}  (${best.s.toFixed(2)})  ${v.texte.replace(/<\/?i>/g,'').slice(0,60)}`)
    else
      console.log(`   v${String(v.v).padStart(2)} → ?              ${v.texte.replace(/<\/?i>/g,'').slice(0,60)}`)
  }
}
