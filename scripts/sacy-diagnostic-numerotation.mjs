// Confronte la numérotation de Sacy à celle du référent, chapitre par chapitre, en
// s'appuyant sur le CONTENU. Sert à trancher les coquilles de numérotation de l'édition.
//   node scripts/sacy-diagnostic-numerotation.mjs EST esd_ 6 9
//
// Pour chaque verset de Sacy, on cherche le verset du référent qui lui ressemble le plus
// dans le même chapitre. Si le numéro trouvé diffère du numéro imprimé, l'écart saute aux
// yeux — et l'on voit du même coup où l'édition a sauté ou répété un chiffre.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))

const [CODE, PREFIXE, ...CHS] = process.argv.slice(2)
const src = JSON.parse(readFileSync(D + `crampon_${CODE}_source.json`, 'utf8'))
const S = JSON.parse(readFileSync(D + `${PREFIXE}${CODE}_transcrit.json`, 'utf8'))

const sig = t => new Set(((t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/f/g,'s')
  .toLowerCase().match(/[a-z]{4,}/g) || []))
const jac = (a,b) => { if(!a.size||!b.size) return 0; let i=0; for(const w of a) if(b.has(w)) i++; return i/Math.max(a.size,b.size) }

for (const ch of CHS.map(Number)){
  const sv = S.filter(v => v.ch === ch).sort((a,b) => a.v - b.v)
  const cv = src[ch] || []
  console.log(`\n═══ ${CODE} ${ch} — Sacy ${sv.length} versets · référent ${cv.length}`)
  let decalage = 0
  for (const s of sv){
    let best = null
    for (const c of cv){ const j = jac(sig(s.texte), sig(c.texte)); if (!best || j > best.j) best = { v: c.v, j } }
    const marque = best && best.v !== s.v ? `  ⇒ ${best.v}` : ''
    if (marque) decalage++
    console.log(`  imprimé ${String(s.v).padStart(2)}${marque.padEnd(8)} (${best ? best.j.toFixed(2) : '—'})  ${s.texte.replace(/<\/?i>/g,'').slice(0, 62)}`)
  }
  console.log(`  → ${decalage} verset(s) dont le numéro imprimé ne correspond pas au contenu`)
}
