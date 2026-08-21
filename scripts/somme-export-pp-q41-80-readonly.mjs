import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ROOT = "tmp/somme-liens-audit-2026-07-29";
const PAGE = 100;
mkdirSync(ROOT, { recursive: true });
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
const questions = Array.from(
  { length: 40 },
  (_, index) => `Question ${41 + index}`,
);
const segments = [];
const pagination = [];
for (const question of questions) {
  for (let from = 0; ; from += PAGE) {
    const page = await must(
      db
        .from("segments")
        .select("*")
        .eq("id_oeuvre", "A0013O0002")
        .eq("ref_niv1", "Prima Pars")
        .eq("ref_niv2", question)
        .order("segment_numero")
        .range(from, from + PAGE - 1),
      `${question}:${from}`,
    );
    segments.push(...page);
    pagination.push({
      objet: "segments",
      question,
      from,
      to: from + PAGE - 1,
      lignes: page.length,
    });
    if (page.length < PAGE) break;
  }
}
segments.sort((a, b) => a.segment_numero - b.segment_numero);
const links = [];
for (let from = 0; from < segments.length; from += PAGE) {
  const page = await must(
    db
      .from("liens_bibliques")
      .select("*")
      .in(
        "segment_id",
        segments.slice(from, from + PAGE).map((segment) => segment.id),
      )
      .order("id"),
    `liens:${from}`,
  );
  links.push(...page);
  pagination.push({
    objet: "liens",
    from,
    to: Math.min(from + PAGE - 1, segments.length - 1),
    lignes: page.length,
  });
}
links.sort((a, b) => a.id - b.id);
const targetIds = [
  ...new Set(links.map((link) => link.canon_id).filter(Boolean)),
];
const witnesses = [];
const columns =
  'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"';
for (let from = 0; from < targetIds.length; from += PAGE) {
  witnesses.push(
    ...(await must(
      db
        .from("versets_lecture")
        .select(columns)
        .in("id_verset", targetIds.slice(from, from + PAGE)),
      `témoins:${from}`,
    )),
  );
}
const payload = {
  exported_at: new Date().toISOString(),
  partie: "Prima Pars",
  questions,
  pagination,
  segments,
  links,
  witnesses,
};
writeFileSync(
  `${ROOT}/pp-q41-80-raw.json`,
  `${JSON.stringify(payload, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      segments: segments.length,
      range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
      links: links.length,
      witnesses: witnesses.length,
      marked_local: segments.filter(
        (segment) => segment.liens_revus_le || segment.liens_revus_par,
      ).length,
      types: Object.fromEntries(
        [1, 2, 3, 4].map((type) => [
          type,
          links.filter((link) => link.type === type).length,
        ]),
      ),
      special: links.filter(
        (link) => link.verset_v2_id || link.livre || link.chapitre,
      ).length,
      by_question: Object.fromEntries(
        questions.map((question) => [
          question,
          segments.filter((segment) => segment.ref_niv2 === question).length,
        ]),
      ),
    },
    null,
    2,
  ),
);
