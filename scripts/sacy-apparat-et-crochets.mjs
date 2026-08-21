// Trois corrections sur la Sacy, demandées par l'éditeur.
//
//   1. Le prologue de l'Ecclésiastique quitte le texte biblique pour l'apparat critique.
//   2. « Ne soyez pas incredule… » n'est pas un surnuméraire : il rejoint le créneau du
//      verset précédent, en gardant son numéro d'origine.
//   3. Les crochets éditoriaux perdent les espaces qui les séparaient du mot.
//
//   node scripts/sacy-apparat-et-crochets.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const sauvegarde = {}

// ── 1. Le prologue passe à l'apparat ────────────────────────────────────────────────────
const { data: pro } = await sb.from('versets_v2').select('*')
  .eq('trad_id', 'TR0001').eq('livre', 'SIR').eq('ch_orig', 0)
if (!pro?.length) console.error('✗ prologue introuvable')
else {
  sauvegarde.prologue = pro
  console.log(`${DRY ? '[DRY] ' : ''}prologue SIR : ${pro.length} ligne(s), ${pro[0].texte.length} caractères → apparat`)
  if (!DRY) {
    const { error } = await sb.from('traduction_apparat').insert(pro.map((p, i) => ({
      trad_id: 'TR0001', livre: 'SIR', piece: 'Prologue', ordre: i,
      texte: p.texte,
      source: `Bible de Sacy 1730 — en tête de l’Ecclésiastique (transcrit comme ${p.ch_orig}, ${p.v_orig})`,
    })))
    if (error) { console.error('✗ insertion apparat : ' + error.message); process.exit(1) }
    // On ne supprime qu'APRÈS s'être assuré que la copie est en place.
    for (const p of pro) await sb.from('versets_v2').delete().eq('id', p.id)
    console.log('   déplacé, puis retiré du texte biblique')
  }
}

// ── 2. « Ne soyez pas incredule » rejoint le créneau précédent ───────────────────────────
// Il figure chez Crampon : ce n'est donc pas un ajout propre à Sacy, mais la seconde moitié
// d'un verset que Sacy coupe et que le canon ne coupe pas. Le rattacher au même créneau — et
// non recopier son texte ailleurs — laisse intacte sa numérotation d'origine.
const { data: inc } = await sb.from('versets_v2').select('*')
  .eq('trad_id', 'TR0001').eq('livre', 'SIR').eq('ch_orig', 16).eq('v_orig', 29)
if (!inc?.length) console.error('✗ « Ne soyez pas incredule » introuvable')
else {
  const { data: prec } = await sb.from('versets_v2').select('id,v_orig,canon_id')
    .eq('trad_id', 'TR0001').eq('livre', 'SIR').eq('ch_orig', 16)
    .lt('v_orig', 29).not('canon_id', 'is', null).order('v_orig', { ascending: false }).limit(1)
  if (!prec?.length) console.error('✗ aucun verset précédent rattaché : rattachement impossible')
  else {
    sauvegarde.incredule = inc
    console.log(`${DRY ? '[DRY] ' : ''}SIR 16,29 → créneau ${prec[0].canon_id} (avec 16,${prec[0].v_orig})`)
    if (!DRY) await sb.from('versets_v2').update({
      canon_id: prec[0].canon_id,
      notes: 'Sacy coupe ici un verset que le canon ne coupe pas ; les deux moitiés partagent un créneau et gardent chacune leur numéro d’origine. Le passage figure aussi chez Crampon : ce n’est pas un ajout propre à cette édition.',
    }).eq('id', inc[0].id)
  }
}

// ── 3. Crochets éditoriaux : plus d'espace entre le crochet et le mot ────────────────────
// Sacy encadre de crochets les passages qu'il tient pour douteux ou empruntés. La transcription
// avait conservé l'espace que l'imprimeur laisse par justification, ce qui n'est pas de la
// ponctuation française : « [ il » se lit comme un crochet flottant.
let o = 0, tous = []
for (;;) {
  const { data } = await sb.from('versets_v2').select('id,livre,ch_orig,v_orig,texte')
    .eq('trad_id', 'TR0001').or('texte.ilike.%[ %,texte.ilike.% ]%').order('id').range(o, o + 999)
  if (!data?.length) break
  tous = tous.concat(data); if (data.length < 1000) break; o += 1000
}
//   et   : les espaces insécables posées par la passe typographique comptent aussi.
const recolle = t => t.replace(/\[[\s  ]+/g, '[').replace(/[\s  ]+\]/g, ']')
const aCorriger = tous.map(r => ({ ...r, neuf: recolle(r.texte) })).filter(r => r.neuf !== r.texte)
sauvegarde.crochets = aCorriger.map(({ id, texte }) => ({ id, texte }))
console.log(`\n${DRY ? '[DRY] ' : ''}crochets : ${aCorriger.length} versets à recoller (sur ${tous.length} examinés)`)
for (const r of aCorriger.slice(0, 3)) console.log(`   ${r.livre} ${r.ch_orig},${r.v_orig} : …${r.neuf.slice(Math.max(0, r.neuf.indexOf('[') - 24), r.neuf.indexOf('[') + 30)}…`)
if (!DRY) {
  for (const r of aCorriger) await sb.from('versets_v2').update({ texte: r.neuf }).eq('id', r.id)
  writeFileSync(D + `avant_apparat_crochets_${Date.now()}.json`, JSON.stringify(sauvegarde, null, 1))
  // La vue de lecture est matérialisée : sans ce rafraîchissement, le site continue
  // d'afficher l'état d'avant.
  const { error } = await sb.rpc('rafraichir_versets_lecture')
  console.log(error ? '\n✗ rafraîchissement de la vue : ' + error.message : '\nvue de lecture rafraîchie')
}
