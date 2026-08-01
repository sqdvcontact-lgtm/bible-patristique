import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const R = "tmp/somme-liens-audit-2026-07-29";
const raw = JSON.parse(readFileSync(`${R}/sup-q61-80-raw.json`, "utf8"));
const plan = JSON.parse(
  readFileSync(`${R}/SUP-Q61-80-DOSSIER-STRICT.json`, "utf8"),
);
const APPLY = process.argv.includes("--apply");
const questions = Array.from(
  { length: 20 },
  (_, index) => `Question ${61 + index}`,
);
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, "")]),
);
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

async function must(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const stable = (value) => JSON.stringify(value);
const tuple = (link) =>
  JSON.stringify({
    segment_id: link.segment_id,
    canon_id: link.canon_id,
    verset_v2_id: link.verset_v2_id ?? null,
    livre: link.livre ?? null,
    chapitre: link.chapitre ?? null,
    type: link.type,
    fiabilite: link.fiabilite,
    motif: link.motif,
    provenance: link.provenance,
    arbitrage_requis: link.arbitrage_requis,
  });
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`;

function snapshot(label, payload) {
  mkdirSync(R, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");
  const name = `SUP-Q61-80-${label}-${stamp}.json`;
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${R}/${name}`, body);
  writeFileSync(
    `${R}/${name}.sha256`,
    `${createHash("sha256").update(body).digest("hex")}  ${name}\n`,
  );
  return `${R}/${name}`;
}

async function live() {
  const segments = [];
  for (const question of questions) {
    for (let from = 0; ; from += 100) {
      const page = await must(
        supabase
          .from("segments")
          .select("*")
          .eq("id_oeuvre", "A0013O0002")
          .eq("ref_niv1", "Supplément")
          .eq("ref_niv2", question)
          .order("segment_numero")
          .range(from, from + 99),
        question,
      );
      segments.push(...page);
      if (page.length < 100) break;
    }
  }
  segments.sort((a, b) => a.segment_numero - b.segment_numero);

  const links = [];
  for (let index = 0; index < segments.length; index += 100) {
    links.push(
      ...(await must(
        supabase
          .from("liens_bibliques")
          .select("*")
          .in(
            "segment_id",
            segments.slice(index, index + 100).map((segment) => segment.id),
          )
          .order("id"),
        "liens",
      )),
    );
  }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
}

const desired = [
  ...plan.decisions
    .filter((decision) => decision.decision !== "supprimer")
    .map((decision) => ({
      segment_id: decision.segment_id,
      ...decision.final,
    })),
  ...plan.insertions,
].map((link) => ({
  segment_id: link.segment_id,
  canon_id: link.canon_id,
  type: link.type,
  fiabilite: link.fiabilite,
  motif: link.motif,
  provenance: link.provenance,
  arbitrage_requis: link.arbitrage_requis,
}));

function isDone(state) {
  return (
    state.segments.length === 1188 &&
    state.links.length === 132 &&
    state.segments.every(
      (segment) => segment.liens_revus_le && segment.liens_revus_par,
    ) &&
    stable(state.links.map(tuple).sort()) ===
      stable(
        desired
          .map((link) =>
            tuple({
              ...link,
              verset_v2_id: null,
              livre: null,
              chapitre: null,
            }),
          )
          .sort(),
      )
  );
}

if (
  raw.segments.length !== 1188 ||
  raw.links.length !== 38 ||
  plan.decisions.length !== 38 ||
  plan.insertions.length !== 97 ||
  desired.length !== 132 ||
  plan.summary.liens_finaux_proposes !== 132 ||
  plan.controle_stratifie.length !== 30
) {
  throw new Error("dossier incomplet");
}

const state = await live();
const before = snapshot("live-before", state);
const exact =
  stable(state.segments) === stable(raw.segments) &&
  stable(state.links) === stable(raw.links);
const done = isDone(state);
if (!exact && !done) throw new Error(`état divergent ${before}`);

