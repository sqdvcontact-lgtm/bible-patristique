import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const DEBUT = 1295
const FIN = 1353
const TOTAL_SEGMENTS = 59
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. CLXXVII, sous-passe A'
const EMPREINTE_ATTENDUE = '89e22c913dba317720b4083751ccc185c9ccb6b83d796bb64f2701b5e04b86d0'
const SANS_LIEN = new Set([1296])
const LIENS = []
const NON_RESOLUS = []

const add = (ns, canonId, type, motif) => {
  for (const n of ns) LIENS.push([n, canonId, type, motif])
}
const cite = (n, canonId, motif) => add([n], canonId, 1, motif)
const com = (ns, canonId, motif) => add(ns, canonId, 3, motif)
const nonBiblique = (n, motif) => NON_RESOLUS.push([n, 4, `RÉFÉRENCE NON BIBLIQUE ${motif}`])

// § 1 — objet et méthode de la description du tabernacle.
cite(1295, 'EXO.40.33', 'Référence intentionnelle vérifiée à l’achèvement et à l’érection du tabernacle à la fin de l’Exode.')

// § 2 — les dix rideaux de fin lin (Exode 26,1-6).
cite(1297, 'EXO.26.1', 'Référence intentionnelle vérifiée à l’ordre de faire dix rideaux de fin lin retors, avec couleurs et chérubins.')
com([1297, 1298], 'EXO.26.1', 'La nature des dix rideaux et le sens lexical de αὐλαίας/aulaea sont directement expliqués.')
cite(1298, 'EXO.26.2', 'Référence explicite vérifiée, avec note, aux dimensions identiques des dix rideaux.')
com([1298], 'EXO.26.2', 'Les vingt-huit coudées de hauteur et quatre de largeur des rideaux sont reprises et expliquées.')
nonBiblique(1298, '(interprètes non identifiés) : opinion de plusieurs interprètes ayant compris dix parvis au lieu de dix rideaux ; références à constituer.')
cite(1299, 'EXO.26.3', 'Référence explicite vérifiée, avec note, aux deux assemblages de cinq rideaux.')
com([1299], 'EXO.26.3', 'L’union des rideaux cinq par cinq est interprétée comme délimitant l’espace du tabernacle.')
cite(1300, 'EXO.26.4', 'Citation explicite vérifiée, avec note, des cordons d’hyacinthe placés aux bords des assemblages.')
com([1300, 1301, 1302], 'EXO.26.4', 'La disposition des attaches entre les rideaux successifs est directement expliquée.')
com([1300, 1303], 'EXO.26.5', 'La correspondance des cinquante cordons entre les bords opposés est directement expliquée.')
com([1303], 'EXO.26.6', 'Les cinquante anneaux d’or et leur fonction d’union avec les cordons sont directement expliqués.')
cite(1304, 'EXO.26.6', 'Citation explicite vérifiée, avec note, des cinquante anneaux d’or unissant les rideaux en un seul tabernacle.')
com([1304, 1305], 'EXO.26.6', 'L’enlacement des anneaux et des cordons pour former deux ensembles de cinq rideaux est expliqué matériellement.')

