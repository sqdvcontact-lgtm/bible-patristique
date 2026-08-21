import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const ROOT = "tmp/somme-liens-audit-2026-07-29",
  raw = JSON.parse(readFileSync(`${ROOT}/ps-q81-end-raw.json`, "utf8")),
  plan = JSON.parse(
    readFileSync(`${ROOT}/PS-Q81-114-DOSSIER-STRICT.json`, "utf8"),
  ),
  desired = JSON.parse(
    readFileSync(`${ROOT}/PS-Q81-114-DESIRED-LINKS.json`, "utf8"),
  ),
  APPLY = process.argv.includes("--apply"),
  questions = Array.from({ length: 34 }, (_, i) => `Question ${81 + i}`),
  env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  ),
  db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  must = async (q, l) => {
    const { data, error } = await q;
    if (error) throw new Error(`${l}: ${error.message}`);
    return data;
  },
  canon = (v) =>
    Array.isArray(v)
      ? v.map(canon)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canon(v[k])]),
          )
        : v,
  stable = (v) => JSON.stringify(canon(v)),
  sqlString = (v) => `'${String(v).replaceAll("'", "''")}'`,
  sqlJson = (v) => `${sqlString(JSON.stringify(v))}::jsonb`,
  tuple = (x) =>
    JSON.stringify({
      segment_id: x.segment_id,
      canon_id: x.canon_id ?? null,
      verset_v2_id: x.verset_v2_id ?? null,
      livre: x.livre ?? null,
      chapitre: x.chapitre ?? null,
      type: x.type,
      fiabilite: x.fiabilite,
      motif: x.motif,
      provenance: x.provenance,
      arbitrage_requis: x.arbitrage_requis,
    });
function snapshot(label, payload) {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date()
      .toISOString()
      .replaceAll(":", "-")
      .replaceAll(".", "-"),
    name = `PS-Q81-114-${label}-${stamp}.json`,
    body = `${JSON.stringify(payload, null, 2)}\n`;
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
      const p = await must(
        db
          .from("segments")
          .select("*")
          .eq("id_oeuvre", "A0013O0002")
          .eq("ref_niv1", "Prima Secundae")
          .eq("ref_niv2", question)
          .order("segment_numero")
          .range(from, from + 99),
        `${question}:${from}`,
      );
      segments.push(...p);
      if (p.length < 100) break;
    }
  segments.sort((a, b) => a.segment_numero - b.segment_numero);
  const links = [];
  for (let i = 0; i < segments.length; i += 100)
    links.push(
      ...(await must(
        db
          .from("liens_bibliques")
          .select("*")
          .in(
            "segment_id",
            segments.slice(i, i + 100).map((s) => s.id),
          )
          .order("id"),
        `links:${i}`,
      )),
    );
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
}
const isDone = (s) =>
    s.segments.length === 2036 &&
    s.links.length === 1175 &&
    s.segments.every(
      (x) => x.liens_revus_le && x.liens_revus_par === "IA-lecture",
    ) &&
    stable(s.links.map(tuple).sort()) === stable(desired.map(tuple).sort()),
  key = (x) =>
    `${x.segment_id}|${x.type}|${x.canon_id ?? ""}|${x.verset_v2_id ?? ""}|${x.livre ?? ""}|${x.chapitre ?? ""}`;
if (
  raw.segments.length !== 2036 ||
  raw.links.length !== 1147 ||
  plan.decisions.length !== 1147 ||
  plan.insertions.length !== 31 ||
  desired.length !== 1175 ||
  plan.summary.suppressions !== 3 ||
  plan.summary.cibles_corrigees !== 5 ||
  plan.summary.liens_chapitre_finaux !== 71 ||
  plan.controle_stratifie.length !== 60 ||
  plan.controle_stratifie.filter((x) => x.type >= 3).length !== 30 ||
  new Set(desired.map(key)).size !== desired.length
)
  throw new Error("Dossier incomplet");
for (const x of desired)
  if (
    Number(!!x.canon_id) +
      Number(!!x.verset_v2_id) +
      Number(!!(x.livre && x.chapitre)) !==
      1 ||
    x.fiabilite !== "vérifié" ||
    x.provenance !== "lecture" ||
    x.arbitrage_requis ||
    !x.motif
  )
    throw new Error(`Desired invalide ${key(x)}`);
const state = await live(),
  before = snapshot("live-before", state),
  exact =
    stable(state.segments) === stable(raw.segments) &&
    stable(state.links) === stable(raw.links),
  done = isDone(state);
