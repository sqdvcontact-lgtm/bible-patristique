import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const R = "tmp/somme-liens-audit-2026-07-29",
  P = 100;
mkdirSync(R, { recursive: true });
const env = Object.fromEntries(
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
    if (error) throw Error(`${l}: ${error.message}`);
    return data;
  },
  questions = Array.from({ length: 7 }, (_, i) => `Question ${8 + i}`),
  segments = [],
  pagination = [];
for (const q of questions)
  for (let from = 0; ; from += P) {
    const page = await must(
      db
        .from("segments")
        .select("*")
        .eq("id_oeuvre", "A0013O0002")
        .eq("ref_niv1", "Secunda Secundae")
        .eq("ref_niv2", q)
        .order("segment_numero")
        .range(from, from + P - 1),
      `${q}:${from}`,
    );
    segments.push(...page);
    pagination.push({
      objet: "segments",
      question: q,
      from,
      to: from + P - 1,
      lignes: page.length,
    });
    if (page.length < P) break;
  }
segments.sort((a, b) => a.segment_numero - b.segment_numero);
const links = [];
for (let i = 0; i < segments.length; i += P) {
  const page = await must(
    db
      .from("liens_bibliques")
      .select("*")
      .in(
        "segment_id",
        segments.slice(i, i + P).map((s) => s.id),
      )
      .order("id"),
    `liens:${i}`,
  );
  links.push(...page);
  pagination.push({
    objet: "liens",
    from: i,
    to: Math.min(i + P - 1, segments.length - 1),
    lignes: page.length,
  });
}
links.sort((a, b) => a.id - b.id);
const ids = [...new Set(links.map((x) => x.canon_id).filter(Boolean))],
  witnesses = [],
  cols =
    'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"';
for (let i = 0; i < ids.length; i += P)
  witnesses.push(
    ...(await must(
      db
        .from("versets_lecture")
        .select(cols)
        .in("id_verset", ids.slice(i, i + P)),
      `témoins:${i}`,
    )),
  );
const payload = {
  exported_at: new Date().toISOString(),
  partie: "Secunda Secundae",
  questions,
  pagination,
  segments,
  links,
  witnesses,
};
writeFileSync(
  `${R}/ss-q8-14-raw.json`,
  JSON.stringify(payload, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      segments: segments.length,
      range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
      links: links.length,
      witnesses: witnesses.length,
      marked: segments.filter((s) => s.liens_revus_le || s.liens_revus_par)
        .length,
      unmarked: segments.filter((s) => !s.liens_revus_le || !s.liens_revus_par)
        .length,
      markers: Object.fromEntries(
        [...new Set(segments.map((s) => s.liens_revus_par))].map((x) => [
          String(x),
          segments.filter((s) => s.liens_revus_par === x).length,
        ]),
      ),
      types: Object.fromEntries(
        [1, 2, 3, 4].map((t) => [t, links.filter((l) => l.type === t).length]),
      ),
      special: links.filter((l) => l.verset_v2_id || l.livre || l.chapitre)
        .length,
      provisional: links.filter(
        (l) =>
          l.fiabilite !== "vérifié" ||
          l.provenance !== "lecture" ||
          l.arbitrage_requis,
      ).length,
      by_question: Object.fromEntries(
        questions.map((q) => [
          q,
          segments.filter((s) => s.ref_niv2 === q).length,
        ]),
      ),
    },
    null,
    2,
  ),
);
