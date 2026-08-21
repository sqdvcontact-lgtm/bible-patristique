// Fusionne les transcriptions de la Genèse (lots A→H) en un texte unique, puis contrôle.
// Traite les trois pièges repérés : réclames dupliquées au raccord, lettrines en casse
// mixte, et confusions de lecture u/n. Ne corrige rien en aveugle : signale pour arbitrage.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// ── 1. collecte, dans l'ordre des pages ──
const LOTS = ['A','B','C','D','E','F','G','H']
const frags = new Map()      // "ch.v" → [{page, texte}]
const manquants = []
for (const L of LOTS){
  const f = D+`trans_${L}.json`
  if (!existsSync(f)) { manquants.push(L); continue }
  for (const p of JSON.parse(readFileSync(f,'utf8')).pages)
    for (const v of p.versets||[]){
      const k = v.ch+'.'+v.v
      ;(frags.get(k) ?? frags.set(k,[]).get(k)).push({page:p.pageImp, texte:(v.texte||'').trim()})
    }
}
if (manquants.length) console.log('⚠ lots absents : '+manquants.join(', ')+'\n')

// ── 2. recollage des fragments, avec dédoublonnage de la réclame au raccord ──
let reclames = 0
function recoller(parts){
  parts.sort((a,b)=>a.page-b.page)
  let t = parts[0].texte
  for (let i=1;i<parts.length;i++){
    const suite = parts[i].texte
    const finA = t.split(/\s+/).pop() || ''
    const debB = suite.split(/\s+/)[0] || ''
    const nu = s => s.toLowerCase().replace(/[^a-zà-ÿ']/g,'')
    if (nu(finA) && nu(finA) === nu(debB)) {           // réclame répétée : on l'enlève
      t = t.slice(0, t.length - finA.length).trimEnd(); reclames++
    }
    t = (t + ' ' + suite).replace(/\s+/g,' ').trim()
  }
  return t
}

// ── 3. lettrine : « SAra » → « Sara », « LE ciel » → « Le ciel » ──
let lettrines = 0
function normaliserLettrine(t){
  const avant = t
  t = t.replace(/^([A-ZÀ-Ü])([A-ZÀ-Ü]+)(?=[a-zà-ÿ])/, (m,a,b)=> a + b.toLowerCase())        // SAra
  t = t.replace(/^([A-ZÀ-Ü])([A-ZÀ-Ü]+)(\s+[a-zà-ÿ])/, (m,a,b,c)=> a + b.toLowerCase() + c) // LE ciel
  if (t!==avant) lettrines++
  return t
}

const versets = []
for (const [k, parts] of frags){
  const [ch,v] = k.split('.').map(Number)
  versets.push({ ch, v, texte: normaliserLettrine(recoller(parts)) })
}
versets.sort((a,b)=>a.ch-b.ch || a.v-b.v)
writeFileSync(D+'genese_transcrite.json', JSON.stringify(versets,null,1))

// ── 4. contrôle : couverture contre la Vulgate ──
const canon = await all(sb.from('versets_canon').select('ch_canon,v_canon').eq('livre','GEN').order('ordre'))
const MAXV = {}; for (const r of canon) MAXV[r.ch_canon] = Math.max(MAXV[r.ch_canon]||0, r.v_canon)
const present = new Set(versets.map(v=>v.ch+'.'+v.v))
const trous = []
for (const c of Object.keys(MAXV).map(Number).sort((a,b)=>a-b)){
  const miss = []; for (let v=1; v<=MAXV[c]; v++) if(!present.has(c+'.'+v)) miss.push(v)
  if (miss.length) trous.push(`  ch ${String(c).padStart(2)} : manque ${miss.join(',').slice(0,60)}`)
}
const surnum = versets.filter(v=>!MAXV[v.ch] || v.v>MAXV[v.ch])

// ── 5. contrôle : confusions de lecture u/n, à l'aide d'un lexique tiré des traductions en base ──
const lex = new Set()
for (const r of await all(sb.from('versets_v2').select('texte').in('trad_id',['TR0002','TR0003']).order('id')))
  for (const w of (r.texte||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').match(/[a-z']{3,}/g)||[]) lex.add(w)
const suspects = []
for (const v of versets)
  for (const w of (v.texte.match(/[A-Za-zÀ-ÿ]{3,}/g)||[])){
    const n = w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    if (lex.has(n)) continue
    const swap = n.includes('n') ? n.replace(/n/g,'u') : n.includes('u') ? n.replace(/u/g,'n') : null
    if (swap && lex.has(swap)) suspects.push(`Gn ${v.ch},${v.v} : « ${w} » → « ${swap} » ?`)
  }

console.log('TRANSCRIPTION FUSIONNÉE — Genèse')
console.log('  versets : '+versets.length+' / '+canon.length+'  ('+Math.round(100*versets.length/canon.length)+'%)')
console.log('  chapitres : '+new Set(versets.map(v=>v.ch)).size+' / '+Object.keys(MAXV).length)
console.log('  italiques : '+versets.filter(v=>/<i>/.test(v.texte)).length+' versets')
console.log('  réclames dédoublonnées au raccord : '+reclames)
console.log('  lettrines normalisées : '+lettrines)
console.log('\nCHAPITRES INCOMPLETS : '+trous.length)
trous.slice(0,15).forEach(t=>console.log(t))
if (surnum.length) console.log('\nversets hors Vulgate : '+surnum.map(v=>v.ch+','+v.v).join(' '))
console.log('\nCONFUSIONS u/n PROBABLES : '+suspects.length+'  (à arbitrer sur l\'image, ne pas corriger en aveugle)')
suspects.slice(0,20).forEach(s=>console.log('  '+s))
writeFileSync(D+'genese_suspects.json', JSON.stringify(suspects,null,1))
