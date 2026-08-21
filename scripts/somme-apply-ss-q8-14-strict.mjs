import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const R = "tmp/somme-liens-audit-2026-07-29";
const raw = JSON.parse(readFileSync(`${R}/ss-q8-14-raw.json`, "utf8"));
const plan = JSON.parse(
  readFileSync(`${R}/SS-Q8-14-DOSSIER-STRICT.json`, "utf8"),
);
const APPLY = process.argv.includes("--apply");
const questions = Array.from({ length: 7 }, (_, i) => `Question ${8 + i}`);
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw Error(`${label}: ${error.message}`);
  return data;
};
const stable = (value) => JSON.stringify(value);
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`;
const tuple = (link) =>
  JSON.stringify({
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
  mkdirSync(R, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");
  const name = `SS-Q8-14-${label}-${stamp}.json`;
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
        db
          .from("segments")
          .select("*")
          .eq("id_oeuvre", "A0013O0002")
          .eq("ref_niv1", "Secunda Secundae")
          .eq("ref_niv2", question)
          .order("segment_numero")
          .range(from, from + 99),
        `${question}:${from}`,
      );
      segments.push(...page);
      if (page.length < 100) break;
    }
  }
  segments.sort((a, b) => a.segment_numero - b.segment_numero);
  const links = [];
  for (let i = 0; i < segments.length; i += 100) {
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
  }
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

const isDone = (state) =>
  state.segments.length === 347 &&
  state.links.length === 154 &&
  state.segments.every(
    (segment) =>
      segment.liens_revus_le && segment.liens_revus_par === "IA-lecture",
  ) &&
  stable(state.links.map(tuple).sort()) === stable(desired.map(tuple).sort());

if (
  raw.segments.length !== 347 ||
  raw.links.length !== 133 ||
  plan.decisions.length !== 133 ||
  plan.insertions.length !== 26 ||
  desired.length !== 154 ||
  plan.summary.suppressions !== 5 ||
  plan.summary.reciblages !== 0 ||
  plan.summary.reclassements !== 7 ||
  plan.summary.segments_a_marquer !== 0 ||
  plan.controle_stratifie.length !== 30 ||
  plan.controle_stratifie.filter((x) => x.type >= 3).length !== 15
) {
  throw Error("dossier incomplet");
}

const state = await live();
const before = snapshot("live-before", state);
const exact =
  stable(state.segments) === stable(raw.segments) &&
  stable(state.links) === stable(raw.links);
const done = isDone(state);
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
          "A0013O0002 / Secunda Secundae / Questions 8–14 / segment_numero 12789–13135",
        before,
        preetat_exact: exact,
        range: [12789, 13135],
        segments: 347,
        delete_scope: 133,
        insert_bulk: 154,
        update_segments_bulk: 0,
        segments_guard_only: "347 marqueurs IA-lecture déjà présents",
        checks: [
          "préétat live exact et postétat idempotent",
          "scope Q8–14 et marqueurs verrouillés/assertés",
          "cibles exclusives canon/chapitre",
          "doublons",
          "cibles mortes",
          "métadonnées",
          "7 T4 et 6 chapitres audités",
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
 select array_agg(id order by id) into scope_ids from segments where id_oeuvre='A0013O0002' and ref_niv1='Secunda Secundae' and ref_niv2=any(array['Question 8','Question 9','Question 10','Question 11','Question 12','Question 13','Question 14']) and segment_numero between 12789 and 13135;
 if cardinality(scope_ids)<>347 then raise exception 'scope %/347',cardinality(scope_ids);end if;
 perform 1 from segments where id=any(scope_ids) for update;
 select count(*) into n from segments where id=any(scope_ids) and liens_revus_le is not null and liens_revus_par='IA-lecture';if n<>347 then raise exception 'marqueurs %/347',n;end if;
 perform 1 from liens_bibliques where segment_id=any(scope_ids) for update;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids);if n<>133 then raise exception 'préétat cardinal %/133',n;end if;
 delete from liens_bibliques where segment_id=any(scope_ids);
 insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
 select x.segment_id,x.canon_id,x.verset_v2_id,x.livre,x.chapitre,x.type,x.fiabilite,x.motif,x.provenance,x.arbitrage_requis from jsonb_to_recordset(${sqlJson(desired)}) as x(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean);
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids);if n<>154 then raise exception 'total final %/154',n;end if;
 select count(*) into n from jsonb_to_recordset(${sqlJson(desired)}) as e(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean) join liens_bibliques c on c.segment_id=e.segment_id and c.type=e.type and c.canon_id is not distinct from e.canon_id and c.verset_v2_id is not distinct from e.verset_v2_id and c.livre is not distinct from e.livre and c.chapitre is not distinct from e.chapitre where c.fiabilite is not distinct from e.fiabilite and c.motif is not distinct from e.motif and c.provenance is not distinct from e.provenance and c.arbitrage_requis is not distinct from e.arbitrage_requis;if n<>154 then raise exception 'contenu final %/154',n;end if;
 select count(*) into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id=any(scope_ids) group by 1,2,3,4,5,6 having count(*)>1)d;if n<>0 then raise exception 'doublons %',n;end if;
 select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and l.canon_id is not null and not exists(select 1 from versets_lecture v where v.id_verset=l.canon_id);if n<>0 then raise exception 'cibles mortes %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and not((canon_id is not null and verset_v2_id is null and livre is null and chapitre is null)or(canon_id is null and verset_v2_id is null and livre is not null and chapitre is not null));if n<>0 then raise exception 'cibles exclusives %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and(fiabilite<>'vérifié'or provenance<>'lecture'or arbitrage_requis or motif is null or motif='');if n<>0 then raise exception 'métadonnées %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and type=4;if n<>0 then raise exception 'T4 finaux %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and livre is not null;if n<>1 then raise exception 'chapitres finaux %/1',n;end if;
end $atomic$;`;

const { error } = await db.rpc("exec_sql", { sql });
if (error) throw Error(`transaction: ${error.message}`);
const afterLive = await live();
const after = snapshot("live-after", afterLive);
if (!isDone(afterLive)) throw Error(`postétat ${after}`);
console.log(
  JSON.stringify(
    { applied: true, before, after, segments: 347, links: 154 },
    null,
    2,
  ),
);
