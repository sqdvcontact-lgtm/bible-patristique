// Rétablit l'espace insécable (U+00A0) à l'intérieur des guillemets français de la Crampon
// (TR0003) : après « et avant ». Le report Wikisource avait réintroduit des espaces
// normales (&nbsp; décodé en espace) ou collé les guillemets. --dry pour simuler.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const NB=' '
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

// « + espaces éventuelles -> « + insécable ;  espaces éventuelles + » -> insécable + »
// (gère le cas « collé » : zéro espace -> insère l'insécable ; normalise les NBSP multiples)
const SP = '[ \\t\\u00A0\\u202F\\u2009\\u2007]*'
const fix = t => t
  .replace(new RegExp('\\u00AB'+SP, 'g'), '«'+NB)
  .replace(new RegExp(SP+'\\u00BB', 'g'), NB+'»')
  .replace(/^\s+|\s+$/g, '')  // pas d'espace en tête/fin (\s inclut U+00A0)

const rows = await all(sb.from('versets_v2').select('id,texte').eq('trad_id','TR0003'))
const upd=[]
for (const r of rows){ const f=fix(r.texte||''); if(f!==r.texte) upd.push({id:r.id,texte:f}) }
console.log(`${DRY?'[DRY] ':''}Crampon — ${upd.length} versets à corriger.`)
if (DRY){ for (const u of upd.slice(0,5)) console.log('  '+u.texte.replace(/ /g,'·').slice(0,90)) }

if (!DRY){
  for (let i=0;i<upd.length;i+=25) await Promise.all(upd.slice(i,i+25).map(u=>sb.from('versets_v2').update({texte:u.texte}).eq('id',u.id)))
  console.log('appliqué.')
  const rows2 = await all(sb.from('versets_v2').select('texte').eq('trad_id','TR0003'))
  let oNB=0,oBad=0,fNB=0,fBad=0,dbl=0
  for(const r of rows2){const t=r.texte||''
    if(/  /.test(t)) dbl++
    for(let i=0;i<t.length;i++){
      if(t[i]==='«'){ if(t[i+1]===NB)oNB++; else oBad++ }
      if(t[i]==='»'){ if(t[i-1]===NB)fNB++; else fBad++ }
    }}
  console.log('contrôle : après « → NBSP='+oNB+' autre='+oBad+' | avant » → NBSP='+fNB+' autre='+fBad+' | versets double-NBSP='+dbl)
}