// § 3 — les onze tapis de poils (Exode 26,7-11).
cite(1306, 'EXO.26.7', 'Citation explicite vérifiée, avec note, de l’ordre de faire des tapis de poils pour couvrir le tabernacle.')
com([1306, 1307], 'EXO.26.7', 'La couverture de poils est expliquée comme enceinte et son nombre de onze est repris.')
cite(1307, 'EXO.26.7', 'Citation explicite vérifiée, avec note, du nombre de onze tapis.')
cite(1308, 'EXO.26.8', 'Citation explicite vérifiée, avec note, des dimensions identiques des onze tapis.')
com([1308], 'EXO.26.8', 'Les trente coudées de longueur et quatre de largeur des tapis sont directement reprises.')
cite(1308, 'EXO.26.9', 'Citation explicite vérifiée, avec note, des assemblages de cinq et six tapis.')
com([1308, 1309], 'EXO.26.9', 'L’assemblage cinq plus six et le repli du sixième tapis à l’entrée sont directement expliqués.')
cite(1309, 'EXO.26.9', 'Citation explicite vérifiée, avec note, du sixième tapis replié à l’entrée du tabernacle.')
cite(1310, 'EXO.26.10', 'Citation explicite vérifiée, avec note, des cinquante cordons placés aux bords des tapis.')
com([1310, 1311, 1312, 1313], 'EXO.26.10', 'La place des cordons sur les bords et leur fonction d’attache entre les tapis sont directement expliquées.')
cite(1311, 'EXO.26.10', 'Citation explicite vérifiée de la seconde série de cinquante cordons au bord du tapis correspondant.')
cite(1311, 'EXO.26.11', 'Citation explicite vérifiée, avec note, des cinquante anneaux d’airain unissant les tapis en un seul tout.')
com([1311, 1312], 'EXO.26.11', 'Le passage des cordons dans les anneaux d’airain et la différence avec les anneaux d’or sont directement expliqués.')
com([1313], 'EXO.26.4', 'La couleur d’hyacinthe prescrite pour les cordons des rideaux est comparée au silence sur la matière des cordons des tapis.')

// § 4 — surplus des tapis et couvertures (Exode 26,12-14).
cite(1314, 'EXO.26.12', 'Citation explicite vérifiée du demi-tapis en surplus couvrant le derrière du tabernacle ; la note imprimée « Ex. XXI,12 » est fautive.')
com([1314, 1319], 'EXO.26.12', 'Le demi-tapis en surplus et sa destination à l’arrière du tabernacle sont l’objet direct de la difficulté examinée.')
cite(1315, 'EXO.26.13', 'Citation explicite vérifiée, avec note, de la coudée excédentaire de chaque côté du tabernacle.')
com([1315, 1316, 1318, 1319], 'EXO.26.13', 'Les deux coudées excédentaires et leur relation difficile avec le demi-tapis sont analysées par le calcul.')
cite(1315, 'EXO.26.9', 'Référence intentionnelle vérifiée à l’ordre antérieur de relever le sixième tapis à l’entrée.')
com([1315], 'EXO.26.9', 'Le repli du sixième tapis est confronté à la mention ultérieure du demi-tapis en surplus.')
cite(1316, 'EXO.26.13', 'Citation explicite vérifiée de la coudée placée de chaque côté, confrontée à la longueur totale du tapis.')
com([1316, 1317, 1318], 'EXO.26.8', 'La longueur de trente coudées des tapis de poils fonde le calcul des excédents.')
cite(1317, 'EXO.26.2', 'Référence intentionnelle vérifiée aux vingt-huit coudées de longueur des rideaux de fin lin.')
cite(1317, 'EXO.26.8', 'Référence intentionnelle vérifiée aux trente coudées de longueur des tapis de poils.')
com([1317, 1318], 'EXO.26.2', 'Les vingt-huit coudées des rideaux sont comparées aux trente coudées des tapis pour calculer le surplus.')
cite(1318, 'EXO.26.13', 'Référence explicite vérifiée à la formule scripturaire d’une coudée de chaque côté.')
cite(1320, 'EXO.26.7', 'Citation explicite vérifiée, avec note, des tapis de poils destinés à couvrir le tabernacle.')
com([1320], 'EXO.26.7', 'L’étendue possible de la couverture de poils, tabernacle intérieur seul ou parvis compris, est directement discutée.')
com([1320], 'EXO.27.9', 'La prescription ultérieure du parvis entourant le tabernacle sert à poser la question de l’étendue de la couverture.')
cite(1321, 'EXO.26.14', 'Citation explicite vérifiée, avec note, de la couverture en peaux de moutons teintes en rouge.')
com([1321, 1322], 'EXO.26.14', 'L’étendue des deux couvertures de peaux et la fonction supérieure des peaux d’hyacinthe sont directement discutées.')

