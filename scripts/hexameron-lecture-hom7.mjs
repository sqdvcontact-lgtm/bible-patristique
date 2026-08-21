// LECTURE — Homélie VII de l'Hexaéméron (commentaire suivi de Gn 1, 20-21 :
// « Que les eaux produisent des reptiles animés… », les animaux aquatiques ;
// « Dieu créa les grands poissons ». Longs développements d'histoire naturelle
// et de morale — le crabe, le polype, les migrations des poissons, la vipère
// et la lamproie. Les OISEAUX de Gn 1, 20 relèvent de l'homélie VIII).
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom7.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom7.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Septième homélie'
// Amorces à nettoyer même sans lien de lecture (amorce mal placée) :
const SUPPR_EXTRA = [1127] // EPH.5.25 amorcé ici, mais la citation est en #1128

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // ═══════ Le lemme : Gn 1, 20 « Que les eaux produisent des reptiles animés » ═══════
  // — citations littérales du lemme (refrain de l'homélie) —
  [1008, 'GEN.1.20', 1, 'probable', 'Cite le lemme : « Que les eaux produisent des reptiles animés »'],
  [1011, 'GEN.1.20', 1, 'probable', 'Cite « Ainsi, dit l\'Écriture, que les eaux produisent des reptiles » (annonce « dit l\'Écriture »)'],
  [1014, 'GEN.1.20', 1, 'probable', 'Cite « il est dit : Que les eaux produisent des reptiles »'],
  [1018, 'GEN.1.20', 1, 'probable', 'Cite « Que les eaux produisent des reptiles »'],
  [1020, 'GEN.1.20', 1, 'probable', 'Cite « Que les eaux produisent »'],
  [1040, 'GEN.1.20', 1, 'probable', 'Cite « Que les eaux produisent selon l\'espèce » (κατὰ γένος)'],
  [1147, 'GEN.1.20', 1, 'probable', 'Reprend « Que les eaux produisent »'],
  // — commentaire du lemme (Basile explique les mots du verset) —
  [1009, 'GEN.1.20', 3, 'probable', 'Commente : « c\'est pour la première fois qu\'est créé un être animé et pourvu de sentiment » (exégèse de « animés »)'],
  [1010, 'GEN.1.20', 3, 'probable', 'Commente : plantes et arbres « vivent » sans être animés — distingue le vivant animé qu\'introduit le verset'],
  [1012, 'GEN.1.20', 3, 'probable', 'Commente : tout ce qui nage « est du genre des reptiles, puisqu\'il se traîne » (pourquoi le verset dit « reptiles »)'],
  [1015, 'GEN.1.20', 3, 'probable', 'Commente l\'ampleur de l\'ordre : « quelle espèce n\'est pas comprise dans ce simple ordre ? »'],
  [1021, 'GEN.1.20', 3, 'probable', 'Commente : « ces paroles vous montrent le rapport naturel que les animaux nageurs ont avec l\'eau » (pourquoi LES EAUX les produisent)'],
  [1030, 'GEN.1.20', 3, 'probable', 'Commente « selon l\'espèce » : Dieu ordonne les prémices de chaque espèce, réservant la multitude aux générations'],

  // ═══════ Gn 1, 21 « Dieu créa les grands poissons » ═══════
  [1150, 'GEN.1.21', 1, 'probable', 'Cite « Dieu créa les grands poissons » (τὰ κήτη τὰ μεγάλα) — CORRIGE l\'amorce t4'],
  [1151, 'GEN.1.21', 3, 'probable', 'Commente « grands » : appelés grands non par comparaison, mais parce que leur masse égale les plus hautes montagnes'],

  // ═══════ Citations et échos d'autres livres ═══════
  // Mt 13, 47-48 — la parabole du filet
  [1059, 'MAT.13.47', 4, 'probable', 'Écho de la parabole du filet : « pris à l\'hameçon, dans la nasse ou dans le filet » (réf. Matth. 13, 47)'],
  [1059, 'MAT.13.48', 4, 'probable', 'Écho : le filet tiré, les mauvais rejetés — « nous ne pourrons nous soustraire aux peines » (réf. Matth. 13, 48)'],
  // Mt 7, 15 — les loups ravisseurs sous la peau de brebis
  [1076, 'MAT.7.15', 2, 'probable', 'Paraphrase fondue : « que le Seigneur appelle des loups ravissants qui se montrent sous la peau de brebis »'],
  // Gn 3, 14 — le serpent condamné à ramper
  [1078, 'GEN.3.14', 4, 'probable', 'Écho de la malédiction du serpent : « plein de dissimulation, il a été condamné à ramper »'],
  // Gn 25, 27 — Jacob, homme simple
  [1079, 'GEN.25.27', 4, 'probable', 'Écho : « le juste est simple et sans fard comme Jacob » (Jacob, homme simple)'],
  // Ps 67, 7 (grec) — Dieu fait habiter dans une maison les cœurs droits
  [1079, 'PSA.67.7', 4, 'probable', 'Écho : « le Seigneur fait habiter dans sa maison ceux qui ont un cœur droit et simple »'],
  // Ps 103, 25 (grec) — la mer vaste, les reptiles sans nombre (CORRIGE t4→t1, annonce)
  [1080, 'PSA.103.25', 1, 'probable', 'Cite « La mer, dit le Psalmiste, est d\'une grande et vaste étendue : elle renferme un nombre infini de reptiles » — CORRIGE l\'amorce t4'],
  // Pr 22, 28 — déplacer les bornes des pères
  [1091, 'PRO.22.28', 2, 'probable', 'Paraphrase fondue : « nous remuons ces bornes éternelles qu\'avaient placées nos pères »'],
  // Is 5, 8 — malheur à ceux qui joignent maison à maison
  [1091, 'ISA.5.8', 2, 'probable', 'Paraphrase fondue : « nous joignons maison à maison et champ à champ, afin de dépouiller notre prochain » (Is 5, 8)'],
  // Ep 5, 25 — époux, aimez vos femmes (amorce déplacée du §1127 → §1128)
  [1128, 'EPH.5.25', 2, 'probable', 'Reprend l\'exhortation de Paul : « Époux, aimez vos femmes » (Ep 5, 25) — amorce déplacée du §1127'],
  // Jon 1, 3 — Jonas fuyant vers la mer
  [1160, 'JON.1.3', 4, 'probable', 'Écho : « je ne cherchais pas, ainsi que Jonas, à retourner vers la mer » (Jonas fuyant par mer)'],
  // Ct 5, 2 — je dors, et mon cœur veille (CORRIGE t4→t1, annonce « avec Salomon »)
  [1167, 'SNG.5.2', 1, 'probable', 'Cite « puissiez-vous dire avec Salomon : Je dors, et mon cœur veille » (Ct 5, 2) — CORRIGE l\'amorce t4'],
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
const canons = [...new Set(L.map(l => l[1]))]
const vtexte = new Map()
for (let i = 0; i < canons.length; i += 200) {
  const { data } = await sb.from('versets_lecture').select('id_verset, "TR0003", "TR0001", "TR0004"').in('id_verset', canons.slice(i, i + 200))
  for (const v of data ?? []) vtexte.set(v.id_verset, v.TR0003 || v.TR0001 || v.TR0004 || '(vide)')
}

console.log(`Homélie VII — ${L.length} liens de lecture proposés\n`)
let manquants = 0
for (const [num, cible, type, fiab, motif] of L) {
  const s = segByNum.get(num)
  const vt = vtexte.get(cible)
  if (!vt) manquants++
  if (!s) console.log(`#${num} → ⚠️ SEGMENT ABSENT`)
  console.log(`#${num} → ${cible} [t${type}/${fiab}]${vt ? '' : '  ⚠️ CIBLE ABSENTE'}`)
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
  provenance: 'lecture', arbitrage_requis: fiab === 'douteux', motif,
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
