import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const ROOT = "tmp/somme-liens-audit-2026-07-29";
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q41-80-raw.json`, "utf8"));
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
const stop = new Set(
  "alors aussi avec cette comme dans depuis elle elles encore entre est fait leur leurs mais meme nous pour quand sans selon sera sont sous tout tous toute tres une vous votre ainsi avoir celui dont etre faut plus".split(
    " ",
  ),
);
const normalize = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word));
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
const indexed = verses.map((verse) => ({
  verse,
  sets: [verse.TR0001, verse.TR0003, verse.TR0004]
    .filter(Boolean)
    .map((text) => new Set(normalize(text))),
}));
const rows = [];
for (const segment of raw.segments) {
  const quotes = [...segment.segment_texte.matchAll(/«\s*([^»]{12,520})\s*»/g)]
    .map((match) => match[1])
    .filter((quote) => normalize(quote).length >= 3);
  for (const quote of quotes) {
    const query = new Set(normalize(quote));
    const scores = [];
    for (const candidate of indexed) {
      let best = 0;
      for (const words of candidate.sets) {
        const overlap =
          [...query].filter((word) => words.has(word)).length /
          Math.max(1, query.size);
        if (overlap > best) best = overlap;
      }
      if (best >= 0.2)
        scores.push({
          id_verset: candidate.verse.id_verset,
          ref: candidate.verse.ref,
          score: Number(best.toFixed(3)),
          TR0003: candidate.verse.TR0003,
        });
    }
    scores.sort((a, b) => b.score - a.score);
    rows.push({
      segment_id: segment.id,
      segment_numero: segment.segment_numero,
      question: segment.ref_niv2,
      quote,
      top: scores.slice(0, 5),
    });
  }
}
writeFileSync(
  `${ROOT}/pp-q41-80-quote-matches.json`,
  `${JSON.stringify(rows, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      verses: verses.length,
      quotes: rows.length,
      exactish: rows.filter((row) => row.top[0]?.score >= 0.8).length,
      high: rows.filter((row) => row.top[0]?.score >= 0.65).length,
      medium: rows.filter(
        (row) => row.top[0]?.score >= 0.4 && row.top[0]?.score < 0.65,
      ).length,
      low: rows.filter((row) => !row.top[0] || row.top[0].score < 0.4).length,
    },
    null,
    2,
  ),
);
