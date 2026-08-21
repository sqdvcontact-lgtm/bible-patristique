// LECTURE — Homélie VI de l'Hexaéméron (commentaire suivi de Gn 1, 14-19 :
// « Que des corps lumineux soient faits dans le firmament du ciel… », les luminaires
// — soleil, lune, étoiles ; signes, saisons, jours, années ; polémique anti-astrologie).
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom6.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom6.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Sixième homélie'

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // ═══════ Le lemme : Gn 1, 14-19 (les luminaires) ═══════
  // — Gn 1, 14 « Que des corps lumineux soient faits dans le firmament du ciel » —
  [797, 'GEN.1.14', 1, 'probable', 'Cite le lemme : « au quatrième jour Dieu dit : Que des corps lumineux soient faits dans le firmament du ciel »'],
  [799, 'GEN.1.14', 1, 'probable', 'Cite « Dieu dit que des corps lumineux soient faits »'],
  // — Gn 1, 16 « Dieu fit les deux grands corps lumineux » —
  [799, 'GEN.1.16', 1, 'probable', 'Cite « et Dieu fit deux corps lumineux » (Dieu fit les deux grands luminaires)'],
  // — Gn 1, 15 « pour éclairer la terre » —
  [802, 'GEN.1.15', 1, 'probable', 'Cite « les corps lumineux ont été créés pour éclairer la terre, dit-il »'],
  [802, 'GEN.1.15', 3, 'probable', 'Commente : Moïse ajoute la cause pour laquelle les corps lumineux ont été créés'],
  [803, 'GEN.1.15', 3, 'probable', 'Objection : si la création de la lumière a précédé, pourquoi dit-on que le soleil a été créé pour éclairer la terre ?'],
  [807, 'GEN.1.15', 3, 'probable', 'Résout : Dieu a créé d\'abord la substance de la lumière, et produit le corps du soleil pour lui servir de véhicule'],
  // — Gn 1, 14 « pour séparer le jour et la nuit » —
  [826, 'GEN.1.14', 1, 'probable', 'Cite « Les corps lumineux reçurent l\'ordre de séparer le jour de la nuit »'],
  // — Gn 1, 4 « Dieu sépara la lumière des ténèbres » (rappelé pour éclairer la séparation) —
  [827, 'GEN.1.4', 3, 'probable', 'Commente : Dieu avait déjà séparé la lumière des ténèbres, puis rendit leur nature absolument opposée'],
  [831, 'GEN.1.4', 1, 'probable', 'Cite « il est dit dans l\'Écriture que Dieu sépara la lumière des ténèbres »'],
  [832, 'GEN.1.4', 3, 'probable', 'Commente : dans la première création lumière et ténèbres ont reçu une nature qui les rend ennemies irréconciliables'],
  // — Gn 1, 16 « le plus grand pour présider au jour, le plus petit pour présider à la nuit » —
  [833, 'GEN.1.16', 3, 'probable', 'Commente : Dieu a commandé au soleil de mesurer le jour, et chargé la lune de régler la nuit'],
  // — Gn 1, 14 « qu'ils servent de signes, pour marquer les temps, les jours et les années » —
  [838, 'GEN.1.14', 3, 'probable', 'Commente la clause « signes » : les signes des corps lumineux sont nécessaires à la vie humaine'],
  [911, 'GEN.1.14', 1, 'probable', 'Cite « Qu\'ils servent de signes, dit-elle, pour marquer les temps, les jours et les années »'],
  [912, 'GEN.1.14', 3, 'probable', 'Commente « les temps » : par temps il faut entendre les diverses saisons — hiver, printemps, été, automne'],
  [929, 'GEN.1.14', 1, 'probable', 'Cite « Qu\'ils servent de signes pour les jours, dit l\'Écriture »'],
  [929, 'GEN.1.14', 3, 'probable', 'Commente : non pour produire les jours mais pour les présider, car le jour et la nuit sont plus anciens que les corps lumineux'],
  [934, 'GEN.1.14', 3, 'probable', 'Commente « les années » : le soleil et la lune ont été établis pour les années (mois intercalaire, année solaire)'],
  // — Gn 1, 16 « les DEUX GRANDS corps lumineux » (exégèse du mot « grand ») —
  [939, 'GEN.1.16', 3, 'probable', 'Commente « grand » : une grandeur absolue se montre dans la constitution des corps lumineux'],
  [940, 'GEN.1.16', 3, 'probable', 'Explique en quoi le soleil et la lune sont « grands » : leur circonférence, dont la splendeur embrasse ciel, air, terre et mer'],
  [957, 'GEN.1.16', 3, 'probable', 'Conclut : « Le soleil est un grand corps lumineux, d\'après le témoignage de l\'Écriture, et infiniment plus grand qu\'il ne nous paraît »'],

  // ═══════ Citations et échos d'autres livres ═══════
  // Jc 1, 15 — le péché engendre la mort
  [790, 'JAS.1.15', 4, 'probable', 'Écho : « la mort, qu\'a engendrée le péché » (le péché consommé engendre la mort)'],
  // Gn 1, 26 & Gn 2, 7 — l'homme, ouvrage des mains divines, fait pour commander
  [791, 'GEN.1.26', 4, 'probable', 'Écho : l\'homme « fait pour commander à ces animaux et aux êtres inanimés » (domination donnée à l\'homme)'],
  [791, 'GEN.2.7', 4, 'douteux', 'Écho : « terrestre par votre nature, vous êtes l\'ouvrage des mains divines » (l\'homme formé de la terre)'],
  // Ml 3, 20 (Crampon ; = Ml 4, 2 numérotation LXX/hébr.) — le soleil de justice
  [793, 'MAL.3.20', 4, 'probable', 'Écho : au soleil matériel s\'oppose « le soleil de justice » (le Christ)'],
  // Jn 1, 9 — la vraie lumière
  [794, 'JHN.1.9', 4, 'probable', 'Écho : « quelle infortune pour le pécheur d\'être privé de la lumière véritable »'],
  // Ph 2, 15 — les flambeaux dans le monde (CORRIGE l'amorce PHP.1.15)
  [809, 'PHP.2.15', 1, 'probable', 'Cite « L\'apôtre parle de corps lumineux dans le monde » (φωστῆρες ἐν κόσμῳ, Ph 2, 15)'],
  [809, 'JHN.1.9', 4, 'probable', 'Écho : « cette lumière véritable du monde, par la participation de laquelle les saints sont devenus des corps lumineux »'],
  // Ex 3, 2 — le buisson ardent
  [816, 'EXO.3.2', 4, 'probable', 'Écho : Dieu « a mis dans le buisson un feu qui n\'agissait que de son éclat, et dont la vertu brûlante restait oisive »'],
  // Ps 28, 7 (grec) — la voix du Seigneur qui divise la flamme
  [817, 'PSA.28.7', 1, 'probable', 'Cite « le psalmiste par ces mots : la voix du Seigneur qui rend inutile la flamme du feu »'],
  // Mt 16, 3 — le ciel rouge et sombre annonce l'orage (CORRIGE t4→t1)
  [840, 'MAT.16.3', 1, 'probable', 'Cite « Le Seigneur, dans l\'Évangile : Il y aura de l\'orage, dit-il, car le ciel est sombre et rougeâtre »'],
  // Lc 21, 25 — signes dans le soleil, la lune et les étoiles
  [853, 'LUK.21.25', 4, 'probable', 'Écho de la prophétie : « le soleil, la lune et les étoiles donneront des signes de la dissolution de l\'univers »'],
  // Mt 24, 29 // Mc 13, 24 — le soleil changé, la lune sans lumière (CORRIGE t4→t1)
  [855, 'MAT.24.29', 1, 'probable', 'Cite « Le soleil sera changé en sang, et la lune ne donnera pas sa lumière » (réf. Matth. 24, 29)'],
  [855, 'MRK.13.24', 1, 'probable', 'Cite « Le soleil sera changé…, et la lune ne donnera pas sa lumière » (réf. Marc 13, 24)'],
  // 1 Co 15, 52 — en un moment, en un clin d'œil (CORRIGE t4→t1)
  [862, '1CO.15.52', 1, 'probable', 'Cite « selon ce que dit l\'Apôtre, en un moment, en un clin d\'œil »'],
  // Mt 1, 9 — la succession royale Ozias-Joatham-Achaz-Ézéchias
  [900, 'MAT.1.9', 4, 'probable', 'Écho de la généalogie : « Osias engendra Joathan, Joathan Achas, Achas Ézéchias » (contre l\'astrologie)'],
  // Ps 135, 8-9 (grec) — le soleil pour commander au jour… (CORRIGE t4→t1, + v9)
  [930, 'PSA.135.8', 1, 'probable', 'Cite « le Psalmiste : Il a placé le soleil pour commander au jour »'],
  [930, 'PSA.135.9', 1, 'probable', 'Cite « la lune et les étoiles pour commander à la nuit »'],
  // Si 27, 11 — l'insensé change comme la lune
  [970, 'SIR.27.11', 1, 'probable', 'Cite « L\'insensé, dit avec vérité l\'Écriture, est changeant comme la lune »'],
  // Doxologie finale
  [997, '1CO.12.7', 4, 'probable', 'Écho : « la manifestation de l\'esprit » (φανέρωσις τοῦ Πνεύματος)'],
  [997, 'ROM.12.6', 4, 'probable', 'Écho : « en proportion de votre foi » (κατὰ τὴν ἀναλογίαν τῆς πίστεως)'],
  [997, '1PE.4.11', 4, 'probable', 'Écho de la doxologie : « à qui soient la gloire et l\'empire dans les siècles des siècles »'],
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

console.log(`Homélie VI — ${L.length} liens de lecture proposés\n`)
let manquants = 0
for (const [num, cible, type, fiab, motif] of L) {
  const s = segByNum.get(num)
  const vt = vtexte.get(cible)
  if (!vt) manquants++
  if (!s) console.log(`#${num} → ⚠️ SEGMENT ABSENT`)
  console.log(`#${num} → ${cible} [t${type}/${fiab}]${vt ? '' : '  ⚠️ CIBLE ABSENTE'}`)
  console.log(`   seg: ${(s?.texte_original ?? s?.segment_texte ?? '?').replace(/\s+/g, ' ').slice(0, 110)}`)
  if (vt) console.log(`   cib: ${String(vt).replace(/\s+/g, ' ').slice(0, 110)}`)
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
