// Ré-alignement des chapitres à décalage (action integrate/shift = MÊME chapitre) par
// alignement de séquences Needleman-Wunsch fondé sur le contenu. Remplace l'offset
// uniforme : gère les décalages qui changent en cours de chapitre, met en vide les
// « plus » LXX, garde les versets à formulation divergente ancrés à leur position.
// Ne touche PAS aux chapitres manuels (étape A, cross-chapitre).
//   node scripts/align-nw.mjs --show SIR 13     → montre l'alignement d'un chapitre (dry)
//   node scripts/align-nw.mjs --dry             → simulation globale (compte seulement)
//   node scripts/align-nw.mjs                    → applique en base
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const SHOW = args.includes('--show') ? [args[args.indexOf('--show')+1], +args[args.indexOf('--show')+2]] : null
const TRAD = 'TR0009', GAP = 0.12

const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
const nettoie = t => (t||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

// alignement global Needleman-Wunsch ; retourne map[i] = index canon (0-based) ou null
function nw(gtok, ctok) {
  const n=gtok.length, m=ctok.length
  const S=Array.from({length:n+1},()=>new Float64Array(m+1))
  const T=Array.from({length:n+1},()=>new Int8Array(m+1))  // 0 diag, 1 gig-gap, 2 canon-gap
  for(let i=1;i<=n;i++){ S[i][0]=-i*GAP; T[i][0]=1 }
  for(let j=1;j<=m;j++){ S[0][j]=-j*GAP; T[0][j]=2 }
  for(let i=1;i<=n;i++) for(let j=1;j<=m;j++){
    const diag=S[i-1][j-1]+dice(gtok[i-1],ctok[j-1])
    const up=S[i-1][j]-GAP, left=S[i][j-1]-GAP
    let b=diag,t=0; if(up>b){b=up;t=1} if(left>b){b=left;t=2}
    S[i][j]=b; T[i][j]=t
  }
  const map=new Array(n).fill(null); let i=n,j=m
  while(i>0||j>0){ const t=(i>0&&j>0)?T[i][j]:(i>0?1:2)
    if(t===0){ map[i-1]=j-1; i--; j-- } else if(t===1){ i-- } else { j-- } }
  return map
}

const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const plan = JSON.parse(readFileSync('scripts/giguet-plan.json','utf8'))

// texte référent Crampon par livre/chapitre → liste ordonnée {v, cid, tok}
const refRows = await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null).order('id'))
const canonPar = {}
for (const r of refRows){ const [code,ch,v]=r.canon_id.split('.'); (canonPar[`${code} ${ch}`]??=[]).push({ v:+v, cid:r.canon_id, tok:new Set(norm(r.texte)), txt:r.texte }) }
for (const k in canonPar) canonPar[k].sort((a,b)=>a.v-b.v)

function chapitresCibles(){
  // mode ciblé : tokens CODE:CH sur la ligne de commande (contourne le plan)
  const explicites = args.filter(a=>/^[A-Z0-9]+:\d+$/.test(a)).map(a=>{ const [c,n]=a.split(':'); return [c,+n] })
  if (explicites.length) return explicites
  const out=[]
  for (const [k,p] of Object.entries(plan)) if (p.action==='integrate'||p.action==='shift'){ const [code,ch]=k.split(' '); out.push([code,+ch]) }
  return out
}

async function traiter(code, ch, montre=false){
  const gc = (gig[code]||[]).find(c=>c.ch===ch); if(!gc) return null
  const cc = canonPar[`${code} ${ch}`]||[]
  const labels = gc.versets.map(v=>v.v)
  const monotone = labels.every((n,i)=>i===0||n>labels[i-1])   // glitch → v_orig par position
  const gv = gc.versets.map((v,idx)=>({ num: monotone?v.v:idx+1, tok:new Set(norm(v.text)), txt:nettoie(v.text) }))
  const map = nw(gv.map(g=>g.tok), cc.map(c=>c.tok))
  const rows = gv.map((g,i)=>({ trad_id:TRAD, livre:code, ch_orig:ch, v_orig:g.num, texte:g.txt,
    canon_id: map[i]!=null ? cc[map[i]].cid : null, est_suscription:false, alignement_verifie: map[i]!=null }))
  if (montre){
    console.log(`\n=== ${code} ${ch} — Giguet ${gv.length}v / canon ${cc.length}v ===`)
    gv.forEach((g,i)=>{ const c=map[i]!=null?cc[map[i]]:null
      console.log(`G${g.num} → ${c?c.cid:'vide'}   ${g.txt.slice(0,46)}`)
      if(c) console.log(`         canon: ${c.txt.slice(0,46)}`) })
  }
  return rows
}

if (SHOW){ await traiter(SHOW[0], SHOW[1], true); process.exit(0) }

const cibles = chapitresCibles()
let totV=0, totMap=0, nChap=0
// regroupe par livre pour insertion
const parLivre={}
for (const [code,ch] of cibles){ const rows=await traiter(code,ch); if(!rows)continue; (parLivre[code]??=[]).push({ch,rows}); nChap++ }

for (const [code, chapes] of Object.entries(parLivre)){
  for (const {ch,rows} of chapes){
    if(!DRY){ await sb.from('versets_v2').delete().eq('trad_id',TRAD).eq('livre',code).eq('ch_orig',ch)
      for(let i=0;i<rows.length;i+=500){ const{error}=await sb.from('versets_v2').insert(rows.slice(i,i+500)); if(error)throw new Error(`${code} ${ch}: ${error.message}`) } }
    totV+=rows.length; totMap+=rows.filter(r=>r.canon_id).length
  }
}
console.log(`${DRY?'[SIMULATION] ':''}Ré-aligné ${nChap} chapitres (integrate/shift) · ${totV} versets · ${totMap} mappés.`)
