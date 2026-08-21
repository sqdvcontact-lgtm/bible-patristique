import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const PREMIER = 1413
const DERNIER = 1471
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. CLXXVII, sous-passe C'
const EMPREINTE_ATTENDUE = '9b8273994fd21c42eebbaa52e689320906f4029cd8a58823acebd4d4f30d87a8'
const LIENS = []
const SANS_LIEN = new Set()
const NON_RESOLUS = []
const CORRECTIONS_TEXTE = new Map([
  [1421, [
    'ce n est pas assez de quarante coudées',
    'ce n’est pas assez de quarante coudées',
  ]],
])
const add = (ns, canon, type, motif) => { for (const n of ns) LIENS.push([n, canon, type, motif]) }
const cite = (n, canon, motif) => add([n], canon, 1, motif)
const com = (ns, canon, motif) => add(ns, canon, 3, motif)
const rapproche = (ns, canon, motif) => add(ns, canon, 4, motif)

// § 15-16 — distribution du surplus des tapis et dimensions comparées.
com([1413, 1414, 1416], 'EXO.26.2', 'Les vingt-huit coudées de chaque rideau servent de terme à la comparaison numérique.')
com([1413, 1414, 1416], 'EXO.26.8', 'Les trente coudées de chaque tapis expliquent l’excédent de deux coudées discuté.')
com([1413, 1414, 1416, 1417, 1419, 1421], 'EXO.26.13', 'Le surplus d’une coudée de part et d’autre sur les côtés du tabernacle est directement expliqué.')
com([1415, 1416], 'EXO.26.1', 'Les dix rideaux intérieurs fournissent la série de deux cent quatre-vingts coudées calculée.')
com([1415], 'EXO.26.2', 'La longueur de vingt-huit coudées des dix rideaux fonde le calcul total.')
com([1417, 1418, 1419, 1420, 1421], 'EXO.27.9', 'Le côté méridional du parvis, long de cent coudées, intervient dans la reconstruction.')
com([1417, 1418, 1419, 1420, 1421], 'EXO.27.11', 'Le côté septentrional du parvis, également long de cent coudées, intervient dans la reconstruction.')
com([1418, 1421], 'EXO.27.12', 'Les cinquante coudées du côté occidental complètent le périmètre du parvis.')
com([1418, 1421], 'EXO.27.13', 'Les cinquante coudées du côté oriental complètent le périmètre du parvis.')
com([1419, 1420, 1421], 'EXO.26.18', 'Les vingt planches du côté méridional sont rapprochées des vingt colonnes du parvis.')
com([1419, 1420, 1421], 'EXO.26.20', 'Les vingt planches du côté septentrional sont rapprochées des vingt colonnes du parvis.')
com([1421], 'EXO.27.14', 'Les quinze coudées d’un côté de la porte occidentale entrent dans le calcul des côtés courts.')
com([1421], 'EXO.27.15', 'Les quinze coudées de l’autre côté de la porte occidentale entrent dans le même calcul.')
com([1421], 'EXO.27.16', 'La porte de vingt coudées complète les cinquante coudées du côté occidental reconstruit.')
com([1422], 'EXO.26.9', 'Le sixième tapis replié sur le devant explique une partie des trente coudées soustraites.')
com([1422], 'EXO.26.12', 'La demi-tenture retombant au derrière explique l’autre partie de la soustraction.')

