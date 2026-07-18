// Contrôle poussé : structure extraite vs versets_canon (Vulgate = numérotation de Sacy).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const PROJ = './';
const env = Object.fromEntries(readFileSync(PROJ+'.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const ORDRE_T1 = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','TOB','JDT','EST','JOB','PSA','PRO','ECC','SNG','WIS','SIR']
const NOMS = {GEN:'Genèse',EXO:'Exode',LEV:'Lévitique',NUM:'Nombres',DEU:'Deutéronome',JOS:'Josué',JDG:'Juges',RUT:'Ruth','1SA':'1 Rois(Sam)','2SA':'2 Rois(Sam)','1KI':'3 Rois','2KI':'4 Rois','1CH':'1 Paralip.','2CH':'2 Paralip.',EZR:'1 Esdras',NEH:'2 Esdras',TOB:'Tobie',JDT:'Judith',EST:'Esther',JOB:'Job',PSA:'Psaumes',PRO:'Proverbes',ECC:'Ecclésiaste',SNG:'Cantique',WIS:'Sagesse',SIR:'Ecclésiastique'}

const canon = await all(sb.from('versets_canon').select('livre,ch_canon,v_canon').order('ordre'))
const attendu = {}
for (const r of canon){ if(!ORDRE_T1.includes(r.livre)) continue; (attendu[r.livre] ??= {ch:new Set(), n:0}); attendu[r.livre].ch.add(r.ch_canon); attendu[r.livre].n++ }

const extrait = JSON.parse(readFileSync('C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/sacy_t1.json','utf8'))
const obtenu = {}
for (const v of extrait){ (obtenu[v.livreIdx] ??= {ch:new Set(), n:0}); obtenu[v.livreIdx].ch.add(v.ch); obtenu[v.livreIdx].n++ }

console.log('Livre            | chap. extr/att | versets extr/att | manquants')
console.log('-'.repeat(74))
let totE=0, totA=0, totChE=0, totChA=0
ORDRE_T1.forEach((code,idx)=>{
  const a = attendu[code] || {ch:new Set(),n:0}, o = obtenu[idx] || {ch:new Set(), n:0}
  const pc = a.n ? Math.round(100*o.n/a.n) : 0
  totE+=o.n; totA+=a.n; totChE+=o.ch.size; totChA+=a.ch.size
  const alerte = pc<85 ? '  ⚠' : ''
  console.log(
    (NOMS[code]||code).padEnd(16)+' | '+
    String(o.ch.size).padStart(5)+'/'+String(a.ch.size).padEnd(8)+' | '+
    String(o.n).padStart(7)+'/'+String(a.n).padEnd(8)+' | '+
    String(a.n-o.n).padStart(6)+' ('+pc+'%)'+alerte)
})
console.log('-'.repeat(74))
console.log('TOTAL'.padEnd(16)+' | '+String(totChE).padStart(5)+'/'+String(totChA).padEnd(8)+' | '+
  String(totE).padStart(7)+'/'+String(totA).padEnd(8)+' | '+String(totA-totE).padStart(6)+' ('+Math.round(100*totE/totA)+'%)')
