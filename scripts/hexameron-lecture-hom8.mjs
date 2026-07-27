// LECTURE — Homélie VIII de l'Hexaéméron (commentaire suivi de Gn 1, 24 :
// « Que la terre produise une âme vivante… », les animaux terrestres ; puis
// RETOUR sur Gn 1, 20 « … et des oiseaux qui volent sur la terre dans le
// firmament du ciel » — les OISEAUX que Basile avait oubliés à l'homélie VII.
// Longs développements d'histoire naturelle morale — l'âne et le bœuf, le
// chameau rancunier, les abeilles, grues/cigognes/corneilles, l'hirondelle,
// l'alcyon, la tourterelle, l'aigle, le hibou, le cygne — sans contenu biblique.
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom8.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom8.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Huitième homélie'
// Amorces à nettoyer même sans lien de lecture (amorce mal placée) : aucune ici
const SUPPR_EXTRA = []

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // ═══════ Le lemme : Gn 1, 24 « Que la terre produise une âme vivante » ═══════
  [1170, 'GEN.1.24', 3, 'probable', 'Commente l\'accomplissement de l\'ordre : « L\'ordre du Seigneur se fait entendre en avançant toujours, et la terre reçoit l\'ornement qui lui est propre »'],
  [1172, 'GEN.1.24', 1, 'probable', 'Cite le lemme : « Que la terre, dit-il ici, produise une âme vivante »'],
  [1174, 'GEN.1.24', 3, 'probable', 'Commente « Qu\'elle produise » (contre les Manichéens) : ce n\'est pas qu\'elle ait produit ce qui était en elle ; Dieu lui a donné la vertu de produire'],
  [1176, 'GEN.1.24', 3, 'probable', 'Explique « Que la terre produise, c\'est-à-dire… qu\'elle acquière ce qu\'elle n\'a pas »'],
  [1177, 'GEN.1.24', 3, 'probable', 'Explique « Que la terre produise une âme, non une âme qui soit en elle, mais une âme qui lui soit donnée par l\'ordre de Dieu »'],
  [1197, 'GEN.1.24', 3, 'probable', 'Commente « Pourquoi la terre produit-elle une âme vivante ? c\'est afin que vous appreniez la différence entre l\'âme de la bête et l\'âme de l\'homme »'],
  [1200, 'GEN.1.24', 1, 'probable', 'Reprend le lemme : « Que la terre produise une âme vivante »'],
  [1201, 'GEN.1.24', 3, 'probable', 'Commente : l\'affinité âme/sang/chair/terre montre que « la terre constitue l\'âme des bêtes » (pourquoi LA TERRE produit l\'âme)'],
  [1333, 'GEN.1.24', 1, 'probable', 'Cite le lemme complet : « Que la terre produise l\'âme vivante des animaux domestiques, des bêtes sauvages et des reptiles selon leur espèce »'],

  // — Rappel de Gn 1, 11 (le lemme de l'homélie V) —
  [1175, 'GEN.1.11', 1, 'probable', 'Cite « il a été dit à la terre : Qu\'elle produise de l\'herbe verte et des arbres fruitiers » (annonce « il a été dit »)'],

  // ═══════ RETOUR sur Gn 1, 20 « … et des oiseaux qui volent… » (les oiseaux) ═══════
  [1171, 'GEN.1.20', 1, 'probable', 'Cite le premier ordre : « Que les eaux produisent des reptiles animés, avait-il dit d\'abord »'],
  [1210, 'GEN.1.20', 1, 'probable', 'Cite le lemme complet : « Que les eaux produisent des reptiles animés, selon leur espèce, et des oiseaux qui volent sur la terre dans le firmament du ciel »'],
  [1214, 'GEN.1.20', 3, 'probable', 'Commente : « Pourquoi l\'Écriture fait-elle sortir des eaux les animaux volatiles comme les animaux nageurs ? » (parenté oiseaux/poissons)'],
  [1216, 'GEN.1.20', 3, 'probable', 'Commente « on les a fait sortir également des eaux » : puisque tous deux nagent, même origine'],
  [1301, 'GEN.1.20', 3, 'probable', 'Commente « voler sur la terre » : les oiseaux trouvent leur nourriture sur la terre'],
  [1302, 'GEN.1.20', 3, 'probable', 'Commente « dans le firmament du ciel » : cet air épais au-dessus de nous, appelé firmament'],
  [1329, 'GEN.1.20', 1, 'probable', 'Cite le lemme : « Que les eaux produisent des oiseaux qui volent sur la terre dans le firmament du ciel »'],
  [1329, 'GEN.1.20', 3, 'probable', 'Commente : lues simplement, ces paroles ne sont que syllabes ; le sens révèle le prodige de la sagesse du Créateur'],

  // ═══════ Citations et échos d'autres livres ═══════
  // Is 1, 3 — le bœuf connaît son maître (CORRIGE t4→t1)
  [1190, 'ISA.1.3', 1, 'probable', 'Cite « Le bœuf reconnaît celui auquel il appartient, et l\'âne l\'étable de son maître » (Is 1, 3, LXX) — CORRIGE l\'amorce t4'],
  // Lv 17, 11 — l'âme de tout animal est son sang (CORRIGE t4→t1, annonce)
  [1199, 'LEV.17.11', 1, 'probable', 'Cite avec annonce « d\'après l\'Écriture, l\'âme de tout animal est son sang » (Lv 17, 11 ; cf. 17, 14) — CORRIGE l\'amorce t4'],
  // Rm 12, 17 & 21 — ne pas rendre le mal pour le mal, vaincre le mal par le bien (réf. éditeur)
  [1248, 'ROM.12.17', 2, 'probable', 'Reprend l\'ordre paulinien fondu : « il est ordonné de ne point rendre le mal pour le mal » (Rm 12, 17) — CORRIGE l\'amorce t4'],
  [1248, 'ROM.12.21', 2, 'probable', 'Reprend fondu « mais de vaincre le mal par le bien » (Rm 12, 21 ; réf. éditeur, récupérée à la lecture)'],
  // Pr 6, 8a-c (addition LXX sur l'abeille) — ABSENTE de nos 4 éditions (fourmi à PRO.6.8).
  // Charte §9.6 : verset septantiste absent → « à constituer » SANS cible, motif descriptif.
  // (L'amorce mécanique PRO.6.8 visait la fourmi = FAUX ; supersédée à la suppression.)
  [1252, null, 1, 'à constituer', 'Cite l\'éloge de l\'abeille « Le livre des Proverbes… en l\'appelant habile et laborieuse » (σοφὴ καὶ ἐργάτις) = addition LXX Pr 6, 8a-c, ABSENTE de l\'ossature (Crampon/Sacy/Vulgate/Swete portent la fourmi à Pr 6, 8) — cible à constituer'],
  [1253, null, 2, 'à constituer', 'Reprend fondu la suite de l\'éloge LXX de l\'abeille : « dont les princes et les particuliers recueillent les fruits salutaires » (Pr 6, 8b LXX) — verset absent de l\'ossature, cible à constituer'],
  // 1 Co 1, 21 — sauver par la folie de la prédication
  [1299, '1CO.1.21', 1, 'probable', 'Cite « celui qui a voulu sauver les fidèles par la folie de la prédication » (1 Co 1, 21)'],
  // Is 7, 14 — la vierge qui enfante (écho du mystère de la naissance virginale)
  [1299, 'ISA.7.14', 4, 'douteux', 'Écho du mystère : « qu\'une vierge enfante, sa virginité restant toujours intacte » (la vierge qui conçoit)'],
  // 1 Co 15, 51-52 — le changement à la résurrection annoncé par Paul
  [1335, '1CO.15.51', 4, 'probable', 'Écho de l\'annonce paulinienne de la résurrection : « croyez les changements que Paul nous annonce à tous » (l\'ἀλλαγή, nous serons tous changés)'],
  [1335, '1CO.15.52', 4, 'probable', 'Écho : la transformation des ressuscités que Paul annonce à tous (1 Co 15, 52)'],
  // Ps 36, 4 (grec) — réjouis-toi dans le Seigneur, il donnera les désirs de ton cœur (CORRIGE t4→t1)
  [1343, 'PSA.36.4', 1, 'probable', 'Cite « Réjouissez-vous dans le Seigneur, et il vous accordera ce que votre cœur demande » (Ps 36, 4 grec) — CORRIGE l\'amorce t4'],
  // Ps 18, 10-11 (grec) — les jugements du Seigneur, plus désirables que l'or, plus doux que le miel
  [1345, 'PSA.18.10', 1, 'probable', 'Cite « Les jugements du Seigneur sont vrais, et tous également justes » (Ps 18, 10 grec)'],
  [1346, 'PSA.18.11', 1, 'probable', 'Cite « Ils sont plus désirables qu\'une grande abondance d\'or et de pierres précieuses » (Ps 18, 11 grec) — CORRIGE l\'amorce PSA.18.10 (mauvais verset)'],
  [1347, 'PSA.18.11', 2, 'probable', 'Reprend fondu « vous avez les paroles divines… plus douces que les rayons du miel » (Ps 18, 11 grec)'],
  // 1 P 4, 11 — doxologie finale « la gloire et l'empire dans les siècles des siècles »
  [1357, '1PE.4.11', 4, 'probable', 'Écho de la doxologie : « à qui soient la gloire et l\'empire dans les siècles des siècles » (1 P 4, 11)'],
]