if (!exact && !done) throw new Error(`État divergent ${before}`);
if (!APPLY) {
  const result = {
    ready: true,
    applied: false,
    noop_if_applied: done,
    guard: "--apply requis ; option non exécutée",
    database_mode: "lecture seule",
    atomicite:
      "transaction unique : scope relationnel Q81–Q114 verrouillé, marqueurs assertés sans UPDATE, DELETE 1147, INSERT JSON recordset 1175, assertions avant commit",
    before,
    preetat_exact: exact,
    range: [10369, 12407],
    questions: [81, 114],
    scope_filter:
      "id_oeuvre + ref_niv1 + ref_niv2 ANY(Question 81..Question 114) + bornes segment_numero",
    segments: 2036,
    delete_scope: 1147,
    insert_json_recordset: 1175,
    update_segments_bulk: 0,
    locked_segments_with_markers_asserted: 2036,
    checks: [
      "préétat exact ou postétat no-op",
      "cibles exclusives et chapitres valides",
      "absence de doublons et cibles mortes",
      "T1=934 T2=4 T3=80 T4=157",
      "71 cibles chapitre",
      "60 contrôles dont 30 difficiles",
      "snapshots JSON+SHA256",
    ],
  };
  writeFileSync(
    `${ROOT}/PS-Q81-114-APPLY-DRY-RUN.json`,
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
if (done) {
  console.log(JSON.stringify({ noop: true, before }, null, 2));
  process.exit(0);
}
const sql = `do $atomic$ declare n integer; scope_ids bigint[]; begin set local statement_timeout='120s'; select array_agg(id order by segment_numero) into scope_ids from segments where id_oeuvre='A0013O0002' and ref_niv1='Prima Secundae' and segment_numero between 10369 and 12407; n:=coalesce(array_length(scope_ids,1),0);if n<>2036 then raise exception 'scope %/2036',n;end if;perform 1 from segments where id=any(scope_ids) for update;select count(*) into n from segments where id=any(scope_ids) and liens_revus_le is not null and liens_revus_par='IA-lecture';if n<>2036 then raise exception 'marqueurs %/2036',n;end if;perform 1 from liens_bibliques where segment_id=any(scope_ids) for update;select count(*) into n from liens_bibliques where segment_id=any(scope_ids);if n<>1147 then raise exception 'préétat cardinal %/1147',n;end if;select count(*) into n from jsonb_array_elements(${sqlJson(raw.links)}) e join liens_bibliques c on c.id=(e->>'id')::bigint where c.segment_id is not distinct from (e->>'segment_id')::bigint and c.canon_id is not distinct from e->>'canon_id' and c.verset_v2_id is not distinct from (e->>'verset_v2_id')::uuid and c.livre is not distinct from e->>'livre' and c.chapitre is not distinct from (e->>'chapitre')::integer and c.type is not distinct from (e->>'type')::integer and c.fiabilite is not distinct from e->>'fiabilite' and c.motif is not distinct from e->>'motif' and c.provenance is not distinct from e->>'provenance' and c.created_at is not distinct from (e->>'created_at')::timestamptz and c.updated_at is not distinct from (e->>'updated_at')::timestamptz and c.arbitrage_requis is not distinct from (e->>'arbitrage_requis')::boolean;if n<>1147 then raise exception 'préétat contenu %/1147',n;end if;delete from liens_bibliques where segment_id=any(scope_ids);get diagnostics n=row_count;if n<>1147 then raise exception 'delete %/1147',n;end if;insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) select x.segment_id,x.canon_id,x.verset_v2_id,x.livre,x.chapitre,x.type,x.fiabilite,x.motif,x.provenance,x.arbitrage_requis from jsonb_to_recordset(${sqlJson(desired)}) x(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean);get diagnostics n=row_count;if n<>1175 then raise exception 'insert %/1175',n;end if;select count(*) into n from jsonb_to_recordset(${sqlJson(desired)}) e(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean) join liens_bibliques c on c.segment_id=e.segment_id and c.type=e.type and c.canon_id is not distinct from e.canon_id and c.verset_v2_id is not distinct from e.verset_v2_id and c.livre is not distinct from e.livre and c.chapitre is not distinct from e.chapitre and c.fiabilite=e.fiabilite and c.motif=e.motif and c.provenance=e.provenance and c.arbitrage_requis=e.arbitrage_requis;if n<>1175 then raise exception 'contenu final %/1175',n;end if;select count(*) into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id=any(scope_ids) group by 1,2,3,4,5,6 having count(*)>1)d;if n<>0 then raise exception 'doublons %',n;end if;select count(*) into n from liens_bibliques a join liens_bibliques b on b.segment_id=a.segment_id and b.canon_id=a.canon_id and b.type=2 where a.segment_id=any(scope_ids) and a.type=1;if n<>0 then raise exception 'coexistences T1/T2 %',n;end if;select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and ((l.canon_id is not null)::integer+(l.verset_v2_id is not null)::integer+(l.livre is not null and l.chapitre is not null)::integer)<>1;if n<>0 then raise exception 'cibles non exclusives %',n;end if;select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and l.canon_id is not null and not exists(select 1 from versets_lecture v where v.id_verset=l.canon_id);if n<>0 then raise exception 'cibles mortes %',n;end if;select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis or motif is null or motif='');if n<>0 then raise exception 'métadonnées %',n;end if;select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and livre is not null;if n<>71 then raise exception 'chapitres %/71',n;end if;select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=1;if n<>934 then raise exception 'T1 %/934',n;end if;select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=2;if n<>4 then raise exception 'T2 %/4',n;end if;select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=3;if n<>80 then raise exception 'T3 %/80',n;end if;select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=4;if n<>157 then raise exception 'T4 %/157',n;end if;end $atomic$;`;
const questionsSql = questions.map(sqlString).join(",");
const scopedSql = sql.replace(
  "and ref_niv1='Prima Secundae' and segment_numero",
  `and ref_niv1='Prima Secundae' and ref_niv2=any(array[${questionsSql}]::text[]) and segment_numero`,
);
if (!scopedSql.includes("ref_niv2=any(array['Question 81'"))
  throw new Error("Filtre transactionnel Q81–Q114 absent");
const { error } = await db.rpc("exec_sql", { sql: scopedSql });
if (error) throw new Error(`Transaction ${error.message}`);
const afterLive = await live(),
  after = snapshot("live-after", afterLive);
if (!isDone(afterLive)) throw new Error(`Postétat divergent ${after}`);
console.log(
  JSON.stringify(
    { applied: true, before, after, segments: 2036, links: 1175 },
    null,
    2,
  ),
);
