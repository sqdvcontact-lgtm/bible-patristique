// Relecture générale de la Genèse de Sacy en base : détecte les anomalies résiduelles.
// Ne corrige rien — signale, pour arbitrage sur le fac-similé.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

const V = await all(sb.from('versets_v2').select('canon_id,ch_orig,v_orig,texte').eq('trad_id','TR0001').order('canon_id'))
const ref = v => `Gn ${v.ch_orig}, ${v.v_orig}`
const pb = (cat, v, det) => anomalies.push({ cat, ref: ref(v), det })
const anomalies = []

// lexique français tiré des traductions déjà en base (Segond + Crampon)
const lex = new Set()
for (const r of await all(sb.from('versets_v2').select('texte').in('trad_id',['TR0002','TR0003']).order('id')))
  for (const w of (r.texte||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').match(/[a-z']{2,}/g)||[]) lex.add(w)

for (const v of V){
  const t = v.texte || ''
  // 1. balises d'italique mal formées
  if ((t.match(/<i>/g)||[]).length !== (t.match(/<\/i>/g)||[]).length) pb('balise', v, t.slice(0,60))
  // 2. lacune signalée par le transcripteur
  if (t.includes('[?]')) pb('illisible', v, t.slice(0,70))
  // 3. caractères parasites (chiffre isolé, ponctuation aberrante)
  if (/[0-9]/.test(t.replace(/<\/?i>/g,''))) pb('chiffre', v, t.slice(0,70))
  if (/[!]{1}[a-zà-ÿ]|[a-zà-ÿ][!][a-zà-ÿ]/.test(t)) pb('ponctuation', v, t.slice(0,70))
  if (/\b(8c|6c|\$c|&c)\b/.test(t)) pb('esperluette', v, t.slice(0,70))
  // 4. verset anormalement court
  if (t.replace(/<\/?i>/g,'').trim().length < 18) pb('très court', v, t)
  // 5. césure non recollée
  if (/[a-zà-ÿ]-\s/.test(t)) pb('césure', v, t.slice(0,70))
  // 6. mot répété (réclame non dédoublonnée)
  const m = t.replace(/<\/?i>/g,'').match(/\b([A-Za-zà-ÿ']{3,})\s+\1\b/i)
  if (m) pb('mot répété', v, '« '+m[1]+' » — '+t.slice(0,60))
  // 7. mots hors lexique, avec suggestion par permutation u/n ou i/l
  for (const w of (t.replace(/<\/?i>/g,'').match(/[A-Za-zÀ-ÿ]{4,}/g)||[])){
    const n = w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    if (lex.has(n)) continue
    for (const [a,b] of [['n','u'],['u','n'],['l','i'],['i','l'],['c','e'],['e','c']]){
      if (!n.includes(a)) continue
      const alt = n.split(a).join(b)
      if (lex.has(alt)) { pb('lecture ?', v, `« ${w} » → « ${alt} » ?`); break }
    }
  }
}

// 8. contrôle de continuité : trous dans la numérotation de l'édition
const parCh = new Map()
for (const v of V) (parCh.get(v.ch_orig) ?? parCh.set(v.ch_orig,[]).get(v.ch_orig)).push(v.v_orig)
const trous = []
for (const [ch, vs] of [...parCh].sort((a,b)=>a[0]-b[0])){
  vs.sort((a,b)=>a-b)
  for (let i=1;i<vs.length;i++) if (vs[i] !== vs[i-1]+1) trous.push(`Gn ${ch} : saut de ${vs[i-1]} à ${vs[i]}`)
  if (vs[0] !== 1) trous.push(`Gn ${ch} : commence au v.${vs[0]}`)
}

const parCat = {}
for (const a of anomalies) (parCat[a.cat] ??= []).push(a)
console.log('RELECTURE — Genèse (Sacy 1730) : '+V.length+' versets, '+parCh.size+' chapitres')
console.log('anomalies signalées : '+anomalies.length+'\n')
for (const [cat, list] of Object.entries(parCat).sort((a,b)=>b[1].length-a[1].length)){
  console.log(`── ${cat} (${list.length})`)
  list.slice(0,8).forEach(a=>console.log(`   ${a.ref} : ${a.det}`))
  if (list.length>8) console.log(`   … et ${list.length-8} autres`)
}
console.log('\n── continuité de la numérotation ('+trous.length+')')
trous.slice(0,12).forEach(t=>console.log('   '+t))
