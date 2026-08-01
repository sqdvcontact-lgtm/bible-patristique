import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q81-end-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/PP-Q81-119-DOSSIER-STRICT.json`, 'utf8'));
const desired = JSON.parse(readFileSync(`${ROOT}/PP-Q81-119-DESIRED-LINKS.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 39 }, (_, index) => `Question ${81 + index}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function must(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
const canonical = (value) => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;
const stable = (value) => JSON.stringify(canonical(value));
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`;
const tuple = (link) => JSON.stringify({
  segment_id: link.segment_id,
  canon_id: link.canon_id ?? null,
  verset_v2_id: link.verset_v2_id ?? null,
  livre: link.livre ?? null,
  chapitre: link.chapitre ?? null,
  type: link.type,
  fiabilite: link.fiabilite,
  motif: link.motif,
  provenance: link.provenance,
  arbitrage_requis: link.arbitrage_requis,
});

function snapshot(label, payload) {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `PP-Q81-119-${label}-${stamp}.json`;
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, body);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(body).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
}

async function live() {
  const segments = [];
  for (const question of questions) {
    for (let from = 0; ; from += 100) {
      const page = await must(db.from('segments').select('*')
        .eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Prima Pars').eq('ref_niv2', question)
        .order('segment_numero').range(from, from + 99), `${question}:${from}`);
      segments.push(...page);
      if (page.length < 100) break;
    }
  }
  segments.sort((left, right) => left.segment_numero - right.segment_numero);
  const links = [];
  for (let from = 0; from < segments.length; from += 100) {
    links.push(...await must(db.from('liens_bibliques').select('*')
      .in('segment_id', segments.slice(from, from + 100).map((segment) => segment.id)).order('id'), `liens:${from}`));
  }
  links.sort((left, right) => left.id - right.id);
  return { segments, links };
}

function isDone(state) {
  return state.segments.length === 1874
    && state.links.length === 340
    && state.segments.every((segment) => segment.liens_revus_le && segment.liens_revus_par === 'IA-lecture')
    && stable(state.links.map(tuple).sort()) === stable(desired.map(tuple).sort());
}

const desiredKey = (link) => `${link.segment_id}|${link.type}|${link.canon_id ?? ''}|${link.verset_v2_id ?? ''}|${link.livre ?? ''}|${link.chapitre ?? ''}`;
const desiredFunctionalGroups = new Map();
for (const link of desired) {
  const functionalKey = `${link.segment_id}|${link.canon_id ?? `${link.livre}.${link.chapitre}`}`;
  if (!desiredFunctionalGroups.has(functionalKey)) desiredFunctionalGroups.set(functionalKey, []);
  desiredFunctionalGroups.get(functionalKey).push(link.type);
}
const incompatibleType12 = [...desiredFunctionalGroups.values()].filter((types) => types.includes(1) && types.includes(2));
if (
  raw.segments.length !== 1874
  || raw.links.length !== 368
  || plan.decisions.length !== 368
  || plan.insertions.length !== 2
  || desired.length !== 340
  || plan.summary.suppressions !== 30
  || plan.summary.reclassements !== 9
  || plan.summary.liens_finaux_proposes !== 340
  || plan.summary.types_4_finaux !== 12
  || plan.summary.liens_chapitre_finaux !== 0
  || plan.controle_stratifie.length !== 60
  || plan.controle_stratifie.filter((item) => item.type >= 3).length !== 30
  || new Set(desired.map(desiredKey)).size !== desired.length
  || incompatibleType12.length !== 0
) throw new Error('Dossier ou desired state incomplet.');
for (const link of desired) {
  const exclusive = Number(Boolean(link.canon_id)) + Number(Boolean(link.verset_v2_id)) + Number(Boolean(link.livre && link.chapitre));
  if (exclusive !== 1 || !link.motif || link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis) throw new Error(`Desired link invalide : ${desiredKey(link)}`);
}

const state = await live();
const before = snapshot('live-before', state);
const exact = stable(state.segments) === stable(raw.segments) && stable(state.links) === stable(raw.links);
const done = isDone(state);
if (!exact && !done) throw new Error(`État divergent : ${before}`);

