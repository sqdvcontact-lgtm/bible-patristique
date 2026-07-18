// Pour chaque chapitre Giguet, teste plusieurs décalages (-2..+2) entre le label Giguet
// et le numéro canon, via similarité de contenu vs Crampon. Ne déclare SÛR que si le
// meilleur alignement est offset 0 avec forte concordance. Décale/flag sinon.
// Écrit scripts/giguet-plan.json : { "CODE ch": {action, offset, dice, nv} }.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (a,b)=>{const A=new Set(a),B=new Set(b);if(!A.size||!B.size)return 0;let i=0;for(const x of A)if(B.has(x))i++;return 2*i/(A.size+B.size)}

const ref = new Map(), canonCount = {}
let from=0
while(true){ const {data,error}=await sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null).order('id').range(from,from+999); if(error)throw error; for(const r of data)ref.set(r.canon_id,norm(r.texte)); if(data.length<1000)break; from+=1000 }
from=0
while(true){ const {data}=await sb.from('versets_canon').select('id,livre').order('id').range(from,from+999); for(const r of data){const ch=+r.id.split('.')[1];(canonCount[r.livre]??={})[ch]=(canonCount[r.livre]?.[ch]||0)+1} if(data.length<1000)break; from+=1000 }

const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const SEUIL = 0.28
const plan = {}, tally = { integrate:0, shift:0, manual:0, nocanon:0 }
for (const [code, chs] of Object.entries(gig)) {
  for (const c of chs) {
    const key = `${code} ${c.ch}`
    if (!canonCount[code]?.[c.ch]) { plan[key]={action:'manual',raison:'nocanon',nv:c.versets.length}; tally.nocanon++; continue }
    const vs = c.versets.map(v=>({ v:v.v, t:norm(v.text) }))
    let best={off:0,dice:0,cov:0}
    for (let off=-2; off<=2; off++){
      let sum=0,n=0
      for (const g of vs){ const rt=ref.get(`${code}.${c.ch}.${g.v+off}`); if(!rt)continue; sum+=dice(g.t,rt); n++ }
      const cov=n/vs.length, moy=n?sum/n:0
      if (cov>=0.6 && moy>best.dice) best={off,dice:+moy.toFixed(3),cov:+cov.toFixed(2)}
    }
    let action
    if (best.dice>=SEUIL && best.off===0) { action='integrate'; tally.integrate++ }
    else if (best.dice>=SEUIL && best.off!==0) { action='shift'; tally.shift++ }
    else { action='manual'; tally.manual++ }
    plan[key]={ action, offset:best.off, dice:best.dice, cov:best.cov, nv:c.versets.length }
  }
}
writeFileSync('scripts/giguet-plan.json', JSON.stringify(plan,null,0))
console.log('Décision par chapitre :', tally)
const shifts = Object.entries(plan).filter(([,p])=>p.action==='shift')
console.log(`\nSHIFT (décalage uniforme détecté, ${shifts.length}) :`)
for (const [k,p] of shifts.slice(0,40)) console.log(`  ${k}: offset ${p.offset>0?'+':''}${p.offset} (Dice ${p.dice}, cov ${p.cov})`)
const man = Object.entries(plan).filter(([,p])=>p.action==='manual'&&!k0(p)).length
function k0(){return false}
console.log(`\nMANUAL : ${tally.manual} chapitres (voir giguet-plan.json)`)
