// LECTURE — Homélie V de l'Hexaéméron (commentaire suivi de Gn 1, 11-12 :
// « Que la terre produise de l'herbe verte… », la végétation — herbes, graines, arbres).
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom5.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom5.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Cinquième homélie'

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // ————— Gn 1, 11 « Que la terre produise de l'herbe verte… des arbres fruitiers… qui renferment leur semence en eux-mêmes selon leur espèce » —————
  // — citations littérales du lemme (refrain qui ouvre chaque sous-développement) —
  [608, 'GEN.1.11', 1, 'probable', 'Cite le lemme entier : « Que la terre produise de l\'herbe verte… des arbres fruitiers… qui renferment leur semence en eux-mêmes »'],
  [611, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise une herbe verte »'],
  [614, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise de l\'herbe verte »'],
  [619, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise une herbe verte qui porte de la graine selon son espèce »'],
  [631, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise »'],
  [642, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise de l\'herbe verte, qui porte de la graine selon son espèce et selon la ressemblance »'],
  [645, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise de l\'herbe verte »'],
  [655, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise de l\'herbe verte » (avant la digression sur les poisons)'],
  [671, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise de l\'herbe verte »'],
  [685, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise de l\'herbe verte »'],
  [690, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise, dit l\'Écriture, des arbres fruitiers qui portent du fruit… qui renferment leur semence en eux-mêmes »'],
  [766, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise des arbres fruitiers qui portent du fruit sur la terre »'],
  [777, 'GEN.1.11', 1, 'probable', 'Cite « Que la terre produise »'],
  // — commentaires du lemme (exégèse de la formule) —
  [609, 'GEN.1.11', 3, 'probable', 'Commente l\'ordre de la formule : la terre reçoit l\'ordre de produire d\'abord l\'herbe, ensuite les arbres'],
  [610, 'GEN.1.11', 3, 'probable', 'Commente « la voix de Dieu, le premier ordre » : comme la loi de la nature, permanente, donnant à la terre sa fécondité'],
  [615, 'GEN.1.11', 3, 'probable', 'Commente « par elle-même » : la terre produit sans aucun secours étranger'],
  [621, 'GEN.1.11', 3, 'douteux', 'Critique textuelle : le texte devrait être rétabli « Que la terre produise de l\'herbe verte, et des graines selon les espèces »'],
  [622, 'GEN.1.11', 3, 'douteux', 'Poursuit : cette disposition des mots serait plus conforme à l\'ordre de la nature'],
  [623, 'GEN.1.11', 3, 'probable', 'Objection sur « selon son espèce » : comment l\'Écriture dit-elle que toutes les productions ont des graines, alors que le roseau, le safran… n\'en ont pas ?'],
  [628, 'GEN.1.11', 3, 'probable', 'Explique « c\'est là le sens de ces paroles : Selon son espèce »'],
  [629, 'GEN.1.11', 3, 'probable', 'Commente « selon son espèce » : un roseau naît d\'un roseau, jamais un olivier'],
  [643, 'GEN.1.11', 3, 'probable', 'Commente : l\'ordre observé aujourd\'hui atteste l\'ordre originel, toute production commençant par l\'herbe verte'],
  [673, 'GEN.1.11', 3, 'probable', 'Commente : Dieu n\'ordonne pas de produire d\'emblée la graine, mais d\'abord l\'herbe, pour faire du premier ordre une leçon pour tous les siècles'],
  [674, 'GEN.1.11', 3, 'probable', 'Objection sur « selon l\'espèce » : pourquoi, ayant semé du bon blé, recueillons-nous du froment noir ?'],
  [675, 'GEN.1.11', 3, 'probable', 'Réponse : ce n\'est pas un changement d\'espèce mais une altération, le grain reste blé'],
  [694, 'GEN.1.11', 3, 'probable', 'Objection sur « qui renferment leur semence » : plusieurs arbres n\'ont ni fruits ni semences'],
  [696, 'GEN.1.11', 3, 'probable', 'Réponse : tous les arbres ont une semence ou une vertu qui en tient lieu'],
  [778, 'GEN.1.11', 3, 'probable', 'Commente « ce peu de paroles » : elles furent une nature universelle et un art merveilleux'],
  [779, 'GEN.1.11', 3, 'probable', 'Commente : ces mêmes paroles pressent encore la terre chaque année de produire herbes, plantes et arbres'],
  // ————— Gn 1, 12 « Et la terre fit sortir du gazon… et des arbres produisant… » (accomplissement) —————
  [686, 'GEN.1.12', 3, 'probable', 'Décrit l\'accomplissement : la terre, obéissant, produit l\'herbe et conduit les plantes à une entière perfection'],
  [691, 'GEN.1.12', 3, 'probable', 'Décrit l\'accomplissement pour les arbres : « à cette parole on vit paraître une immense quantité de bois… tous les arbres »'],
  [767, 'GEN.1.12', 3, 'probable', 'Décrit l\'accomplissement : « à cette parole, les sommets des montagnes furent couverts d\'arbres »'],
  // ————— citations et échos d'autres livres —————
  // Is 40, 6 — « Toute chair est comme l'herbe » (commentaire suivi #635-641)
  [635, 'ISA.40.6', 1, 'probable', 'Cite « le sage Isaïe : Toute chair est comme l\'herbe, et toute la gloire de l\'homme est comme la fleur de l\'herbe »'],
  [636, 'ISA.40.6', 3, 'probable', 'Commente la comparaison d\'Isaïe : la plus propre à exprimer la brièveté de la vie, la fragilité des prospérités humaines'],
  [641, 'ISA.40.6', 3, 'probable', 'Conclut : « avec raison le Prophète compare la gloire humaine à la fleur la plus fragile »'],
  // Mc 4, 26-28 — la semence qui croît d'elle-même (réf. éditeur « Marc 4, 26 et suiv. »)
  [681, 'MRK.4.26', 3, 'probable', 'Introduit et commente : le Seigneur compare l\'état parfait des croyants à l\'accroissement des semences'],
  [682, 'MRK.4.26', 1, 'probable', 'Cite « Le royaume des cieux est semblable à ce qui arrive lorsqu\'un homme a jeté de la semence en terre »'],
  [683, 'MRK.4.27', 1, 'probable', 'Cite « Soit qu\'il dorme ou qu\'il se lève… la semence germe et croît sans qu\'il sache comment »'],
  [684, 'MRK.4.28', 1, 'probable', 'Cite « la terre produit premièrement l\'herbe, ensuite l\'épi, puis le blé tout formé » (réf. Marc 4, 26)'],
  // Mt 13, 25 — l'ivraie mêlée au bon grain
  [679, 'MAT.13.25', 4, 'probable', 'Écho de la parabole : l\'ivraie « dont il est parlé dans l\'Écriture », mêlée au bon grain'],
  [680, 'MAT.13.25', 3, 'probable', 'Interprète l\'ivraie : image de ceux qui corrompent les préceptes et se mêlent au corps sain de l\'Église'],
  // Gn 3, 18-19 — épines et sueur (la faute)
  [689, 'GEN.3.19', 4, 'probable', 'Écho : les premières productions plus anciennes que la faute qui nous condamna à « manger notre pain à la sueur de notre front »'],
  [693, 'GEN.3.18', 4, 'probable', 'Écho : l\'épine ajoutée à la rose rappelle la faute qui condamna la terre à produire « des épines et des ronces »'],
  // Ps 103, 15 (grec) — le vin qui réjouit le cœur
  [701, 'PSA.103.15', 4, 'probable', 'Écho : la vigne « produit le vin qui réjouit le cœur de l\'homme » et l\'olivier l\'huile « qui répand la joie sur le visage »'],
  // Jn 15 — la vraie vigne
  [704, 'JHN.15.1', 4, 'probable', 'Reprend l\'allégorie johannique : le Seigneur « se nomme lui-même la vigne, son Père le vigneron », nous les sarments'],
  [705, 'JHN.15.6', 4, 'probable', 'Écho : il exhorte à porter du fruit « de peur que, stériles, nous ne soyons livrés au feu »'],
  // Is 5, 1 — le chant de la vigne
  [707, 'ISA.5.1', 1, 'probable', 'Cite « par un de ses Prophètes : Mon bien-aimé avait une vigne dans un lieu élevé, gras et fertile »'],
  // Mt 21, 33 — la vigne entourée d'une haie
  [708, 'MAT.21.33', 2, 'douteux', 'Cite fondu (1re pers.) « J\'ai planté une vigne, dit-il ailleurs, et je l\'ai enfermée d\'une haie »'],
  [709, 'MAT.21.33', 3, 'probable', 'Interprète : la vigne = les âmes humaines, la haie = la force des préceptes et la garde des anges'],
  // Ps 33, 8 (grec) — l'ange du Seigneur
  [710, 'PSA.33.8', 1, 'probable', 'Cite « L\'ange du Seigneur, dit David, environnera ceux qui le craignent »'],
  // Ps 51, 10 (grec) — l'olivier verdoyant dans la maison de Dieu
  [718, 'PSA.51.10', 4, 'probable', 'Écho : « soyez comme un olivier qui porte du fruit dans la maison de Dieu »'],
  // Jr 17, 6 — le tamaris de la lande
  [776, 'JER.17.6', 3, 'douteux', 'Interprète la comparaison de Jérémie : le tamaris amphibie figure les caractères vicieux qui balancent entre le bien et le mal'],
  // Ps 91, 14 (grec) — plantés dans la maison de Dieu (doxologie finale)
  [781, 'PSA.91.14', 4, 'probable', 'Écho de la doxologie : « plantés dans la maison de notre Dieu, nous fleurissions à l\'entrée des demeures éternelles »'],
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

console.log(`Homélie V — ${L.length} liens de lecture proposés\n`)
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
