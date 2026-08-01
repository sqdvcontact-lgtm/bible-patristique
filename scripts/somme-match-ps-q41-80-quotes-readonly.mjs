import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const R = "tmp/somme-liens-audit-2026-07-29",
  raw = JSON.parse(readFileSync(`${R}/ps-q41-80-raw.json`, "utf8")),
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
  STOP = new Set(
    "alors aussi avec cette comme dans depuis elle elles encore entre leur leurs mais meme nous pour quand sans selon sera sont sous tout tous toute tres vous votre ainsi avoir celui dont etre fait faut plus".split(
      " ",
    ),
  ),
  norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w));
const verses = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db
    .from("versets_lecture")
    .select("id_verset,ref,TR0001,TR0003,TR0004")
    .order("id_verset")
    .range(from, from + 999);
  if (error) throw error;
  verses.push(...data);
  if (data.length < 1000) break;
}
const indexed = verses.map((v) => ({
    v,
    sets: [v.TR0001, v.TR0003, v.TR0004]
      .filter(Boolean)
      .map((t) => new Set(norm(t))),
  })),
  rows = [];
for (const s of raw.segments) {
  const quotes = [...s.segment_texte.matchAll(/«\s*([^»]{12,520})\s*»/g)]
    .map((x) => x[1])
    .filter((q) => norm(q).length >= 3);
  for (const quote of quotes) {
    const q = new Set(norm(quote)),
      scores = [];
    for (const x of indexed) {
      let best = 0;
      for (const vs of x.sets) {
        const score =
          [...q].filter((w) => vs.has(w)).length / Math.max(1, q.size);
        if (score > best) best = score;
      }
      if (best >= 0.2)
        scores.push({
          id_verset: x.v.id_verset,
          ref: x.v.ref,
          score: Number(best.toFixed(3)),
          TR0003: x.v.TR0003,
        });
    }
    scores.sort((a, b) => b.score - a.score);
    rows.push({
      segment_id: s.id,
      segment_numero: s.segment_numero,
      question: s.ref_niv2,
      quote,
      top: scores.slice(0, 5),
    });
  }
}
writeFileSync(
  `${R}/ps-q41-80-quote-matches.json`,
  JSON.stringify(rows, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      verses: verses.length,
      quotes: rows.length,
      exactish: rows.filter((x) => x.top[0]?.score >= 0.8).length,
      high: rows.filter((x) => x.top[0]?.score >= 0.65).length,
      medium: rows.filter(
        (x) => x.top[0]?.score >= 0.4 && x.top[0]?.score < 0.65,
      ).length,
      low: rows.filter((x) => !x.top[0] || x.top[0].score < 0.4).length,
    },
    null,
    2,
  ),
);
