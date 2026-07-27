// LECTURE — Homélie III de l'Hexaéméron (commentaire suivi de Gn 1, 6-8 : le firmament).
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom3.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom3.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Troisième homélie'

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // — Gn 1, 6 « Que le firmament soit fait au milieu des eaux, qu'il sépare les eaux » —
  [327, 'GEN.1.6', 1, 'probable', 'Cite « Que le firmament soit fait »'],
  [328, 'GEN.1.6', 3, 'probable', 'Explique : les paroles disent la cause pour laquelle Dieu crée le firmament'],
  [329, 'GEN.1.6', 1, 'probable', 'Cite « qu\'il divise les eaux d\'avec les eaux »'],
  [330, 'GEN.1.6', 3, 'probable', 'Exégèse de « Dieu dit » : comment Dieu parle'],
  [335, 'GEN.1.6', 3, 'probable', 'Exégèse de « Dieu qui ordonne et parle » : indique un coopérateur (le Fils)'],
  [379, 'GEN.1.6', 3, 'probable', 'Explique « firmament » : une substance ferme et solide retenant l\'eau'],
  [388, 'GEN.1.6', 3, 'probable', 'Commente « Que le firmament soit » : voix adressée au Fils'],
  [390, 'GEN.1.6', 1, 'probable', 'Cite « Afin qu\'il divise les eaux d\'avec les eaux »'],
  // — Gn 1, 7 « Et Dieu fit le firmament ; il divisa les eaux sous… au-dessus » —
  [365, 'GEN.1.7', 1, 'probable', 'Cite « Et Dieu fit le firmament ; il divisa les eaux qui étaient sous… au-dessus »'],
  [385, 'GEN.1.7', 3, 'probable', 'Commente : non « le firmament fut » mais « Dieu fit le firmament », puis « Dieu divisa »'],
  [389, 'GEN.1.7', 3, 'probable', 'Commente « Dieu fit le firmament » : témoignage d\'une puissance créatrice'],
  // — Gn 1, 8 « Dieu appela le firmament ciel » (+ conclusion du 2e jour) —
  [440, 'GEN.1.8', 3, 'probable', 'Commente « appela le firmament ciel » : l\'air épais visible nommé ciel'],
  [363, 'GEN.1.8', 3, 'probable', 'Conclut : le second ciel (firmament) diffère du premier, d\'une substance plus ferme'],
  [467, 'GEN.1.8', 3, 'probable', 'Commente « Dieu vit que cela était bon » (add. Septante au 2e jour) : Dieu juge selon l\'art et la fin'],
  // — citations d'appui sur les mots « ciel / firmament » —
  [441, 'PSA.8.9', 1, 'probable', 'Cite « Les oiseaux du ciel » = Ps 8,9'],
  [442, 'GEN.1.20', 1, 'probable', 'Cite « Les oiseaux qui volent dans le firmament du ciel » = Gn 1,20'],
  [443, 'PSA.106.26', 1, 'probable', 'Cite « Ils montent jusqu\'aux cieux » = Ps 106,26'],
  [444, 'DEU.33.13', 1, 'probable', 'Cite la bénédiction de Joseph : « les fruits du ciel et de la rosée… » = Dt 33,13-16'],
  [445, 'DEU.28.23', 1, 'probable', 'Cite « Le ciel au-dessus de ta tête sera d\'airain » = Dt 28,23'],
  [461, 'PSA.18.2', 1, 'probable', 'Cite « Les cieux racontent la gloire de Dieu… le firmament annonce l\'ouvrage de ses mains » = Ps 18,2'],
  [463, 'DAN.3.64', 4, 'douteux', 'Nomme le Bénédicité de Daniel 3 : rosée, frimas, froid, chaleur invités à louer'],
  [464, 'PSA.148.7', 1, 'probable', 'Cite « Louez le Seigneur… dragons et tous les abîmes » = Ps 148,7'],
  // — autres citations et échos —
  [317, 'PSA.118.103', 1, 'probable', 'Cite le psalmiste : « Que vos paroles sont agréables à ma bouche… plus que le miel » = Ps 118,103'],
  [353, '2CO.12.2', 4, 'douteux', 'Allusion au troisième ciel contemplé par saint Paul (2 Co 12,2)'],
  [354, 'PSA.148.4', 4, 'douteux', '« cieux des cieux » — expression du psalmiste (Ps 148,4)'],
  [377, 'AMO.4.13', 1, 'probable', 'Cite « C\'est moi qui affermis le tonnerre » = Am 4,13 (forme Septante)'],
  [400, 'JOB.36.27', 1, 'probable', 'Cite Job : « nombre jusqu\'aux gouttes de la pluie » = Jb 36,27'],
  [414, 'ISA.44.27', 1, 'probable', 'Cite Isaïe : « Vous qui dites à l\'abîme : sois désolé, je dessécherai tes fleuves » = Is 44,27'],
  [476, 'ROM.1.20', 1, 'probable', 'Cite saint Paul : « Ce qu\'il y a d\'invisible en Dieu… depuis la création du monde » = Rm 1,20'],
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

console.log(`Homélie III — ${L.length} liens de lecture proposés\n`)
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
