// LECTURE — Neuvième homélie de l'Hexaéméron.
// Commentaire suivi de Gn 1, 24 (« Que la terre produise l'âme vivante » —
// caractères propres des animaux : le bœuf, l'âne, le lion, la panthère, l'ours,
// la fourmi, le chien, l'éléphant… morale de l'instinct), PUIS la grande section
// christologique sur Gn 1, 26-27 (« Faisons l'homme à notre image », le pluriel
// = le Père s'adressant au Fils coopérateur, polémique anti-juive).
// Gros pans d'histoire naturelle morale (guérisons animales, pressentiment de
// l'air, l'éléphant, le scorpion) sans contenu biblique.
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom9.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom9.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Neuvième homélie'
// Amorces à nettoyer même sans lien de lecture (amorce mal placée) :
//   #1390 portait PHP.3.20 mais « Vivez dans le ciel » (le πολίτευμα) est en #1391.
const SUPPR_EXTRA = [1390]

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // ═══════ Le lemme : Gn 1, 24 « Que la terre produise l'âme vivante » ═══════
  [1375, 'GEN.1.24', 3, 'probable', 'Commente la portée de l\'ordre créateur : « Considérez la parole de Dieu qui s\'étend sur toutes les créatures, qui a commencé alors, qui agit encore maintenant… jusqu\'à la consommation du monde »'],
  [1379, 'GEN.1.24', 1, 'probable', 'Cite le lemme : « Que la terre produise l\'âme vivante »'],
  [1380, 'GEN.1.24', 3, 'probable', 'Commente : « Cet ordre est resté inhérent à la terre, qui ne cesse d\'obéir au Créateur »'],
  [1384, 'GEN.1.24', 1, 'probable', 'Reprend le lemme : « Que la terre produise l\'âme vivante »'],
  [1394, 'GEN.1.24', 3, 'probable', 'Explique la nature de l\'âme des bêtes : « L\'âme des bêtes n\'a pas été mise dans la terre pour paraître au-dehors, mais elle a existé aussitôt que l\'ordre a été proféré »'],
  [1395, 'GEN.1.24', 3, 'probable', 'Commente « une âme vivante » : « L\'âme des bêtes est uniforme ; un seul trait la caractérise, le défaut de raison »'],

  // — Élisée et les herbes sauvages (4 Rois 4, 39), écho d'épisode (réf. éditeur) —
  [1363, '2KI.4.39', 4, 'probable', 'Écho de l\'épisode : « Les amis du prophète Élisée ne le méprisaient point, parce qu\'il ne les recevait qu\'avec des herbes sauvages » (2 R 4, 39, la coloquinte/vigne sauvage)'],
  // — Rm 1, 16 « je ne rougis pas de l'Évangile » : citation littérale (amorce t4→t1) —
  [1368, 'ROM.1.16', 1, 'probable', 'Cite « car je ne rougis pas de l\'Évangile » (Rm 1, 16 ; grec οὐκ ἐπαισχύνομαι τὸ εὐαγγέλιον) — CORRIGE l\'amorce t4'],

  // — Ps 48, 21 (grec) : l'homme sans intelligence comparé aux bêtes (fondu, exhortation) —
  // Ossature Crampon : « bêtes » est en Ps 48, 21 (v13 = « biches ») — CORRIGE l'amorce PSA.48.13.
  [1388, 'PSA.48.21', 2, 'probable', 'Reprend fondu à la 2e pers. le verset : « vous vous rapprochez des bêtes qui n\'ont point de raison, et vous leur devenez semblable » (Ps 48, 21 grec ; παρασυνεβλήθη τοῖς κτήνεσιν τοῖς ἀνοήτοις καὶ ὡμοιώθη) — CORRIGE l\'amorce PSA.48.13'],
  // — Col 3, 1-2 : chercher les choses d'en haut où est le Christ (fondu ; amorce COL.3.1 t4→t2) —
  [1389, 'COL.3.1', 2, 'probable', 'Reprend fondu « vous devez chercher ce qui est dans le ciel, où est Jésus-Christ » (Col 3, 1 ; τὰ ἄνω ζητεῖν, οὗ ὁ Χριστός ἐστιν) — CORRIGE l\'amorce t4'],
  [1389, 'COL.3.2', 2, 'probable', 'Reprend fondu la suite « et élever votre âme au-dessus des choses terrestres » (Col 3, 2, τὰ ἄνω φρονεῖτε, μὴ τὰ ἐπὶ τῆς γῆς — récupéré à la lecture)'],
  // — Ph 3, 20 « notre cité est dans les cieux » : écho, sur #1391 (amorce mal placée en #1390) —
  [1391, 'PHP.3.20', 4, 'probable', 'Écho tourné en exhortation : « Vivez dans le ciel » (grec Τὸ πολίτευμα ἔχε ἐν οὐρανοῖς = Ph 3, 20) — l\'amorce PHP.3.20 était MAL PLACÉE en #1390, nettoyée'],
  // — He 12, 23 + Ga 4, 26 : la Jérusalem d'en haut, les premiers-nés inscrits aux cieux (amorce HEB.12.23) —
  [1392, 'HEB.12.23', 2, 'probable', 'Reprend fondu « vous êtes concitoyens des premiers nés dont les noms sont écrits dans les cieux » (He 12, 23 ; ἀπογεγραμμένων ἐν οὐρανοῖς)'],
  [1392, 'GAL.4.26', 2, 'probable', 'Reprend fondu « La Jérusalem d\'en haut est votre patrie véritable » (Ga 4, 26 ; ἡ ἄνω Ἱερουσαλήμ — récupéré à la lecture)'],

  // — Ps 103, 24 (grec) : « Que vos œuvres sont magnifiques… tout fait avec sagesse » (annonce, amorce t4→t1) —
  [1421, 'PSA.103.24', 1, 'probable', 'Cite avec annonce « Disons donc… avec le Prophète : Que vos œuvres, Seigneur, sont magnifiques ! vous avez tout fait avec sagesse » (Ps 103, 24 grec) — CORRIGE l\'amorce t4'],

  // — Ep 6, 1 & 4 : enfants/pères (réf. éditeur « Eph 6, 1-4 ») —
  [1431, 'EPH.6.1', 2, 'probable', 'Reprend « Enfants, aimez vos pères » (paraphrase d\'Ep 6, 1 « obéissez à vos parents » ; réf. éditeur Eph 6, 1-4)'],
  [1431, 'EPH.6.4', 1, 'probable', 'Cite « Pères, n\'irritez point vos enfants » (Ep 6, 4 ; μὴ παροργίζετε τὰ τέκνα)'],
  [1433, 'EPH.6.1', 3, 'probable', 'Commente le précepte : « Paul ne prescrit rien de nouveau, il ne fait que resserrer le lien de la nature »'],

  // ═══════ Gn 1, 26-27 « Faisons l'homme à notre image » (section christologique) ═══════
  // Anticipation : Gn 1, 26 « à notre image » (domination de l'homme sur l'animal)
  [1479, 'GEN.1.26', 4, 'probable', 'Écho anticipé du lemme : « le Créateur nous a tout assujetti parce qu\'il nous a faits à son image » (Gn 1, 26 κατ\' εἰκόνα)'],
  // Le lemme Gn 1, 26, cité en refrain
  [1496, 'GEN.1.26', 1, 'probable', 'Cite le lemme : « Et Dieu dit : Faisons l\'homme »'],
  [1500, 'GEN.1.26', 3, 'probable', 'Commente le pluriel « Faisons » par l\'analogie de l\'artisan : nul ouvrier seul ne se dit à lui-même « Faisons une épée » — donc « Faisons » n\'est pas une adresse à soi-même'],
  [1504, 'GEN.1.26', 1, 'probable', 'Reprend le lemme : « Et Dieu dit : Faisons l\'homme »'],
  [1506, 'GEN.1.26', 3, 'probable', 'Commente pourquoi le pluriel paraît ici : « lorsque la création de l\'homme est attendue, la foi se dévoile, le dogme de la vérité se manifeste d\'une façon plus claire »'],
  [1507, 'GEN.1.26', 1, 'probable', 'Reprend le lemme : « Faisons l\'homme »'],
  [1508, 'GEN.1.26', 3, 'probable', 'Commente « Faisons » : Dieu s\'entretient avec « celui qui partage l\'ouvrage de la création » (le Fils coopérateur)'],
  [1513, 'GEN.1.26', 1, 'probable', 'Cite « Considérez la suite, à notre image » (Gn 1, 26)'],
  [1515, 'GEN.1.26', 3, 'probable', 'Commente « à notre image » : « La forme du Père et du Fils est la même nécessairement » (l\'image unique exclut les anges)'],
  [1518, 'GEN.1.26', 3, 'probable', 'Commente l\'interlocuteur de « à notre image » : c\'est « celui qui est la splendeur de sa gloire… l\'image du Dieu invisible » (le Fils)'],
  [1519, 'GEN.1.26', 1, 'probable', 'Cite le lemme complet : « c\'est à cette image qu\'il dit : Faisons l\'homme à notre image »'],
  // He 1, 2-3 sur #1508 : par qui il a fait les siècles / soutient tout par sa parole (réf. éditeur ; amorce HEB.1.2 t4→t1)
  [1508, 'HEB.1.2', 1, 'probable', 'Cite « par qui il a fait les siècles » (He 1, 2 ; δι\' οὗ καὶ τοὺς αἰῶνας ἐποίησεν ; réf. éditeur « Héb 1, 2 et 3 ») — CORRIGE l\'amorce t4'],
  [1508, 'HEB.1.3', 1, 'probable', 'Cite « qui soutient tout par la parole de sa puissance » (He 1, 3 ; φέρων τὰ πάντα τῷ ῥήματι τῆς δυνάμεως αὐτοῦ)'],
  // He 1, 3 + Col 1, 15 sur #1518 (amorce HEB.1.3 t4→t1)
  [1518, 'HEB.1.3', 1, 'probable', 'Cite « la splendeur de sa gloire, le caractère de sa substance » (He 1, 3 ; ἀπαύγασμα τῆς δόξης, χαρακτὴρ τῆς ὑποστάσεως) — CORRIGE l\'amorce t4'],
  [1518, 'COL.1.15', 1, 'probable', 'Cite « l\'image du Dieu invisible » (Col 1, 15 ; εἰκὼν τοῦ Θεοῦ τοῦ ἀοράτου — récupéré à la lecture)'],
  // Jn 10, 30 & 14, 9 sur #1519 (réf. éditeur « Jean 10, 13 ; 14, 9 » — coquille : Jn 10, 30)
  [1519, 'JHN.10.30', 1, 'probable', 'Cite « Moi et mon Père nous sommes une même chose » (Jn 10, 30 ; la réf. éditeur porte « Jean 10, 13 », coquille pour 10, 30)'],
  [1519, 'JHN.14.9', 1, 'probable', 'Cite « qui m\'a vu a vu mon Père » (Jn 14, 9 ; réf. éditeur)'],

  // Gn 1, 27 « Et Dieu fit l'homme à l'image de Dieu »
  [1521, 'GEN.1.27', 1, 'probable', 'Cite « Et Dieu fit l\'homme » (Gn 1, 27, καὶ ἐποίησεν ὁ Θεὸς τὸν ἄνθρωπον — le singulier, non « ils firent »)'],
  [1524, 'GEN.1.27', 3, 'probable', 'Commente le singulier « fit » : l\'Écriture « recourt sagement à l\'unité, afin que vous conceviez le Fils avec le Père, et que vous évitiez le danger du polythéisme »'],
  [1525, 'GEN.1.27', 1, 'probable', 'Cite « Il le fit à l\'image de Dieu » (Gn 1, 27)'],
  [1526, 'GEN.1.27', 3, 'probable', 'Commente « à l\'image de Dieu » : l\'Écriture « introduit de nouveau la personne d\'un coopérateur, en ne disant pas, à son image, mais, à l\'image de Dieu »'],

  // — Ps 90, 13 (grec) : marcher sur l'aspic et le basilic (annonce, amorce t4→t1) —
  [1487, 'PSA.90.13', 1, 'probable', 'Cite « Vous marcherez sur l\'aspic et le basilic, vous foulerez aux pieds le lion et le dragon » (Ps 90, 13 grec) — CORRIGE l\'amorce t4'],
  // — Lc 10, 19 : le pouvoir de fouler serpents et scorpions (récupéré) —
  [1488, 'LUK.10.19', 1, 'probable', 'Cite « marcher… sur les serpents et les scorpions » (Lc 10, 19 ; τὴν ἐξουσίαν πατεῖν ἐπάνω ὄφεων καὶ σκορπίων — récupéré à la lecture)'],
  // — Ac 28, 3 : Paul et la vipère (écho d'épisode ; réf. éditeur) —
  [1489, 'ACT.28.3', 4, 'probable', 'Écho de l\'épisode : « Paul ramassant des sarments, ne reçut aucun mal d\'une vipère qui s\'était attachée à sa main » (Ac 28, 3)'],
  // — Ps 138, 6 (grec) : la science admirable de Dieu (annonce, amorce t4→t1) —
  [1495, 'PSA.138.6', 1, 'probable', 'Cite avec annonce « selon ce que dit le Prophète : La science de votre nature a été en moi admirable » (Ps 138, 6 grec ; ἐθαυμαστώθη ἡ γνῶσίς σου ἐξ ἐμοῦ) — CORRIGE l\'amorce t4'],
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

console.log(`Homélie IX — ${L.length} liens de lecture proposés\n`)
let manquants = 0
for (const [num, cible, type, fiab, motif] of L) {
  const s = segByNum.get(num)
  const vt = cible ? vtexte.get(cible) : null
  if (cible && !vt) manquants++
  if (!s) console.log(`#${num} → ⚠️ SEGMENT ABSENT`)
  console.log(`#${num} → ${cible ?? '(à constituer — verset absent de l\'ossature)'} [t${type}/${fiab}]${cible && !vt ? '  ⚠️ CIBLE ABSENTE' : ''}`)
  console.log(`   seg: ${(s?.segment_texte ?? s?.texte_original ?? '?').replace(/\s+/g, ' ').slice(0, 120)}`)
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
