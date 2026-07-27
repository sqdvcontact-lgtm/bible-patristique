// LECTURE — Dixième homélie de l'Hexaéméron (APOCRYPHE, attribution douteuse).
// Commentaire suivi de Gn 1, 26 (« Faisons l'homme à notre image et à notre
// ressemblance, et qu'il commande aux poissons… » — le pluriel = le Père et le
// Verbe coopérateur ; l'image ≠ figure corporelle mais la RAISON ; la domination
// de l'homme sur les animaux), de Gn 1, 27 (« Et Dieu fit l'homme à son image » —
// pourquoi « image » seule et non « ressemblance » : l'image donnée par nature,
// la ressemblance laissée au libre arbitre), et de Gn 2, 7 (« Dieu prit du limon
// de la terre et forma l'homme » — fit=âme / forma=corps ; leçon d'humilité).
// Longue péroraison d'anatomie (l'œil) = philosophie naturelle sans contenu biblique.
// Fruit de MA lecture segment par segment (types 1/2/3/4). Provenance 'lecture'.
// Remplace les « à constituer » éditoriaux des segments concernés (supersédés).
//
//   node scripts/hexameron-lecture-hom10.mjs           (contrôle, rien écrit)
//   node scripts/hexameron-lecture-hom10.mjs --write   (écrit)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const REF_NIV1 = 'Dixième homélie (apocryphe)'
// Toutes les amorces de cette homélie sont sur des segments retravaillés ci-dessous :
const SUPPR_EXTRA = []

