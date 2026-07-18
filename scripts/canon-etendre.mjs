// Étend l'ossature versets_canon aux versets que PLUSIEURS éditions portent en commun mais
// que le canon ignorait.
//   node scripts/canon-etendre.mjs [--ecrire]
//
// Pourquoi. L'ossature avait été bâtie sur une numérisation du référent qui, pour Tobie et
// Judith, avait perdu ses frontières de versets : elle en comptait donc trop peu. Une fois
// le référent rechargé depuis une édition correctement découpée, il est apparu que Sacy ET
// Crampon portent les mêmes 86 versets supplémentaires, aux mêmes numéros. Ce ne sont pas
// des singularités d'une édition : c'est du texte que l'ossature omettait.
//
// Règle appliquée : on n'ajoute un créneau que si AU MOINS DEUX éditions indépendantes
// portent ce verset au même numéro. Un verset propre à une seule édition reste surnuméraire
// — sans quoi l'ossature se mettrait à suivre les particularités de chaque témoin.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ECRIRE = process.argv.includes('--ecrire')
const all = async q => { const o=[]; let f=0; while(true){ const {data,error}=await q.range(f,f+999); if(error)throw error; o.push(...data); if(data.length<1000)break; f+=1000 } return o }

// ── surnuméraires, regroupés par (livre, ch, v) ──
const S = await all(sb.from('versets_v2').select('id,trad_id,livre,ch_orig,v_orig,texte').is('canon_id', null))
const groupes = new Map()
for (const r of S){
  const k = `${r.livre}.${r.ch_orig}.${r.v_orig}`
  ;(groupes.get(k) ?? groupes.set(k, []).get(k)).push(r)
}

// L'ordre encode livre, chapitre et verset : TOB.1.1 vaut 17001001. On lit la base de
// chaque livre sur un créneau existant plutôt que de la coder en dur.
const C = await all(sb.from('versets_canon').select('id,livre,ordre').order('ordre'))
const baseLivre = new Map()
for (const r of C){
  if (baseLivre.has(r.livre)) continue
  baseLivre.set(r.livre, Math.floor(r.ordre / 1000000))
}
const dejaLa = new Set(C.map(r => r.id))

const nouveaux = [], rejetes = []
for (const [k, rs] of [...groupes].sort()){
  const [livre, ch, v] = k.split('.')
  if (dejaLa.has(k)){ rejetes.push(`${k} (créneau déjà existant)`); continue }
  if (rs.length < 2){ rejetes.push(`${k} (une seule édition : ${rs[0].trad_id})`); continue }
  const base = baseLivre.get(livre)
  if (base === undefined){ rejetes.push(`${k} (livre inconnu de l'ossature)`); continue }
  nouveaux.push({
    id: k, livre, ch_canon: +ch, v_canon: +v,
    ordre: base * 1000000 + (+ch) * 1000 + (+v),
    est_suscription: false, ch_heb: +ch, v_heb: +v,
  })
}

const parLivre = {}
for (const n of nouveaux) parLivre[n.livre] = (parLivre[n.livre] || 0) + 1
console.log('╔═ Extension de l’ossature canonique\n')
console.log(`  créneaux à créer : ${nouveaux.length}`)
for (const [L, n] of Object.entries(parLivre)) console.log(`     ${L} : ${n}`)
console.log(`  écartés          : ${rejetes.length}`)
rejetes.slice(0, 8).forEach(r => console.log(`     ${r}`))
console.log(`\n  ossature : ${C.length} → ${C.length + nouveaux.length} créneaux`)

// contrôle : l'ordre inséré doit tomber entre le verset précédent et le suivant du livre
const ordres = new Map(C.map(r => [r.id, r.ordre]))
let malPlaces = 0
for (const n of nouveaux){
  const precedent = ordres.get(`${n.livre}.${n.ch_canon}.${n.v_canon - 1}`)
  if (precedent !== undefined && n.ordre <= precedent) malPlaces++
}
console.log(`  ordres mal placés : ${malPlaces}`)

if (!ECRIRE){ console.log('\n[simulation] — relancer avec --ecrire'); process.exit(0) }

const f = D + `avant_canon_${new Date().toISOString().slice(0,10)}.json`
writeFileSync(f, JSON.stringify(C, null, 1))
console.log(`\n  ossature sauvegardée : ${C.length} lignes → ${f.split('/').pop()}`)

let n = 0
for (let i = 0; i < nouveaux.length; i += 200){
  const { error } = await sb.from('versets_canon').insert(nouveaux.slice(i, i+200))
  if (error){ console.error('ERR ' + error.message); break }
  n += nouveaux.slice(i, i+200).length
}
console.log(`  créneaux créés : ${n}`)

// rattacher les versets qui les attendaient
let rattaches = 0
for (const [k, rs] of groupes){
  if (!nouveaux.some(x => x.id === k)) continue
  for (const r of rs){
    const { error } = await sb.from('versets_v2')
      .update({ canon_id: k, notes: null, alignement_verifie: true }).eq('id', r.id)
    if (!error) rattaches++
  }
}
console.log(`  versets rattachés à leur créneau : ${rattaches}`)
