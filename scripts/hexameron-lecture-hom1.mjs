// LECTURE — Homélie I de l'Hexaéméron (commentaire suivi de Gn 1, 1).
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés
// par le type tranché ; cibles corrigées : #10 Nb 12,8, #113 Ps 74,4).
//
//   node scripts/hexameron-lecture-hom1.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom1.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // — Gn 1, 1 : le verset commenté d'un bout à l'autre (§9.6 commentaire suivi) —
  [2, 'GEN.1.1', 4, 'probable', 'Reprend le thème de Gn 1,1 (création du ciel et de la terre)'],
  [20, 'GEN.1.1', 1, 'probable', 'Citation : « Au commencement Dieu a fait le ciel et la terre »'],
  [22, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement, dit-il, Dieu créa »'],
  [22, 'GEN.1.1', 3, 'probable', 'Commente l\'ordre des mots : le nom de Dieu placé en tête'],
  [24, 'GEN.1.1', 3, 'probable', 'Explique « au commencement » (le monde n\'est pas sans commencement)'],
  [28, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement, dit-il, Dieu créa »'],
  [28, 'GEN.1.1', 3, 'probable', 'Le nom de Dieu comme sceau contre l\'erreur'],
  [29, 'GEN.1.1', 1, 'probable', 'Citation : « au commencement créa le ciel et la terre »'],
  [35, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement Dieu créa »'],
  [35, 'GEN.1.1', 3, 'probable', 'Y lit l\'annonce de la consommation et de la rénovation du monde'],
  [43, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement Dieu créa »'],
  [54, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement, dit-il, Dieu créa »'],
  [54, 'GEN.1.1', 3, 'probable', '« au commencement » = lorsque le temps commença à couler'],
  [55, 'GEN.1.1', 3, 'probable', 'Le sensible n\'a commencé qu\'après l\'invisible'],
  [69, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement Dieu créa »'],
  [69, 'GEN.1.1', 3, 'probable', 'Création dans un instant unique et indivisible'],
  [74, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement Dieu créa »'],
  [75, 'GEN.1.1', 3, 'probable', 'Sens de « au commencement » : dans un moment indivisible'],
  [82, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement Dieu créa »'],
  [82, 'GEN.1.1', 3, 'probable', 'Explique « créa » : ni enfanta ni produisit'],
  [83, 'GEN.1.1', 1, 'probable', 'Cite « Au commencement Dieu créa »'],
  [83, 'GEN.1.1', 3, 'probable', 'Contre l\'idée du monde coéternel : Dieu cause volontaire'],
  [87, 'GEN.1.1', 3, 'probable', 'Les deux extrêmes (ciel, terre) embrassent toute la substance'],
  [143, 'GEN.1.1', 1, 'probable', 'Citation : « Au commencement Dieu créa le ciel et la terre »'],
  // — Autres livres cités / commentés —
  [7, 'HEB.11.25', 1, 'probable', '« aima mieux être affligé avec le peuple de Dieu que de jouir de plaisirs passagers » = Hé 11,25'],
  [7, 'ACT.7.20', 4, 'probable', 'Récit de Moïse enfant, agréable à Dieu (Ac 7,20)'],
  [8, 'NUM.12.6', 1, 'probable', '« S\'il se trouve un prophète parmi vous… vision… songe » = Nb 12,6'],
  [9, 'NUM.12.7', 1, 'probable', '« Moïse qui gouverne toute ma maison, mon serviteur fidèle » = Nb 12,7'],
  [10, 'NUM.12.8', 1, 'probable', '« Je lui parlerai bouche à bouche… face à face » = Nb 12,8'],
  [12, '1CO.2.4', 1, 'probable', '« non les discours persuasifs de la sagesse humaine, mais… l\'Esprit » = 1 Co 2,4'],
  [33, '1CO.7.31', 1, 'probable', '« La figure de ce monde passe, dit saint Paul » = 1 Co 7,31'],
  [34, 'MAT.24.35', 1, 'probable', '« Le ciel et la terre passeront » = Mt 24,35'],
  [38, 'ROM.1.21', 2, 'douteux', '« leur cœur insensé a été rempli de ténèbres » (fondu) = Rm 1,21'],
  [38, 'ROM.1.22', 2, 'douteux', '« devenus fous en s\'attribuant le nom de sages » = Rm 1,22'],
  [68, 'ROM.1.20', 1, 'probable', '« Les choses invisibles sont devenues visibles depuis la création du monde » = Rm 1,20'],
  [48, 'COL.1.16', 1, 'probable', '« Tout a été créé en lui… les trônes, les dominations… » = Col 1,16'],
  [59, 'PRO.1.7', 1, 'probable', '« Le commencement de la sagesse est la crainte du Seigneur » = Pr 1,7'],
  [61, 'EXO.31.3', 4, 'probable', 'L\'habileté de Béséléel pour les ornements du tabernacle (Ex 31,3)'],
  [99, 'ISA.51.6', 1, 'probable', '« qui a étendu le ciel comme une fumée » = Is 51,6'],
  [100, 'ISA.40.22', 1, 'probable', '« qui a établi le ciel comme une voûte » = Is 40,22'],
  [112, 'JOB.38.6', 1, 'probable', 'Job : « Sur quoi ses bases sont-elles affermies ? » = Jb 38,6'],
  [113, 'PSA.74.4', 1, 'probable', '« J\'ai affermi ses colonnes » = Ps 74,4 (source imprimait Ps 64,4)'],
  [114, 'PSA.23.2', 1, 'probable', '« Il l\'a fondée sur les mers » = Ps 23,2'],
  [117, 'PSA.94.4', 1, 'probable', '« Les limites de la terre sont dans la main de Dieu » = Ps 94,4'],
]

// segment_numero → id
const segByNum = new Map()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('segments').select('id, segment_numero, ref_niv1, segment_texte, texte_original')
    .eq('id_oeuvre', 'A0017O0001').eq('ref_niv1', 'Première homélie').order('segment_numero').range(from, from + 999)
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

console.log(`Homélie I — ${L.length} liens de lecture proposés\n`)
let manquants = 0
for (const [num, cible, type, fiab, motif] of L) {
  const s = segByNum.get(num)
  const vt = vtexte.get(cible)
  if (!vt) manquants++
  console.log(`#${num} → ${cible} [t${type}/${fiab}]${vt ? '' : '  ⚠️ CIBLE ABSENTE'}`)
  console.log(`   seg: ${(s?.texte_original ?? s?.segment_texte ?? '?').replace(/\s+/g, ' ').slice(0, 95)}`)
  if (vt) console.log(`   cib: ${String(vt).replace(/\s+/g, ' ').slice(0, 95)}`)
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