// § 5 — planches, tenons, côtés nord et sud (Exode 26,15-21).
cite(1323, 'EXO.26.15', 'Citation explicite vérifiée, avec note, des planches de bois incorruptible destinées au tabernacle.')
cite(1323, 'EXO.26.16', 'Citation explicite vérifiée, avec note, des dimensions de chaque planche.')
cite(1323, 'EXO.26.17', 'Citation explicite vérifiée, avec note, des deux tenons ou « coins » de chaque planche.')
com([1324, 1325], 'EXO.26.17', 'La fonction matérielle puis figurative des deux tenons de chaque planche est directement examinée.')
com([1324], 'EXO.26.26', 'Les cinq barres prévues pour chaque côté sont mobilisées pour écarter une interprétation matérielle des deux tenons.')
nonBiblique(1324, '(renvoi interne) : Question CIX du Livre deuxième de la présente œuvre, relative à la nature des tenons ; cible interne à constituer.')
com([1326], 'EXO.26.18', 'Le nombre des planches du côté méridional contribue à déterminer la forme allongée du tabernacle.')
com([1326], 'EXO.26.20', 'Le nombre égal des planches du côté septentrional contribue à déterminer la forme allongée du tabernacle.')
com([1326], 'EXO.26.22', 'Le nombre inférieur de planches du côté occidental est mobilisé pour déterminer la forme du tabernacle.')
com([1326], 'EXO.26.23', 'Les deux planches d’angle complètent le calcul de la largeur occidentale du tabernacle.')
cite(1327, 'EXO.26.18', 'Citation explicite vérifiée, avec note, des vingt planches du côté méridional.')
cite(1327, 'EXO.26.19', 'Citation explicite vérifiée des quarante bases d’argent placées deux par planche.')
cite(1328, 'EXO.26.20', 'Citation explicite vérifiée des vingt planches du côté septentrional.')
cite(1328, 'EXO.26.21', 'Citation explicite vérifiée des quarante bases d’argent du second côté.')
com([1328], 'EXO.26.21', 'La répétition des deux bases sous chaque planche est expliquée comme formule distributive.')
com([1329], 'EXO.26.19', 'Les deux bases de chaque planche sont interprétées selon l’explication antérieure des bases et chapiteaux.')
com([1329], 'EXO.26.21', 'La même interprétation est appliquée aux bases du côté septentrional.')
nonBiblique(1329, '(renvoi interne) : Question CX du Livre deuxième de la présente œuvre, sur les deux bases attribuées à chaque planche ; cible interne à constituer.')

// § 6 — fond occidental et angles (Exode 26,22-25), avec anticipation du parvis oriental.
com([1330], 'EXO.26.18', 'Les vingt planches méridionales sont reprises pour comparer les quatre côtés du tabernacle.')
com([1330], 'EXO.26.20', 'Les vingt planches septentrionales sont reprises pour comparer les quatre côtés du tabernacle.')
com([1330, 1331], 'EXO.26.22', 'Les six planches du fond occidental sont opposées au silence sur la face orientale.')
com([1331], 'EXO.26.23', 'Les planches d’angle complètent la réflexion sur la fermeture du côté occidental et l’ouverture orientale.')
com([1332], 'EXO.27.14', 'Les trois colonnes d’un côté de la porte orientale contribuent au total de dix colonnes du parvis annoncé par anticipation.')
com([1332], 'EXO.27.15', 'Les trois colonnes de l’autre côté de la porte orientale contribuent au total de dix colonnes du parvis annoncé par anticipation.')
com([1332], 'EXO.27.16', 'Les quatre colonnes de la porte complètent le total de dix colonnes du côté oriental du parvis.')
cite(1333, 'EXO.26.22', 'Citation explicite vérifiée, avec note, des six planches du fond occidental.')
cite(1333, 'EXO.26.23', 'Citation explicite vérifiée, avec note, des deux planches placées aux angles du fond.')
cite(1334, 'EXO.26.24', 'Citation explicite vérifiée, avec note, de la disposition identique des deux planches d’angle.')
cite(1334, 'EXO.26.25', 'Citation explicite vérifiée des huit planches et de leurs seize bases d’argent.')
com([1334, 1335, 1336], 'EXO.26.24', 'L’union et la verticalité des planches d’angle sont directement interprétées.')
com([1335], 'EXO.26.22', 'Les six planches intermédiaires du fond sont reprises dans la reconstruction du côté occidental.')
com([1335], 'EXO.26.23', 'Les deux planches d’angle sont reprises comme liaisons entre les côtés du tabernacle.')
com([1335], 'EXO.26.25', 'Le total de huit planches occidentales est directement expliqué comme six intermédiaires et deux angulaires.')

