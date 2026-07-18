// Charge la Genèse de Sacy (TR0001) dans versets_v2, italiques comprises.
// Sacy suit la numérotation de la Vulgate = celle de versets_canon → canon_id direct.
// alignement_verifie = true uniquement pour les versets dont la référence a été confirmée
// par recoupement avec la Crampon ; false partout ailleurs (texte lisible, référence à revoir).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// ── données ──
const versets  = JSON.parse(readFileSync(D+'sacy_t1.json','utf8')).filter(v=>v.livreIdx===0)
const confirm  = new Set(JSON.parse(readFileSync(D+'genese_valide.json','utf8')).map(v=>v.ch+'.'+v.v))
const { ital } = JSON.parse(readFileSync(D+'genese_italiques.json','utf8'))
const canonIds = new Set((await all(sb.from('versets_canon').select('id').like('id','GEN.%').order('id'))).map(r=>r.id))

// ── pose des italiques (appariement tolérant à l'OCR) ──
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/[^a-z0-9& ]/g,' ').replace(/f/g,'s').replace(/[ij]/g,'i').replace(/[uv]/g,'u')
  .replace(/\s+/g,' ').trim()
function proche(a,b,s){ if(Math.abs(a.length-b.length)>s) return false
  let p=[...Array(b.length+1).keys()]
  for(let i=1;i<=a.length;i++){ const c=[i]; let m=i
    for(let j=1;j<=b.length;j++){ c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); if(c[j]<m)m=c[j] }
    if(m>s) return false; p=c }
  return p[b.length]<=s }
function trouver(botte,aig){ const n=norm(aig); if(!n) return null
  const mots=botte.split(/(\s+)/), nb=n.split(' ').length, seuil=Math.max(1,Math.round(n.length*0.25))
  for(let i=0;i<mots.length;i+=2) for(let k=nb-1;k<=nb+1;k++){
    const b=mots.slice(i,i+2*k-1).join(''); if(!b.trim()) continue
    if(proche(norm(b),n,seuil)){ const d=mots.slice(0,i).join('').length; return [d,d+b.length] } }
  return null }

const idx=new Map(versets.map(v=>[v.ch+'.'+v.v,v]))
let poses=0
for(const it of ital){
  if(/^&$/.test(it.texte.trim())){ const c=idx.get(it.ch+'.'+it.v)
    if(!c||(c.texte.match(/&/g)||[]).length!==1) continue }
  const c=idx.get(it.ch+'.'+it.v); if(!c) continue
  const p=trouver(c.texte,it.texte)
  if(p){ // on n'avale pas la ponctuation en fin de span
    let [a,b]=p; while(b>a && /[\s.,;:!?]/.test(c.texte[b-1])) b--
    c.texte=c.texte.slice(0,a)+'<i>'+c.texte.slice(a,b)+'</i>'+c.texte.slice(b); poses++ }
}

// ── lignes à insérer ──
const lignes=[]
for(const v of versets){
  const cid = `GEN.${v.ch}.${v.v}`
  if(!canonIds.has(cid)) continue                       // n° hors Vulgate : écarté
  lignes.push({ trad_id:'TR0001', livre:'GEN', ch_orig:v.ch, v_orig:v.v,
    texte:v.texte.replace(/\s+/g,' ').trim(), canon_id:cid, est_suscription:false,
    alignement_verifie: confirm.has(v.ch+'.'+v.v) })
}
// dédoublonnage sur canon_id
const uniq=new Map()
for(const l of lignes) if(!uniq.has(l.canon_id)||uniq.get(l.canon_id).texte.length<l.texte.length) uniq.set(l.canon_id,l)
const finales=[...uniq.values()]

const verif=finales.filter(l=>l.alignement_verifie).length
console.log(`${DRY?'[DRY] ':''}Genèse Sacy — ${finales.length} versets à charger`)
console.log(`  italiques posées : ${poses} / ${ital.length}`)
console.log(`  référence confirmée (alignement_verifie=true) : ${verif}`)
console.log(`  à revoir (alignement_verifie=false) : ${finales.length-verif}`)
console.log(`  versets portant une italique : ${finales.filter(l=>l.texte.includes('<i>')).length}`)

if(!DRY){
  await sb.from('versets_v2').delete().eq('trad_id','TR0001').like('canon_id','GEN.%')
  let n=0
  for(let i=0;i<finales.length;i+=500){
    const {error}=await sb.from('versets_v2').insert(finales.slice(i,i+500))
    if(error){ console.error('ERR '+error.message); break }
    n+=finales.slice(i,i+500).length
  }
  console.log('inséré : '+n)
}
