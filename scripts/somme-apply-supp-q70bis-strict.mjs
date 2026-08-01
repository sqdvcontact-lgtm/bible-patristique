import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const R = "tmp/somme-liens-audit-2026-07-29";
const raw = JSON.parse(readFileSync(`${R}/supp-q70bis-raw.json`, "utf8"));
const plan = JSON.parse(
  readFileSync(`${R}/SUPPLEMENT-Q70BIS-DOSSIER-STRICT.json`, "utf8"),
);
const APPLY = process.argv.includes("--apply");
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
  const name = `SUPPLEMENT-Q70BIS-${label}-${stamp}.json`;
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${R}/${name}`, body);
  writeFileSync(
    `${R}/${name}.sha256`,
    `${createHash("sha256").update(body).digest("hex")}  ${name}\n`,
  );
  return `${R}/${name}`;
}
async function live() {
  const segments = await must(
    db
      .from("segments")
      .select("*")
      .eq("id_oeuvre", "A0013O0002")
      .eq("ref_niv1", "Supplément")
      .eq("ref_niv2", "Question 70 bis")
      .order("segment_numero"),
    "segments",
  );
  const links = await must(
    db
      .from("liens_bibliques")
      .select("*")
      .in(
        "segment_id",
        segments.map((x) => x.id),
      )
      .order("id"),
    "liens",
  );
  return { segments, links };
}
const desired = plan.decisions.map((x) => ({
  segment_id: x.segment_id,
  canon_id: x.final.canon_id ?? null,
  verset_v2_id: x.final.verset_v2_id ?? null,
  livre: x.final.livre ?? null,
  chapitre: x.final.chapitre ?? null,
  type: x.final.type,
  fiabilite: x.final.fiabilite,
  motif: x.final.motif,
  provenance: x.final.provenance,
  arbitrage_requis: x.final.arbitrage_requis,
}));
const isDone = (state) =>
  state.segments.length === 22 &&
  state.links.length === 2 &&
  state.segments.every(
    (x) => x.liens_revus_le && x.liens_revus_par === "IA-lecture",
  ) &&
  stable(state.links.map(tuple).sort()) === stable(desired.map(tuple).sort());
if (
  raw.segments.length !== 22 ||
  raw.links.length !== 2 ||
  plan.decisions.length !== 2 ||
  plan.insertions.length !== 0 ||
  desired.length !== 2 ||
  plan.summary.segments_a_marquer !== 22 ||
  plan.controle_segments_exhaustif.length !== 22 ||
  plan.controle_liens_exhaustif.length !== 2
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
        atomicite: "transaction unique ; marqueurs et liens en bulk",
        scope_sql:
          "A0013O0002 / Supplément / Question 70 bis / segment_numero 30527–30548",
        before,
        preetat_exact: exact,
        segments: 22,
        update_segments_bulk: 22,
        delete_scope: 2,
        insert_bulk: 2,
        checks: [
          "préétat live exact et postétat idempotent",
          "scope exact Question 70 bis verrouillé/asserté",
          "22 marqueurs initialement absents",
          "cibles exclusives canon/chapitre",
          "doublons, cibles mortes et métadonnées",
          "contrôle exhaustif 22 segments et 2 liens",
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
 select array_agg(id order by id) into scope_ids from segments where id_oeuvre='A0013O0002' and ref_niv1='Supplément' and ref_niv2='Question 70 bis' and segment_numero between 30527 and 30548;
 if cardinality(scope_ids)<>22 then raise exception 'scope %/22',cardinality(scope_ids);end if;
 perform 1 from segments where id=any(scope_ids) for update;
 select count(*) into n from segments where id=any(scope_ids) and (liens_revus_le is not null or liens_revus_par is not null);if n<>0 then raise exception 'marqueurs préexistants %/0',n;end if;
 perform 1 from liens_bibliques where segment_id=any(scope_ids) for update;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids);if n<>2 then raise exception 'préétat cardinal %/2',n;end if;
 update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id=any(scope_ids);
 delete from liens_bibliques where segment_id=any(scope_ids);
 insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
 select x.segment_id,x.canon_id,x.verset_v2_id,x.livre,x.chapitre,x.type,x.fiabilite,x.motif,x.provenance,x.arbitrage_requis from jsonb_to_recordset(${sqlJson(desired)}) as x(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean);
 select count(*) into n from segments where id=any(scope_ids) and liens_revus_le is not null and liens_revus_par='IA-lecture';if n<>22 then raise exception 'marqueurs finaux %/22',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids);if n<>2 then raise exception 'total final %/2',n;end if;
 select count(*) into n from jsonb_to_recordset(${sqlJson(desired)}) as e(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean) join liens_bibliques c on c.segment_id=e.segment_id and c.type=e.type and c.canon_id is not distinct from e.canon_id and c.verset_v2_id is not distinct from e.verset_v2_id and c.livre is not distinct from e.livre and c.chapitre is not distinct from e.chapitre where c.fiabilite is not distinct from e.fiabilite and c.motif is not distinct from e.motif and c.provenance is not distinct from e.provenance and c.arbitrage_requis is not distinct from e.arbitrage_requis;if n<>2 then raise exception 'contenu final %/2',n;end if;
 select count(*) into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id=any(scope_ids) group by 1,2,3,4,5,6 having count(*)>1)d;if n<>0 then raise exception 'doublons %',n;end if;
 select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and l.canon_id is not null and not exists(select 1 from versets_lecture v where v.id_verset=l.canon_id);if n<>0 then raise exception 'cibles mortes %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and not(canon_id is not null and verset_v2_id is null and livre is null and chapitre is null);if n<>0 then raise exception 'cibles exclusives %',n;end if;
 select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and(fiabilite<>'vérifié'or provenance<>'lecture'or arbitrage_requis or motif is null or motif='' or type<>1);if n<>0 then raise exception 'métadonnées ou types %',n;end if;
end $atomic$;`;
const { error } = await db.rpc("exec_sql", { sql });
if (error) throw Error(`transaction: ${error.message}`);
const afterLive = await live();
const after = snapshot("live-after", afterLive);
if (!isDone(afterLive)) throw Error(`postétat ${after}`);
console.log(
  JSON.stringify(
    { applied: true, before, after, segments: 22, links: 2 },
    null,
    2,
  ),
);
