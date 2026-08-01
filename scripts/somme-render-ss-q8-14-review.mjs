import { readFileSync, writeFileSync } from "node:fs";
const R = "tmp/somme-liens-audit-2026-07-29",
  raw = JSON.parse(readFileSync(`${R}/ss-q8-14-raw.json`, "utf8")),
  matches = JSON.parse(
    readFileSync(`${R}/ss-q8-14-quote-matches.json`, "utf8"),
  ),
  S = new Map(raw.segments.map((x) => [x.id, x])),
  W = new Map(raw.witnesses.map((x) => [x.id_verset, x])),
  Q = new Map();
for (const x of matches) {
  const a = Q.get(x.segment_id) || [];
  a.push(x);
  Q.set(x.segment_id, a);
}
const clean = (s) =>
    String(s ?? "")
      .replace(/\s+/g, " ")
      .replaceAll("\t", " ")
      .trim(),
  stop = new Set(
    "avec cette comme dans depuis elle elles encore entre leur leurs mais meme nous pour quand sans selon sont sous tout tous toute vous votre ainsi celui dont etre faut plus".split(
      " ",
    ),
  ),
  words = (s) =>
    new Set(
      clean(s)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stop.has(w)),
    ),
  overlap = (s, w) =>
    Math.max(
      0,
      ...[w?.TR0001, w?.TR0003, w?.TR0004].filter(Boolean).map((t) => {
        const a = words(s),
          b = words(t);
        return [...b].filter((x) => a.has(x)).length / Math.max(1, b.size);
      }),
    );
const rows = [
  "link_id\tsegment_numero\tquestion\ttype_initial\tcanon_id\tverset_v2_id\tlivre\tchapitre\tfiabilite\tfull_overlap\tbest_quote_score\tquote\ttemoin\tsegment",
];
for (const l of raw.links) {
  const s = S.get(l.segment_id),
    own = (Q.get(l.segment_id) || []).filter((x) =>
      x.top.some((c) => c.id_verset === l.canon_id),
    );
  own.sort(
    (a, b) =>
      (b.top.find((c) => c.id_verset === l.canon_id)?.score ?? 0) -
      (a.top.find((c) => c.id_verset === l.canon_id)?.score ?? 0),
  );
  const best = own[0],
    score = best?.top.find((c) => c.id_verset === l.canon_id)?.score ?? 0,
    w = W.get(l.canon_id);
  rows.push(
    [
      l.id,
      s.segment_numero,
      s.ref_niv2,
      l.type,
      l.canon_id,
      l.verset_v2_id,
      l.livre,
      l.chapitre,
      l.fiabilite,
      overlap(s.segment_texte, w).toFixed(3),
      score,
      clean(best?.quote),
      clean(w?.TR0003 || w?.TR0001 || w?.TR0004),
      clean(s.segment_texte),
    ].join("\t"),
  );
}
writeFileSync(`${R}/ss-q8-14-existing-review.tsv`, rows.join("\n") + "\n");
const existing = new Set(raw.links.map((l) => `${l.segment_id}|${l.canon_id}`)),
  omissions = matches.filter(
    (x) =>
      x.top[0]?.score >= 0.8 &&
      (x.top[0].score === 1 ||
        x.top[0].score - (x.top[1]?.score ?? 0) >= 0.12) &&
      !existing.has(`${x.segment_id}|${x.top[0].id_verset}`),
  );
writeFileSync(
  `${R}/ss-q8-14-omission-candidates.json`,
  JSON.stringify(omissions, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      existing: raw.links.length,
      t1_low: rows
        .slice(1)
        .map((x) => x.split("\t"))
        .filter((x) => x[3] === "1" && Number(x[9]) < 0.12).length,
      t3_t4: raw.links.filter((x) => x.type >= 3).length,
      special: raw.links.filter((x) => x.verset_v2_id || x.livre || x.chapitre)
        .length,
      omissions_high_discriminant: omissions.length,
    },
    null,
    2,
  ),
);
