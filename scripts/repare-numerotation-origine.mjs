// Répare la numérotation d'origine là où mes propres interventions l'ont laissée fausse ou muette.
//
// LA RÈGLE DE L'ÉDITEUR EST CONSTANTE : on corrige le RATTACHEMENT au canon, jamais la
// numérotation d'origine, et tout écart s'explique par une note. Deux catégories y échappaient.
//
// 1. SACY, DÉCALAGES SANS NOTE (36 versets). Quand une scission rend deux créneaux, tout ce
//    qui suit dans le chapitre avance d'un cran. Le v_orig était bien conservé — mais rien
//    n'expliquait au lecteur pourquoi la colonne affiche « 17,16 » en face d'un « 15 ».
//
// 2. CRAMPON, NUMÉROS DEVENUS FAUX. Plus sérieux. J'ai déplacé du TEXTE d'une ligne à l'autre
//    pour combler des créneaux vides (Ps 49, Ps 100, Jn 11, Ac 10, Mt 17) sans toucher aux
//    numéros : ces lignes annonçaient donc un numéro qui n'était plus celui de leur texte.
//    On aurait pu croire le champ décoratif — il ne l'est pas : le v_orig de Crampon diffère
//    du numéro canonique dans 2 382 lignes sur 7 304, il porte bien sa numérotation propre.
//
//   node scripts/repare-numerotation-origine.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const all=async q=>{const o=[];let f=0;for(;;){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// Chaque intervention : le verset SOURCE a été coupé en deux créneaux, et la suite du
// chapitre a glissé d'un cran. `jusqu` est le dernier créneau touché.
const INTERVENTIONS = [
  { trad:'TR0003', livre:'MAT', ch:17, coupe:14, jusqu:27,
    quoi:'l’arrivée de l’homme et sa supplication, que le canon compte séparément' },
  { trad:'TR0003', livre:'JHN', ch:11, coupe:56, jusqu:57,
    quoi:'la question posée dans le temple et l’ordre des pontifes' },
  { trad:'TR0003', livre:'ACT', ch:10, coupe:48, jusqu:49,
    quoi:'l’ordre du baptême et la prière de rester quelques jours' },
  { trad:'TR0003', livre:'PSA', ch:49, coupe:1, jusqu:24,
    quoi:'le titre du psaume et son premier verset' },
  { trad:'TR0003', livre:'PSA', ch:100, coupe:1, jusqu:9,
    quoi:'le titre du psaume et son premier verset' },
]

const maj = []
for (const it of INTERVENTIONS){
  const V = await all(sb.from('versets_v2').select('id,canon_id,v_orig,v_orig_suffixe,notes')
    .eq('trad_id', it.trad).eq('livre', it.livre).eq('ch_orig', it.ch))
  for (const r of V){
    if (!r.canon_id) continue
    const n = +r.canon_id.split('.')[2]
    if (n < it.coupe || n > it.jusqu) continue
    // Les deux moitiés du verset coupé gardent SON numéro, distinguées par un suffixe ;
    // tout ce qui suit porte le numéro qu'il avait avant le décalage, soit n-1.
    const vOrig = n <= it.coupe + 1 ? it.coupe : n - 1
    const suff  = n === it.coupe ? 'a' : n === it.coupe + 1 ? 'b' : null
    const note = n <= it.coupe + 1
      ? `Cette édition réunit en un seul verset, numéroté ${it.ch}, ${it.coupe}, ${it.quoi} : le verset a été coupé pour que les traductions restent alignées, et chaque part garde la numérotation d’origine.`
      : `Le rattachement au canon avance d’un cran à partir du verset ${it.ch}, ${it.coupe}, que cette édition ne coupe pas ; la numérotation d’origine est celle de l’édition.`
    if (r.v_orig === vOrig && (r.v_orig_suffixe || null) === suff && (r.notes || '').includes('numérotation d’origine')) continue
    maj.push({ id: r.id, ref: `${it.trad} ${it.livre} ${it.ch},${n}`, v_orig: vOrig, v_orig_suffixe: suff,
               notes: [r.notes, note].filter(Boolean).join(' ').slice(0, 900) })
  }
}

// ── Sacy : les décalages muets ───────────────────────────────────────────────────────────
for (const [livre, ch, coupe] of [['MAT',17,14],['JHN',6,51],['ACT',7,55]]){
  for (const r of await all(sb.from('versets_v2').select('id,canon_id,v_orig,notes')
      .eq('trad_id','TR0001').eq('livre',livre).eq('ch_orig',ch))){
    if (!r.canon_id) continue
    const n = +r.canon_id.split('.')[2]
    if (n === r.v_orig || r.notes) continue
    maj.push({ id: r.id, ref: `TR0001 ${livre} ${ch},${n}`, v_orig: r.v_orig, v_orig_suffixe: null,
      notes: `Le rattachement au canon avance d’un cran à partir du verset ${ch}, ${coupe}, que l’édition de 1730 ne coupe pas ; la numérotation d’origine est celle de l’édition.` })
  }
}

console.log(`${DRY?'[DRY] ':''}${maj.length} versets à réparer`)
for (const m of maj.slice(0, 6)) console.log(`  ${m.ref} → v_orig ${m.v_orig}${m.v_orig_suffixe||''}`)
if (!DRY && maj.length){
  writeFileSync(D + `avant_numerotation_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(maj, null, 1))
  for (const m of maj){
    const { error } = await sb.from('versets_v2')
      .update({ v_orig: m.v_orig, v_orig_suffixe: m.v_orig_suffixe, notes: m.notes }).eq('id', m.id)
    if (error){ console.error('  ERR ' + error.message); break }
  }
  console.log('  écrit — état antérieur sauvegardé')
}
