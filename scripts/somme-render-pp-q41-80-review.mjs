import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "tmp/somme-liens-audit-2026-07-29";
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q41-80-raw.json`, "utf8"));
const matches = JSON.parse(
  readFileSync(`${ROOT}/pp-q41-80-quote-matches.json`, "utf8"),
);
const segments = new Map(raw.segments.map((segment) => [segment.id, segment]));
const witnesses = new Map(
  raw.witnesses.map((witness) => [witness.id_verset, witness]),
);
const quoteBySegment = new Map();
for (const match of matches) {
  const list = quoteBySegment.get(match.segment_id) ?? [];
  list.push(match);
  quoteBySegment.set(match.segment_id, list);
}
const clean = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .replaceAll("\t", " ")
    .trim();
const stop = new Set(
  "avec cette comme dans depuis elle elles encore entre leur leurs mais meme nous pour quand sans selon sont sous tout tous toute vous votre ainsi celui dont etre faut plus".split(
    " ",
  ),
);
const words = (text) =>
  new Set(
    clean(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stop.has(word)),
  );
const overlap = (segment, witness) => {
  const source = words(segment);
  const editions = [witness?.TR0001, witness?.TR0003, witness?.TR0004]
    .filter(Boolean)
    .map(words);
  return Math.max(
    0,
    ...editions.map(
      (edition) =>
        [...edition].filter((word) => source.has(word)).length /
        Math.max(1, edition.size),
    ),
  );
};
const rows = [
  "link_id\tsegment_numero\tquestion\ttype_initial\tcanon_id\tfiabilite\tfull_overlap\tbest_quote_score\tquote\ttemoin\tsegment",
];
for (const link of raw.links) {
  const segment = segments.get(link.segment_id);
  const own = (quoteBySegment.get(link.segment_id) ?? []).filter((match) =>
    match.top.some((candidate) => candidate.id_verset === link.canon_id),
  );
  own.sort(
    (a, b) =>
      (b.top.find((candidate) => candidate.id_verset === link.canon_id)
        ?.score ?? 0) -
      (a.top.find((candidate) => candidate.id_verset === link.canon_id)
        ?.score ?? 0),
  );
  const best = own[0];
  const score =
    best?.top.find((candidate) => candidate.id_verset === link.canon_id)
      ?.score ?? 0;
  const witness = witnesses.get(link.canon_id);
  rows.push(
    [
      link.id,
      segment.segment_numero,
      segment.ref_niv2,
      link.type,
      link.canon_id,
      link.fiabilite,
      overlap(segment.segment_texte, witness).toFixed(3),
      score,
      clean(best?.quote),
      clean(witness?.TR0003 || witness?.TR0001 || witness?.TR0004),
      clean(segment.segment_texte),
    ].join("\t"),
  );
}
writeFileSync(`${ROOT}/pp-q41-80-existing-review.tsv`, `${rows.join("\n")}\n`);
const existingTargets = new Set(
  raw.links.map((link) => `${link.segment_id}|${link.canon_id}`),
);
const omissions = matches.filter((match) => {
  const top = match.top[0];
  const second = match.top[1];
  return (
    top?.score >= 0.8 &&
    (top.score === 1 || top.score - (second?.score ?? 0) >= 0.12) &&
    !existingTargets.has(`${match.segment_id}|${top.id_verset}`)
  );
});
writeFileSync(
  `${ROOT}/pp-q41-80-omission-candidates.json`,
  `${JSON.stringify(omissions, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      existing_review: raw.links.length,
      omissions_high_discriminant: omissions.length,
      initial_t3_t4: raw.links.filter((link) => link.type >= 3).length,
    },
    null,
    2,
  ),
);