// § 7 — barres et anneaux (Exode 26,26-29).
cite(1337, 'EXO.26.26', 'Citation explicite vérifiée, avec note, des cinq barres du premier côté du tabernacle.')
cite(1337, 'EXO.26.27', 'Citation explicite vérifiée des cinq barres du second côté et des cinq barres du fond occidental.')
com([1338], 'EXO.26.26', 'Les cinq barres du premier côté sont expliquées comme maintenant les planches entre elles.')
com([1338], 'EXO.26.27', 'La présence de barres sur trois côtés seulement confirme l’absence de planches à l’orient du tabernacle intérieur.')
cite(1339, 'EXO.26.28', 'Citation explicite vérifiée, avec note, de la barre médiane allant d’une extrémité à l’autre.')
com([1339], 'EXO.26.28', 'Le parcours de la barre médiane d’une planche à l’autre est directement expliqué.')
cite(1340, 'EXO.26.29', 'Citation explicite vérifiée, avec note, des planches dorées, des anneaux et des barres dorées.')
com([1340, 1341], 'EXO.26.29', 'La fixation des anneaux et leur fonction de réception des extrémités des barres sont expliquées matériellement.')

// § 8 — voiles et mobilier intérieur (Exode 26,30-37), puis transition vers l’autel.
cite(1342, 'EXO.26.30', 'Citation explicite vérifiée, avec note, du modèle du tabernacle montré sur la montagne.')
cite(1342, 'EXO.26.31', 'Citation explicite vérifiée, avec note, du voile coloré et orné de chérubins.')
cite(1343, 'EXO.26.32', 'Citation explicite vérifiée, avec note, des quatre colonnes dorées portant le voile.')
cite(1343, 'EXO.26.33', 'Citation explicite vérifiée, avec note, du voile séparant le Saint du Saint des Saints et de l’arche placée au-dedans.')
cite(1344, 'EXO.26.34', 'Citation explicite vérifiée, avec note, du propitiatoire placé sur l’arche dans le Saint des Saints.')
com([1344], 'EXO.26.34', 'La relation entre le voile et le couvercle de l’arche est directement clarifiée.')
cite(1345, 'EXO.26.35', 'Citation explicite vérifiée, avec note, de la table au nord et du chandelier au midi, hors du voile.')
cite(1346, 'EXO.26.36', 'Citation explicite vérifiée, avec note, du voile brodé destiné à l’entrée du tabernacle.')
cite(1346, 'EXO.26.37', 'Citation explicite vérifiée, avec note, des cinq colonnes dorées et de leurs bases d’airain.')
com([1347], 'EXO.26.36', 'Le voile brodé est identifié comme fermeture de l’entrée du tabernacle intérieur.')
com([1347], 'EXO.26.37', 'Les cinq colonnes sont expliquées comme supports du voile de l’entrée intérieure.')
cite(1347, 'EXO.27.1', 'Référence intentionnelle vérifiée au début des prescriptions relatives à l’autel des holocaustes.')
for (let verset = 1; verset <= 8; verset++) {
  com([1348], `EXO.27.${verset}`, 'L’unité Exode 27,1-8 est caractérisée comme décrivant la construction de l’autel sans encore préciser son emplacement.')
}

