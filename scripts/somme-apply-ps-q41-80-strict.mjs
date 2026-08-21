import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const R = "tmp/somme-liens-audit-2026-07-29",
  raw = JSON.parse(readFileSync(`${R}/ps-q41-80-raw.json`, "utf8")),
  plan = JSON.parse(readFileSync(`${R}/PS-Q41-80-DOSSIER-STRICT.json`, "utf8")),
  APPLY = process.argv.includes("--apply"),
  questions = Array.from({ length: 40 }, (_, i) => `Question ${41 + i}`),
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
  );
const must = async (q, l) => {
    const { data, error } = await q;
    if (error) throw Error(`${l}: ${error.message}`);
    return data;
  },
  stable = (v) => JSON.stringify(v),
  sqlString = (v) => `'${String(v).replaceAll("'", "''")}'`,
  sqlJson = (v) => `${sqlString(JSON.stringify(v))}::jsonb`,
  tuple = (l) =>
    JSON.stringify({
      segment_id: l.segment_id,
      canon_id: l.canon_id ?? null,
      verset_v2_id: l.verset_v2_id ?? null,
      livre: l.livre ?? null,
      chapitre: l.chapitre ?? null,
      type: l.type,
      fiabilite: l.fiabilite,
      motif: l.motif,
      provenance: l.provenance,
      arbitrage_requis: l.arbitrage_requis,
    });
function snap(label, p) {
  mkdirSync(R, { recursive: true });
  const stamp = new Date()
      .toISOString()
      .replaceAll(":", "-")
      .replaceAll(".", "-"),
    name = `PS-Q41-80-${label}-${stamp}.json`,
    body = JSON.stringify(p, null, 2) + "\n";
  writeFileSync(`${R}/${name}`, body);
  writeFileSync(
    `${R}/${name}.sha256`,
    `${createHash("sha256").update(body).digest("hex")}  ${name}\n`,
  );
  return `${R}/${name}`;
}
async function live() {
  const segments = [];
  for (const q of questions)
    for (let from = 0; ; from += 100) {
      const page = await must(
        db
          .from("segments")
          .select("*")
          .eq("id_oeuvre", "A0013O0002")
          .eq("ref_niv1", "Prima Secundae")
          .eq("ref_niv2", q)
          .order("segment_numero")
          .range(from, from + 99),
        `${q}:${from}`,
      );
      segments.push(...page);
      if (page.length < 100) break;
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
        `liens:${i}`,
      )),
    );
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
}
const desired = [
  ...plan.decisions
    .filter((x) => x.decision !== "supprimer")
    .map((x) => ({ segment_id: x.segment_id, ...x.final })),
  ...plan.insertions,
].map((x) => ({
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
}));
const isDone = (x) =>
  x.segments.length === 2041 &&
  x.links.length === 347 &&
  x.segments.every(
    (s) => s.liens_revus_le && s.liens_revus_par === "IA-lecture",
  ) &&
  stable(x.links.map(tuple).sort()) === stable(desired.map(tuple).sort());
if (
  raw.segments.length !== 2041 ||
  raw.links.length !== 341 ||
  plan.decisions.length !== 341 ||
  plan.insertions.length !== 14 ||
  desired.length !== 347 ||
  plan.summary.suppressions !== 8 ||
  plan.summary.reciblages !== 3 ||
  plan.summary.reclassements !== 14 ||
  plan.controle_stratifie.length !== 30 ||
  plan.controle_stratifie.filter((x) => x.type >= 3).length !== 15
)
  throw Error("dossier incomplet");
const state = await live(),
  before = snap("live-before", state),
  exact =
    stable(state.segments) === stable(raw.segments) &&
    stable(state.links) === stable(raw.links),
  done = isDone(state);
