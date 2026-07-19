// Genèse 37,28 — scission (§23.21).
// La Genèse a été chargée par un pipeline antérieur au chargeur générique : elle ne se
// recharge pas par sacy-charge.mjs. La correction est donc portée directement, selon la
// même règle, et ce script en garde la trace.
//
// L'édition réunit sous le seul numéro 28 ce que le canon compte en 28 et 29 : la vente de
// Joseph, puis le retour de Ruben à la citerne. Le second créneau restait vide et la colonne
// se décalait. On coupe ; CHAQUE part garde la numérotation d'origine, 37, 28.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const COUPE = 'Ruben étant retourné à la citerne'
const NOTE = n => `L’édition de 1730 réunit en un seul verset, numéroté 37, 28, ce que le canon compte en deux : partie ${n} sur 2. La numérotation d’origine est conservée pour chaque part.`

const { data: v } = await sb.from('versets_v2').select('*')
  .eq('trad_id','TR0001').eq('livre','GEN').eq('ch_orig',37).eq('v_orig',28).is('v_orig_suffixe',null).single()
if (!v){ console.error('Gn 37,28 introuvable (déjà scindé ?)'); process.exit(1) }
const i = v.texte.indexOf(COUPE)
if (i < 0){ console.error(`point de coupe introuvable : « ${COUPE} »`); process.exit(1) }
const partA = v.texte.slice(0, i).trim(), partB = v.texte.slice(i).trim()

console.log(`${DRY?'[DRY] ':''}Gn 37,28`)
console.log(`  28a → GEN.37.28 : ${partA.slice(0,74)}`)
console.log(`  28b → GEN.37.29 : ${partB}`)
if (DRY) process.exit(0)

writeFileSync(D + `avant_GEN37_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify([v], null, 1))
const e1 = (await sb.from('versets_v2').update({
  texte: partA, canon_id: 'GEN.37.28', canon_id_fin: null, v_orig_suffixe: 'a',
  alignement_verifie: true, notes: NOTE(1) }).eq('id', v.id)).error
const e2 = (await sb.from('versets_v2').insert({
  trad_id:'TR0001', livre:'GEN', ch_orig:37, v_orig:28, v_orig_suffixe:'b',
  texte: partB, canon_id:'GEN.37.29', canon_id_fin:null, est_suscription:false,
  ordre_slot:null, alignement_verifie:true, notes: NOTE(2) })).error
console.log(e1||e2 ? 'ERR '+((e1||e2).message) : 'écrit — sauvegarde faite')