// segment_numero → id
const segByNum = new Map()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('segments').select('id, segment_numero, ref_niv1, segment_texte, texte_original')
    .eq('id_oeuvre', 'A0017O0001').eq('ref_niv1', REF_NIV1).order('segment_numero').range(from, from + 999)
  if (!data?.length) break
  for (const s of data) segByNum.set(s.segment_numero, s)
  if (data.length < 1000) break
}
// textes cibles (Crampon référent)
const canons = [...new Set(L.map(l => l[1]).filter(Boolean))]
const vtexte = new Map()
for (let i = 0; i < canons.length; i += 200) {
  const { data } = await sb.from('versets_lecture').select('id_verset, "TR0003", "TR0001", "TR0004"').in('id_verset', canons.slice(i, i + 200))
  for (const v of data ?? []) vtexte.set(v.id_verset, v.TR0003 || v.TR0001 || v.TR0004 || '(vide)')
}

console.log(`Homélie VIII — ${L.length} liens de lecture proposés\n`)
let manquants = 0
for (const [num, cible, type, fiab, motif] of L) {
  const s = segByNum.get(num)
  const vt = cible ? vtexte.get(cible) : null
  const sansCible = cible === null && fiab === 'à constituer'  // septantiste absent, volontaire
  if (cible && !vt) manquants++
  if (!s) console.log(`#${num} → ⚠️ SEGMENT ABSENT`)
  console.log(`#${num} → ${cible ?? '(à constituer — verset absent de l\'ossature)'} [t${type}/${fiab}]${cible && !vt ? '  ⚠️ CIBLE ABSENTE' : ''}`)
  console.log(`   seg: ${(s?.texte_original ?? s?.segment_texte ?? '?').replace(/\s+/g, ' ').slice(0, 120)}`)
  if (vt) console.log(`   cib: ${String(vt).replace(/\s+/g, ' ').slice(0, 120)}`)
  console.log()
}
if (manquants) console.log(`⚠️ ${manquants} cible(s) absente(s) de l'ossature — à corriger avant écriture.`)

