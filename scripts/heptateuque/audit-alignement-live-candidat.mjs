import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const WORK_ID = "A0010O0023";
const ROOT = resolve("scripts/heptateuque");
const OUT = resolve("audit/heptateuque-alignement-avant-liens-2026-08-02");
const candidate = JSON.parse(readFileSync(resolve(ROOT, "segmentation-candidate/segments-candidate.json"), "utf8"));
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, "")]));

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchLive() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("segments").select("*")
      .eq("id_oeuvre", WORK_ID).order("segment_numero").range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const live = await fetchLive();
mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "segments-live-avant.json"), `${JSON.stringify(live, null, 2)}\n`);

const clean = (value) => String(value ?? "")
  .replace(/<\/?i>/g, "")
  .replace(/\[<i>sic<\/i>\]/g, "[sic]")
  .replace(/\s+/g, " ")
  .trim();
const key = (row) => [row.ref_niv1, row.ref_niv2 ?? "", row.paragraphe ?? ""].join("|");
function groups(rows) {
  const map = new Map();
  for (const row of rows) {
    const k = key(row);
    const group = map.get(k) ?? { key: k, rows: [], text: "" };
    group.rows.push(row);
    group.text = clean(`${group.text} ${row.segment_texte}`);
    map.set(k, group);
  }
  return map;
}

const gl = groups(live);
const gc = groups(candidate);
const allKeys = [...new Set([...gl.keys(), ...gc.keys()])].sort();
const differences = allKeys.map((k) => {
  const a = gl.get(k);
  const b = gc.get(k);
  return {
    key: k,
    live_segments: a?.rows.length ?? 0,
    candidate_segments: b?.rows.length ?? 0,
    delta: (b?.rows.length ?? 0) - (a?.rows.length ?? 0),
    same_text: a?.text === b?.text,
    live_first: a?.rows[0]?.segment_numero ?? null,
    candidate_first: b?.rows[0]?.segment_numero ?? null,
    live_text: a?.text ?? "",
    candidate_text: b?.text ?? "",
  };
}).filter((row) => row.delta !== 0 || !row.same_text);

const sha = (rows) => createHash("sha256").update(JSON.stringify(rows)).digest("hex");
const report = {
  generated_at: new Date().toISOString(),
  live_segments: live.length,
  candidate_segments: candidate.length,
  live_hash: sha(live.map(({ id, ...row }) => row)),
  candidate_hash: sha(candidate),
  differing_groups: differences.length,
  count_delta_groups: differences.filter((row) => row.delta !== 0).length,
  text_delta_groups: differences.filter((row) => !row.same_text).length,
  differences,
};
writeFileSync(resolve(OUT, "rapport-alignement.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  live: report.live_segments,
  candidate: report.candidate_segments,
  differing_groups: report.differing_groups,
  count_delta_groups: report.count_delta_groups,
  text_delta_groups: report.text_delta_groups,
  count_deltas: differences.filter((row) => row.delta !== 0).map(({ key, live_segments, candidate_segments, delta, same_text }) => ({ key, live_segments, candidate_segments, delta, same_text })),
}, null, 2));
