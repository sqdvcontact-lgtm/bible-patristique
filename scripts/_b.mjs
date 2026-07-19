import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}
const S=JSON.parse(readFileSync(D+'ezk_BAR_transcrit.json','utf8'))
const C=new Map((await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','BAR'))).map(r=>[r.canon_id,r.texte]))
console.log('BAR 1 — Sacy :')
for (const v of S.filter(x=>x.ch===1).sort((a,b)=>a.v-b.v)) console.log(`  ${String(v.v).padStart(2)} : ${v.texte.replace(/<\/?i>/g,'').slice(0,72)}`)
console.log('\nBAR 1 — référent (créneaux) :')
const c1=[...C.keys()].filter(k=>+k.split('.')[1]===1).sort((a,b)=>+a.split('.')[2]-+b.split('.')[2])
console.log('  ' + c1.map(k=>k.split('.')[2]).join(' '))
for (const k of ['BAR.1.17','BAR.1.18','BAR.1.19','BAR.1.20','BAR.1.21','BAR.1.22']) console.log(`  ${k} : ${(C.get(k)||'(absent)').slice(0,72)}`)
console.log('\ncréneaux canon par livre :')
for (const code of ['BAR','LJE','LAM']){
  const n=(await all(sb.from('versets_canon').select('id').like('id',code+'.%'))).length
  console.log(`  ${code} : ${n} créneaux`)
}
const chB={}; for(const k of C.keys()){const[,c,v]=k.split('.');chB[+c]=Math.max(chB[+c]||0,+v)}
console.log('  BAR par chapitre (référent) : ' + Object.keys(chB).map(Number).sort((a,b)=>a-b).map(c=>c+':'+chB[c]).join(' '))
const chS={}; for(const v of S) chS[v.ch]=Math.max(chS[v.ch]||0,v.v)
console.log('  BAR par chapitre (Sacy)     : ' + Object.keys(chS).map(Number).sort((a,b)=>a-b).map(c=>c+':'+chS[c]).join(' '))