if (!APPLY) {
  const result = {
    ready: true,
    applied: false,
    noop_if_applied: done,
    guard: '--apply requis ; option non exécutée',
    database_mode: 'lecture seule',
    atomicite: 'transaction unique : scope relationnel verrouillé, garde des marqueurs et du préétat des liens, DELETE du scope, INSERT JSON recordset, assertions avant commit',
    before,
    preetat_exact: exact,
    range: [4307, 6180],
    questions: [81, 119],
    segments: 1874,
    delete_scope: 368,
    insert_json_recordset: 340,
    update_segments_bulk: 0,
    locked_segments_with_markers_asserted: 1874,
    checks: [
      'préétat exact ou postétat no-op',
      'scope relationnel de 1 874 segments verrouillés et marqueurs IA-lecture contrôlés sans UPDATE',
      '340 cibles exclusives',
      'absence de doublons',
      'absence de cibles mortes',
      'métadonnées vérifiées',
      'répartition T1=253, T2=21, T3=54, T4=12',
      'aucune cible chapitre',
      '60 contrôles dont 30 difficiles',
      'snapshots JSON et SHA-256 avant/après',
    ],
  };
  writeFileSync(`${ROOT}/PP-Q81-119-APPLY-DRY-RUN.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (done) {
  console.log(JSON.stringify({ noop: true, before }, null, 2));
  process.exit(0);
}

const sql = `
do $atomic$
declare
  n integer;
  scope_ids bigint[];
begin
  set local statement_timeout='120s';
  select array_agg(id order by segment_numero) into scope_ids
  from segments
  where id_oeuvre='A0013O0002'
    and ref_niv1='Prima Pars'
    and segment_numero between 4307 and 6180;
  n:=coalesce(array_length(scope_ids,1),0);
  if n<>1874 then raise exception 'scope segments %/1874',n; end if;
  perform 1 from segments where id=any(scope_ids) for update;

  perform 1 from liens_bibliques where segment_id=any(scope_ids) for update;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids);
  if n<>368 then raise exception 'préétat cardinal liens %/368',n; end if;
  select count(*) into n
  from jsonb_array_elements(${sqlJson(raw.links)}) expected
  join liens_bibliques current on current.id=(expected->>'id')::bigint
  where current.segment_id is not distinct from (expected->>'segment_id')::bigint
    and current.canon_id is not distinct from expected->>'canon_id'
    and current.verset_v2_id is not distinct from (expected->>'verset_v2_id')::uuid
    and current.livre is not distinct from expected->>'livre'
    and current.chapitre is not distinct from (expected->>'chapitre')::integer
    and current.type is not distinct from (expected->>'type')::integer
    and current.fiabilite is not distinct from expected->>'fiabilite'
    and current.motif is not distinct from expected->>'motif'
    and current.provenance is not distinct from expected->>'provenance'
    and current.created_at is not distinct from (expected->>'created_at')::timestamptz
    and current.updated_at is not distinct from (expected->>'updated_at')::timestamptz
    and current.arbitrage_requis is not distinct from (expected->>'arbitrage_requis')::boolean;
  if n<>368 then raise exception 'préétat contenu liens %/368',n; end if;

  delete from liens_bibliques where segment_id=any(scope_ids);
  get diagnostics n=row_count; if n<>368 then raise exception 'liens supprimés %/368',n; end if;

  insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
  select value.segment_id,value.canon_id,value.verset_v2_id,value.livre,value.chapitre,value.type,value.fiabilite,value.motif,value.provenance,value.arbitrage_requis
  from jsonb_to_recordset(${sqlJson(desired)}) as value(
    segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,
    fiabilite text,motif text,provenance text,arbitrage_requis boolean
  );
  get diagnostics n=row_count; if n<>340 then raise exception 'liens insérés %/340',n; end if;

  select count(*) into n from segments
  where id=any(scope_ids) and liens_revus_le is not null and liens_revus_par='IA-lecture';
  if n<>1874 then raise exception 'marqueurs segments %/1874',n; end if;

  select count(*) into n from liens_bibliques where segment_id=any(scope_ids);
  if n<>340 then raise exception 'total final %/340',n; end if;
  select count(*) into n
  from jsonb_to_recordset(${sqlJson(desired)}) as expected(
    segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,
    fiabilite text,motif text,provenance text,arbitrage_requis boolean
  )
  join liens_bibliques current
    on current.segment_id=expected.segment_id
   and current.type=expected.type
   and current.canon_id is not distinct from expected.canon_id
   and current.verset_v2_id is not distinct from expected.verset_v2_id
   and current.livre is not distinct from expected.livre
   and current.chapitre is not distinct from expected.chapitre
   and current.fiabilite is not distinct from expected.fiabilite
   and current.motif is not distinct from expected.motif
   and current.provenance is not distinct from expected.provenance
   and current.arbitrage_requis is not distinct from expected.arbitrage_requis;
  if n<>340 then raise exception 'contenu final %/340',n; end if;

  select count(*) into n from (
    select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)
    from liens_bibliques where segment_id=any(scope_ids)
    group by 1,2,3,4,5,6 having count(*)>1
  ) duplicates;
  if n<>0 then raise exception 'doublons %',n; end if;
  select count(*) into n
  from liens_bibliques t1
  join liens_bibliques t2 on t2.segment_id=t1.segment_id and t2.canon_id=t1.canon_id and t2.type=2
  where t1.segment_id=any(scope_ids) and t1.type=1;
  if n<>0 then raise exception 'coexistences fonctionnelles T1/T2 %',n; end if;
  select count(*) into n from liens_bibliques link
  where link.segment_id=any(scope_ids)
    and ((link.canon_id is not null)::integer + (link.verset_v2_id is not null)::integer + (link.livre is not null and link.chapitre is not null)::integer)<>1;
  if n<>0 then raise exception 'cibles non exclusives %',n; end if;
  select count(*) into n from liens_bibliques link
  where link.segment_id=any(scope_ids) and link.canon_id is not null
    and not exists(select 1 from versets_lecture verse where verse.id_verset=link.canon_id);
  if n<>0 then raise exception 'cibles mortes %',n; end if;
  select count(*) into n from liens_bibliques
  where segment_id=any(scope_ids)
    and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis or motif is null or motif='');
  if n<>0 then raise exception 'métadonnées invalides %',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and livre is not null;
  if n<>0 then raise exception 'cibles chapitre %/0',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=1;
  if n<>253 then raise exception 'T1 %/253',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=2;
  if n<>21 then raise exception 'T2 %/21',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=3;
  if n<>54 then raise exception 'T3 %/54',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=4;
  if n<>12 then raise exception 'T4 %/12',n; end if;
end $atomic$;
`;

const { error } = await db.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction : ${error.message}`);
const afterLive = await live();
const after = snapshot('live-after', afterLive);
if (!isDone(afterLive)) throw new Error(`Postétat divergent : ${after}`);
console.log(JSON.stringify({ applied: true, before, after, segments: 1874, links: 340 }, null, 2));
