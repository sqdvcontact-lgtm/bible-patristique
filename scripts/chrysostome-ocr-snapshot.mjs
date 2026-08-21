// Instantané de sécurité avant la relecture OCR page par page de A0014O0038.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),OEUVRE='A0014O0038'
async function tous(q){const out=[];for(let from=0;;from+=1000){const{data,error}=await q.range(from,from+999);if(error)throw error;out.push(...data);if(data.length<1000)break}return out}
const segments=await tous(sb.from('segments').select('*').eq('id_oeuvre',OEUVRE).order('segment_numero'))
const ids=segments.map(s=>s.id),liens=[]
for(let i=0;i<ids.length;i+=200){const{data,error}=await sb.from('liens_bibliques').select('*').in('segment_id',ids.slice(i,i+200));if(error)throw error;liens.push(...data)}
const{data:oeuvre,error}=await sb.from('oeuvres').select('*').eq('id_oeuvre',OEUVRE).single();if(error)throw error
mkdirSync('tmp/audit-backups',{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-'),f=`tmp/audit-backups/${OEUVRE}-avant-relecture-ocr-${stamp}.json`
writeFileSync(f,JSON.stringify({oeuvre,segments,liens},null,2));writeFileSync('tmp/pdfs/chrysostome_facsimile/segments-courants.json',JSON.stringify(segments,null,2))
console.log(`✓ ${segments.length} segments · ${liens.length} liens · ${f}`)
