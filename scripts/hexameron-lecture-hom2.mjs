// LECTURE — Homélie II de l'Hexaéméron (commentaire suivi de Gn 1, 2-5).
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom2.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom2.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Deuxième homélie'

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // — Gn 1, 2 « la terre était invisible et informe » —
  [153, 'GEN.1.2', 1, 'probable', 'Cite « La terre était invisible et informe » (dit Moïse)'],
  [155, 'GEN.1.2', 3, 'probable', 'Question exégétique : que veut dire « informe », pourquoi « invisible »'],
  [156, 'GEN.1.2', 3, 'probable', 'Explique « informe » : la terre sans sa fécondité ni ses ornements'],
  [157, 'GEN.1.2', 3, 'probable', 'Cite et explique « informe » : rien n\'existait encore'],
  [160, 'GEN.1.2', 3, 'probable', 'Explique « invisible » : deux raisons (pas d\'homme ; eaux la couvraient)'],
  [162, 'GEN.1.2', 3, 'probable', 'Définit « invisible » : ce qui est caché par un corps, comme le fer sous l\'eau'],
  [163, 'GEN.1.2', 3, 'probable', 'La terre nommée invisible parce que cachée sous les eaux'],
  [164, 'GEN.1.2', 3, 'probable', '« invisible » aussi parce que la lumière n\'était pas encore créée'],
  [166, 'GEN.1.2', 3, 'douteux', 'Rapporte l\'exégèse hérétique de « invisible et informe » (= la matière) pour la réfuter'],
  [189, 'GEN.1.2', 1, 'probable', 'Cite « La terre était invisible et informe »'],
  [190, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement Dieu créa le ciel et la terre »'],
  [192, 'GEN.1.2', 3, 'probable', 'Explique « invisible » : chercher le voile qui couvrait la terre'],
  [195, 'GEN.1.2', 3, 'probable', 'L\'eau inondait la terre : cause de l\'invisibilité'],
  [196, 'GEN.1.2', 3, 'probable', 'Explique « invisible » et « informe » par l\'excès d\'eau'],
  [198, 'GEN.1.2', 3, 'probable', 'Explique « informe » : la terre privée de sa beauté (ornements)'],
  // — Gn 1, 2 « les ténèbres au-dessus de l'abîme » —
  [201, 'GEN.1.2', 3, 'probable', 'Réfute l\'exégèse des « ténèbres » comme puissance mauvaise'],
  [205, 'GEN.1.2', 1, 'probable', 'Cite « La terre était invisible »'],
  [206, 'GEN.1.2', 3, 'probable', 'Explique l\'invisibilité : l\'abîme couvrait la terre'],
  [208, 'GEN.1.2', 3, 'probable', 'Définit « abîme » : grande quantité d\'eau au fond insondable'],
  [212, 'GEN.1.2', 3, 'probable', 'La terre invisible car l\'abîme était obscurci par les ténèbres'],
  [237, 'GEN.1.2', 3, 'probable', 'Définit « ténèbres » : disposition de l\'air privé de lumière'],
  [238, 'GEN.1.2', 3, 'probable', 'Paraphrase « les ténèbres étaient répandues sur les eaux »'],
  // — citations d'autres livres dans la section des ténèbres —
  [240, 'PRO.13.9', 1, 'probable', 'Cite Salomon : « La lumière est pour les justes à jamais » = Pr 13,9'],
  [241, 'COL.1.12', 1, 'probable', 'Cite saint Paul : « rendus dignes d\'avoir part à l\'héritage des saints… dans la lumière » = Col 1,12'],
  [242, 'MAT.25.30', 4, 'douteux', '« ténèbres extérieures » — reprise de l\'expression évangélique (Mt 8,12 ; 22,13 ; 25,30)'],
  // — Gn 1, 2 « l'esprit de Dieu était porté sur les eaux » —
  [250, 'GEN.1.2', 3, 'probable', 'Interprète « l\'esprit de Dieu porté sur les eaux » comme l\'air'],
  [251, 'GEN.1.2', 3, 'probable', 'Interprète « esprit de Dieu » comme l\'Esprit-Saint'],
  [252, 'GEN.1.2', 3, 'probable', 'Cite « était porté sur les eaux » et s\'interroge'],
  [253, 'GEN.1.2', 3, 'probable', 'Exégèse syrienne : « porté » = échauffait et fécondait les eaux'],
  // — Gn 1, 3 « que la lumière soit » —
  [256, 'GEN.1.3', 3, 'probable', 'Commente l\'effet de « Que la lumière soit » (première parole de Dieu)'],
  [265, 'GEN.1.3', 1, 'probable', 'Cite « Que la lumière soit »'],
  [265, 'GEN.1.3', 3, 'probable', 'Explique : « ce commandement était une action »'],
  [266, 'GEN.1.3', 3, 'probable', 'Explique ce qu\'est la « parole »/« commandement » de Dieu'],
  // — Gn 1, 4 « Dieu vit que la lumière était belle » / « divisa la lumière des ténèbres » —
  [267, 'GEN.1.4', 1, 'probable', 'Cite « Et Dieu vit que la lumière était belle »'],
  [268, 'GEN.1.4', 3, 'probable', 'Commente « la lumière était belle » : le témoignage du Créateur'],
  [274, 'GEN.1.4', 3, 'probable', 'Explique le jugement de Dieu sur la beauté de la lumière'],
  [275, 'GEN.1.4', 1, 'probable', 'Cite « Et Dieu divisa la lumière des ténèbres »'],
  [275, 'GEN.1.4', 3, 'probable', 'Explique : Dieu rendit leur nature incompatible'],
  // — Gn 1, 5 « appela le jour/la nuit ; du soir et du matin se fit le jour » —
  [277, 'GEN.1.5', 3, 'probable', 'Commente « jour » et « nuit » depuis la création du soleil'],
  [279, 'GEN.1.5', 1, 'probable', 'Cite « Et du soir et du matin se fit le jour »'],
  [280, 'GEN.1.5', 3, 'probable', 'Explique « soir » et « matin » comme bornes du jour et de la nuit'],
  [281, 'GEN.1.5', 3, 'probable', 'Explique l\'ordre soir/matin : privilège d\'aînesse du jour'],
  [283, 'GEN.1.5', 3, 'probable', 'Explique « les ténèbres… appelées nuit »'],
  [285, 'GEN.1.5', 3, 'probable', 'Explique « jour » = le jour et la nuit pris ensemble'],
  [287, 'PSA.89.10', 1, 'probable', 'Cite le psalmiste : « Les jours de mes années » = Ps 89,10'],
  [288, 'PSA.22.6', 1, 'probable', 'Cite « Tous les jours de ma vie » = Ps 22,6'],
  [289, 'GEN.47.9', 1, 'probable', 'Cite Jacob : « Les jours de ma vie ont été en petit nombre et traversés de maux » = Gn 47,9'],
  [291, 'GEN.1.5', 1, 'probable', 'Cite « Et du soir et du matin se fit le jour »'],
  [292, 'GEN.1.5', 3, 'probable', 'Question : pourquoi « le jour » et non « le premier jour »'],
  [301, 'GEN.1.5', 3, 'probable', 'Explique « le jour » (non « premier ») : rapport avec l\'éternité'],
  [305, 'JOL.2.11', 1, 'probable', 'Cite « Le jour du Seigneur est grand et illustre » = Jl 2,11 (la source imprimait « Job »)'],
  [306, 'AMO.5.18', 1, 'probable', 'Cite « Pourquoi cherchez-vous le jour du Seigneur… ténèbres et non lumière » = Am 5,18'],
  [311, 'GEN.1.5', 1, 'probable', 'Cite « Et du soir et du matin se fit le jour »'],
  // — écho anticipé : rassemblement des eaux appelées « mer » —
  [161, 'GEN.1.10', 4, 'douteux', 'Anticipe le rassemblement des eaux appelées « mer » (Gn 1,9-10)'],
  // — doxologie finale (#313) : échos scripturaires —
  [313, 'JHN.1.9', 4, 'douteux', '« le père de la lumière véritable » — écho de la vraie lumière (Jn 1,9)'],
  [313, 'MAT.13.43', 4, 'probable', '« briller comme le soleil dans la splendeur des saints » = Mt 13,43'],
  [313, 'PHP.2.16', 4, 'douteux', '« pour être ma joie et ma couronne au jour de Jésus-Christ » = « εἰς καύχημα ἐμοὶ εἰς ἡμέραν Χριστοῦ » (Ph 2,16)'],
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

console.log(`Homélie II — ${L.length} liens de lecture proposés\n`)
let manquants = 0
for (const [num, cible, type, fiab, motif] of L) {
  const s = segByNum.get(num)
  const vt = vtexte.get(cible)
  if (!vt) manquants++
  if (!s) console.log(`#${num} → ⚠️ SEGMENT ABSENT`)
  console.log(`#${num} → ${cible} [t${type}/${fiab}]${vt ? '' : '  ⚠️ CIBLE ABSENTE'}`)
  console.log(`   seg: ${(s?.texte_original ?? s?.segment_texte ?? '?').replace(/\s+/g, ' ').slice(0, 100)}`)
  if (vt) console.log(`   cib: ${String(vt).replace(/\s+/g, ' ').slice(0, 100)}`)
  console.log()
}
if (manquants) console.log(`⚠️ ${manquants} cible(s) absente(s) de l'ossature — à corriger avant écriture.`)

if (!WRITE) { console.log('\n(contrôle : rien écrit — relancer avec --write)'); process.exit(0) }

// Supprimer les « à constituer » éditoriaux des segments retravaillés (supersédés).
const idsRetravailles = [...new Set(L.map(l => l[0]))].map(n => segByNum.get(n)?.id).filter(Boolean)
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
