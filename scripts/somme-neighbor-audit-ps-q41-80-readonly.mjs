import { readFileSync, writeFileSync } from "node:fs";
const R = "tmp/somme-liens-audit-2026-07-29",
  raw = JSON.parse(readFileSync(`${R}/ps-q41-80-raw.json`, "utf8")),
  S = [...raw.segments].sort((a, b) => a.segment_numero - b.segment_numero),
  I = new Map(S.map((s, i) => [s.id, i])),
  W = new Map(raw.witnesses.map((w) => [w.id_verset, w])),
  stop = new Set(
    "avec cette comme dans depuis elle elles encore entre leur leurs mais meme nous pour quand sans selon sont sous tout tous toute vous votre ainsi celui dont etre faut plus".split(
      " ",
    ),
  ),
  words = (s) =>
    new Set(
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((x) => x.length > 3 && !stop.has(x)),
    ),
  score = (s, w) =>
    Math.max(
      0,
      ...[w?.TR0001, w?.TR0003, w?.TR0004].filter(Boolean).map((t) => {
        const a = words(s),
          b = words(t);
        return [...b].filter((x) => a.has(x)).length / Math.max(1, b.size);
      }),
    ),
  flags = [];
for (const l of raw.links.filter((x) => x.type === 1 && x.canon_id)) {
  const i = I.get(l.segment_id),
    w = W.get(l.canon_id),
    cur = score(S[i].segment_texte, w),
    prev = i ? score(S[i - 1].segment_texte, w) : 0,
    next = i + 1 < S.length ? score(S[i + 1].segment_texte, w) : 0,
    best = Math.max(prev, next);
  if (best >= 0.2 && best > cur + 0.15)
    flags.push({
      link_id: l.id,
      canon_id: l.canon_id,
      current_numero: S[i].segment_numero,
      current_score: Number(cur.toFixed(3)),
      better_numero:
        prev >= next ? S[i - 1].segment_numero : S[i + 1].segment_numero,
      better_score: Number(best.toFixed(3)),
      current: S[i].segment_texte,
      better: (prev >= next ? S[i - 1] : S[i + 1]).segment_texte,
    });
}
writeFileSync(
  `${R}/ps-q41-80-neighbor-flags.json`,
  JSON.stringify(flags, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      flags: flags.length,
      summary: flags.map((x) => ({
        id: x.link_id,
        canon: x.canon_id,
        from: x.current_numero,
        to: x.better_numero,
        scores: [x.current_score, x.better_score],
      })),
    },
    null,
    2,
  ),
);