// § 17 — sens de πλάγια et côtés obliques du parvis occidental.
com([1423, 1424, 1425, 1429, 1430, 1433, 1434, 1435, 1436], 'EXO.26.13', 'Le terme grec πλάγια et la couverture du surplus sur les côtés sont l’objet direct de l’analyse.')
com([1426, 1427, 1429, 1432, 1433, 1434, 1435], 'EXO.27.14', 'Les quinze coudées et trois colonnes du premier côté de la porte déterminent le côté oblique.')
com([1426, 1427, 1429, 1432, 1433, 1434, 1435], 'EXO.27.15', 'Les quinze coudées et trois colonnes du second côté déterminent l’autre côté oblique.')
com([1426, 1427, 1431, 1432], 'EXO.27.16', 'La porte de vingt coudées et ses quatre colonnes fixent l’écartement occidental du parvis.')
com([1428], 'EXO.27.1', 'L’autel des holocaustes est situé dans l’espace entre la porte du parvis et le tabernacle.')
com([1428], 'EXO.30.18', 'Le bassin d’airain placé entre le tabernacle et l’autel est explicitement évoqué.')
com([1428], 'EXO.30.19', 'L’usage du bassin pour laver les mains et les pieds des prêtres est rappelé.')
com([1430, 1431, 1432, 1433, 1435], 'EXO.26.22', 'Les six planches du fond occidental participent à la largeur postérieure reconstruite.')
com([1430, 1431, 1432, 1433, 1435], 'EXO.26.23', 'Les deux planches d’angle complètent les huit appuis du fond occidental.')
com([1431, 1432], 'EXO.26.25', 'Le total de huit planches du fond explique les quarante coudées attribuées à cette ligne.')
com([1431, 1432, 1433, 1435], 'EXO.26.36', 'Le voile de l’entrée du tabernacle fournit la limite intérieure opposée à la porte du parvis.')
com([1431, 1432], 'EXO.26.37', 'Les cinq colonnes de l’entrée du tabernacle sous-tendent le calcul de trente coudées intermédiaires.')

// § 18-20 — récapitulation du parvis, de l’intérieur et du mobilier.
com([1437], 'EXO.26.1', 'La récapitulation reprend l’établissement du tabernacle à partir de ses dix rideaux.')
com([1437], 'EXO.27.9', 'La récapitulation inclut l’établissement du parvis autour du tabernacle.')
com([1438, 1439, 1440, 1441], 'EXO.27.14', 'Le premier côté de quinze coudées et trois colonnes est décrit dans le parcours depuis la porte.')
com([1438, 1439, 1440, 1441], 'EXO.27.15', 'Le second côté de quinze coudées et trois colonnes est décrit symétriquement.')
com([1438, 1439, 1440], 'EXO.27.16', 'La porte du parvis, large de vingt coudées et portée par quatre colonnes, est directement décrite.')
com([1441], 'EXO.27.1', 'L’autel carré de cinq coudées sur cinq est situé dans le parvis.')
com([1442], 'EXO.27.1', 'L’autel des sacrifices constitue le premier repère du cheminement dans le parvis.')
com([1442], 'EXO.30.18', 'La cuve d’airain entre l’autel et le tabernacle est directement localisée.')
com([1442], 'EXO.30.19', 'Le lavage des mains et des pieds d’Aaron et de ses fils est directement rappelé.')
com([1442], 'EXO.30.20', 'Le lavage avant l’entrée dans le tabernacle ou le service de l’autel est expliqué.')
com([1443], 'EXO.27.14', 'Les tentures de quinze coudées du premier côté de la porte sont récapitulées.')
com([1443], 'EXO.27.15', 'Les tentures de quinze coudées du second côté de la porte sont récapitulées.')
com([1443], 'EXO.27.18', 'La hauteur de cinq coudées des tentures de fin lin est directement rappelée.')
com([1444], 'EXO.26.1', 'Les dix rideaux qui enveloppent le tabernacle intérieur sont récapitulés.')
com([1444], 'EXO.26.3', 'L’assemblage des rideaux cinq par cinq correspond à la disposition décrite.')
com([1444, 1445], 'EXO.26.36', 'Le voile mobile de l’entrée, aux quatre couleurs, est directement décrit.')
com([1445], 'EXO.26.37', 'Les cinq colonnes portant le voile d’entrée sont rappelées.')
com([1446], 'EXO.26.31', 'Le voile intérieur aux quatre couleurs est distingué du voile d’entrée.')
com([1446], 'EXO.26.32', 'Les quatre colonnes portant le voile intérieur sont directement évoquées.')
com([1446], 'EXO.26.33', 'La séparation entre le Saint et le Saint des saints est directement décrite.')
com([1447], 'EXO.26.35', 'La table au nord et le chandelier au midi, en face l’un de l’autre, sont directement localisés.')
com([1448], 'EXO.26.33', 'Le voile séparant le Saint du Saint des saints fixe l’espace intérieur décrit.')
com([1448], 'EXO.26.34', 'L’arche et le propitiatoire dans le Saint des saints sont directement rappelés.')
com([1448], 'EXO.25.16', 'Les tables du Témoignage déposées dans l’arche correspondent au contenu mentionné.')
rapproche([1448], 'HEB.9.4', 'Le vase d’or contenant la manne, la verge d’Aaron et les tables de l’alliance sont réunis dans cette description du contenu de l’arche.')
com([1449], 'EXO.25.17', 'Le propitiatoire d’or placé au-dessus de l’arche est directement décrit.')
com([1449], 'EXO.25.18', 'Les deux chérubins d’or placés aux extrémités du propitiatoire sont évoqués.')
com([1449], 'EXO.25.20', 'Les chérubins se faisant face et couvrant le propitiatoire de leurs ailes sont directement décrits.')
com([1450], 'EXO.30.1', 'L’autel destiné à l’encens est directement évoqué.')
com([1450], 'EXO.30.3', 'L’autel et ses parties revêtus d’or expliquent l’alternance entre « d’or » et « doré ».')
com([1450], 'EXO.30.6', 'La position de l’autel devant le voile et près de l’arche est directement expliquée.')
cite(1451, 'LEV.16.1', 'Référence éditoriale explicite au chapitre du Lévitique sur l’entrée du grand prêtre et les expiations.')
com([1451], 'LEV.16.2', 'L’interdiction d’entrer en tout temps dans le sanctuaire corrige et précise la règle évoquée.')
com([1451], 'LEV.16.12', 'L’encens porté par le grand prêtre au-delà du voile appartient au rite annuel décrit.')
com([1451], 'LEV.16.14', 'L’aspersion du sang devant le propitiatoire appartient au rite d’expiation évoqué.')
com([1451], 'LEV.16.18', 'La purification sanglante de l’autel est expressément décrite dans le rite d’Expiation.')
com([1451], 'LEV.16.34', 'L’expiation annuelle pour Israël correspond à la règle « une fois l’année ».')
com([1452], 'EXO.26.22', 'Le fond occidental fournit le point de départ du parcours à travers le tabernacle.')
com([1452], 'EXO.26.33', 'Le voile intérieur marque l’accès final au lieu où se trouve l’arche du témoignage.')
com([1452], 'EXO.26.34', 'L’arche et le propitiatoire dans le Saint des saints constituent l’aboutissement oriental décrit.')

