// Transfère les guillemets français « » (niv.1) et anglais “ ” (niv.2) depuis le Crampon 1923
// de Wikisource (qui les a corrects) vers TR0003, verset par verset. Sécurité : ne remplace
// QUE si le contenu du verset Wikisource correspond au mien (mêmes mots, hors ponctuation).
//   node scripts/crampon-guillemets.mjs Genèse GEN --dry
import { readFileSync } from 'node:fs'
import { get } from 'node:https'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const [pageArg, codeArg] = process.argv.slice(2)
const DRY = process.argv.includes('--dry')
const fetchUrl = url => new Promise((res,rej)=>get(url,{headers:{'User-Agent':'research'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej))
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const decode = h => h
  .replace(/<div class="alinea[^"]*"[\s\S]*?<\/div>/g,' ')   // notes exégétiques de bas de page
  .replace(/<span id="CH\d+">[\s\S]*?<\/div>/g,' ')    // en-tête de numéro de chapitre
  .replace(/<sup class="verset-num[\s\S]*?<\/sup>/g,' ')
  .replace(/<sup[\s\S]*?<\/sup>/g,' ')                 // notes/références en exposant
  .replace(/<a[^>]*>\s*\d+\s*<\/a>/g,' ')              // liens de note (numéro seul)
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;|&#160;/g,' ').replace(/&#8217;|&rsquo;/g,'’')
  .replace(/&#171;|&laquo;/g,'«').replace(/&#187;|&raquo;/g,'»')
  .replace(/&#8220;|&ldquo;/g,'“').replace(/&#8221;|&rdquo;/g,'”')
  .replace(/&#339;/g,'œ').replace(/&#230;/g,'æ').replace(/&#8230;/g,'…').replace(/&#8212;/g,'—')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/[ \t\r\n]+/g,' ').replace(/ +([.,)])/g,'$1').replace(/ ?  ?/g,' ').trim()
const cmp = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[«»“”"'’ ]/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()

const html = await fetchUrl('https://fr.wikisource.org/w/index.php?title=Bible_Crampon_1923/'+encodeURIComponent(pageArg)+'&action=render')
// versets délimités par les ancres id="ch-v"
const anchors = [...html.matchAll(/id="(\d+)-(\d+)"/g)]
const wiki = new Map()
for (let k=0;k<anchors.length;k++){
  const ch=+anchors[k][1], v=+anchors[k][2]
  const start = html.indexOf('>', anchors[k].index) + 1                       // après la balise d'ancre
  const end = k+1<anchors.length ? html.lastIndexOf('<', anchors[k+1].index) : html.length  // avant le <span suivant
  wiki.set(`${ch}.${v}`, decode(html.slice(start, end)))
}
console.log(`Wikisource ${pageArg} : ${wiki.size} versets extraits.`)

const mine = await all(sb.from('versets_v2').select('id,canon_id,texte').eq('trad_id','TR0003').like('canon_id',codeArg+'.%'))
let ok=0, diff=0, absent=0, sans=0
const updates=[]; const mism=[]
for (const r of mine){
  const [,ch,v] = r.canon_id.split('.')
  const w = wiki.get(`${ch}.${v}`)
  if (w===undefined){ absent++; continue }
  if (cmp(w)===cmp(r.texte)){ ok++; if(w!==r.texte){ updates.push({id:r.id, canon_id:r.canon_id, texte:w}) } else { sans++ } }
  else { diff++; if(mism.length<10) mism.push({cid:r.canon_id, mien:r.texte.slice(0,55), wiki:w.slice(0,55)}) }
}
console.log(`Correspondants : ${ok} (dont ${updates.length} à mettre à jour, ${sans} déjà identiques) · texte différent : ${diff} · absents du Wikisource : ${absent}`)
if (mism.length){ console.log('\nExemples de NON-correspondance (à ne pas toucher / vérifier) :'); mism.forEach(m=>console.log(`  ${m.cid}\n    mien: ${m.mien}\n    wiki: ${m.wiki}`)) }

if (DRY){
  console.log('\n===== Aperçu (versets avec guillemets, ch.1-4) =====')
  for (const u of updates.filter(x=>{const c=+x.canon_id.split('.')[1];return c<=4 && /[«“]/.test(x.texte)})) console.log(`  ${u.canon_id}: ${u.texte}`)
} else {
  for (let i=0;i<updates.length;i+=25) await Promise.all(updates.slice(i,i+25).map(u=>sb.from('versets_v2').update({texte:u.texte}).eq('id',u.id)))
  console.log(`\n${updates.length} versets ${codeArg} mis à jour depuis Wikisource.`)
}
