// Sacy Ps 67, 5 : détacher le plus de la Vulgate en surnuméraire.
//
// « ses ennemis seront remplis de trouble à la vûe de son visage » traduit
// « turbabuntur a facie eius » (Ps 67, 5 Vulg.), qui n'a d'équivalent ni en
// hébreu, ni chez Crampon, ni à l'AELF (dont les v. 5 et 6 n'en portent aucune
// trace). La suite du même verset, « il est le pere des orphelins, & le juge des
// veuves », correspond en revanche au v. 6 du canon.
//
// Le verset 67, 5 de l'édition se répartit donc en trois :
//   5a → créneau 5           « Soyez dans de saints transports de joie… »
//   5b → surnuméraire        « ses ennemis seront remplis de trouble… »
//   5c → créneau 6           « il est le pere des orphelins… »
//
//   node scripts/psa-67-5-surnumeraire.mjs --dry
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const COUPE = 'il est le pere des orphelins'
// trim() mangerait les insécables U+00A0 exigés par la charte §23.11.
const rogne = s => s.replace(/^[ \t]+|[ \t]+$/g, '')
const equilibre = t => (t.match(/<i>/g) || []).length === (t.match(/<\/i>/g) || []).length

const PART = n => `L’édition de 1730 réunit en un seul verset, numéroté 67, 5, ce que le canon ne recueille qu’en partie : il est scindé en trois — partie ${n} sur 3. La numérotation d’origine est conservée pour chaque part.`
const SURN = `Verset propre à la Vulgate, sans équivalent chez le référent.`
const SOUDURE = n => `L’édition de 1730 découpe autrement : 67, 5 et 67, 6 tiennent ensemble le verset 67, 6 du canon — partie ${n} sur 2. La numérotation d’origine est conservée pour chacune.`

const { data, error } = await sb.from('versets_v2').select('*')
  .eq('trad_id', 'TR0001').eq('livre', 'PSA').eq('ch_orig', 67).eq('v_orig', 5).eq('v_orig_suffixe', 'b')
if (error) throw error
if (data.length !== 1) { console.error(`✗ ${data.length} ligne(s) pour Sacy 67, 5b, 1 attendue`); process.exit(1) }
const r = data[0]

const i = r.texte.indexOf(COUPE)
if (i < 0) { console.error(`✗ coupe « ${COUPE} » introuvable`); process.exit(1) }
const surnumeraire = rogne(r.texte.slice(0, i))
const versCanon = rogne(r.texte.slice(i))
if (!equilibre(surnumeraire) || !equilibre(versCanon)) { console.error('✗ la coupe traverse une balise <i>'); process.exit(1) }

// 5b devient le surnuméraire ; 5c naît pour le créneau 6.
const majB = { canon_id: null, canon_id_fin: null, ordre_slot: null, texte: surnumeraire,
               notes: `${SURN} ${PART(2)}`, alignement_verifie: true }
const insC = { trad_id: r.trad_id, livre: r.livre, ch_orig: r.ch_orig, v_orig: 5, v_orig_suffixe: 'c',
               est_suscription: false, texte: versCanon, canon_id: 'PSA.67.6', canon_id_fin: null,
               ordre_slot: 1, notes: `${PART(3)} ${SOUDURE(1)}`, alignement_verifie: true }

// 5a reste au créneau 5, mais sa note doit dire « sur 3 » désormais.
const { data: partA } = await sb.from('versets_v2').select('*')
  .eq('trad_id', 'TR0001').eq('livre', 'PSA').eq('ch_orig', 67).eq('v_orig', 5).eq('v_orig_suffixe', 'a')
const majA = { notes: `${PART(1)} L’édition de 1730 découpe autrement : 67, 4 et 67, 5 tiennent ensemble le verset 67, 5 du canon — partie 2 sur 2. La numérotation d’origine est conservée pour chacune.` }

console.log(`  surnuméraire │ ${surnumeraire}`)
console.log(`  créneau 6    │ ${versCanon}`)

if (DRY) { console.log('\n✓ plan valide (--dry, rien écrit)'); process.exit(0) }

writeFileSync('scripts/backup_psa67_5_surnumeraire.json', JSON.stringify([r, ...partA], null, 1), 'utf8')
for (const [id, maj] of [[r.id, majB], [partA[0].id, majA]]) {
  const { error: e } = await sb.from('versets_v2').update(maj).eq('id', id); if (e) throw e
}
const { error: e2 } = await sb.from('versets_v2').insert(insC); if (e2) throw e2
console.log('\n✓ appliqué · sauvegarde scripts/backup_psa67_5_surnumeraire.json')