if (!APPLY) {
  console.log(
    JSON.stringify(
      {
        ready: true,
        applied: false,
        noop_if_applied: done,
        guard: "--apply requis ; option non exécutée",
        atomicite: "transaction unique, remplacement bulk du scope",
        before,
        preetat_exact: exact,
        range: [29958, 31229],
        segments: 1188,
        delete_scope: 38,
        insert_bulk: 132,
        update_segments_bulk: 1188,
        checks: [
          "préétat/postétat idempotent",
          "garde transactionnelle du préétat",
          "cibles exclusives",
          "doublons",
          "cibles mortes",
          "métadonnées",
          "30 contrôles dont 15 difficiles",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (done) {
  console.log(JSON.stringify({ noop: true, before }, null, 2));
  process.exit(0);
}

const segmentIds = state.segments.map((segment) => segment.id);
const expectedSegments = raw.segments.map((segment) => ({
  id: segment.id,
  segment_numero: segment.segment_numero,
  liens_revus_le: segment.liens_revus_le,
  liens_revus_par: segment.liens_revus_par,
}));

const sql = `
do $atomic$
declare
  n integer;
begin
  perform 1
  from segments
  where id = any(array[${segmentIds.join(",")}]::bigint[])
  for update;

  select count(*) into n
  from jsonb_array_elements(${sqlJson(expectedSegments)}) expected
  join segments current on current.id = (expected->>'id')::bigint
  where current.segment_numero is not distinct from (expected->>'segment_numero')::integer
    and current.liens_revus_le is not distinct from (expected->>'liens_revus_le')::timestamptz
    and current.liens_revus_par is not distinct from expected->>'liens_revus_par';
  if n <> 1188 then
    raise exception 'préétat segments divergent: %/1188', n;
  end if;

  perform 1
  from liens_bibliques
  where segment_id = any(array[${segmentIds.join(",")}]::bigint[])
  for update;

  select count(*) into n
  from liens_bibliques
  where segment_id = any(array[${segmentIds.join(",")}]::bigint[]);
  if n <> 38 then
    raise exception 'préétat liens, cardinal divergent: %/38', n;
  end if;

  select count(*) into n
  from jsonb_array_elements(${sqlJson(raw.links)}) expected
  join liens_bibliques current on current.id = (expected->>'id')::bigint
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
  if n <> 38 then
    raise exception 'préétat liens, contenu divergent: %/38', n;
  end if;

  delete from liens_bibliques
  where segment_id = any(array[${segmentIds.join(",")}]::bigint[]);

  insert into liens_bibliques (
    segment_id,
    canon_id,
    verset_v2_id,
    livre,
    chapitre,
    type,
    fiabilite,
    motif,
    provenance,
    arbitrage_requis
  )
  select
    value.segment_id,
    value.canon_id,
    null,
    null,
    null,
    value.type,
    value.fiabilite,
    value.motif,
    value.provenance,
    value.arbitrage_requis
  from jsonb_to_recordset(${sqlJson(desired)}) as value(
    segment_id bigint,
    canon_id text,
    type integer,
    fiabilite text,
    motif text,
    provenance text,
    arbitrage_requis boolean
  );

  update segments
  set liens_revus_le = coalesce(liens_revus_le, now()),
      liens_revus_par = coalesce(liens_revus_par, 'IA-lecture')
  where id = any(array[${segmentIds.join(",")}]::bigint[]);

  get diagnostics n = row_count;
  if n <> 1188 then
    raise exception 'mise à jour segments incomplète: %/1188', n;
  end if;

  select count(*) into n
  from liens_bibliques
  where segment_id = any(array[${segmentIds.join(",")}]::bigint[]);
  if n <> 132 then raise exception 'total final: %/132', n; end if;

  select count(*) into n
  from jsonb_to_recordset(${sqlJson(desired)}) as expected(
    segment_id bigint,
    canon_id text,
    type integer,
    fiabilite text,
    motif text,
    provenance text,
    arbitrage_requis boolean
  )
  join liens_bibliques current
    on current.segment_id = expected.segment_id
   and current.canon_id = expected.canon_id
   and current.type = expected.type
  where current.verset_v2_id is null
    and current.livre is null
    and current.chapitre is null
    and current.fiabilite is not distinct from expected.fiabilite
    and current.motif is not distinct from expected.motif
    and current.provenance is not distinct from expected.provenance
    and current.arbitrage_requis is not distinct from expected.arbitrage_requis;
  if n <> 132 then raise exception 'contenu final: %/132', n; end if;

  select count(*) into n
  from (
    select segment_id, type, canon_id, count(*)
    from liens_bibliques
    where segment_id = any(array[${segmentIds.join(",")}]::bigint[])
    group by 1, 2, 3
    having count(*) > 1
  ) duplicates;
  if n <> 0 then raise exception 'doublons finaux: %', n; end if;

  select count(*) into n
  from liens_bibliques link
  where link.segment_id = any(array[${segmentIds.join(",")}]::bigint[])
    and not exists (
      select 1 from versets_lecture verse where verse.id_verset = link.canon_id
    );
  if n <> 0 then raise exception 'cibles mortes: %', n; end if;

  select count(*) into n
  from segments
  where id = any(array[${segmentIds.join(",")}]::bigint[])
    and (liens_revus_le is null or liens_revus_par is null);
  if n <> 0 then raise exception 'métadonnées segments: %', n; end if;
end
$atomic$;
`;

const { error } = await supabase.rpc("exec_sql", { sql });
if (error) throw new Error(`transaction: ${error.message}`);

const afterLive = await live();
const after = snapshot("live-after", afterLive);
if (!isDone(afterLive)) throw new Error(`postétat divergent ${after}`);
console.log(
  JSON.stringify(
    { applied: true, before, after, segments: 1188, links: 132 },
    null,
    2,
  ),
);
