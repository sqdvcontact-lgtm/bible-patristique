import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}
const S=JSON.parse(readFileSync(D+'ezk_EZK_transcrit.json','utf8'))
const C=new Map((await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','EZK'))).map(r=>[r.canon_id,r.texte]))
console.log('EZK 34,23 tel que transcrit :\n  ' + (S.find(v=>v.ch===34&&v.v===23)?.texte||'—'))
const ch={}; for(const k of C.keys()){const[,c,v]=k.split('.');ch[+c]=Math.max(ch[+c]||0,+v)}
const chS={}; for(const v of S) chS[v.ch]=Math.max(chS[v.ch]||0,v.v)
console.log('\ncomptes ch 19-22 — Sacy / canon :')
for(let c=19;c<=22;c++) console.log(`  ch ${c} : Sacy ${chS[c]} · canon ${ch[c]}`)
console.log('\n── charnière 20/21 ──')
for(const [c,v] of [[20,44],[20,45],[20,46],[20,49],[21,1],[21,2]]){
  console.log(`  S ${c},${v} : ${(S.find(x=>x.ch===c&&x.v===v)?.texte||'—').replace(/<\/?i>/g,'').slice(0,76)}`)
  console.log(`  C ${c},${v} : ${(C.get(`EZK.${c}.${v}`)||'—').slice(0,76)}`)
}
for(const k of ['EZK.21.1','EZK.21.5','EZK.21.6']) console.log(`  → ${k} : ${(C.get(k)||'—').slice(0,76)}`)
console.log('\nSacy dernier verset ch 21 : ' + chS[21] + ' → ' + (S.find(x=>x.ch===21&&x.v===chS[21])?.texte||'').replace(/<\/?i>/g,'').slice(0,70))
console.log('canon dernier ch 21 (' + ch[21] + ') : ' + (C.get(`EZK.21.${ch[21]}`)||'').slice(0,70))
