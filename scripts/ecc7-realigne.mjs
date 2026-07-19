// Aligne l'Ecclésiaste 7, 27-29 sur le découpage de l'AELF, qui est l'ossature.
//
// CONSTAT. Sacy et Segond suivent déjà ce découpage, verset pour verset : rien à y faire.
// Seul le référent condense — son 7,27 porte à lui seul les versets 27 ET 28 du canon, si
// bien que son 7,28 vient occuper le créneau 28 qui revient au 29, et que son 7,29 est vide.
// La colonne se décalait donc d'un cran sur trois versets.
//
// REMÈDE, selon la règle §23.21 : on ne laisse pas un créneau vide, on SCINDE — chaque part
// reçoit son créneau et TOUTES gardent la numérotation d'origine (ici 7,27 deux fois).
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

// Le point de coupe est désigné par son texte, jamais par une position.
const COUPE = 'que mon âme a constamment cherchée'
const NOTE_SCISSION = (i, n) => `Le référent réunit en un seul verset, numéroté 7, 27, ce que le canon compte en ${n} : partie ${i} sur ${n}. La numérotation d’origine est conservée pour chaque part.`

const { data: rows } = await sb.from('versets_v2').select('*')
  .eq('trad_id','TR0003').eq('livre','ECC').eq('ch_orig',7).gte('v_orig',27).order('v_orig')
const v27 = rows.find(r => r.v_orig === 27), v28 = rows.find(r => r.v_orig === 28), v29 = rows.find(r => r.v_orig === 29)
if (!v27 || !v28){ console.error('versets attendus introuvables — rien fait'); process.exit(1) }
if (v27.v_orig_suffixe){ console.log('déjà scindé — rien fait'); process.exit(0) }

const i = v27.texte.indexOf(COUPE)
if (i < 0){ console.error(`point de coupe introuvable : « ${COUPE} » — rien fait`); process.exit(1) }
const partA = v27.texte.slice(0, i).trim(), partB = v27.texte.slice(i).trim()

console.log(`${DRY?'[DRY] ':''}Crampon ECC 7`)
console.log(`  7,27a → ECC.7.27 : ${partA.slice(0,72)}`)
console.log(`  7,27b → ECC.7.28 : ${partB.slice(0,72)}`)
console.log(`  7,28  → ECC.7.29 : ${v28.texte.slice(0,72)}`)
console.log(`  7,29  : ligne vide, supprimée (${v29 ? 'présente' : 'déjà absente'})`)
if (DRY) process.exit(0)

writeFileSync(D + `avant_ECC7_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(rows, null, 1))
// L'ordre compte : on libère d'abord le créneau 29, puis le 28, avant d'y écrire.
const e0 = v29 ? (await sb.from('versets_v2').delete().eq('id', v29.id)).error : null
const e1 = (await sb.from('versets_v2').update({ canon_id: 'ECC.7.29', alignement_verifie: true }).eq('id', v28.id)).error
const e2 = (await sb.from('versets_v2').update({
  texte: partA, canon_id: 'ECC.7.27', v_orig_suffixe: 'a', ordre_slot: null,
  alignement_verifie: true, notes: NOTE_SCISSION(1, 2) }).eq('id', v27.id)).error
const e3 = (await sb.from('versets_v2').insert({
  trad_id:'TR0003', livre:'ECC', ch_orig:7, v_orig:27, v_orig_suffixe:'b',
  texte: partB, canon_id:'ECC.7.28', canon_id_fin:null, est_suscription:false,
  ordre_slot:null, alignement_verifie:true, notes: NOTE_SCISSION(2, 2) })).error
const err = e0||e1||e2||e3
console.log(err ? 'ERR '+err.message : 'écrit — sauvegarde de l’état antérieur faite')
