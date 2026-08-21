// Répare le dégât causé par repare-numerotation-origine.mjs sur les psaumes du référent.
//
// CE QUE J'AI CASSÉ, ET POURQUOI. CRAMPON NUMÉROTE LES PSAUMES À L'HÉBRAÏQUE : le psaume
// canonique 49 porte chez lui le numéro 50, le canonique 100 porte 101. Mon script de
// réparation filtrait sur `ch_orig` — le numéro de CRAMPON — en croyant viser le numéro
// canonique. Il a donc écrit des numéros d'origine faux et des notes mensongères sur les
// psaumes canoniques 48 et 99, QUE JE N'AVAIS JAMAIS TOUCHÉS, et n'a pas réparé les deux
// qu'il visait.
//
// Le décalage de numérotation entre Crampon et le canon était pourtant connu et documenté
// depuis le début du psautier. Je l'ai appliqué au texte et oublié dans une requête.
//
// SECONDE LEÇON, PLUS COÛTEUSE : la « sauvegarde » de ce script enregistrait les valeurs
// qu'il ALLAIT écrire, non celles qu'il écrasait. Elle était donc sans usage au moment où
// elle aurait servi. On ne sauvegarde pas ce qu'on s'apprête à faire, on sauvegarde ce qu'on
// s'apprête à détruire.
//
// LA RESTAURATION EST SÛRE, et vérifiée avant d'agir : dans tous les psaumes intacts du
// référent (45, 46, 47, 97, 98, 101…), v_orig est EXACTEMENT le numéro canonique. Les
// psaumes 48 et 99 n'ayant subi aucune scission, leur état d'origine est donc reconstituable
// sans ambiguïté.
//
//   node scripts/repare-degat-psa.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const MIENNES = /(Cette édition réunit en un seul verset|Le rattachement au canon avance d’un cran)[^.]*\.\s*/g

// ── 1. remettre en état les psaumes canoniques 48 et 99 ──────────────────────────────────
const remis = []
for (const c of [48, 99]){
  const { data } = await sb.from('versets_v2').select('id,canon_id,v_orig,v_orig_suffixe,notes')
    .eq('trad_id','TR0003').like('canon_id', `PSA.${c}.%`)
  for (const r of data){
    const n = +r.canon_id.split('.')[2]
    const notes = (r.notes || '').replace(MIENNES, '').trim() || null
    if (r.v_orig === n && !r.v_orig_suffixe && notes === (r.notes || null)) continue
    remis.push({ id: r.id, ref: r.canon_id, v_orig: n, v_orig_suffixe: null, notes })
  }
}

// ── 2. appliquer la vraie réparation, cette fois par canon_id ────────────────────────────
// Le titre occupe le créneau 1 seul, le corps glisse : le créneau n porte le verset que
// Crampon numérote n-1, et les créneaux 1 et 2 se partagent son verset 1.
const vrais = []
for (const [c, dernier] of [[49, 24], [100, 9]]){
  const { data } = await sb.from('versets_v2').select('id,canon_id,v_orig,v_orig_suffixe,notes')
    .eq('trad_id','TR0003').like('canon_id', `PSA.${c}.%`)
  for (const r of data){
    const n = +r.canon_id.split('.')[2]
    if (n > dernier) continue
    const vOrig = n <= 2 ? 1 : n - 1
    const suff  = n === 1 ? 'a' : n === 2 ? 'b' : null
    const note = n <= 2
      ? `Cette édition réunit en un seul verset, numéroté 1, le titre du psaume et son premier verset ; il a été coupé pour que les traductions restent alignées, et chaque part garde la numérotation d’origine.`
      : `Le rattachement au canon avance d’un cran à partir du verset 1, que cette édition ne coupe pas ; la numérotation d’origine est celle de l’édition.`
    if (r.v_orig === vOrig && (r.v_orig_suffixe || null) === suff && (r.notes || '').includes(note.slice(0, 40))) continue
    vrais.push({ id: r.id, ref: r.canon_id, v_orig: vOrig, v_orig_suffixe: suff,
                 notes: [(r.notes || '').replace(MIENNES, '').trim(), note].filter(Boolean).join(' ') })
  }
}

console.log(`${DRY?'[DRY] ':''}psaumes 48 et 99 remis en état : ${remis.length} versets`)
console.log(`${DRY?'[DRY] ':''}psaumes 49 et 100 enfin réparés : ${vrais.length} versets`)
for (const m of [...remis.slice(0,3), ...vrais.slice(0,3)]) console.log(`  ${m.ref} → ${m.v_orig}${m.v_orig_suffixe||''}`)

if (!DRY){
  const tout = [...remis, ...vrais]
  writeFileSync(D + `apres_degat_psa_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(tout, null, 1))
  for (const m of tout){
    const { error } = await sb.from('versets_v2')
      .update({ v_orig: m.v_orig, v_orig_suffixe: m.v_orig_suffixe, notes: m.notes }).eq('id', m.id)
    if (error){ console.error('  ERR ' + error.message); break }
  }
  console.log('  écrit')
}