// § 21-23 — synthèse des mesures et couvertures.
com([1453], 'EXO.26.1', 'Les dix rideaux du tabernacle intérieur sont récapitulés.')
com([1453], 'EXO.26.2', 'La longueur de vingt-huit coudées de chaque rideau est directement rappelée.')
com([1454], 'EXO.26.3', 'Les rideaux réunis cinq par cinq sont directement rappelés.')
com([1454], 'EXO.26.5', 'Les attaches se faisant face expliquent la correspondance mutuelle des deux ensembles.')
com([1454, 1456], 'EXO.26.18', 'Les vingt supports du côté méridional sont récapitulés.')
com([1454, 1456], 'EXO.26.20', 'Les vingt supports du côté septentrional sont récapitulés.')
com([1454, 1456], 'EXO.26.22', 'Les six supports du fond occidental sont inclus dans le total de huit avec les angles.')
com([1454, 1456], 'EXO.26.23', 'Les deux supports d’angle complètent le fond occidental.')
com([1455, 1456], 'EXO.26.2', 'Les quatre coudées de largeur et vingt-huit de longueur des dix rideaux fondent le calcul récapitulatif.')
com([1456], 'EXO.26.1', 'Les quatre couleurs des rideaux sont directement rappelées.')
com([1457], 'EXO.27.9', 'Les vingt colonnes et cent coudées du côté méridional du parvis sont récapitulées.')
com([1457], 'EXO.27.11', 'Les vingt colonnes et cent coudées du côté septentrional du parvis sont récapitulées.')
com([1458], 'EXO.27.13', 'La largeur orientale de cinquante coudées est directement rappelée.')
com([1458], 'EXO.27.14', 'Les trois colonnes du premier côté participent au total reconstruit de dix colonnes orientales.')
com([1458], 'EXO.27.15', 'Les trois colonnes du second côté participent au même total.')
com([1458], 'EXO.27.16', 'Les quatre colonnes de la porte complètent le total de dix colonnes.')
com([1459], 'EXO.27.12', 'Les dix colonnes du côté occidental et ses cinquante coudées sont récapitulées.')
com([1459], 'EXO.27.14', 'Les trois colonnes du premier pan latéral sont rappelées.')
com([1459], 'EXO.27.15', 'Les trois colonnes du second pan latéral sont rappelées.')
com([1459], 'EXO.27.16', 'Les quatre colonnes de la porte complètent le portique à trois pans.')
com([1460], 'EXO.27.18', 'Les tentures de fin lin hautes de cinq coudées ferment le parvis décrit.')
com([1460, 1461, 1462, 1463], 'EXO.26.7', 'Les onze tapis de poils couvrant le tabernacle sont récapitulés.')
com([1460, 1461, 1462, 1463], 'EXO.26.8', 'Les trente coudées de longueur des tapis fondent les totaux calculés.')
com([1460, 1461, 1462], 'EXO.26.9', 'L’assemblage de cinq et six tapis et le repli du sixième sur le devant sont rappelés.')
com([1462], 'EXO.26.12', 'La demi-tenture retombant au derrière explique la seconde moitié retranchée.')
com([1463, 1464, 1465], 'EXO.26.2', 'Les vingt-huit coudées des rideaux fournissent le terme intérieur de la comparaison.')
com([1463, 1464, 1465, 1467, 1468], 'EXO.26.13', 'Les deux coudées excédantes et leur distribution de part et d’autre sont directement expliquées.')
com([1464, 1465, 1466], 'EXO.27.9', 'Les cent coudées méridionales du parvis sont comparées au côté intérieur parallèle.')
com([1464, 1465, 1466], 'EXO.27.11', 'Les cent coudées septentrionales du parvis sont comparées au côté intérieur parallèle.')
com([1464, 1465, 1466, 1467], 'EXO.27.13', 'Les cinquante coudées orientales du parvis reçoivent une part du surplus des tapis.')
com([1464, 1465, 1466, 1467, 1468], 'EXO.27.12', 'Les cinquante coudées occidentales du parvis reçoivent l’autre part du surplus.')
com([1467], 'EXO.27.14', 'Les trois colonnes du premier côté occidental expliquent la rupture de la ligne droite.')
com([1467], 'EXO.27.15', 'Les trois colonnes du second côté occidental expliquent la disposition symétrique.')
com([1467, 1468], 'EXO.27.16', 'Les quatre colonnes de la porte forment le pan central du portique occidental.')
com([1468], 'EXO.27.1', 'L’autel des sacrifices est situé dans la partie du parvis enfermée par le portique.')
com([1468], 'EXO.27.14', 'Le côté oblique de quinze coudées porté par trois colonnes est directement décrit.')
com([1468], 'EXO.27.15', 'L’autre côté oblique de quinze coudées porté par trois colonnes est directement décrit.')
com([1469], 'EXO.26.8', 'La largeur de quatre coudées des tapis de poils est interprétée comme leur hauteur en place.')
com([1469], 'EXO.27.18', 'La hauteur de cinq coudées des tentures de fin lin du parvis est directement comparée.')
com([1470, 1471], 'EXO.26.14', 'Les couvertures de peaux teintes en rouge et de peaux d’hyacinthe au-dessus du tabernacle sont directement discutées.')

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER).lte('segment_numero', DERNIER).order('segment_numero')
if (e0) throw e0
const segments = bruts.filter((s) => s.ref_niv1 === 'Livre deuxième' && s.ref_niv2 === 'Question CLXXVII')
if (segments.length !== 59 || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw Error('Préétat structurel invalide')
if (segments.some((s) => s.liens_revus_le || s.liens_revus_par)) throw Error('Déjà relu')
for (const [n, [avant]] of CORRECTIONS_TEXTE) {
  const segment = segments.find((s) => s.segment_numero === n)
  if (!segment?.segment_texte.includes(avant)) throw Error(`Précondition de correction invalide au segment ${n}`)
}
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...NON_RESOLUS].map((x) => x[0]))
const nonClasses = segments.filter((s) => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw Error(`Non classés ${nonClasses.map((x) => x.segment_numero)}`)
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw Error('Manifeste de liens invalide')
if (NON_RESOLUS.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Manifeste non biblique invalide')
const keys = LIENS.map((x) => `${x[0]}|${x[1]}|${x[2]}`)
const vus = new Set()
const doublons = keys.filter((k) => vus.has(k) || !vus.add(k))
if (doublons.length) throw Error(`Doublons ${doublons}`)
const cibles = [...new Set(LIENS.map((x) => x[1]))]
const { data: temoins, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const temoinsParCible = new Map(temoins.map((v) => [v.id_verset, v]))
const absentes = cibles.filter((c) => !temoinsParCible.has(c))
if (absentes.length) throw Error(`Cibles absentes ${absentes}`)
const ids = segments.map((s) => s.id)
const { count: existants, error: e2 } = await sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (e2) throw e2
if (existants) throw Error(`${existants} liens existants`)
const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((a, x) => { a[x[2]] = (a[x[2]] || 0) + 1; return a }, {})
if (NON_RESOLUS.length) types[4] = (types[4] || 0) + NON_RESOLUS.length
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Exode CLXXVII — sous-passe C', bornes: [PREMIER, DERNIER], segments: segments.length, corrections_ocr: CORRECTIONS_TEXTE.size, liens: total, sans_cible_a_constituer: NON_RESOLUS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: '39,67 %' }, null, 2))
if (DETAIL) {
  for (const [n, c, t, m] of LIENS) console.log({ n, c, t, m, segment: parNumero.get(n).segment_texte, temoin: temoinsParCible.get(c).TR0003 || temoinsParCible.get(c).TR0001 || temoinsParCible.get(c).TR0004 })
  for (const [n, t, m] of NON_RESOLUS) console.log({ n, c: null, t, m, segment: parNumero.get(n).segment_texte })
}
if (!WRITE) process.exit(0)

const q = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const correctionsSql = [...CORRECTIONS_TEXTE].map(([n, [avant, apres]]) => {
  const id = parNumero.get(n).id
  return `update segments set segment_texte = replace(segment_texte, ${q(avant)}, ${q(apres)}) where id = ${id} and segment_texte like ${q(`%${avant}%`)};\n  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction OCR segment ${n}: %/1', n; end if;`
}).join('\n  ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  ${correctionsSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> 59 then raise exception 'Segments %/59', n; end if;
end $passe$;`
const { error: ew } = await sb.rpc('exec_sql', { sql })
if (ew) throw ew
const [{ count: liensApres, error: ea }, { count: revusApres, error: eb }, { data: audit, error: ec }, { data: textesApres, error: ed }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte').in('id', ids),
])
if (ea || eb || ec || ed) throw (ea || eb || ec || ed)
const textesParNumero = new Map(textesApres.map((s) => [s.segment_numero, s.segment_texte]))
const correctionInvalide = [...CORRECTIONS_TEXTE].some(([n, [avant, apres]]) => textesParNumero.get(n).includes(avant) || !textesParNumero.get(n).includes(apres))
if (liensApres !== total || revusApres !== 59 || correctionInvalide || audit.some((x) => !x.motif || x.provenance !== 'lecture' || (x.canon_id ? (x.fiabilite !== 'vérifié' || x.arbitrage_requis) : (x.fiabilite !== 'à constituer' || !x.arbitrage_requis || x.type !== 4 || !x.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw Error('Postcontrôle invalide')
console.log(`✓ ${liensApres} liens, ${revusApres} segments`)
