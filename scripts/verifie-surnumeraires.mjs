// Contrôle de la règle : « un surnuméraire doit constituer un AJOUT, qui n'apparaît NULLE
// PART dans la traduction de référence » (19/07/2026).
//
// La vérification ne peut pas se faire en constatant qu'aucun verset du référent ne porte ce
// numéro : le référent range souvent le texte À L'INTÉRIEUR d'un verset voisin. On compare
// donc chaque surnuméraire au CONTENU de tous les versets du référent dans son livre, et on
// signale ceux qui trouvent un écho — ce sont des créneaux partagés, non des ajouts.
//   node scripts/verifie-surnumeraires.mjs [TR0001]
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const TRAD = process.argv.find(a => /^TR\d+$/.test(a)) || 'TR0001'
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}

// Signature robuste au changement de recension : mots longs, « f » ramené à « s » (le s long
// de 1730), accents retirés. Les noms propres et les nombres pèsent le plus.
const sig = t => new Set(((t||'').replace(/<\/?i>/g,'').normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/f/g,'s').toLowerCase().match(/[a-z]{5,}|\d+/g) || []))
// On mesure la part du SURNUMÉRAIRE retrouvée dans le verset du référent : c'est le sens de
// la question posée — « ce texte est-il quelque part chez le référent ? » —, et non l'inverse.
const couvre = (a, b) => { if (!a.size) return 0; let i=0; for (const w of a) if (b.has(w)) i++; return i/a.size }

const surn = await all(sb.from('versets_v2').select('livre,ch_orig,v_orig,canon_id,texte,est_suscription').eq('trad_id', TRAD).is('canon_id', null))
const livres = [...new Set(surn.map(v => v.livre))]
const REF = new Map()
for (const l of livres)
  REF.set(l, (await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre', l))).filter(r => r.texte && r.canon_id))

console.log(`\n${surn.length} surnuméraires à vérifier, dans ${livres.length} livre(s)\n`)
const suspects = []
for (const v of surn.sort((a,b)=>a.livre.localeCompare(b.livre)||a.ch_orig-b.ch_orig||a.v_orig-b.v_orig)){
  const s = sig(v.texte)
  let best = { id: '—', score: 0 }
  for (const r of REF.get(v.livre)){ const sc = couvre(s, sig(r.texte)); if (sc > best.score) best = { id: r.canon_id, score: sc } }
  if (best.score >= 0.5) suspects.push({ v, best })
}
console.log(`  ${suspects.length} surnuméraire(s) dont plus de la moitié des mots se retrouvent chez le référent`)
console.log('  → ce sont probablement des CRÉNEAUX PARTAGÉS, non des ajouts :\n')
for (const { v, best } of suspects.sort((a,b)=>b.best.score-a.best.score))
  console.log(`  ${v.livre} ${v.ch_orig},${v.v_orig}  ${(best.score*100).toFixed(0)}% dans ${best.id}\n     ${(v.texte||'').replace(/<\/?i>/g,'').slice(0,74)}`)
if (!suspects.length) console.log('  ✓ aucun : tous les surnuméraires sont bien des ajouts propres à l’édition.')
