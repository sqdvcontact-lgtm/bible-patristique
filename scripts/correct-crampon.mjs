// Correction typographique de la Crampon (TR0003) : espace INSÉCABLE (U+00A0) avant la
// ponctuation double ; : ! ? et à l'intérieur des guillemets « ». Gère les groupes (?! reste
// soudé, une seule espace avant le groupe) et normalise les espaces existants.
//   node scripts/correct-crampon.mjs --dry
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const NBSP = ' '
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

function fix(t){
  if (!t) return t
  // guillemets : insécable après « et avant »
  t = t.replace(/«[   ]*/g, '«'+NBSP).replace(/[   ]*»/g, NBSP+'»')
  // ponctuation double : enlève d'abord toute espace avant, puis insère une insécable
  // uniquement devant le PREMIER signe d'un groupe (le char précédent doit être « ordinaire »)
  t = t.replace(/[   ]+([;:!?])/g, '$1')
  t = t.replace(/([^\s;:!?«…])([;:!?])/g, '$1'+NBSP+'$2')
  return t
}

const rows = await all(sb.from('versets_v2').select('id,texte').eq('trad_id','TR0003').order('id'))
const changed = []
for (const r of rows){ const f = fix(r.texte); if (f !== r.texte) changed.push({ id:r.id, texte:f }) }
console.log(`${DRY?'[DRY] ':''}Versets Crampon : ${rows.length} · à corriger : ${changed.length}`)

// exemples délicats (groupes, guillemets, espace déjà présent)
const tests = ['Quoi?! dit-il.', 'Il cria: « Arrête ! » puis partit.', 'déjà correct : oui ; non.', 'la fin...']
const vis=s=>s.replace(/ /g,'·')
console.log('\nCas de test :')
for (const t of tests) console.log('  '+t+'  →  '+vis(fix(t)))

if (!DRY){
  let n=0
  for (let i=0;i<changed.length;i+=25){
    await Promise.all(changed.slice(i,i+25).map(c => sb.from('versets_v2').update({ texte:c.texte }).eq('id', c.id)))
    n += Math.min(25, changed.length-i)
    if (n % 2500 < 25) process.stdout.write(`  ${n}/${changed.length}\n`)
  }
  console.log(`\n${changed.length} versets corrigés.`)
}
