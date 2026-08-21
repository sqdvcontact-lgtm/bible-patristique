// Transfère les guillemets « » / " " du Crampon 1923 (Wikisource) vers TR0003, pour TOUS
// les livres. Match par ch_orig/v_orig (numérotation propre Crampon = celle de Wikisource,
// hébraïque pour les Psaumes). Contrôle d'équilibre par livre. --dry = simulation.
import { readFileSync } from 'node:fs'
import { get } from 'node:https'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const only = process.argv.slice(2).filter(a=>!a.startsWith('--'))
const Q = String.fromCharCode(34)
const fetchUrl = url => new Promise((res,rej)=>get(url,{headers:{'User-Agent':'research'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej))
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }
const decode = h => h
  .replace(/<div class="alinea[^"]*"[\s\S]*?<\/div>/g,' ').replace(/<span id="CH\d+">[\s\S]*?<\/div>/g,' ')
  .replace(/<sup class="verset-num[\s\S]*?<\/sup>/g,' ').replace(/<sup[\s\S]*?<\/sup>/g,' ').replace(/<a[^>]*>\s*\d+\s*<\/a>/g,' ')
  .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&#8217;|&rsquo;/g,'’')
  .replace(/&#171;|&laquo;/g,'«').replace(/&#187;|&raquo;/g,'»').replace(/&#8220;|&ldquo;/g,'“').replace(/&#8221;|&rdquo;/g,'”')
  .replace(/&#339;/g,'œ').replace(/&#230;/g,'æ').replace(/&#8230;/g,'…').replace(/&#8212;/g,'—').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/[ \t\r\n]+/g,' ').replace(/ +([.,)])/g,'$1').replace(/^([A-ZÀ-Ü]) (?=[a-zà-ÿ])/,'$1').trim()  // lettrine
const cmp = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[«»“”"'’ ]/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()

const BOOKS = [
  ['GEN','Genèse'],['EXO','Exode'],['LEV','Lévitique'],['NUM','Nombres'],['DEU','Deutéronome'],
  ['JOS','Josué'],['JDG','Juges'],['RUT','Ruth'],['1SA','1 Samuel'],['2SA','2 Samuel'],
  ['1KI','1 Rois'],['2KI','2 Rois'],['1CH','1 Chroniques'],['2CH','2 Chroniques'],
  ['EZR','Esdras'],['NEH','Néhémie'],['TOB','Tobie'],['JDT','Judith'],['EST','Esther'],
  ['1MA','1 Machabées'],['2MA','2 Machabées'],['JOB','Job'],
  ['PSA',['Psaumes 1','Psaumes 2','Psaumes 3','Psaumes 4','Psaumes 5']],
  ['PRO','Proverbes'],['ECC','Ecclésiaste'],['SNG','Cantique'],['WIS','Sagesse'],['SIR','Ecclésiastique'],
  ['ISA','Isaïe'],['JER','Jérémie'],['LAM','Lamentations'],['BAR','Baruch'],['EZK','Ézéchiel'],['DAN','Daniel'],
  ['HOS','Osée'],['JOL','Joël'],['AMO','Amos'],['OBA','Abdias'],['JON','Jonas'],['MIC','Michée'],
  ['NAM','Nahum'],['HAB','Habacuc'],['ZEP','Sophonie'],['HAG','Aggée'],['ZEC','Zacharie'],['MAL','Malachie'],
  ['MAT','Matthieu'],['MRK','Marc'],['LUK','Luc'],['JHN','Jean'],['ACT','Actes des Apôtres'],
  ['ROM','Romains'],['1CO','1 Corinthiens'],['2CO','2 Corinthiens'],['GAL','Galates'],['EPH','Éphésiens'],
  ['PHP','Philippiens'],['COL','Colossiens'],['1TH','1 Thessaloniciens'],['2TH','2 Thessaloniciens'],
  ['1TI','1 Timothée'],['2TI','2 Timothée'],['TIT','Tite'],['PHM','Philémon'],['HEB','Hébreux'],
  ['JAS','Jacques'],['1PE','1 Pierre'],['2PE','2 Pierre'],['1JN','1 Jean'],['2JN','2 Jean'],['3JN','3 Jean'],
  ['JUD','Jude'],['REV','Apocalypse'],
]

const anomalies = []
for (const [code, pageOrList] of BOOKS){
  if (only.length && !only.includes(code)) continue
  const pages = Array.isArray(pageOrList) ? pageOrList : [pageOrList]
  const wiki = new Map()
  for (const page of pages){
    const html = await fetchUrl('https://fr.wikisource.org/w/index.php?title=Bible_Crampon_1923/'+encodeURIComponent(page.replace(/ /g,'_'))+'&action=render')
    const anchors = [...html.matchAll(/id="(\d+)-(\d+)"/g)]
    for (let k=0;k<anchors.length;k++){ const s=html.indexOf('>',anchors[k].index)+1; const e=k+1<anchors.length?html.lastIndexOf('<',anchors[k+1].index):html.length; wiki.set(anchors[k][1]+'.'+anchors[k][2], decode(html.slice(s,e))) }
  }
  const mine = await all(sb.from('versets_v2').select('id,canon_id,ch_orig,v_orig,texte').eq('trad_id','TR0003').like('canon_id',code+'.%'))
  let ok=0, diff=0, absent=0; const updates=[]
  for (const r of mine){ const w = wiki.get(`${r.ch_orig}.${r.v_orig}`)
    if (w===undefined){ absent++; continue }
    if (cmp(w)===cmp(r.texte)){ ok++; if(w!==r.texte) updates.push({id:r.id, texte:w}) } else diff++ }
  if (!DRY) for (let i=0;i<updates.length;i+=25) await Promise.all(updates.slice(i,i+25).map(u=>sb.from('versets_v2').update({texte:u.texte}).eq('id',u.id)))
  // équilibre après (recharge si appliqué, sinon simule sur updates+mine)
  const finalTxt = new Map(mine.map(r=>[r.id, r.texte]))
  for (const u of updates) finalTxt.set(u.id, u.texte)
  let o1=0,f1=0,o2=0,f2=0, straight=0
  for (const t of finalTxt.values()){ o1+=(t.match(/«/g)||[]).length; f1+=(t.match(/»/g)||[]).length; o2+=(t.match(/“/g)||[]).length; f2+=(t.match(/”/g)||[]).length; straight+=(t.match(new RegExp(Q,'g'))||[]).length }
  const bal = (o1===f1 && o2===f2)
  const flag = (!bal||diff>0||absent>0||straight>0)
  console.log(`${code}: maj ${updates.length} · match ${ok}/${mine.length} · diff ${diff} · absent ${absent} · « ${o1}/${f1}${bal?'✓':' ⚠'}${straight?` · " restants ${straight}`:''}${flag?'  ⚑':''}`)
  if (!bal) anomalies.push(`${code} : déséquilibre « ${o1} / » ${f1}${o2!==f2?` · " ${o2}/${f2}`:''}`)
  if (straight>0 || diff>0) anomalies.push(`${code} : ${straight} guillemet(s) droit(s) restant(s), ${diff} verset(s) au texte divergent (à revoir)`)
}
console.log('\n===== ANOMALIES À REVOIR =====')
anomalies.forEach(a=>console.log('  '+a))