// [segment_numero, canon_id, type, fiabilité, motif]
const L = [
  // ═══════ « Étudie-toi toi-même » : Ps 138, 6 (grec) ═══════
  // Crampon (hébreu) lit « Science trop merveilleuse pour moi » ; Basile cite la LXX.
  [1548, 'PSA.138.6', 1, 'probable', 'Cite avec annonce « le sage David… disait à Dieu : La science de votre nature a été en moi admirable » (Ps 138, 6 grec ; ἐθαυμαστώθη ἡ γνῶσίς σου ἐξ ἐμοῦ) — CORRIGE l\'amorce t4'],
  [1549, 'PSA.138.6', 3, 'probable', 'Glose le verset : « C\'est-à-dire, j\'ai trouvé d\'une manière admirable la connaissance de votre nature… d\'après l\'étude de moi-même »'],
  [1550, 'PSA.138.6', 3, 'probable', 'Développe le verset : « cette faible mais admirable machine m\'a fait connaître le grand Ouvrier »'],

  // ═══════ Le lemme Gn 1, 26 « Faisons l'homme à notre image et à notre ressemblance » ═══════
  [1551, 'GEN.1.26', 1, 'probable', 'Cite le lemme complet : « Faisons l\'homme à notre image et à notre ressemblance » — CORRIGE l\'amorce t4'],
  [1552, 'GEN.1.26', 3, 'probable', 'Commente « quel est celui qui parle et à qui la parole s\'adresse » (le Père au Verbe ; renvoie à la fin de l\'homélie IX)'],
  [1554, 'GEN.1.26', 1, 'probable', 'Reprend « Faisons l\'homme »'],
  [1556, 'GEN.1.26', 3, 'probable', 'Commente que « cette parole n\'a pas encore été employée pour les autres ouvrages de la création » — la délibération est propre à l\'homme'],
  [1563, 'GEN.1.26', 3, 'probable', 'Commente le contraste : « L\'homme n\'existe pas encore ; et Dieu délibère sur l\'homme »'],
  [1566, 'GEN.1.26', 3, 'probable', 'Commente « Faisons » : « Dieu établit en quelque sorte un conseil au-dedans de lui pour délibérer sur vous »'],
  [1568, 'GEN.1.26', 3, 'probable', 'Commente « Faisons » : « La sagesse elle-même délibère, l\'Ouvrier suprême examine »'],
  [1570, 'GEN.1.26', 1, 'probable', 'Reprend le lemme complet : « Faisons l\'homme à notre image et à notre ressemblance »'],
  [1584, 'GEN.1.26', 3, 'probable', 'Commente « à notre image » : « ces paroles… ne doivent nullement être prises dans le sens de figure corporelle »'],
  [1599, 'GEN.1.26', 3, 'probable', 'Conclut : « c\'est dans les ressources de la raison, et non dans la figure du corps, qu\'on doit chercher… la prérogative d\'avoir été faits à l\'image et à la ressemblance de Dieu »'],
  [1600, 'GEN.1.26', 1, 'probable', 'Reprend « Faisons l\'homme à notre image »'],
  [1601, 'GEN.1.26', 3, 'probable', 'Commente : « L\'Écriture parle de l\'homme intérieur, quand elle dit : Faisons l\'homme »'],
  [1611, 'GEN.1.26', 3, 'probable', 'Paraphrase-commente : « Faisons l\'homme à notre image, c\'est-à-dire, donnons-lui la supériorité de la raison, et qu\'ainsi il commande aux poissons »'],
  [1612, 'GEN.1.26', 3, 'probable', 'Commente : « ce ne sont pas les passions qui constituent l\'image de Dieu, mais la raison qui domine les passions »'],
  [1617, 'GEN.1.26', 1, 'probable', 'Cite la clause de domination : « Qu\'il commande… aux poissons, aux oiseaux du ciel, aux bêtes sauvages, aux animaux domestiques, aux reptiles qui rampent sur la terre » (Gn 1, 26)'],
  // — Gn 1, 29 : le don des arbres fruitiers, différé (écho) —
  [1618, 'GEN.1.29', 4, 'probable', 'Écho du don différé : « Dieu ne dit pas… et qu\'il mange des arbres fruitiers qui ont fruit en eux-mêmes : il le dira ensuite » (= Gn 1, 29, différé après Gn 1, 26)'],
  [1626, 'GEN.1.26', 3, 'probable', 'Commente : « où est la puissance du commandement, là est l\'image de Dieu ; où est l\'image de Dieu, là est l\'homme qu\'il a formé »'],
  [1627, 'GEN.1.26', 1, 'probable', 'Reprend « Qu\'il commande aux poissons »'],
  [1643, 'GEN.1.26', 1, 'probable', 'Reprend « Qu\'il commande aux poissons de la mer et aux bêtes sauvages de la terre »'],
  [1661, 'GEN.1.26', 1, 'probable', 'Reprend la fin de la clause : « Et aux reptiles qui rampent sur la terre »'],
  [1669, 'GEN.1.26', 1, 'probable', 'Reprend la délibération avec les deux mots : « Faisons l\'homme à notre image et à notre ressemblance »'],
  [1670, 'GEN.1.26', 3, 'probable', 'Commente : « La délibération renferme deux choses, à notre image et à notre ressemblance »'],
  [1684, 'GEN.1.26', 3, 'probable', 'Commente « à notre ressemblance » (de la délibération) : « annonçant qu\'il nous donnerait une volonté libre, par laquelle nous pourrions devenir semblables à Dieu »'],
  [1703, 'GEN.1.26', 1, 'probable', 'Reprend le lemme complet en péroraison : « Faisons l\'homme à notre image et à notre ressemblance »'],

  // — L'homme intérieur : 2 Co 4, 16 (citation attribuée « l'Apôtre ») —
  [1604, '2CO.4.16', 1, 'probable', 'Cite avec annonce « Écoutez l\'Apôtre qui dit : Quoique dans nous l\'homme extérieur se détruise, cependant l\'homme intérieur se renouvelle de jour en jour » (2 Co 4, 16)'],
  [1605, '2CO.4.16', 3, 'probable', 'Commente les deux hommes : « l\'un qui paraît aux yeux, et l\'autre qui est caché… l\'homme invisible, l\'homme intérieur »'],

  // — La lumière créée par simple ordre : Gn 1, 3 (rappel) —
  [1558, 'GEN.1.3', 1, 'probable', 'Rappelle le lemme du 1er jour : « Dieu dit : Que la lumière soit » (Gn 1, 3, création par simple ordre, opposée à la délibération sur l\'homme)'],
  // — « Il a dit, et tout a été fait » : Ps 32, 9 (fondu) —
  [1562, 'PSA.32.9', 2, 'probable', 'Reprend fondu « Il a dit, et tout a été fait » (Ps 32, 9 ; αὐτὸς εἶπε καὶ ἐγενήθησαν) dans l\'énumération des créatures'],

  // — 1 Co 7, 21 « appelé étant esclave » (paraphrase fondue) —
  [1623, '1CO.7.21', 2, 'probable', 'Reprend fondu « Tu as été appelé à la foi étant esclave » (1 Co 7, 21 ; δοῦλος ἐκλήθης — la suite « μή σοι μελέτω » paraphrasée en #1624 « Pourquoi te mettre en peine ») — CORRIGE l\'amorce t4'],

  // — Ps 8, 7 : toutes choses sous ses pieds (écho de la domination) —
  [1658, 'PSA.8.7', 4, 'probable', 'Écho : « Car Dieu a tout mis sous sa main, il lui a donné toutes les créatures pour son héritage » (Ps 8, 7 « tu as mis toutes choses sous ses pieds »)'],

  // ═══════ Gn 1, 27 « Et Dieu fit l'homme à l'image de Dieu » ═══════
  [1662, 'GEN.1.27', 3, 'probable', 'Commente le privilège : « avoir été fait à l\'image de Dieu… est dans le pouvoir du commandement, dans la raison et dans l\'intelligence de l\'âme » — amorce à constituer'],
  [1663, 'GEN.1.27', 1, 'probable', 'Cite « Et Dieu fit l\'homme » (Gn 1, 27, LXX ἐποίησεν ; Crampon lit « créa »)'],
  [1667, 'GEN.1.27', 1, 'probable', 'Cite « Et Dieu fit l\'homme ; il le fit à l\'image de Dieu » — CORRIGE l\'amorce t4'],
  [1671, 'GEN.1.27', 3, 'probable', 'Commente : « La création n\'en offre qu\'une, à son image » (contre la délibération qui portait les deux mots)'],
  [1676, 'GEN.1.27', 3, 'probable', 'Pose la difficulté : « Pourquoi… l\'Écriture ne dit-elle pas que Dieu l\'a fait à son image et à sa ressemblance, mais seulement à son image ? »'],
  [1682, 'GEN.1.27', 3, 'probable', 'Résout : « Être fait à l\'image de Dieu, c\'est un avantage qui nous est donné par notre nature… dès l\'origine »'],
  [1686, 'GEN.1.27', 3, 'probable', 'Commente : « Dans la création même de l\'homme, l\'Écriture dit seulement que Dieu le fit à son image… elle supprime et à sa ressemblance »'],
  [1717, 'GEN.1.27', 1, 'probable', 'Re-cite pour distinguer fit/forma : « après avoir dit : Et Dieu fit l\'homme, l\'Écriture ajoute : Et il le fit à l\'image de Dieu »'],

  // ═══════ Gn 2, 7 « Dieu prit du limon de la terre et forma l'homme » ═══════
  [1710, 'GEN.2.7', 1, 'probable', 'Cite « Dieu prit du limon de la terre et forma l\'homme » (Gn 2, 7 ; Crampon « de la poussière du sol ») — CORRIGE l\'amorce t4'],
  [1712, 'GEN.2.7', 3, 'probable', 'Commente « forma… de sa propre main » : « Il n\'emploie pas… le ministère d\'un ange… mais il nous travaille de sa propre main en prenant du limon de la terre »'],
  [1716, 'GEN.2.7', 3, 'probable', 'Commente la distinction des verbes : « il fallait entendre du corps le mot forma et le mot fit de l\'âme »'],
  [1718, 'GEN.2.7', 3, 'probable', 'Commente : « lorsqu\'ensuite elle nous parle de la substance du corps et de sa construction, elle dit : Il forma »'],
  [1726, 'GEN.2.7', 1, 'probable', 'Reprend « Dieu prit, dit-elle, du limon de la terre, et forma l\'homme de ses propres mains »'],
  [1733, 'GEN.2.7', 1, 'probable', 'Reprend « Dieu prit du limon de la terre, et forma l\'homme »'],
  [1748, 'GEN.2.7', 1, 'probable', 'Reprend « Dieu forma l\'homme »'],
  [1749, 'GEN.2.7', 3, 'probable', 'Commente « forma » : « Le seul mot forma annonce un certain art dont use l\'Ouvrier suprême en créant l\'homme »'],
  // — Gn 3, 19 : « tu es poussière » (écho moral du limon) —
  [1742, 'GEN.3.19', 4, 'probable', 'Écho : « comme vous en êtes sorti, vous ne tarderez pas à y retourner » (Gn 3, 19 « tu es poussière, et tu retourneras à la terre »)'],

  // — Mt 5, 45 & 48 : « Soyez parfaits… il fait lever son soleil » (réf. éditeur « Matth. 5. 45 et 48 ») —
  [1695, 'MAT.5.48', 1, 'probable', 'Cite « Soyez parfaits comme votre Père céleste est parfait » (Mt 5, 48 ; réf. éditeur)'],
  [1695, 'MAT.5.45', 1, 'probable', 'Cite « il fait lever son soleil sur les bons et sur les méchants, il fait pleuvoir sur les justes et sur les injustes » (Mt 5, 45) — CORRIGE l\'amorce t4'],
  [1696, 'MAT.5.45', 3, 'probable', 'Commente : « Vous voyez par où et pourquoi le Seigneur veut que vous soyez semblables à lui : parce qu\'il fait lever son soleil… »'],

  // — Col 3, 12 « entrailles de tendresse et de bonté » (+ écho Rm 13, 14 « revêtir de Jésus-Christ ») —
  [1700, 'COL.3.12', 1, 'probable', 'Cite « Prenez donc des entrailles de tendresse et de bonté » (Col 3, 12 ; σπλάγχνα οἰκτιρμοῦ, χρηστότητα) — CORRIGE l\'amorce t4'],
  [1700, 'ROM.13.14', 4, 'probable', 'Écho paulinien « afin de vous revêtir de Jésus-Christ » (Rm 13, 14 « revêtez-vous du Seigneur Jésus-Christ »)'],

  // — Ps 118, 73 (grec) : « Vos mains m'ont fait et m'ont formé » (fit/forma) —
  [1719, 'PSA.118.73', 1, 'probable', 'Cite avec annonce « Le Psalmiste… Vos mains, dit-il, m\'ont fait et m\'ont formé » (Ps 118, 73 grec ; αἱ χεῖρές σου ἐποίησάν με καὶ ἔπλασάν με) — CORRIGE l\'amorce t4'],

  // — « le monde est un livre qui prêche la gloire de Dieu » : Ps 18, 2 + Rm 1, 20 (échos) —
  [1731, 'PSA.18.2', 4, 'probable', 'Écho : « tout ce monde entier est comme un livre écrit qui vous prêche la gloire de Dieu » (Ps 18, 2 « les cieux racontent la gloire de Dieu »)'],
  [1731, 'ROM.1.20', 4, 'probable', 'Écho : « il vous annonce cette grandeur cachée et invisible, à vous qui êtes doué d\'intelligence, pour vous faire connaître le Dieu de vérité » (Rm 1, 20)'],

  // — Qo 2, 14 : « les yeux du sage sont à sa tête » (citation attribuée « l'Ecclésiaste ») —
  [1768, 'ECC.2.14', 1, 'probable', 'Cite « les yeux du sage ont été placés dans sa tête, dit le sage Ecclésiaste » (Qo 2, 14) — CORRIGE l\'amorce ECC.1.14 (mauvais verset : 1,14 = « tout est vanité »)'],

  // — Doxologie finale : 1 P 4, 11 (écho) —
  [1796, '1PE.4.11', 4, 'probable', 'Doxologie finale : « à lui soient la gloire et l\'empire dans les siècles des siècles » (1 P 4, 11)'],
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

console.log(`Homélie X — ${L.length} liens de lecture proposés\n`)
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