if (!WRITE) { console.log('\n(contrôle : rien écrit — relancer avec --write)'); process.exit(0) }

// Supprimer les « à constituer » éditoriaux des segments retravaillés (supersédés).
const idsRetravailles = [...new Set([...L.map(l => l[0]), ...SUPPR_EXTRA])].map(n => segByNum.get(n)?.id).filter(Boolean)
let del = 0
for (let i = 0; i < idsRetravailles.length; i += 200) {
  const { data } = await sb.from('liens_bibliques').delete().in('segment_id', idsRetravailles.slice(i, i + 200))
    .eq('provenance', 'editeur').eq('fiabilite', 'à constituer').select('id')
  del += data?.length || 0
}
// Insérer les liens de lecture (pas de garde-fou mécanique : la lecture AFFIRME 3/4).
const rows = L.map(([num, cible, type, fiab, motif]) => ({
  segment_id: segByNum.get(num).id, canon_id: cible, type, fiabilite: fiab,
  provenance: 'lecture', arbitrage_requis: fiab === 'douteux' || fiab === 'à constituer', motif,
}))
// dédup contre existant (segment|cible|type)
const deja = new Set()
for (let i = 0; i < idsRetravailles.length; i += 200) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', idsRetravailles.slice(i, i + 200))
  for (const l of data ?? []) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`)
}
const aEcrire = rows.filter(r => !deja.has(`${r.segment_id}|${r.canon_id}|${r.type}`))
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 500))
  if (error) throw error
}
console.log(`\n✓ ${del} « à constituer » supersédés supprimés · ${aEcrire.length} liens de lecture écrits (${rows.length - aEcrire.length} déjà présents)`)
