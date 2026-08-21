// Finalisation : après le transfert Wikisource (~95% des « » en place), convertit les
// guillemets droits " RESTANTS (versets au texte divergent de l'édition Wikisource, non
// appariés) en « » / “ ”. Règle LOCALE, fiable pour les " isolés : un " précédé de
// : ; ( — « “ ou en début de verset OUVRE ; sinon il FERME. Le niveau (« » niv.1 vs “ ”
// niv.2) est donné par la profondeur PAR VERSET (les imbrications tiennent dans le verset ;
// une fermeture isolée reprend le niveau 1 par défaut). --dry pour simuler.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const Q = String.fromCharCode(34), NBSP=' ', O1='«', F1='»', O2='“', F2='”'
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const rows = (await all(sb.from('versets_v2').select('id,canon_id,ch_orig,v_orig,texte').eq('trad_id','TR0003').like('texte','%'+Q+'%')))
  .sort((a,b)=>{const A=a.canon_id.split('.'),B=b.canon_id.split('.');return A[0]<B[0]?-1:A[0]>B[0]?1:(a.ch_orig-b.ch_orig)||(a.v_orig-b.v_orig)})

const updates=[]
for (const r of rows){
  let out='', depth=0
  for (let i=0;i<r.texte.length;i++){ const c=r.texte[i]
    if (c===O1||c===O2){ depth++; out+=c }
    else if (c===F1||c===F2){ if(depth>0)depth--; out+=c }
    else if (c===Q){
      let j=i-1; while(j>=0 && (r.texte[j]===' '||r.texte[j]===NBSP)) j--
      const b = j>=0 ? r.texte[j] : ''
      const open = (b==='' || ':;(—«“'.includes(b))
      if (open){ out += (depth>=1?O2:O1); depth++ }
      else { const lvl=depth; if(depth>0)depth--; out += (lvl>=2?F2:F1) }
    }
    else out+=c
  }
  // espacement français des guillemets nouvellement posés
  out = out.replace(/«[   ]*/g,O1+NBSP).replace(/[   ]*»/g,NBSP+F1)
    .replace(/[   ]*“[   ]*/g,' '+O2).replace(/[   ]*”[   ]*/g,F2+' ').replace(/  +/g,' ').replace(/ +([.,)])/g,'$1').trim()
  if (out!==r.texte) updates.push({id:r.id, canon_id:r.canon_id, texte:out})
}

console.log(`${DRY?'[DRY] ':''}Versets à guillemet droit convertis : ${updates.length}`)
if (!DRY){ for (let i=0;i<updates.length;i+=25) await Promise.all(updates.slice(i,i+25).map(u=>sb.from('versets_v2').update({texte:u.texte}).eq('id',u.id))); console.log('appliqué.') }
const reste = (await all(sb.from('versets_v2').select('canon_id').eq('trad_id','TR0003').like('texte','%'+Q+'%'))).length
console.log('Versets à guillemet droit restants (tous livres) : '+reste)
// export pour la revue Word
import('node:fs').then(fs=>fs.writeFileSync('scripts/finalize-converted.json', JSON.stringify(updates,null,1)))
