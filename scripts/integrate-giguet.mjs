// Intégrateur Giguet (TR0009) → versets_v2, piloté par scripts/giguet-plan.json
// (alignement validé par le CONTENU vs Crampon). v_orig = label imprimé par Giguet
// (numérotation d'origine du traducteur) ; canon_id = code.ch.(label+offset) si le slot
// existe, sinon null (verset surnuméraire LXX = hors ossature, conservé).
//   --do integrate   : chapitres offset 0 confirmés (défaut)
//   --do integrate,shift : + chapitres à décalage uniforme confirmé
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TRAD = 'TR0009'
const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const plan = JSON.parse(readFileSync('scripts/giguet-plan.json','utf8'))
const doArg = (process.argv.find(a=>a.startsWith('--do='))||'--do=integrate').split('=')[1].split(',')
const nettoie = t => t.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()

const canonIds = new Set()
let from=0
while(true){ const {data,error}=await sb.from('versets_canon').select('id').order('id').range(from,from+999); if(error)throw error; data.forEach(r=>canonIds.add(r.id)); if(data.length<1000)break; from+=1000 }

let totCh=0, totV=0, totHors=0
const parLivre = {}
for (const [code, chs] of Object.entries(gig)) {
  for (const c of chs) {
    const p = plan[`${code} ${c.ch}`]
    if (!p || !doArg.includes(p.action)) continue
    const off = p.offset || 0
    // labels non monotones = glitch OCR (doublon/décroissance) → mapper par POSITION
    const labels = c.versets.map(v=>v.v)
    const monotone = labels.every((n,i)=>i===0||n>labels[i-1])
    const rows = c.versets.map((v, idx) => {
      const num = monotone ? v.v : idx+1            // n° d'origine (corrigé si glitch)
      const cid = `${code}.${c.ch}.${num+off}`
      const ok = canonIds.has(cid)
      const estSusc = off>0 && !ok && num<=off && /psa/i.test(code)   // titre de psaume décalé hors ossature
      return { trad_id:TRAD, livre:code, ch_orig:c.ch, v_orig:num, texte:nettoie(v.text),
        canon_id: ok?cid:null, est_suscription:estSusc, alignement_verifie: ok }
    })
    ;(parLivre[code] ??= []).push(...rows)
  }
}

for (const [code, rows] of Object.entries(parLivre)) {
  await sb.from('versets_v2').delete().eq('trad_id',TRAD).eq('livre',code)
  for (let i=0;i<rows.length;i+=500){ const {error}=await sb.from('versets_v2').insert(rows.slice(i,i+500)); if(error)throw new Error(`${code}: ${error.message}`) }
  const hors = rows.filter(r=>!r.canon_id).length
  totCh += new Set(rows.map(r=>r.ch_orig)).size; totV += rows.length; totHors += hors
}
console.log(`Actions intégrées : ${doArg.join(', ')}`)
console.log(`${Object.keys(parLivre).length} livres · ${totCh} chapitres · ${totV.toLocaleString('fr')} versets · ${totHors} hors ossature (surnuméraires/titre)`)
