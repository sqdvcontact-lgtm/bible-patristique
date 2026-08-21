// LECTURE — Homélie IV de l'Hexaéméron (commentaire suivi de Gn 1, 9-10 :
// le rassemblement des eaux, la terre sèche, les mers, « Dieu vit que cela était bon »).
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom4.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom4.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Quatrième homélie'

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // — Gn 1, 9 « Que les eaux… se rassemblent en un seul lieu, et que le sec paraisse. Et cela se fit ainsi » —
  [487, 'GEN.1.9', 1, 'probable', 'Cite « l\'eau qui était sous le ciel fut rassemblée… et l\'élément aride parut »'],
  [491, 'GEN.1.9', 1, 'probable', 'Cite « Que les eaux se rassemblent, et que l\'élément aride paraisse » (« l\'Écriture qui s\'explique elle-même »)'],
  [508, 'GEN.1.9', 1, 'probable', 'Cite « Que les eaux se rassemblent dans un même lieu »'],
  [513, 'GEN.1.9', 1, 'probable', 'Cite « rappelez-vous cette parole : Que les eaux se rassemblent »'],
  [516, 'GEN.1.9', 1, 'probable', 'Cite « cette première loi : Que les eaux se rassemblent dans un même lieu »'],
  [524, 'GEN.1.9', 1, 'probable', 'Cite « cet ordre : Que les eaux se rassemblent dans un même lieu »'],
  [535, 'GEN.1.9', 3, 'probable', 'Explique le sens de « un même lieu » : le plus grand et le plus parfait assemblage'],
  [552, 'GEN.1.9', 3, 'probable', 'Commente : « Il n\'a point dit : Et que la terre paraisse » (mais « le sec »), la terre encore fangeuse'],
  [554, 'GEN.1.9', 3, 'probable', 'Commente l\'effet de l\'ordre : non le superflu seul, mais l\'eau mêlée en profondeur s\'est retirée'],
  [556, 'GEN.1.9', 3, 'probable', 'Commente « Et cela se fit ainsi » : la parole du Créateur a eu son plein effet'],
  [557, 'GEN.1.9', 1, 'probable', 'Cite l\'addition (var. Septante) « L\'eau qui était sous le ciel fut rassemblée… l\'élément aride parut »'],
  [559, 'GEN.1.9', 3, 'douteux', 'Critique textuelle : après « et cela se fit ainsi », l\'addition répète et peut être retranchée'],
  // — Gn 1, 10 « Dieu appela le sec Terre, et il appela Mer l'amas des eaux » —
  [488, 'GEN.1.10', 1, 'probable', 'Cite « Dieu appela terre l\'élément aride, et donna le nom de mers aux amas des eaux »'],
  [544, 'GEN.1.10', 3, 'probable', 'Question exégétique : « Pourquoi Dieu a-t-il appelé mers (au pluriel) les amas d\'eaux ? »'],
  [545, 'GEN.1.10', 3, 'probable', 'Réponse : les golfes contenus par la terre ont reçu du Seigneur le nom de mers'],
  [549, 'GEN.1.10', 3, 'probable', 'Conclut : « C\'est pour cela que Dieu a appelé mers (au pluriel) les collections d\'eaux »'],
  [562, 'GEN.1.10', 3, 'probable', 'Commente le choix des mots : « le sec paraisse » (non « la terre »), puis « Dieu appela terre le sec »'],
  [563, 'GEN.1.10', 3, 'probable', 'Explique : l\'aridité est la qualité propre, « terre » le simple nom de la chose'],
  [579, 'GEN.1.10', 3, 'probable', 'Commente : il n\'a pas appelé la terre « élément aride » — pourquoi ?'],
  [583, 'GEN.1.10', 3, 'douteux', 'Conclut : on désigne la terre par sa qualité primitive, la plus ancienne'],
  // — Gn 1, 10b « Et Dieu vit que cela était bon » —
  [585, 'GEN.1.10', 3, 'probable', 'Commente « Dieu vit que cela était bon » : non par les yeux, mais par sa sagesse ineffable'],
  [587, 'GEN.1.10', 3, 'probable', 'Commente : Dieu juge de la beauté d\'un ouvrage par son rapport avec les autres'],
  [604, 'GEN.1.10', 3, 'douteux', 'Reprend « belle aux yeux de Dieu » et l\'applique à l\'assemblée chrétienne'],
  // — citations attribuées d'autres livres —
  [484, 'ISA.40.22', 1, 'probable', 'Cite « le ciel disposé comme une voûte, selon le langage du Prophète » = Is 40,22 (forme Septante « voûte »)'],
  [515, 'ECC.1.7', 1, 'probable', 'Cite « suivant les paroles de l\'Ecclésiaste, les fleuves vont à la mer et la mer n\'est point remplie » = Qo 1,7'],
  [519, 'JER.5.22', 1, 'probable', 'Cite « Ne me craindrez-vous pas, dit le Seigneur, moi qui mets le sable pour borne à la mer ? » = Jr 5,22'],
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

console.log(`Homélie IV — ${L.length} liens de lecture proposés\n`)
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
