/**
 * Application atomique de la lecture IIa-IIae, questions 34 à 39.
 *
 * Usage volontairement explicite :
 *   node scripts/somme-apply-ss-q34-39.mjs --apply
 *
 * Sans --apply, le script s'arrête avant toute connexion et toute écriture.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (!process.argv.includes('--apply')) {
  console.error('Refus d’exécuter sans le verrou explicite --apply.');
  process.exit(2);
}

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const PROPOSALS_PATH = `${ROOT}/ss-q34-39-propositions.json`;
const OEUVRE = 'A0013O0002';
const PARTIE = 'Secunda Secundae';
const QUESTIONS = Array.from({ length: 6 }, (_, i) => `Question ${i + 34}`);
const EXPECTED_SEGMENTS = 212;
const EXPECTED_EXISTING_LINKS = 58;

const plan = JSON.parse(readFileSync(PROPOSALS_PATH, 'utf8'));
if (plan.oeuvre !== OEUVRE || plan.partie !== PARTIE) throw new Error('Dossier de propositions inattendu.');
if (plan.segments?.length !== EXPECTED_SEGMENTS) throw new Error(`Le dossier ne contient pas ${EXPECTED_SEGMENTS} segments.`);
if (plan.summary?.liens_existants !== EXPECTED_EXISTING_LINKS) throw new Error(`Le dossier ne contient pas ${EXPECTED_EXISTING_LINKS} liens existants.`);
if (plan.summary?.liens_existants_a_corriger !== 10 || plan.summary?.liens_a_ajouter !== 47) throw new Error('Bilan du dossier inattendu.');

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes.');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function must(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const segmentIds = plan.segments.map((s) => s.id);
const segmentNumbers = plan.segments.map((s) => s.segment_numero);
if (new Set(segmentIds).size !== EXPECTED_SEGMENTS || new Set(segmentNumbers).size !== EXPECTED_SEGMENTS) throw new Error('Segments dupliqués dans le dossier.');
if (Math.min(...segmentNumbers) !== 14369 || Math.max(...segmentNumbers) !== 14580) throw new Error('Bornes de segments inattendues.');

const liveSegments = await must(
  sb.from('segments')
    .select('id,id_oeuvre,segment_numero,segment_texte,ref_niv1,ref_niv2,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', OEUVRE)
    .eq('ref_niv1', PARTIE)
    .in('ref_niv2', QUESTIONS)
    .order('segment_numero'),
  'lecture des segments vivants',
);

const liveLinks = [];
for (let i = 0; i < segmentIds.length; i += 100) {
  liveLinks.push(...await must(
    sb.from('liens_bibliques').select('*').in('segment_id', segmentIds.slice(i, i + 100)).order('id'),
    `lecture des liens vivants ${i}`,
  ));
}
liveLinks.sort((a, b) => a.id - b.id);

// Sauvegarde de l'état vivant AVANT toute validation bloquante et toute écriture distante.
mkdirSync(ROOT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupName = `ss-q34-39-live-before-${stamp}.json`;
const backupPayload = `${JSON.stringify({
  exported_at: new Date().toISOString(),
  oeuvre: OEUVRE,
  partie: PARTIE,
  questions: QUESTIONS,
  segments: liveSegments,
  links: liveLinks,
}, null, 2)}\n`;
writeFileSync(`${ROOT}/${backupName}`, backupPayload);
writeFileSync(`${ROOT}/${backupName}.sha256`, `${createHash('sha256').update(backupPayload).digest('hex')}  ${backupName}\n`);

// Préconditions exactes sur les segments.
if (liveSegments.length !== EXPECTED_SEGMENTS) throw new Error(`Précondition segments : ${liveSegments.length}/${EXPECTED_SEGMENTS}. Sauvegarde : ${backupName}`);
const planSegmentById = new Map(plan.segments.map((s) => [s.id, s]));
for (const live of liveSegments) {
  const expected = planSegmentById.get(live.id);
  if (!expected) throw new Error(`Segment vivant étranger : ${live.id}. Sauvegarde : ${backupName}`);
  if (live.id_oeuvre !== OEUVRE || live.ref_niv1 !== PARTIE || live.ref_niv2 !== expected.question ||
      live.segment_numero !== expected.segment_numero || live.segment_texte !== expected.texte) {
    throw new Error(`Segment modifié depuis l’audit : ${live.segment_numero}. Sauvegarde : ${backupName}`);
  }
  if (live.liens_revus_le !== null || live.liens_revus_par !== null) {
    throw new Error(`Segment déjà marqué relu : ${live.segment_numero}. Sauvegarde : ${backupName}`);
  }
}

// Préconditions exactes sur les 58 liens : aucune insertion, suppression ou modification depuis l'audit.
const expectedLinks = plan.segments.flatMap((s) => s.liens_existants).sort((a, b) => a.id - b.id);
if (expectedLinks.length !== EXPECTED_EXISTING_LINKS || liveLinks.length !== EXPECTED_EXISTING_LINKS) {
  throw new Error(`Précondition liens : vivant=${liveLinks.length}, attendu=${EXPECTED_EXISTING_LINKS}. Sauvegarde : ${backupName}`);
}
const comparableKeys = ['id', 'segment_id', 'canon_id', 'verset_v2_id', 'livre', 'chapitre', 'type', 'fiabilite', 'motif', 'provenance', 'arbitrage_requis'];
for (let i = 0; i < expectedLinks.length; i++) {
  const expected = expectedLinks[i];
  const live = liveLinks[i];
  for (const key of comparableKeys) {
    if ((live[key] ?? null) !== (expected[key] ?? null)) {
      throw new Error(`Lien ${expected.id} modifié depuis l’audit (${key}). Sauvegarde : ${backupName}`);
    }
  }
}

const corrections = expectedLinks.filter((l) => l.audit === 'à corriger');
const retained = expectedLinks.filter((l) => l.audit === 'juste');
const additions = plan.segments.flatMap((s) => s.liens_a_ajouter.map((a) => ({ ...a, segment_id: s.id })));
if (corrections.length !== 10 || retained.length !== 48 || additions.length !== 47) throw new Error('Répartition du plan inattendue.');

const targetKey = (x) => x.canon_id ? `c:${x.canon_id}` : x.verset_v2_id ? `v:${x.verset_v2_id}` : `h:${x.livre}:${x.chapitre}`;
const finalKeys = [];
for (const link of expectedLinks) {
  const p = link.proposition ?? {};
  finalKeys.push(`${link.segment_id}|${targetKey({
    canon_id: p.canon_id !== undefined ? p.canon_id : link.canon_id,
    verset_v2_id: p.verset_v2_id !== undefined ? p.verset_v2_id : link.verset_v2_id,
    livre: p.livre !== undefined ? p.livre : link.livre,
    chapitre: p.chapitre !== undefined ? p.chapitre : link.chapitre,
  })}|${p.type ?? link.type}`);
}
for (const link of additions) finalKeys.push(`${link.segment_id}|${targetKey(link)}|${link.type}`);
if (new Set(finalKeys).size !== finalKeys.length) throw new Error('Le plan final fabriquerait un doublon segment/cible/type.');

const sqlString = (value) => value === null || value === undefined ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
const sqlBool = (value) => value ? 'true' : 'false';
const setTarget = (p) => [
  `canon_id=${sqlString(p.canon_id ?? null)}`,
  `verset_v2_id=${p.verset_v2_id == null ? 'null' : Number(p.verset_v2_id)}`,
  `livre=${sqlString(p.livre ?? null)}`,
  `chapitre=${p.chapitre == null ? 'null' : Number(p.chapitre)}`,
].join(',');

const updateCorrections = corrections.map((link) => {
  const p = link.proposition;
  return `
    update liens_bibliques set
      ${setTarget(p)}, type=${Number(p.type)}, fiabilite='vérifié', provenance='lecture',
      arbitrage_requis=false, motif=${sqlString(p.motif)}
    where id=${Number(link.id)} and segment_id=${Number(link.segment_id)}
      and canon_id is not distinct from ${sqlString(link.canon_id)}
      and verset_v2_id is not distinct from ${link.verset_v2_id == null ? 'null' : Number(link.verset_v2_id)}
      and livre is not distinct from ${sqlString(link.livre)}
      and chapitre is not distinct from ${link.chapitre == null ? 'null' : Number(link.chapitre)}
      and type=${Number(link.type)} and fiabilite=${sqlString(link.fiabilite)}
      and provenance=${sqlString(link.provenance)} and arbitrage_requis=${sqlBool(link.arbitrage_requis)};
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Correction lien ${Number(link.id)} : % ligne(s)',n; end if;`;
}).join('\n');

const updateRetained = retained.map((link) => `
    update liens_bibliques set fiabilite='vérifié', provenance='lecture', arbitrage_requis=false
    where id=${Number(link.id)} and segment_id=${Number(link.segment_id)}
      and canon_id is not distinct from ${sqlString(link.canon_id)}
      and verset_v2_id is not distinct from ${link.verset_v2_id == null ? 'null' : Number(link.verset_v2_id)}
      and livre is not distinct from ${sqlString(link.livre)}
      and chapitre is not distinct from ${link.chapitre == null ? 'null' : Number(link.chapitre)}
      and type=${Number(link.type)} and fiabilite=${sqlString(link.fiabilite)}
      and motif is not distinct from ${sqlString(link.motif)}
      and provenance=${sqlString(link.provenance)} and arbitrage_requis=${sqlBool(link.arbitrage_requis)};
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Validation lien ${Number(link.id)} : % ligne(s)',n; end if;`).join('\n');
const insertValues = additions.map((a) => `(
    ${Number(a.segment_id)},${sqlString(a.canon_id)},null,null,null,${Number(a.type)},
    'vérifié',${sqlString(a.motif)},'lecture',false
  )`).join(',\n');
const segmentValues = liveSegments.map((s) => `(${Number(s.id)})`).join(',');
const expectedTypeCounts = [1, 2, 3, 4].map((type) => {
  const oldFinal = expectedLinks.filter((l) => (l.proposition?.type ?? l.type) === type).length;
  return [type, oldFinal + additions.filter((a) => a.type === type).length];
});

const sql = `do $apply_q34_39$
declare
  n integer;
  ts timestamptz := now();
begin
  -- Préconditions répétées DANS la transaction afin de fermer la fenêtre de concurrence.
  select count(*) into n from segments
  where id=any(array[${segmentIds.map(Number).join(',')}]::bigint[])
    and id_oeuvre='${OEUVRE}' and ref_niv1='${PARTIE}'
    and ref_niv2=any(array[${QUESTIONS.map(sqlString).join(',')}]::text[])
    and liens_revus_le is null and liens_revus_par is null;
  if n<>212 then raise exception 'Précondition transactionnelle segments : %/212',n; end if;

  select count(*) into n from liens_bibliques
  where segment_id=any(array[${segmentIds.map(Number).join(',')}]::bigint[]);
  if n<>58 then raise exception 'Précondition transactionnelle liens : %/58',n; end if;

  -- Les 48 liens justes sont eux aussi passés à l'état effectivement lu,
  -- avec garde exacte sur chaque état antérieur.
  ${updateRetained}

  ${updateCorrections}

  insert into liens_bibliques
    (segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
  values ${insertValues};
  get diagnostics n=row_count;
  if n<>47 then raise exception 'Liens ajoutés : %/47',n; end if;

  with ids(id) as (values ${segmentValues})
  update segments s
  set liens_revus_le=ts, liens_revus_par='IA-lecture'
  from ids
  where s.id=ids.id and s.id_oeuvre='${OEUVRE}' and s.ref_niv1='${PARTIE}'
    and s.liens_revus_le is null and s.liens_revus_par is null;
  get diagnostics n=row_count;
  if n<>212 then raise exception 'Segments marqués : %/212',n; end if;

  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentIds.map(Number).join(',')}]::bigint[]);
  if n<>105 then raise exception 'Total final des liens : %/105',n; end if;

  select count(*) into n from liens_bibliques
  where segment_id=any(array[${segmentIds.map(Number).join(',')}]::bigint[])
    and fiabilite='vérifié' and provenance='lecture' and arbitrage_requis=false;
  if n<>105 then raise exception 'Liens finaux vérifiés/lecture/sans arbitrage : %/105',n; end if;

  select count(*) into n from (
    select segment_id,type,
      coalesce('c:'||canon_id,'v:'||verset_v2_id::text,'h:'||livre||':'||chapitre::text,'aucune') cible,
      count(*)
    from liens_bibliques
    where segment_id=any(array[${segmentIds.map(Number).join(',')}]::bigint[])
    group by segment_id,type,coalesce('c:'||canon_id,'v:'||verset_v2_id::text,'h:'||livre||':'||chapitre::text,'aucune')
    having count(*)>1
  ) d;
  if n<>0 then raise exception 'Doublons finaux : %',n; end if;

  ${expectedTypeCounts.map(([type, count]) => `select count(*) into n from liens_bibliques where segment_id=any(array[${segmentIds.map(Number).join(',')}]::bigint[]) and type=${type}; if n<>${count} then raise exception 'Type ${type} : %/${count}',n; end if;`).join('\n  ')}

  select count(*) into n from segments
  where id=any(array[${segmentIds.map(Number).join(',')}]::bigint[])
    and liens_revus_le=ts and liens_revus_par='IA-lecture';
  if n<>212 then raise exception 'État final segments : %/212',n; end if;
end
$apply_q34_39$;`;

const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}. Sauvegarde : ${backupName}`);

// Relecture indépendante du post-état.
const afterSegments = await must(
  sb.from('segments').select('id,segment_numero,liens_revus_le,liens_revus_par').in('id', segmentIds).order('segment_numero'),
  'contrôle final segments',
);
const afterLinks = [];
for (let i = 0; i < segmentIds.length; i += 100) {
  afterLinks.push(...await must(
    sb.from('liens_bibliques').select('*').in('segment_id', segmentIds.slice(i, i + 100)).order('id'),
    `contrôle final liens ${i}`,
  ));
}
if (afterSegments.length !== 212 || afterSegments.some((s) => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture')) throw new Error('Post-contrôle segments en échec.');
if (afterLinks.length !== 105 || afterLinks.some((l) => l.fiabilite !== 'vérifié' || l.provenance !== 'lecture' || l.arbitrage_requis)) throw new Error('Post-contrôle liens en échec.');
const afterKeys = afterLinks.map((l) => `${l.segment_id}|${targetKey(l)}|${l.type}`);
if (new Set(afterKeys).size !== afterKeys.length) throw new Error('Post-contrôle doublons en échec.');

const afterName = `ss-q34-39-live-after-${stamp}.json`;
const afterPayload = `${JSON.stringify({ exported_at: new Date().toISOString(), segments: afterSegments, links: afterLinks }, null, 2)}\n`;
writeFileSync(`${ROOT}/${afterName}`, afterPayload);
writeFileSync(`${ROOT}/${afterName}.sha256`, `${createHash('sha256').update(afterPayload).digest('hex')}  ${afterName}\n`);
console.log(JSON.stringify({
  applied: true,
  segments_marked: afterSegments.length,
  links_final: afterLinks.length,
  backup: `${ROOT}/${backupName}`,
  after: `${ROOT}/${afterName}`,
}, null, 2));
