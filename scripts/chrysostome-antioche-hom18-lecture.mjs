// Lecture intégrale de l’Homélie XVIII au peuple d’Antioche (A0014O0038,
// segments 1835-1925). Les références [[322]] à [[341]] sont contrôlées sur
// le fac-similé de 1671 ; neuf références perdues sont restaurées en notes.
//
//   node scripts/chrysostome-antioche-hom18-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom18-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// Règle appliquée : la mécanique ne peut produire que du type 1, une
// proposition de type 2 douteuse ou une cible « à constituer ». Tous les
// types 2, 3 et 4 ci-dessous proviennent de la lecture intégrale de l’homélie.

const plage = (debut, fin, canon, motif) => Array.from(
  { length: fin - debut + 1 }, (_, i) => [debut + i, canon, 3, motif],
)

// [segment_numero, canon_id, type, motif]
const VERSETS = [
  [1842, 'PHP.4.4', 1, 'citation directe : se réjouir toujours dans le Seigneur ; note [[322]]'],
  [1860, 'PHP.4.4', 1, 'reprise directe de l’injonction à se réjouir toujours dans le Seigneur ; note [[323]]'],
  [1864, 'DAN.3.50', 2, 'reprise narrative des trois jeunes gens préservés des flammes dans la fournaise ; référence restaurée'],
  [1864, 'DAN.3.94', 2, 'reprise narrative des trois jeunes gens sortant de la fournaise sans avoir été atteints ; référence restaurée'],
  [1869, 'JOB.1.21', 1, 'citation directe de Job : Dieu a donné et repris, que le nom du Seigneur soit béni ; note marginale « Job. 1 » absorbée par l’OCR'],
  [1871, 'ACT.5.41', 1, 'citation directe des Apôtres se réjouissant d’avoir été jugés dignes de souffrir pour le Christ ; note [[324]]'],
  [1873, 'MAT.5.11', 1, 'citation directe des injures et calomnies souffertes à cause du Christ ; note [[325]]'],
  [1873, 'MAT.5.12', 1, 'suite directe : se réjouir parce que la récompense sera grande dans le ciel ; note [[325]]'],
  [1873, 'SIR.2.4', 1, 'citation de l’exhortation à espérer en Dieu dans la pauvreté et la maladie ; note [[326]] imprimée « Eccl. 22 »'],
  [1874, 'SIR.2.5', 1, 'citation de l’or éprouvé au feu et de l’homme éprouvé dans la fournaise de l’humiliation ; note [[326]] imprimée « Eccl. 22 »'],
  [1875, '1PE.1.6', 2, 'reprise de la joie du juste au milieu des pertes, maladies, ignominies et injures ; note [[327]]'],
  [1875, '1PE.1.7', 2, 'reprise du juste éprouvé par les épreuves, dans la continuité de l’image de l’or au feu ; note [[327]]'],
  [1876, 'ROM.9.2', 1, 'citation directe de la grande tristesse et de la douleur continuelle de Paul ; note [[328]], corrigée de « Rom. 7 » en « Rom. 9 » d’après le fac-similé'],
  [1881, 'ISA.22.4', 1, 'citation directe du prophète demandant qu’on le laisse pleurer amèrement ; référence absente de l’appareil français et restaurée'],
  [1882, '2CO.7.10', 1, 'citation directe de la tristesse selon Dieu qui produit une pénitence stable pour le salut ; note [[329]] complétée en « 2. Cor. 7 »'],
  [1886, 'EZK.9.4', 2, 'reprise narrative du signe tracé sur le front de ceux qui gémissent des abominations de Jérusalem ; note [[330]]'],
  [1888, 'AMO.6.6', 2, 'reprise du reproche adressé à ceux qui ne s’affligent pas du malheur de Joseph ; référence marginale imprimée fautivement « Amos 16 » et perdue par l’import'],
  [1888, 'MIC.1.11', 1, 'citation directe de l’habitante de Saphir qui ne sort pas pleurer la maison voisine ; note [[331]]'],
  [1889, 'EZK.18.32', 1, 'citation directe : Dieu ne veut pas la mort du pécheur ; référence restaurée'],
  [1893, 'PSA.1.1', 1, 'citation directe de l’homme heureux qui ne se trouve pas au conseil des impies ; note [[332]]'],
  [1893, 'PSA.93.12', 1, 'citation directe de l’homme heureux que le Seigneur enseigne dans sa loi ; note [[333]]'],
  [1894, 'PSA.118.1', 1, 'citation directe de ceux dont la voie est sans souillure ; note [[334]]'],
  [1894, 'PSA.2.12', 1, 'citation directe de celui qui met sa confiance dans le Seigneur ; note [[335]]'],
  [1894, 'PSA.145.5', 1, 'citation directe de celui dont le Seigneur est le secours ; note [[336]]'],
  [1894, 'SIR.14.2', 4, 'écho attesté par le témoin grec parallèle dans la chaîne des béatitudes, mais rendu librement « selon le cœur de Dieu » en français ; référence restaurée'],
  [1894, 'PSA.111.1', 1, 'citation directe de l’homme heureux qui craint le Seigneur ; note [[337]]'],
  [1895, 'MAT.5.3', 1, 'citation condensée de la béatitude des pauvres en esprit, rendus ici par « les humbles » ; note [[338]]'],
  [1895, 'MAT.5.5', 1, 'citation condensée de la béatitude de ceux qui pleurent, rendus ici par « les affligés » ; note [[338]]'],
  [1895, 'MAT.5.9', 1, 'citation condensée de la béatitude des pacifiques ; note [[338]]'],
  [1895, 'MAT.5.10', 1, 'citation condensée de ceux qui souffrent persécution pour la justice ; note [[338]]'],
  [1900, '2CO.11.25', 2, 'reprise du naufrage parmi les innombrables souffrances de Paul ; référence restaurée'],
  [1900, '2CO.11.26', 2, 'reprise des persécutions et des dangers des brigands endurés par Paul ; référence restaurée'],
  [1901, '1CO.15.31', 2, 'reprise de Paul mourant chaque jour sans mourir ; référence restaurée'],
  [1901, 'COL.1.24', 1, 'citation directe de Paul se réjouissant dans ses souffrances et complétant en son corps celles du Christ ; note [[339]]'],
  [1901, 'ROM.5.3', 1, 'citation directe de Paul mettant sa gloire dans les tribulations ; note [[340]] imprimée fautivement « Rom. 1 »'],
  [1922, 'MAT.12.43', 1, 'citation directe de l’esprit immonde sorti de l’homme ; référence marginale « Matt. 12 » absorbée par l’OCR'],
  [1922, 'MAT.12.44', 1, 'suite directe de la maison trouvée vide et balayée ; référence marginale « Matt. 12 » restaurée'],
  [1922, 'MAT.12.45', 1, 'suite directe des sept esprits plus méchants et de la fin pire que le commencement ; référence marginale « Matt. 12 » restaurée'],
  [1922, 'LUK.11.24', 1, 'parallèle éditorial direct de l’esprit immonde sorti de l’homme ; note [[341]]'],
  [1922, 'LUK.11.25', 1, 'parallèle éditorial direct de la maison balayée ; note [[341]]'],
  [1922, 'LUK.11.26', 1, 'parallèle éditorial direct des sept esprits plus méchants et de la fin pire que le commencement ; note [[341]]'],
  [1924, 'PHP.4.4', 2, 'reprise conclusive du précepte de Paul prescrivant une joie continuelle'],
]

