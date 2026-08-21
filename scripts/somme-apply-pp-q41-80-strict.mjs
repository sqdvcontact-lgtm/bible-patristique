import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ROOT = "tmp/somme-liens-audit-2026-07-29";
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q41-80-raw.json`, "utf8"));
const plan = JSON.parse(
  readFileSync(`${ROOT}/PP-Q41-80-DOSSIER-STRICT.json`, "utf8"),
);
const APPLY = process.argv.includes("--apply");
const questions = Array.from(
  { length: 40 },
  (_, index) => `Question ${41 + index}`,
);
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, "")]),
);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
async function must(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
const stable = (value) => JSON.stringify(value);
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`;
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
function snapshot(label, payload) {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");
  const name = `PP-Q41-80-${label}-${stamp}.json`;
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, body);
  writeFileSync(
    `${ROOT}/${name}.sha256`,
    `${createHash("sha256").update(body).digest("hex")}  ${name}\n`,
  );
  return `${ROOT}/${name}`;
}
async function live() {
  const segments = [];
  for (const question of questions)
    for (let from = 0; ; from += 100) {
      const page = await must(
        db
          .from("segments")
          .select("*")
          .eq("id_oeuvre", "A0013O0002")
          .eq("ref_niv1", "Prima Pars")
          .eq("ref_niv2", question)
          .order("segment_numero")
          .range(from, from + 99),
        `${question}:${from}`,
      );
      segments.push(...page);
      if (page.length < 100) break;
    }
  segments.sort((left, right) => left.segment_numero - right.segment_numero);
  const links = [];
  for (let from = 0; from < segments.length; from += 100)
    links.push(
      ...(await must(
        db
          .from("liens_bibliques")
          .select("*")
          .in(
            "segment_id",
            segments.slice(from, from + 100).map((segment) => segment.id),
          )
          .order("id"),
        `liens:${from}`,
      )),
    );
  links.sort((left, right) => left.id - right.id);
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
    state.segments.length === 2092 &&
    state.links.length === 391 &&
    state.segments.every(
      (segment) =>
        segment.liens_revus_le && segment.liens_revus_par === "IA-lecture",
    ) &&
    stable(state.links.map(tuple).sort()) ===
      stable(
        desired
          .map((link) =>
            tuple({ ...link, verset_v2_id: null, livre: null, chapitre: null }),
          )
          .sort(),
      )
  );
}
if (
  raw.segments.length !== 2092 ||
  raw.links.length !== 398 ||
  plan.decisions.length !== 398 ||
  plan.insertions.length !== 4 ||
  desired.length !== 391 ||
  plan.summary.suppressions !== 11 ||
  plan.summary.reclassements !== 10 ||
  plan.controle_stratifie.length !== 30 ||
  plan.controle_stratifie.filter((item) => item.type >= 3).length !== 15
)
  throw new Error("dossier incomplet");
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
        statement_timeout_local: "120s avant DO",
        scope_sql:
          "A0013O0002 / Prima Pars / segment_numero 2215–4306, résolu une fois en scope_ids",
        before,
        preetat_exact: exact,
        range: [2215, 4306],
        segments: 2092,
        delete_scope: 398,
        insert_bulk: 391,
        update_segments_bulk: 0,
        segments_guard_only: "2092 marqueurs IA-lecture déjà présents",
        checks: [
          "préétat/postétat idempotent",
          "garde transactionnelle du préétat",
          "cibles exclusives",
          "doublons",
          "cibles mortes",
          "métadonnées",
          "14 T4 initiaux et cibles spéciales",
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
const sql = `
set local statement_timeout = '120s';
do $atomic$
declare
  n integer;
  scope_ids bigint[];
begin
  select array_agg(id order by id) into scope_ids
  from segments
  where id_oeuvre='A0013O0002'
    and ref_niv1='Prima Pars'
    and segment_numero between 2215 and 4306;
  if cardinality(scope_ids)<>2092 then raise exception 'scope segments %/2092',cardinality(scope_ids); end if;
  perform 1 from segments where id=any(scope_ids) for update;
  select count(*) into n from segments where id=any(scope_ids) and liens_revus_le is not null and liens_revus_par='IA-lecture';
  if n<>2092 then raise exception 'marqueurs segments %/2092',n; end if;
  perform 1 from liens_bibliques where segment_id=any(scope_ids) for update;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids);
  if n<>398 then raise exception 'préétat cardinal liens %/398',n; end if;
  delete from liens_bibliques where segment_id=any(scope_ids);
  insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
  select value.segment_id,value.canon_id,null,null,null,value.type,value.fiabilite,value.motif,value.provenance,value.arbitrage_requis
  from jsonb_to_recordset(${sqlJson(desired)}) as value(segment_id bigint,canon_id text,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean);
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids); if n<>391 then raise exception 'total final %/391',n; end if;
  select count(*) into n from jsonb_to_recordset(${sqlJson(desired)}) as expected(segment_id bigint,canon_id text,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean) join liens_bibliques current on current.segment_id=expected.segment_id and current.canon_id=expected.canon_id and current.type=expected.type where current.verset_v2_id is null and current.livre is null and current.chapitre is null and current.fiabilite is not distinct from expected.fiabilite and current.motif is not distinct from expected.motif and current.provenance is not distinct from expected.provenance and current.arbitrage_requis is not distinct from expected.arbitrage_requis;
  if n<>391 then raise exception 'contenu final %/391',n; end if;
  select count(*) into n from (select segment_id,type,canon_id,count(*) from liens_bibliques where segment_id=any(scope_ids) group by 1,2,3 having count(*)>1) duplicates; if n<>0 then raise exception 'doublons %',n; end if;
  select count(*) into n from liens_bibliques link where link.segment_id=any(scope_ids) and not exists(select 1 from versets_lecture verse where verse.id_verset=link.canon_id); if n<>0 then raise exception 'cibles mortes %',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and (canon_id is null or verset_v2_id is not null or livre is not null or chapitre is not null or fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis or motif is null or motif=''); if n<>0 then raise exception 'cibles/métadonnées %',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=4; if n<>2 then raise exception 'T4 finaux %/2',n; end if;
end $atomic$;
`;
const { error } = await db.rpc("exec_sql", { sql });
if (error) throw new Error(`transaction: ${error.message}`);
const afterLive = await live();
const after = snapshot("live-after", afterLive);
if (!isDone(afterLive)) throw new Error(`postétat divergent ${after}`);
console.log(
  JSON.stringify(
    { applied: true, before, after, segments: 2092, links: 391 },
    null,
    2,
  ),
);
