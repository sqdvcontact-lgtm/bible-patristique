import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const WORK_ID = "A0010O0023";
const EXPECTED = 3262;
const ROOT = resolve("audit/heptateuque-segmentation-finale-2026-08-02");
const CANDIDATE_ROOT = resolve("scripts/heptateuque/segmentation-candidate");
const FIELDS = [
  "segment_texte", "ref_niv1", "ref_niv2", "ref_niv3", "ref_niv4", "ref_niv5",
  "ref_niv1_texte", "ref_niv2_texte", "ref_niv3_texte", "ref_niv4_texte", "ref_niv5_texte",
  "nature", "texte_original", "notes", "paragraphe", "rang", "page",
  "controle_rang_manuel", "controle_verifie", "marquage_source",
];
const TEXT_FIELDS = new Set([
  "segment_texte", "ref_niv1", "ref_niv2", "ref_niv3", "ref_niv4", "ref_niv5",
  "ref_niv1_texte", "ref_niv2_texte", "ref_niv3_texte", "ref_niv4_texte", "ref_niv5_texte",
  "texte_original", "notes",
]);

function corrigerTypographie(texte) {
  if (texte == null) return texte;
  return texte
    .replace(/'/g, "’")
    .replace(/\.\.\./g, "…")
    .replace(/[ \u00a0\u202f]+([,.])/g, "$1")
    .replace(/[ \u00a0\u202f]+([;!?])/g, "\u202f$1")
    .replace(/[ \u202f]+:/g, "\u00a0:")
    .replace(/«[ \u00a0\u202f]*/g, "«\u202f")
    .replace(/[ \u00a0\u202f]*»/g, "\u202f»")
    .replace(/\s+[–—]\s+/g, " - ")
    .replace(/ {2,}/g, " ");
}

const candidate = JSON.parse(readFileSync(resolve(CANDIDATE_ROOT, "segments-candidate.json"), "utf8"));
const audit = JSON.parse(readFileSync(resolve(CANDIDATE_ROOT, "audit.json"), "utf8"));
const editorial = JSON.parse(readFileSync(resolve(CANDIDATE_ROOT, "editorial-audit.json"), "utf8"));
if (candidate.length !== EXPECTED || !audit.passed || !editorial.passed)
  throw new Error("Le candidat final ou ses audits ne sont pas clos.");
if (candidate.some((r, i) => r.id_oeuvre !== WORK_ID || r.segment_numero !== i + 1))
  throw new Error("Identité ou numérotation du candidat invalide.");
if (candidate.some((r) => r.lien_1 || r.lien_2 || r.lien_3 || r.lien_4 || r.liens_revus_le || r.liens_revus_par))
  throw new Error("Le candidat contient des liens avant la passe d'attribution.");
const finalCandidate = candidate.map((row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [key, TEXT_FIELDS.has(key) ? corrigerTypographie(value) : value]),
));

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAll() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("segments").select("*")
      .eq("id_oeuvre", WORK_ID).order("segment_numero").range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
const canonical = (r) => Object.fromEntries(FIELDS.map((f) => [f, r[f] ?? null]));
const hash = (rows) => createHash("sha256").update(JSON.stringify(rows.map(canonical))).digest("hex");
const live = await fetchAll();
if (live.length !== EXPECTED) throw new Error(`Base inattendue : ${live.length} segments.`);
if (live.some((r, i) => r.segment_numero !== i + 1)) throw new Error("Numérotation non continue en base.");
if (live.some((r) => r.lien_1 || r.lien_2 || r.lien_3 || r.lien_4 || r.liens_revus_le || r.liens_revus_par))
  throw new Error("Des liens existent déjà en base : synchronisation refusée.");

const revisions = finalCandidate.map((r, i) => ({ id: live[i].id, segment_numero: r.segment_numero, ...canonical(r) }));
const differences = revisions.filter((r, i) => FIELDS.some((f) => (r[f] ?? null) !== (live[i][f] ?? null)));
mkdirSync(ROOT, { recursive: true });
writeFileSync(resolve(ROOT, "segments-avant.json"), `${JSON.stringify(live, null, 2)}\n`);
const report = {
  generated_at: new Date().toISOString(), apply: APPLY, oeuvre: WORK_ID,
  segments: EXPECTED, segments_modifies: differences.length,
  hash_avant: hash(live), hash_attendu: hash(finalCandidate),
  audit_segmentation: audit.passed, audit_editorial: editorial.passed,
};
writeFileSync(resolve(ROOT, "rapport-avant.json"), `${JSON.stringify(report, null, 2)}\n`);

if (APPLY) {
  const types = "id bigint, segment_numero integer, segment_texte text, ref_niv1 text, ref_niv2 text, ref_niv3 text, ref_niv4 text, ref_niv5 text, ref_niv1_texte text, ref_niv2_texte text, ref_niv3_texte text, ref_niv4_texte text, ref_niv5_texte text, nature text, texte_original text, notes text, paragraphe integer, rang integer, page integer, controle_rang_manuel text, controle_verifie boolean, marquage_source text";
  for (let offset = 0; offset < revisions.length; offset += 200) {
    const payload = JSON.stringify(revisions.slice(offset, offset + 200)).replaceAll("'", "''");
    const sets = FIELDS.map((f) => `${f}=c.${f}`).join(",\n    ");
    const sql = `with c as (select * from jsonb_to_recordset('${payload}'::jsonb) as x(${types}))
update segments s set ${sets}
from c where s.id=c.id and s.id_oeuvre='${WORK_ID}' and s.segment_numero=c.segment_numero;`;
    const { error } = await db.rpc("exec_sql", { sql });
    if (error) throw new Error(`Lot ${offset + 1} : ${error.message}`);
  }
  const after = await fetchAll();
  if (hash(after) !== hash(finalCandidate)) throw new Error("La relecture en base diffère du candidat final.");
  const final = { ...report, applied_at: new Date().toISOString(), hash_apres: hash(after), verified: true };
  writeFileSync(resolve(ROOT, "rapport-apres.json"), `${JSON.stringify(final, null, 2)}\n`);
  console.log(JSON.stringify(final, null, 2));
} else console.log(JSON.stringify({ ...report, ready: true }, null, 2));
