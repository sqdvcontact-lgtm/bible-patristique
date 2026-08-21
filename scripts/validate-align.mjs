// Valide le mappage par LABEL en comparant le CONTENU Giguet ↔ référent Crampon (TR0003)
// au même canon_id. Dice lexical (hors mots-outils). Sort la distribution par bucket et
// la liste des chapitres à faible similarité (mappage douteux → manuel).
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const STOP = new Set('le la les un une des de du au aux et a à à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or ne y me te se lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2 && !STOP.has(w))
const dice = (a,b) => { const A=new Set(a), B=new Set(b); if(!A.size||!B.size) return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }

// référent Crampon
const ref = new Map()
let from = 0
while (true) {
  const { data, error } = await sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null).order('id').range(from, from+999)
  if (error) throw new Error(error.message)
  for (const r of data) ref.set(r.canon_id, r.texte)
  if (data.length < 1000) break; from += 1000
}
console.log(`Référent Crampon : ${ref.size} versets`)

// canon counts (pour reclasser)
const canonCount = {}
from = 0
while (true) {
  const { data } = await sb.from('versets_canon').select('id,livre').order('id').range(from, from+999)
  for (const r of data) { const ch=+r.id.split('.')[1]; (canonCount[r.livre]??={})[ch]=(canonCount[r.livre]?.[ch]||0)+1 }
  if (data.length < 1000) break; from += 1000
}
function bucketOf(code,c){
  const L=c.versets.map(v=>v.v), cc=canonCount[code]?.[c.ch]
  if(!cc) return 'NOCANON'
  const mono=L.every((n,i)=>i===0||n>L[i-1]), maxL=Math.max(...L)
  if(L.length===cc&&L.every((n,i)=>n===i+1)) return 'CLEAN'
  if(mono&&L[0]===1&&maxL<=cc) return 'GAP'
  if(mono&&(maxL>cc||L.length>cc)) return 'EXTRA'
  return 'GLITCH'
}

const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const parBucket = { CLEAN:[], GAP:[] }
const faibles = []
for (const [code, chs] of Object.entries(gig)) {
  for (const c of chs) {
    const b = bucketOf(code, c)
    if (b!=='CLEAN' && b!=='GAP') continue
    let sum=0, n=0
    for (const v of c.versets) {
      const rt = ref.get(`${code}.${c.ch}.${v.v}`)
      if (!rt) continue
      sum += dice(norm(v.text), norm(rt)); n++
    }
    const moy = n ? sum/n : 0
    parBucket[b].push(moy)
    if (moy < 0.25) faibles.push({ code, ch:c.ch, b, moy:+moy.toFixed(3), nv:c.versets.length })
  }
}
const stats = arr => { const s=[...arr].sort((a,b)=>a-b); const q=p=>s[Math.floor(p*(s.length-1))]; return `n=${s.length} min=${q(0).toFixed(2)} p10=${q(.1).toFixed(2)} médiane=${q(.5).toFixed(2)} moy=${(s.reduce((a,b)=>a+b,0)/s.length).toFixed(2)}` }
console.log('\nDistribution de similarité (Dice moyen par chapitre) :')
console.log('  CLEAN :', stats(parBucket.CLEAN))
console.log('  GAP   :', stats(parBucket.GAP))

// carte par chapitre + tallies de seuil (hors Psaumes)
const diceMap = {}
for (const [code, chs] of Object.entries(gig)) for (const c of chs) {
  const b = bucketOf(code,c); if (b!=='CLEAN'&&b!=='GAP') continue
  let sum=0,n=0; for (const v of c.versets){ const rt=ref.get(`${code}.${c.ch}.${v.v}`); if(!rt) continue; sum+=dice(norm(v.text),norm(rt)); n++ }
  diceMap[`${code} ${c.ch}`] = { b, moy:+(n?sum/n:0).toFixed(3), nv:c.versets.length }
}
writeFileSync('scripts/giguet-dice.json', JSON.stringify(diceMap))
const nonPsa = Object.entries(diceMap).filter(([k])=>!k.startsWith('PSA '))
for (const t of [0.10,0.12,0.15,0.20]) {
  const ok = nonPsa.filter(([,d])=>d.moy>=t).length
  console.log(`  seuil ${t} (hors PSA) : ${ok}/${nonPsa.length} chapitres OK`)
}
faibles.sort((a,b)=>a.moy-b.moy)
writeFileSync('scripts/giguet-faibles.json', JSON.stringify(faibles, null, 1))