// § 9 — début de la description du parvis (Exode 27,9-11).
com([1349], 'EXO.27.9', 'Le début d’Exode 27,9 est identifié comme l’ouverture des prescriptions relatives au parvis entourant le tabernacle.')
cite(1350, 'EXO.27.9', 'Citation explicite vérifiée de l’ordre de faire le parvis, distingué lexicalement des rideaux.')
com([1350, 1351, 1352], 'EXO.27.9', 'Le terme grec αὐλήν désignant le parvis est distingué de αὐλαίας, les rideaux du tabernacle.')
cite(1350, 'EXO.26.1', 'Citation explicite vérifiée de la leçon fautive « dix parvis » donnée par certaines versions pour les dix rideaux d’Exode 26,1 ; la note imprimée « XXVII,1 » est fautive.')
com([1350, 1351], 'EXO.26.1', 'Les traductions fautives par « parvis » ou « portes » sont corrigées lexicalement en « dix rideaux ».')
nonBiblique(1350, '(traducteurs non identifiés) : versions confondant αὐλήν, parvis, et αὐλαίας, rideaux ; références à constituer.')
nonBiblique(1351, '(traducteurs non identifiés) : versions rendant αὐλάς et αὐλαίας par « portes », puis discussion des équivalents grecs et latins ; références à constituer.')
cite(1352, 'EXO.27.9', 'Citation explicite vérifiée, avec note, des rideaux de fin lin du côté méridional du parvis sur cent coudées.')
cite(1353, 'EXO.27.10', 'Citation explicite vérifiée, avec note, des vingt colonnes et vingt bases d’airain du côté méridional.')
cite(1353, 'EXO.27.11', 'Citation explicite vérifiée, avec note, des rideaux, colonnes et bases du côté septentrional.')

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: bruts, error: e0 } = await sb
  .from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', DEBUT - 1)
  .lte('segment_numero', FIN + 1)
  .order('segment_numero')
if (e0) throw e0

const voisinAvant = bruts.find(segment => segment.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(segment => segment.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== 'Livre deuxième' || voisinAvant?.ref_niv2 !== 'Question CLXXVI') {
  throw Error('Raccord amont invalide')
}
if (voisinApres?.ref_niv1 !== 'Livre deuxième' || voisinApres?.ref_niv2 !== 'Question CLXXVII') {
  throw Error('Raccord aval invalide')
}

const segments = bruts.filter(segment => segment.segment_numero >= DEBUT && segment.segment_numero <= FIN)
if (
  segments.length !== TOTAL_SEGMENTS
  || segments.some((segment, index) => segment.segment_numero !== DEBUT + index)
  || segments.some(segment => segment.ref_niv1 !== 'Livre deuxième' || segment.ref_niv2 !== 'Question CLXXVII')
) {
  throw Error('Préétat structurel invalide')
}
if (segments.some(segment => segment.liens_revus_le || segment.liens_revus_par)) throw Error('Lot déjà relu')

const empreinte = createHash('sha256')
  .update(JSON.stringify(segments.map(segment => [
    segment.id,
    segment.segment_numero,
    segment.ref_niv1,
    segment.ref_niv2,
    segment.ref_niv2_texte,
    segment.segment_texte,
    segment.texte_original,
    segment.notes,
    segment.nature,
  ])))
  .digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)

