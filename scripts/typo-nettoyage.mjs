// Trois défauts de texte signalés par l'éditeur, chacun plus large que son exemple.
//
//   node scripts/typo-nettoyage.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const all=async q=>{const o=[];let f=0;for(;;){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// ── 1. SEGOND : espace perdue après un deux-points ───────────────────────────────────────
// « prier :Notre Père », « je vous dis :Ne craignez pas ». Le défaut est dans la SOURCE
// (corpus ebible) et court sur tout le corpus, non sur les deux versets signalés.
// CONTRÔLE PRÉALABLE : on a relevé ce qui suit un deux-points collé sur douze livres — que
// des LETTRES, jamais un chiffre. L'insertion d'une espace ne peut donc pas casser une
// référence du type « 4:18 », qui n'existe pas dans ce texte.
//
// ── 2. SEGOND : deux mots soudés ─────────────────────────────────────────────────────────
// « eton n'allume pas », « délivre-nous dumalin » : même cause, une espace perdue. On ne
// traite QUE les cas signalés et vérifiés. Une règle générale qui recollerait les mots
// soudés est hors de question : elle couperait des mots légitimes, et rien ne le dirait.
const SEGOND_MOTS = [
  ['eton n’allume', 'et on n’allume'],
  ['eton ne', 'et on ne'],
  ['dumalin', 'du malin'],
]

// ── 3. SACY : lettrine précédée d'un signe de renvoi ─────────────────────────────────────
// La normalisation des capitales ornées s'ancrait sur le DÉBUT du texte. Quand l'édition
// place une croix de renvoi devant — « † LEs publicains », « † LA fête des » —, la règle ne
// se déclenchait pas et le mot restait à moitié en capitales.
const LETTRINE_APRES_SIGNE = /^([†¶]\s*)([A-ZÀ-Ü])([A-ZÀ-Ü]+)(?=[\s'’a-zà-ÿ])/

let n1 = 0, n2 = 0, n3 = 0
const maj = []

for (const L of [...new Set((await all(sb.from('versets_canon').select('livre'))).map(r=>r.livre))]){
  const V = await all(sb.from('versets_v2').select('id,trad_id,livre,ch_orig,v_orig,texte').eq('livre', L))
  for (const r of V){
    let t = r.texte || ''
    if (r.trad_id === 'TR0002'){
      const a = t
      t = t.replace(/:(?=\S)/g, ': ')
      if (t !== a) n1++
      for (const [de, vers] of SEGOND_MOTS){ if (t.includes(de)){ t = t.split(de).join(vers); n2++ } }
    }
    if (r.trad_id === 'TR0001'){
      const a = t
      t = t.replace(LETTRINE_APRES_SIGNE, (m, sig, x, y) => sig + x + y.toLowerCase())
      if (t !== a) n3++
    }
    if (t !== r.texte) maj.push({ id: r.id, livre: r.livre, ch: r.ch_orig, v: r.v_orig, avant: r.texte, texte: t })
  }
}

console.log(`${DRY?'[DRY] ':''}espaces rétablies après « : » (Segond) : ${n1}`)
console.log(`${DRY?'[DRY] ':''}mots soudés (Segond, cas signalés)     : ${n2}`)
console.log(`${DRY?'[DRY] ':''}lettrines derrière un signe (Sacy)     : ${n3}`)
console.log(`total : ${maj.length} versets`)
for (const m of maj.filter(x => LETTRINE_APRES_SIGNE.test(x.avant)).slice(0,5))
  console.log(`  ${m.livre} ${m.ch},${m.v} : ${m.avant.slice(0,34)} → ${m.texte.slice(0,34)}`)

if (!DRY && maj.length){
  writeFileSync(D + `avant_typo_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(maj, null, 1))
  for (const m of maj){
    const { error } = await sb.from('versets_v2').update({ texte: m.texte }).eq('id', m.id)
    if (error){ console.error('  ERR ' + error.message); break }
  }
  console.log('  écrit — état antérieur sauvegardé')
}
