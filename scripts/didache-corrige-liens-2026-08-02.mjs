import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const OEUVRE = 'A0012O0002'
const ROOT = 'audit/didache-liens-2026-08-02'
const REVIEWER = 'Codex (IA) — lecture intégrale Doctrine des Apôtres'
// [segment_numero, canon_id, type, fiabilite, motif]
const ADDITIONS = [
  [2, 'MAT.22.37', 2, 'vérifié', 'Le premier commandement de la voie de vie reprend dans le discours l’amour de Dieu formulé par Jésus.'],
  [2, 'MAT.22.39', 2, 'vérifié', 'La désignation du second commandement et l’amour du prochain reprennent la formulation évangélique.'],
  [8, null, 4, 'à constituer', 'RÉFÉRENCE NON BIBLIQUE (agraphon chrétien) : citation explicite sur l’aumône qui doit se mouiller de sueur dans les mains ; source exacte à constituer.'],
  [25, 'SIR.2.4', 2, 'vérifié', 'L’accueil comme un bien de tout événement reprend dans le discours l’exhortation à accepter ce qui survient.'],
  [32, 'PRO.19.17', 4, 'vérifié', 'La récompense promise à celui qui donne au pauvre éclaire l’assurance que Dieu rendra dignement le don.'],
  [43, 'ROM.12.9', 2, 'vérifié', 'La formule négative « ne s’attachent pas au bien » incorpore l’exhortation à s’attacher fortement au bien.'],
  [43, 'WIS.12.5', 2, 'vérifié', 'L’expression « meurtriers d’enfants » reprend dans le catalogue de vices le meurtre cruel des enfants.'],
  [58, 'JHN.17.3', 4, 'vérifié', 'La vie donnée par la connaissance reçue en Jésus rejoint la définition johannique de la vie éternelle.'],
  [59, '1CO.10.17', 4, 'vérifié', 'L’unité du pain rompu et le rassemblement de l’Église correspondent à l’unique pain formant un seul corps.'],
  [60, 'MAT.7.6', 3, 'vérifié', 'La défense de donner le saint aux chiens est explicitement appliquée à l’admission des seuls baptisés à l’eucharistie.'],
  [63, 'SIR.18.1', 2, 'vérifié', 'La création de l’univers est une reprise fondue de celui qui a tout créé sans exception.'],
  [63, '1CO.10.3', 2, 'vérifié', 'La prière incorpore l’expression paulinienne de nourriture spirituelle.'],
  [63, '1CO.10.4', 2, 'vérifié', 'La prière incorpore l’expression paulinienne de breuvage spirituel donné dans le Christ.'],
  [65, 'MAT.6.13', 2, 'vérifié', 'La demande de délivrer l’Église de tout mal reprend dans le discours la dernière demande du Notre Père.'],
  [66, '1JN.2.17', 2, 'vérifié', 'L’acclamation « que ce monde passe » incorpore la formule johannique du monde qui passe.'],
  [70, null, 4, 'à constituer', 'RÉFÉRENCE BIBLIQUE NON RÉSOLUE : renvoi explicite au précepte de l’Évangile réglant l’accueil des apôtres et des prophètes ; locus global non déterminé.'],
  [73, 'MAT.10.9', 4, 'vérifié', 'Le refus de l’argent demandé par l’apôtre itinérant applique l’interdiction évangélique d’emporter de la monnaie.'],
  [73, 'MAT.10.10', 4, 'vérifié', 'Le pain limité au voyage reprend thématiquement les prescriptions évangéliques de dépouillement missionnaire.'],
  [74, 'MAT.12.31', 3, 'vérifié', 'Le blasphème irrémissible contre l’Esprit est appliqué au jugement du prophète parlant en esprit.'],
  [78, null, 4, 'à constituer', 'RÉFÉRENCE BIBLIQUE NON RÉSOLUE : renvoi explicite aux actes symboliques des anciens prophètes ; épisodes précis non déterminés.'],
  [89, 'NUM.15.20', 4, 'vérifié', 'La prescription de prélever les prémices du pain correspond à l’offrande des prémices de la pâte.'],
  [89, 'NUM.15.21', 4, 'vérifié', 'Le commandement invoqué pour le pain correspond à la loi permanente des prémices de la pâte.'],
  [90, 'DEU.18.4', 4, 'vérifié', 'Les prémices du vin et de l’huile données aux prophètes prolongent la loi des prémices dues aux prêtres.'],
  [92, 'ACT.20.7', 4, 'vérifié', 'La réunion dominicale pour rompre le pain correspond à l’assemblée du premier jour de la semaine pour la fraction du pain.'],
  [94, 'MAL.1.11', 3, 'vérifié', 'La prophétie de l’oblation pure en tout lieu est explicitement appliquée au sacrifice eucharistique de l’assemblée.'],
  [94, 'MAL.1.14', 3, 'vérifié', 'La proclamation du grand roi parmi les nations soutient l’application eucharistique de la prophétie de Malachie.'],
  [95, '1TI.3.2', 4, 'vérifié', 'L’élection d’un évêque digne et éprouvé correspond aux qualités requises de l’évêque irréprochable.'],
  [95, '1TI.3.3', 4, 'vérifié', 'Les qualités de douceur et de désintéressement exigées des ministres correspondent aux critères pauliniens.'],
  [95, '1TI.3.8', 4, 'vérifié', 'Les diacres véridiques et désintéressés correspondent aux diacres graves, sans duplicité ni avidité.'],
  [95, '1TI.3.10', 4, 'vérifié', 'L’exigence de ministres éprouvés correspond à l’épreuve préalable des diacres.'],
  [97, 'MAT.18.17', 4, 'vérifié', 'La mise à l’écart de l’offenseur impénitent prolonge la discipline évangélique après le refus d’écouter l’Église.'],
  [98, null, 4, 'à constituer', 'RÉFÉRENCE BIBLIQUE NON RÉSOLUE : renvoi explicite à l’Évangile pour les prières, les aumônes et l’ensemble de la conduite ; loci précis non déterminés.'],
  [100, 'HEB.10.25', 4, 'vérifié', 'L’assemblée fréquente en vue de l’accomplissement final correspond à l’exhortation à ne pas déserter l’assemblée à l’approche du jour.'],
  [101, 'MAT.7.15', 4, 'vérifié', 'Les brebis changées en loups inversent l’image évangélique des faux prophètes, loups sous des vêtements de brebis.'],
  [102, 'MAT.24.10', 2, 'vérifié', 'La haine, la persécution et la trahison mutuelles reprennent dans le discours la séquence eschatologique évangélique.'],
  [103, '2TH.2.9', 2, 'vérifié', 'Les signes et prodiges du Séducteur reprennent dans le discours les prodiges mensongers accompagnant l’impie.'],
  [103, 'MAT.24.21', 4, 'vérifié', 'Les iniquités sans précédent depuis le commencement transforment le motif de la détresse sans précédent.'],
  [105, '1CO.15.52', 2, 'vérifié', 'Le son de la trompette suivi de la résurrection des morts reprend la séquence paulinienne.'],
  [106, 'ZEC.14.5', 3, 'vérifié', 'La venue du Seigneur avec tous les saints est citée pour expliquer que la résurrection annoncée ne concerne pas encore tous les morts.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (promise, label) => {
  const { data, error } = await promise
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}
const segments = await must(db.from('segments').select('*').eq('id_oeuvre', OEUVRE).order('segment_numero'), 'segments')
if (segments.length !== 107 || segments.some((row, index) => row.segment_numero !== index + 1)) throw new Error('Segmentation inattendue')
if (segments.some((row) => row.liens_revus_le)) throw new Error('L’œuvre est déjà marquée comme relue')
const byNumber = new Map(segments.map((row) => [row.segment_numero, row]))
const ids = segments.map((row) => row.id)
const existing = await must(db.from('liens_bibliques').select('*').in('segment_id', ids).order('id'), 'liens')
if (existing.length !== 98) throw new Error(`Préétat divergent : ${existing.length}/98 liens`)
if (existing.filter((row) => row.fiabilite === 'probable').length !== 75 || existing.filter((row) => row.fiabilite === 'douteux').length !== 23) throw new Error('Fiabilités initiales divergentes')
for (const [number, target, type] of ADDITIONS) {
  const segment = byNumber.get(number)
  if (!segment) throw new Error(`Segment absent : ${number}`)
  if (existing.some((row) => row.segment_id === segment.id && row.canon_id === target && row.type === type)) throw new Error(`Ajout déjà présent : ${number}/${target}/T${type}`)
}
const targets = [...new Set(ADDITIONS.map((row) => row[1]).filter(Boolean))]
const witnesses = await must(db.from('versets_lecture').select('id_verset').in('id_verset', targets), 'cibles')
const found = new Set(witnesses.map((row) => row.id_verset))
const missing = targets.filter((target) => !found.has(target))
if (missing.length) throw new Error(`Cibles absentes : ${missing.join(', ')}`)

mkdirSync(ROOT, { recursive: true })
const backup = { exported_at: new Date().toISOString(), oeuvre: OEUVRE, segments, liens_bibliques: existing, additions: ADDITIONS }
const backupBody = `${JSON.stringify(backup, null, 2)}\n`
const backupPath = `${ROOT}/sauvegarde-avant-correction.json`
writeFileSync(backupPath, backupBody, 'utf8')
writeFileSync(`${backupPath}.sha256`, `${createHash('sha256').update(backupBody).digest('hex')}  sauvegarde-avant-correction.json\n`, 'utf8')

const typeCounts = Object.fromEntries([1, 2, 3, 4].map((type) => [type, existing.filter((row) => row.type === type).length + ADDITIONS.filter((row) => row[2] === type).length]))
const summary = {
  mode: APPLY ? 'écriture' : 'contrôle', oeuvre: OEUVRE, segments: 107,
  liens_avant: 98, ajouts: ADDITIONS.length, liens_apres: 98 + ADDITIONS.length,
  types_apres: typeCounts, fiabilites_apres: { vérifié: 110, douteux: 23, 'à constituer': 4 },
  sauvegarde: backupPath, avancement_avant: '0 / 107 = 0,00 %', avancement_apres: '107 / 107 = 100,00 %',
}
console.log(JSON.stringify(summary, null, 2))
if (!APPLY) process.exit(0)

const lit = (value) => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const values = ADDITIONS.map(([number, target, type, reliability, motif]) => {
  const arbitration = reliability === 'à constituer' ? 'true' : 'false'
  return `(${byNumber.get(number).id},${lit(target)},${type},${lit(reliability)},${lit(motif)},'lecture',${arbitration})`
}).join(',\n')
const idList = ids.join(',')
const sql = `do $didache$ declare n integer; begin
  select count(*) into n from segments where id in (${idList}) and liens_revus_le is null;
  if n<>107 then raise exception 'segments non relus %/107',n; end if;
  select count(*) into n from liens_bibliques where segment_id in (${idList});
  if n<>98 then raise exception 'liens initiaux %/98',n; end if;
  update liens_bibliques set fiabilite='vérifié',arbitrage_requis=false,provenance='lecture'
    where segment_id in (${idList}) and fiabilite='probable';
  get diagnostics n=row_count; if n<>75 then raise exception 'certifications %/75',n; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis)
    values ${values};
  get diagnostics n=row_count; if n<>${ADDITIONS.length} then raise exception 'ajouts %/${ADDITIONS.length}',n; end if;
  update segments set liens_revus_le=now(),liens_revus_par=${lit(REVIEWER)} where id in (${idList}) and liens_revus_le is null;
  get diagnostics n=row_count; if n<>107 then raise exception 'marquage %/107',n; end if;
  select count(*) into n from liens_bibliques where segment_id in (${idList});
  if n<>137 then raise exception 'total %/137',n; end if;
  select count(*) into n from liens_bibliques where segment_id in (${idList}) and (motif is null or btrim(motif)='');
  if n<>0 then raise exception 'motifs vides %',n; end if;
  select count(*) into n from liens_bibliques where segment_id in (${idList}) and fiabilite='probable';
  if n<>0 then raise exception 'probables résiduels %',n; end if;
  select count(*) into n from liens_bibliques where segment_id in (${idList}) and fiabilite='vérifié';
  if n<>110 then raise exception 'vérifiés %/110',n; end if;
  select count(*) into n from liens_bibliques where segment_id in (${idList}) and fiabilite='douteux';
  if n<>23 then raise exception 'douteux %/23',n; end if;
  select count(*) into n from liens_bibliques where segment_id in (${idList}) and fiabilite='à constituer';
  if n<>4 then raise exception 'à constituer %/4',n; end if;
  select count(*) into n from (
    select segment_id,type,canon_id,count(*) from liens_bibliques where segment_id in (${idList})
    group by segment_id,type,canon_id having count(*)>1
  ) duplicates;
  if n<>0 then raise exception 'doublons %',n; end if;
end $didache$;`
const { error } = await db.rpc('exec_sql', { sql })
if (error) throw new Error(`Transaction annulée : ${error.message}`)

const [afterSegments, afterLinks] = await Promise.all([
  must(db.from('segments').select('id,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE), 'post-segments'),
  must(db.from('liens_bibliques').select('*').in('segment_id', ids), 'post-liens'),
])
if (afterSegments.length !== 107 || afterSegments.some((row) => !row.liens_revus_le || row.liens_revus_par !== REVIEWER) || afterLinks.length !== 137) throw new Error('Postcontrôle divergent')
console.log('✓ Doctrine des Apôtres : liens corrigés, 107 segments marqués relus')