const parNumero = new Map(segments.map(segment => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(lien => lien[0]))
const nonClasses = segments.filter(segment => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(segment => segment.segment_numero).join(', ')}`)
if (LIENS.some(([numero, canonId, type, motif]) => !parNumero.has(numero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) {
  throw Error('Lien biblique invalide dans le manifeste')
}
if (NON_RESOLUS.some(([numero, type, motif]) => !parNumero.has(numero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) {
  throw Error('Référence non biblique invalide dans le manifeste')
}
const cles = LIENS.map(([numero, canonId, type]) => `${numero}|${canonId}|${type}`)
const vues = new Set()
const doublons = cles.filter(cle => vues.has(cle) || !vues.add(cle))
if (doublons.length) throw Error(`Doublons dans le manifeste : ${doublons.join(', ')}`)

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: versets, error: e1 } = await sb
  .from('versets_lecture')
  .select('id_verset,TR0001,TR0003,TR0004')
  .in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(verset => [verset.id_verset, verset]))
const absentes = cibles.filter(cible => !parCible.has(cible))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
if (cibles.some(cible => {
  const verset = parCible.get(cible)
  return !verset.TR0001 && !verset.TR0003 && !verset.TR0004
})) throw Error('Cible sans aucun des trois témoins locaux')

const ids = segments.map(segment => segment.id)
const { count: liensExistants, error: e2 } = await sb
  .from('liens_bibliques')
  .select('id', { count: 'exact', head: true })
  .in('segment_id', ids)
if (e2) throw e2
if (liensExistants) throw Error(`${liensExistants} liens préexistants dans le lot`)

const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((acc, lien) => {
  acc[lien[2]] = (acc[lien[2]] || 0) + 1
  return acc
}, {})
if (NON_RESOLUS.length) types[4] = (types[4] || 0) + NON_RESOLUS.length

console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  lot: 'Exode CLXXVII — sous-passe A',
  bornes: [DEBUT, FIN],
  raccord_lu: [1290, 1358],
  voisins: {
    avant: [voisinAvant.segment_numero, voisinAvant.ref_niv2],
    apres: [voisinApres.segment_numero, voisinApres.ref_niv2],
  },
  ref_niv1: 'Livre deuxième',
  ref_niv2: 'Question CLXXVII',
  segments: TOTAL_SEGMENTS,
  liens: total,
  liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length,
  sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length,
  types,
  empreinte,
  avancement_actuel: '1271 / 3262 = 38,96 %',
  avancement_apres_ecriture_ulterieure: '1330 / 3262 = 40,77 %',
}, null, 2))

if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) {
    console.log({
      numero,
      canonId,
      type,
      motif,
      segment: parNumero.get(numero).segment_texte,
      TR0001: parCible.get(canonId).TR0001,
      TR0003: parCible.get(canonId).TR0003,
      TR0004: parCible.get(canonId).TR0004,
    })
  }
  for (const [numero, type, motif] of NON_RESOLUS) {
    console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
  }
}

if (!WRITE) process.exit(0)

const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([numero, canonId, type, motif]) => `(${parNumero.get(numero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([numero, type, motif]) => `(${parNumero.get(numero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idsSql = ids.join(', ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = 'Livre deuxième' and ref_niv2 = 'Question CLXXVII' and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idsSql});
  get diagnostics n = row_count; if n <> ${TOTAL_SEGMENTS} then raise exception 'Segments %/${TOTAL_SEGMENTS}', n; end if;
end $passe$;`

const { error: ecritureErreur } = await sb.rpc('exec_sql', { sql })
if (ecritureErreur) throw ecritureErreur

const [
  { count: liensApres, error: e3 },
  { count: relusApres, error: e4 },
  { data: audit, error: e5 },
] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e3 || e4 || e5) throw (e3 || e4 || e5)
if (
  liensApres !== total
  || relusApres !== TOTAL_SEGMENTS
  || audit.some(lien => !lien.motif || lien.provenance !== 'lecture' || (
    lien.canon_id
      ? lien.fiabilite !== 'vérifié' || lien.arbitrage_requis
      : lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')
  ))
) throw Error('Postcontrôle invalide')

console.log(`✓ ${liensApres} liens, ${relusApres} segments`)