if (!exact && !done) throw Error(`état divergent ${before}`);
if (!APPLY) {
  console.log(
    JSON.stringify(
      {
        ready: true,
        applied: false,
        noop_if_applied: done,
        guard: "--apply requis ; option non exécutée",
        atomicite: "transaction unique, bulk liens seulement",
        statement_timeout_local: "120s avant DO",
        scope_sql:
          "A0013O0002 / Prima Secundae / segment_numero 8328–10368, résolu une fois",
        before,
        preetat_exact: exact,
        range: [8328, 10368],
        segments: 2041,
        delete_scope: 341,
        insert_bulk: 347,
        update_segments_bulk: 0,
        segments_guard_only: "2041 marqueurs IA-lecture déjà présents",
        checks: [
          "préétat live exact et postétat idempotent",
          "scope et marqueurs verrouillés/assertés",
          "cibles exclusives canon/chapitre",
          "doublons",
          "cibles mortes",
          "métadonnées",
          "11 T4 et 44 chapitres audités",
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
set local statement_timeout='120s';
do $atomic$
declare n integer; scope_ids bigint[];
begin
 select array_agg(id order by id) into scope_ids from segments where id_oeuvre='A0013O0002' and ref_niv1='Prima Secundae' and segment_numero between 8328 and 10368;
 if cardinality(scope_ids)<>2041 then raise exception 'scope %/2041',cardinality(scope_ids);end if;
 perform 1 from segments where id=any(scope_ids) for update;
 select count(*) into n from segments where id=any(scope_ids) and liens_revus_le is not null and liens_revus_par='IA-lecture';if n<>2041 then raise exception 'marqueurs %/2041',n;end if;
 perform 1 from liens_bibliques where segment_id=any(scope_ids) for update;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids);if n<>341 then raise exception 'préétat cardinal %/341',n;end if;
 delete from liens_bibliques where segment_id=any(scope_ids);
 insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
 select x.segment_id,x.canon_id,x.verset_v2_id,x.livre,x.chapitre,x.type,x.fiabilite,x.motif,x.provenance,x.arbitrage_requis from jsonb_to_recordset(${sqlJson(desired)}) as x(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean);
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids);if n<>347 then raise exception 'total final %/347',n;end if;
 select count(*) into n from jsonb_to_recordset(${sqlJson(desired)}) as e(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean) join liens_bibliques c on c.segment_id=e.segment_id and c.type=e.type and c.canon_id is not distinct from e.canon_id and c.verset_v2_id is not distinct from e.verset_v2_id and c.livre is not distinct from e.livre and c.chapitre is not distinct from e.chapitre where c.fiabilite is not distinct from e.fiabilite and c.motif is not distinct from e.motif and c.provenance is not distinct from e.provenance and c.arbitrage_requis is not distinct from e.arbitrage_requis;if n<>347 then raise exception 'contenu final %/347',n;end if;
 select count(*) into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id=any(scope_ids) group by 1,2,3,4,5,6 having count(*)>1)d;if n<>0 then raise exception 'doublons %',n;end if;
 select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and l.canon_id is not null and not exists(select 1 from versets_lecture v where v.id_verset=l.canon_id);if n<>0 then raise exception 'cibles mortes %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and not((canon_id is not null and verset_v2_id is null and livre is null and chapitre is null)or(canon_id is null and verset_v2_id is null and livre is not null and chapitre is not null));if n<>0 then raise exception 'cibles exclusives %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and(fiabilite<>'vérifié'or provenance<>'lecture'or arbitrage_requis or motif is null or motif='');if n<>0 then raise exception 'métadonnées %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=4;if n<>0 then raise exception 'T4 finaux %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and livre is not null;if n<>41 then raise exception 'chapitres finaux %/41',n;end if;
end $atomic$;`;
const { error } = await db.rpc("exec_sql", { sql });
if (error) throw Error(`transaction: ${error.message}`);
const afterLive = await live(),
  after = snap("live-after", afterLive);
if (!isDone(afterLive)) throw Error(`postétat ${after}`);
console.log(
  JSON.stringify(
    { applied: true, before, after, segments: 2041, links: 347 },
    null,
    2,
  ),
);
