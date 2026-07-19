import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}
const N={TR0001:'Sacy   ',TR0002:'Segond ',TR0003:'Crampon'}
const show=async(livre,ids)=>{
  const r=await all(sb.from('versets_v2').select('trad_id,ch_orig,v_orig,canon_id,texte').eq('livre',livre).in('canon_id',ids))
  for(const id of ids){ console.log(`\n  ${id}`)
    for(const x of r.filter(y=>y.canon_id===id).sort((a,b)=>a.trad_id.localeCompare(b.trad_id)))
      console.log(`    ${N[x.trad_id]} ${x.ch_orig},${x.v_orig} : ${(x.texte||'').replace(/<\/?i>/g,'').slice(0,72)}`)}
}
console.log('══ EZK 1,26-28'); await show('EZK',['EZK.1.26','EZK.1.27','EZK.1.28'])
console.log('\n══ DAN 3,90-98'); await show('DAN',['DAN.3.90','DAN.3.91','DAN.3.92','DAN.3.97','DAN.3.98','DAN.3.99'])
console.log('\n══ DAN 6,1-3'); await show('DAN',['DAN.6.1','DAN.6.2','DAN.6.3'])
console.log('\n══ HOS 14,1-3'); await show('HOS',['HOS.14.1','HOS.14.2','HOS.14.3'])
console.log('\n══ JOL 3,1 / 4,1'); await show('JOL',['JOL.3.1','JOL.4.1','JOL.4.2'])