const COMMENTAIRES = [
  ...plage(1842, 1863, 'PHP.4.4', 'commentaire suivi de l’injonction à se réjouir toujours dans le Seigneur, opposée aux joies fragiles des richesses, de la santé et du pouvoir'),
  ...plage(1863, 1864, 'DAN.3.50', 'application de la préservation des trois jeunes gens à la joie que les épreuves ne peuvent éteindre'),
  ...plage(1863, 1864, 'DAN.3.94', 'application de la sortie indemne de la fournaise à la tranquillité du juste au milieu de l’orage'),
  ...plage(1865, 1876, 'PHP.4.4', 'démonstration que la vie juste rend possible la joie continuelle commandée par Paul'),
  ...plage(1867, 1870, 'JOB.1.21', 'commentaire de la constance de Job devant la mort de ses enfants et la perte de ses biens'),
  ...plage(1870, 1872, 'ACT.5.41', 'commentaire de la joie apostolique au milieu des supplices et des outrages'),
  ...plage(1872, 1873, 'MAT.5.11', 'application de la béatitude des calomniés à l’impossibilité d’outrager le juste'),
  ...plage(1872, 1873, 'MAT.5.12', 'application de la récompense céleste à la joie du juste dans les injures'),
  ...plage(1873, 1875, 'SIR.2.4', 'commentaire de l’espérance en Dieu pendant la maladie et la pauvreté'),
  ...plage(1873, 1875, 'SIR.2.5', 'commentaire de l’épreuve du juste comparée à l’or dans la fournaise'),
  ...plage(1874, 1875, '1PE.1.7', 'rapprochement entre les épreuves du juste et l’or éprouvé au feu'),
  ...plage(1876, 1879, 'ROM.9.2', 'commentaire de la tristesse méritoire de Paul causée par les fautes et l’incrédulité des hommes'),
  ...plage(1880, 1882, 'ISA.22.4', 'application du libre cours donné aux larmes du prophète au soulagement produit par une juste tristesse'),
  ...plage(1882, 1884, '2CO.7.10', 'explication de la tristesse selon Dieu qui efface les fautes et conduit au salut'),
  ...plage(1885, 1887, 'EZK.9.4', 'commentaire du signe protecteur accordé à ceux qui gémissent des abominations de leurs frères'),
  [1888, 'AMO.6.6', 3, 'application du reproche d’Amos à l’obligation de compatir au malheur d’autrui'],
  ...plage(1888, 1890, 'MIC.1.11', 'commentaire du reproche adressé à celle qui ne sort pas pleurer la ruine de la maison voisine'),
  ...plage(1889, 1890, 'EZK.18.32', 'application du refus divin de la mort du pécheur à la compassion due même aux coupables justement punis'),
  ...plage(1891, 1893, 'PSA.1.1', 'commentaire de l’Écriture qui réserve le bonheur à ceux qui marchent dans les voies du Seigneur'),
  ...plage(1892, 1894, 'PSA.93.12', 'intégration du bonheur de l’homme instruit par Dieu dans la chaîne des vraies béatitudes'),
  ...plage(1892, 1895, 'PSA.118.1', 'application de la béatitude des voies sans souillure au bonheur fondé sur la vertu'),
  ...plage(1894, 1895, 'PSA.2.12', 'application de la confiance dans le Seigneur au bonheur fondé sur la seule vertu'),
  ...plage(1894, 1895, 'PSA.145.5', 'application du secours du Seigneur au bonheur fondé sur la seule vertu'),
  ...plage(1894, 1895, 'PSA.111.1', 'application de la crainte du Seigneur au bonheur fondé sur la seule vertu'),
  ...plage(1895, 1896, 'MAT.5.3', 'commentaire de la béatitude des humbles comme réfutation du bonheur mondain'),
  ...plage(1895, 1896, 'MAT.5.5', 'commentaire de la béatitude des affligés comme réfutation du bonheur mondain'),
  ...plage(1895, 1896, 'MAT.5.9', 'commentaire de la béatitude des pacifiques comme réfutation du bonheur mondain'),
  ...plage(1895, 1896, 'MAT.5.10', 'commentaire de la béatitude des persécutés comme réfutation du bonheur mondain'),
  ...plage(1891, 1911, 'PHP.4.4', 'application prolongée de la joie dans le Seigneur à la vertu, aux souffrances de Paul et au courage des solitaires d’Antioche'),
  ...plage(1900, 1901, '2CO.11.25', 'commentaire des souffrances de Paul comme preuve que les épreuves n’abolissent pas la joie'),
  ...plage(1900, 1901, '2CO.11.26', 'commentaire des dangers de Paul comme preuve que les épreuves n’abolissent pas la joie'),
  ...plage(1900, 1901, '1CO.15.31', 'commentaire des morts quotidiennes de Paul comme source paradoxale de joie'),
  ...plage(1900, 1904, 'COL.1.24', 'application de la joie de Paul dans ses souffrances au solide contentement du chrétien'),
  ...plage(1901, 1904, 'ROM.5.3', 'application de la gloire trouvée dans les tribulations au bonheur fondé sur la justice'),
  ...plage(1921, 1923, 'MAT.12.45', 'application du retour de sept esprits plus méchants au risque d’une rechute d’Antioche après la délivrance'),
  ...plage(1921, 1923, 'LUK.11.26', 'application parallèle du retour de l’esprit immonde au risque d’une fin pire que le commencement'),
  [1924, 'PHP.4.4', 3, 'conclusion pratique de toute l’homélie par le précepte d’une joie continuelle'],
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1835).lte('segment_numero', 1925).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 91) throw new Error(`91 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))

const cibles = [...new Set([...VERSETS, ...COMMENTAIRES].map((l) => l[1]))]
const { data: versets, error: erreurVersets } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles)
if (erreurVersets) throw erreurVersets
const presentes = new Set((versets ?? []).map((v) => v.id_verset))
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const rows = [...VERSETS, ...COMMENTAIRES].map(([numero, canon_id, type, motif]) => ({
  segment_id: parNumero.get(numero)?.id, canon_id, livre: null, chapitre: null,
  type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
}))
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')
const cleLien = (l) => `${l.segment_id}|${l.canon_id}|${l.type}|${l.motif}`
if (new Set(rows.map(cleLien)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie XVIII : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 91 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of [
    ...Array.from({ length: 20 }, (_, i) => String(322 + i)),
    'H18D', 'H18J', 'H18I', 'H18A', 'H18E', 'H18S', 'H18C1', 'H18C2', 'H18M',
  ]) segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
}
const corriger = (numero, avant, apres) => {
  const segment = parNumero.get(numero)
  if (!segment.segment_texte_corrige.includes(avant)) {
    if (segment.segment_texte_corrige.includes(apres)) return
    throw new Error(`Correction introuvable au segment ${numero} : ${avant}`)
  }
  segment.segment_texte_corrige = segment.segment_texte_corrige.replace(avant, apres)
}
const appeler = (marqueur, numero, ancre) => corriger(numero, ancre, `${ancre}[[${marqueur}]]`)

// Nettoyage des seules références marginales absorbées par l’OCR.
corriger(1842, 'nous ap prend aujourd’huy', 'nous apprend aujourd’huy')
corriger(1869, 'il n’est Tob. r rien arrivé', 'il n’est rien arrivé')
corriger(1921, 'au demon de Matta. l’Evangile', 'au demon de l’Evangile')

appeler('322', 1842, 'réjoüissez vous toûjours au Seigneur')
appeler('323', 1860, 'Réjoüissez-vous toûjours aux Seigneur')
appeler('H18D', 1864, 'sans être offensez')
appeler('H18J', 1869, 'le Nom du Seigneur soit beny à jamais')
appeler('324', 1871, 'souffrir pour Jesus-Christ')
appeler('325', 1873, 'vôtre recompense sera grande dans le Ciel')
appeler('326', 1874, 'dans la fournaise d’humiliation')
appeler('327', 1875, 'augmentent plûtost, qu’elles ne diminüent la joye du Juste')
appeler('328', 1876, 'son cœur est serré d’une douleur continüelle')
appeler('H18I', 1881, 'qu’on ne s’oppose point à sa douleur')
appeler('329', 1882, 'opere une penitence stable au salut')
appeler('330', 1886, 'sur le front de ceux qui auront pleuré & gemy sur les abominations de leurs freres')
appeler('H18A', 1888, 'sans être touchez de leurs miseres')
appeler('331', 1888, 'pleurer la ruïne de la maison de son voisin')
appeler('H18E', 1889, 'il ne veut point la mort du Pecheur')
corriger(1893, 'dans Je conseil des Impies', 'dans le conseil des Impies')
appeler('332', 1893, 'dans le conseil des Impies')
corriger(1893, 'appris vôtre sainte.', 'appris vôtre sainte')
appeler('333', 1893, 'appris vôtre sainte')
appeler('334', 1894, 'dont la vie n’est point soüillée')
appeler('335', 1894, 'qui se confie au Seigneur')
corriger(1894, 'dont le. Seigneur est le secours', 'dont le Seigneur est le secours')
appeler('336', 1894, 'dont le Seigneur est le secours')
appeler('H18S', 1894, 'qui est selon le cœur de Dieu')
appeler('337', 1894, 'qui craint le Seigneur')
appeler('338', 1895, 'ceux qui souffrent persecution pour la justice')
appeler('H18C1', 1900, 'la violence des brigands')
appeler('H18C2', 1901, 'aprés avoir tous les jours souffert mille morts, mais sans mourir')
appeler('339', 1901, 'mon corps supplée au défaut des souffrances de Jesus-Christ')
appeler('340', 1901, 'Je fais gloire de mes maux')
appeler('H18M', 1922, 'la fin devient pire que le commencement')
appeler('341', 1922, 'la fin devient pire que le commencement[[H18M]]')

const notesAttendues = new Map([
  [1842, '[[322]] Philip. 4.'],
  [1860, '[[323]] Philip. 4.'],
  [1864, '[[H18D]] Dan. 3.'],
  [1869, '[[H18J]] Job. 1.'],
  [1871, '[[324]] Act. 5.'],
  [1873, '[[325]] Matt. 5.'],
  [1874, '[[326]] Eccl. 22.'],
  [1875, '[[327]] 1. Petr. 1.'],
  [1876, '[[328]] Rom. 9.'],
  [1881, '[[H18I]] Esaie 22.'],
  [1882, '[[329]] 2. Cor. 7.'],
  [1886, '[[330]] Ezech. 9.'],
  [1888, '[[H18A]] Amos 16.\n[[331]] Mich. 1.'],
  [1889, '[[H18E]] Ezech. 18.'],
  [1893, '[[332]] Psal. 1.\n[[333]] Psal. 93.'],
  [1894, '[[334]] Ibid. 118.\n[[335]] Ibid. 2.\n[[336]] Ibid. 145.\n[[H18S]] Eccl. 14.\n[[337]] Psal. 111.'],
  [1895, '[[338]] Matt. 5.'],
  [1900, '[[H18C1]] 2. Cor. 11.'],
  [1901, '[[H18C2]] 1. Cor. 15.\n[[339]] Coloss. 1.\n[[340]] Rom. 1.'],
  [1922, '[[H18M]] Matt. 12.\n[[341]] Luc 11.'],
])

const appels = segments.flatMap((s) => [...s.segment_texte_corrige.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = [...notesAttendues.values()].flatMap((n) => [...n.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 29 || definitions.length !== 29 || new Set(appels).size !== 29
  || appels.some((m) => !definitions.includes(m)) || definitions.some((m) => !appels.includes(m)))
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)

if (!WRITE) {
  console.log('29 appels/29 définitions de notes reconstruits (--dry : rien écrit)')
  process.exit(0)
}

for (const segment of segments) {
  const notes = notesAttendues.get(segment.segment_numero) ?? null
  if (segment.segment_texte_corrige !== segment.segment_texte || notes !== segment.notes) {
    const { error } = await sb.from('segments').update({ segment_texte: segment.segment_texte_corrige, notes }).eq('id', segment.id)
    if (error) throw error
  }
}
for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XVIII',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
