import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const REF_NIV2 = 'Question CLXXVII'
const PREMIER = 1354
const DERNIER = 1412
const NB_SEGMENTS = 59
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. CLXXVII, sous-passe B'
const EMPREINTE_ATTENDUE = 'dfb788122ad9701a1659b22ab14abd52620d9bbec97d16fc89678c6bde1453ca'

const LIENS = []
const add = (segmentNumero, canonId, type, motif) => LIENS.push([segmentNumero, canonId, type, motif])
const both = (segmentNumero, canonId, motif) => {
  add(segmentNumero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(segmentNumero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (segmentNumero, canonIds, motif) => {
  for (const canonId of canonIds) add(segmentNumero, canonId, 3, `${motif} (${canonId}).`)
}

// § 10 — dimensions du parvis et comparaison avec le tabernacle intérieur.
both(1354, 'EXO.27.12', 'Les cinquante coudées, dix colonnes et dix bases du côté occidental du parvis sont cités')
both(1354, 'EXO.27.13', 'Les cinquante coudées du côté oriental du parvis sont citées')
explain(1355, ['EXO.27.12', 'EXO.27.13', 'EXO.27.14', 'EXO.27.15', 'EXO.27.16'], 'Les dix colonnes occidentales sont comparées aux dix colonnes orientales formées par trois, trois et quatre')
explain(1356, ['EXO.27.12', 'EXO.27.14', 'EXO.27.15', 'EXO.27.16', 'EXO.26.25'], 'Le rang extérieur oriental et les dix colonnes occidentales sont confrontés aux huit planches intérieures de l’ouest')
explain(1357, ['EXO.27.12', 'EXO.26.25'], 'Les dix colonnes du parvis occidental sont directement confrontées aux huit planches intérieures')
explain(1358, ['EXO.27.12', 'EXO.26.25'], 'La largeur du parvis extérieur et celle du tabernacle intérieur sont comparées à partir de leurs rangs occidental de dix et huit supports')
explain(1359, ['EXO.26.18', 'EXO.26.20', 'EXO.27.10', 'EXO.27.11'], 'L’espacement des vingt supports intérieurs au nord et au midi est comparé à celui des vingt colonnes extérieures')
explain(1360, ['EXO.26.1', 'EXO.26.2', 'EXO.26.18', 'EXO.26.20', 'EXO.26.25', 'EXO.27.9', 'EXO.27.11'], 'Le calcul confronte les dix rideaux de vingt-huit coudées, les supports intérieurs et les rangs extérieurs de cent coudées')
explain(1361, ['EXO.26.1', 'EXO.26.2', 'EXO.26.18', 'EXO.26.20', 'EXO.26.25', 'EXO.27.9', 'EXO.27.11'], 'Les deux cent quatre-vingts coudées des dix rideaux sont réparties entre les côtés de vingt et huit supports et comparées au parvis')
explain(1362, ['EXO.26.18', 'EXO.26.20', 'EXO.26.25', 'EXO.27.10', 'EXO.27.11', 'EXO.27.12'], 'L’hypothèse resserre les vingt supports intérieurs et espace les huit de l’ouest par comparaison avec le parvis extérieur')
explain(1363, ['EXO.26.7', 'EXO.26.9'], 'Le tapis de poils surnuméraire et le pli du sixième tapis sont distingués des dix rideaux intérieurs')
explain(1364, ['EXO.26.18', 'EXO.26.20', 'EXO.26.25', 'EXO.27.9', 'EXO.27.11', 'EXO.27.12', 'EXO.27.13'], 'L’exemple de quatre-vingt-seize coudées développe l’hypothèse de dimensions intérieures moindres que celles du parvis')
explain(1365, ['EXO.26.25', 'EXO.27.12', 'EXO.27.13'], 'La proportion entre huit supports intérieurs pour quarante-quatre coudées et dix colonnes extérieures pour cinquante est calculée')
explain(1366, ['EXO.26.25', 'EXO.27.12', 'EXO.27.13'], 'Le rapport numérique de huit à dix et de quarante à cinquante conclut le calcul des deux rangs')
explain(1367, ['EXO.26.18', 'EXO.26.20', 'EXO.26.25', 'EXO.27.10', 'EXO.27.11', 'EXO.27.12', 'EXO.27.13'], 'La différence supposée d’intervalle entre les vingt supports latéraux et les huit occidentaux est remise en question')

// § 11–12 — côtés et porte du parvis, autel, bassin et entrée du tabernacle.
both(1368, 'EXO.27.14', 'Les quinze coudées de rideaux, trois colonnes et trois bases d’un côté de la porte sont citées ; la note imprimée Exode 26,14 est fautive')
both(1369, 'EXO.27.15', 'Les quinze coudées, trois colonnes et trois bases du second côté sont citées')
both(1369, 'EXO.27.16', 'La tenture de vingt coudées et les quatre colonnes de la porte sont citées')
explain(1370, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16'], 'Les trois, trois et quatre colonnes sont totalisées pour résoudre la disposition de la porte')
explain(1371, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16'], 'Les deux côtés de quinze coudées sont séparés de la tenture centrale de vingt coudées afin de former le passage')
explain(1372, ['EXO.27.16'], 'La beauté et les quatre couleurs de la tenture de la porte la distinguent des rideaux latéraux')
explain(1373, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16', 'EXO.27.1', 'EXO.30.18'], 'La disposition proposée est testée contre la place nécessaire à l’autel carré et au bassin entre autel et entrée')
both(1374, 'EXO.30.18', 'Le bassin d’airain est placé entre l’autel et l’entrée de la tente')
both(1374, 'EXO.30.19', 'Les prêtres se lavant les mains et les pieds au bassin sont intentionnellement rappelés')
both(1374, 'EXO.30.20', 'Les ablutions avant l’entrée dans la tente ou l’approche de l’autel sont intentionnellement rappelées')
explain(1375, ['EXO.27.9', 'EXO.27.1'], 'Le parvis doit enclore à la fois la tente et l’autel des holocaustes')
explain(1376, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16', 'EXO.26.36', 'EXO.26.37'], 'L’hypothèse aligne les côtés et la porte du parvis avec l’entrée du tabernacle voilée et soutenue par cinq colonnes')
explain(1377, ['EXO.26.36', 'EXO.26.37'], 'Le rideau de l’entrée du tabernacle est interprété comme une porte à deux battants')
explain(1378, ['EXO.26.36', 'EXO.26.37'], 'La position intérieure ou extérieure du rideau suspendu à cinq colonnes est examinée')
explain(1379, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16', 'EXO.26.18', 'EXO.26.20', 'EXO.26.25'], 'La nouvelle disposition rend inutile de modifier l’espacement des supports intérieurs du tabernacle')
explain(1380, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16', 'EXO.27.1', 'EXO.30.18'], 'Les trois, trois et quatre colonnes circonscrivent l’espace de l’autel, du bassin et du service sacrificiel')
explain(1381, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16'], 'La figure de la lettre grecque pi sert à représenter la disposition des côtés et de la porte')
explain(1382, ['EXO.26.22', 'EXO.26.23', 'EXO.26.25'], 'Les six planches du fond et les deux angles expliquent le rang intérieur de huit, puis de dix avec les angles')
explain(1383, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16', 'EXO.27.1'], 'Les colonnes de la porte embrassent l’espace nécessaire aux sacrifices devant la tente')
explain(1384, ['EXO.27.14', 'EXO.27.15', 'EXO.27.16'], 'Les tentures de quinze coudées sur trois colonnes et la tenture de vingt coudées sur quatre sont récapitulées')

// § 13 — confrontation avec la construction effective en Exode 38.
both(1385, 'EXO.38.14', 'Les quinze coudées de rideaux et les trois colonnes du premier côté de la porte sont citées d’après le récit de construction')
both(1385, 'EXO.38.15', 'Les mêmes dimensions du second côté de la porte sont citées')
both(1386, 'EXO.38.18', 'La tenture brodée de la porte est citée ; les trente coudées imprimées divergent des vingt coudées du témoin local')
both(1387, 'EXO.38.9', 'Les cent coudées de rideaux de lin retors au midi sont citées')
explain(1387, ['EXO.38.10'], 'Les vingt colonnes correspondant aux cent coudées sont données comme explication de la proportion.')
both(1388, 'EXO.38.10', 'Les vingt colonnes et leurs bases d’airain du côté méridional sont citées')
both(1388, 'EXO.38.11', 'Les cent coudées et vingt colonnes du côté septentrional sont citées')
both(1388, 'EXO.38.12', 'Les cinquante coudées, dix colonnes et dix bases de l’ouest sont citées')
both(1389, 'EXO.38.13', 'Les cinquante coudées du côté oriental sont citées')
explain(1389, ['EXO.38.14', 'EXO.38.15'], 'Le retour du récit aux deux côtés de la porte est annoncé pour expliquer l’espace postérieur.')
both(1390, 'EXO.38.14', 'Les quinze coudées, trois colonnes et trois bases du premier côté de la porte sont citées')
both(1390, 'EXO.38.15', 'Les quinze coudées, trois colonnes et trois bases du second côté sont citées')
explain(1391, ['EXO.38.14', 'EXO.38.15'], 'Les deux côtés sont expliqués comme les deux parties postérieures unies à la porte du parvis.')
both(1392, 'EXO.38.16', 'Tous les rideaux de l’enceinte en fin lin retors sont cités')
both(1392, 'EXO.38.17', 'Les bases d’airain, crochets, tringles et chapiteaux d’argent sont cités')
both(1393, 'EXO.38.18', 'La tenture brodée de la porte, longue de vingt coudées et haute de cinq, est citée malgré la référence imprimée fautive')
explain(1394, ['EXO.38.18'], 'Les cinq coudées de hauteur de la tenture de porte sont expliquées comme sa largeur lors du tissage.')
both(1394, 'EXO.27.18', 'Les dimensions générales du parvis, cent sur cinquante et cinq coudées de haut, sont citées en rappel')
explain(1395, ['EXO.38.18'], 'La hauteur de l’étoffe dressée est identifiée à sa largeur ou longueur selon son orientation.')

// § 14 — surplus du onzième tapis de poils.
both(1398, 'EXO.26.12', 'La moitié de la tenture surnuméraire qui retombe derrière la Demeure est citée')
explain(1399, ['EXO.26.12'], 'La moitié du tapis surnuméraire à cacher derrière la tente est posée comme difficulté de calcul.')
both(1400, 'EXO.26.9', 'Les tapis unis cinq d’une part et six de l’autre, avec le sixième replié à l’avant, sont cités et expliqués')
explain(1401, ['EXO.26.9', 'EXO.26.12'], 'Le devant oriental où le sixième tapis est plié est opposé au derrière occidental où retombe le surplus.')
explain(1402, ['EXO.26.8', 'EXO.26.9'], 'Les longueurs de trente coudées et les groupes de cinq et six tapis fondent le calcul du surplus après le pli.')
explain(1403, ['EXO.26.8', 'EXO.26.9', 'EXO.26.12'], 'Les quinze coudées restant après le pli du sixième tapis sont identifiées à la moitié surnuméraire derrière la tente.')
explain(1404, ['EXO.26.8', 'EXO.26.9', 'EXO.26.12'], 'Les cent cinquante et cent soixante-cinq coudées des deux séries précisent le surplus de quinze coudées.')
explain(1405, ['EXO.26.8', 'EXO.26.9', 'EXO.26.12'], 'Le pli à l’avant et la demi-tenture cachée à l’arrière équilibrent les deux séries à cent cinquante coudées.')

// § 15 — une coudée de surplus de chaque côté.
both(1407, 'EXO.26.13', 'La coudée excédentaire de chaque côté des longues tentures de poils est citée')
explain(1408, ['EXO.26.12', 'EXO.26.13'], 'Le surplus numérique de la demi-tenture est distingué du surplus de longueur d’une coudée de chaque côté.')
explain(1409, ['EXO.26.9', 'EXO.26.12', 'EXO.26.13'], 'Le pli avant et la demi-tenture arrière sont distingués des deux coudées excédentaires en longueur.')
explain(1410, ['EXO.26.2', 'EXO.26.8', 'EXO.26.13'], 'Les tapis de trente coudées dépassent de deux coudées les rideaux de vingt-huit, ce qui explique le surplus latéral.')
both(1411, 'EXO.26.2', 'La longueur de vingt-huit coudées des rideaux intérieurs est intentionnellement rappelée')
both(1411, 'EXO.26.8', 'La longueur de trente coudées des tapis de poils est intentionnellement rappelée')
both(1411, 'EXO.26.13', 'La formule sur le surplus de la longueur, une coudée de chaque côté, est citée puis interrogée')
explain(1412, ['EXO.26.13'], 'Les deux coudées de surplus sont réparties également à l’avant et à l’arrière de la tente.')

const NON_RESOLUS = []
const SANS_LIEN = new Set([1396, 1397, 1406])

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error } = await sb
  .from('segments')
  .select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).eq('ref_niv2', REF_NIV2)
  .gte('segment_numero', PREMIER).lte('segment_numero', DERNIER).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== PREMIER + index)) throw new Error('Préétat : bornes ou continuité invalides')
if (segments.some((segment) => segment.ref_niv1 !== REF_NIV1 || segment.ref_niv2 !== REF_NIV2)) throw new Error('Préétat structurel invalide')
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Lot déjà relu')

const empreinte = createHash('sha256')
  .update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes])))
  .digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(([segmentNumero]) => segmentNumero))
const nonClasses = segments.filter((segment) => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero)}`)
if ([...SANS_LIEN].some((segmentNumero) => numerosClasses.has(segmentNumero) || !parNumero.has(segmentNumero))) throw new Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([segmentNumero, canonId, type, motif]) => !parNumero.has(segmentNumero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Manifeste biblique invalide')
if (NON_RESOLUS.some(([segmentNumero, type, motif]) => !parNumero.has(segmentNumero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')

const cles = LIENS.map(([segmentNumero, canonId, type]) => `${segmentNumero}|${canonId}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const ciblesInvalides = cibles.filter((canonId) => {
  const temoin = temoinsParId.get(canonId)
  return !temoin || (!temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004)
})
if (ciblesInvalides.length) throw new Error(`Cibles invalides : ${ciblesInvalides.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const { count: liensExistants, error: liensError } = await sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (liensError) throw liensError
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)

const TOTAL = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((compte, [, , type]) => {
  compte[type] = (compte[type] ?? 0) + 1
  return compte
}, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] ?? 0) + 1
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle', lot: 'Exode CLXXVII — sous-passe B',
  ref_niv1: REF_NIV1, ref_niv2: REF_NIV2, bornes: [PREMIER, DERNIER],
  segments: segments.length, liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL,
  sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte,
  avancement_actuel: '1271 / 3262 = 38,96 %',
  avancement_potentiel_apres_ecriture: '1330 / 3262 = 40,77 %',
}, null, 2))

if (DETAIL) {
  for (const [segmentNumero, canonId, type, motif] of LIENS) {
    const temoin = temoinsParId.get(canonId)
    console.log({ segmentNumero, canonId, type, motif, segment: parNumero.get(segmentNumero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 })
  }
}
if (!WRITE) process.exit(0)

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([segmentNumero, canonId, type, motif]) => `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([segmentNumero, type, motif]) => `(${parNumero.get(segmentNumero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const sql = `
do $p$
declare
  n integer;
begin
  if exists (
    select 1 from liens_bibliques where segment_id in (${idSql})
  ) then
    raise exception 'Liens présents';
  end if;

  if exists (
    select 1 from segments
    where id in (${idSql})
      and (liens_revus_le is not null or liens_revus_par is not null)
  ) then
    raise exception 'Déjà relu';
  end if;

  insert into liens_bibliques (
    segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis
  ) values
    ${valeurs};

  get diagnostics n = row_count;
  if n <> ${TOTAL} then
    raise exception 'Liens insérés : %', n;
  end if;

  update segments
  set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)}
  where id in (${idSql});

  get diagnostics n = row_count;
  if n <> ${NB_SEGMENTS} then
    raise exception 'Segments relus : %', n;
  end if;
end
$p$;
`

const { error: writeError } = await sb.rpc('exec_sql', { sql })
if (writeError) throw writeError
const [
  { count: liensApres, error: liensApresError },
  { count: relusApres, error: relusApresError },
  { data: audit, error: auditError },
] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (liensApresError || relusApresError || auditError) throw liensApresError || relusApresError || auditError
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || audit.some((lien) => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis) : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
