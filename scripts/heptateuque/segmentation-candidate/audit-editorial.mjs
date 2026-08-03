import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const segments = JSON.parse(readFileSync("segments-candidate.json", "utf8"));
const sourceMap = JSON.parse(readFileSync("source-map.json", "utf8"));
const alertsText = readFileSync("alerts.json", "utf8");
const review = JSON.parse(readFileSync("review-decisions.json", "utf8"));
const failures = [];
const check = (name, ok, detail = "") => { if (!ok) failures.push({ name, detail }); };
const books = [...new Set(segments.map((r) => r.ref_niv1))];
const expectedQuestions = [173, 177, 94, 65, 57, 30, 56];
const expectedNotes = [121, 241, 164, 89, 124, 62, 99];
const ranges = [[383,419],[419,477],[478,512],[512,537],[537,559],[559,572],[573,597]];

for (const [i, book] of books.entries()) {
  const rows = segments.filter((r) => r.ref_niv1 === book);
  const questions = new Set(rows.map((r) => r.ref_niv2).filter((q) => q?.startsWith("Question ")));
  const calls = new Set(rows.flatMap((r) =>
    [...`${r.segment_texte} ${r.ref_niv2_texte ?? ""}`.matchAll(/\[\[(\d+)\]\]/g)].map((m) => +m[1])));
  check(`questions:${book}`, questions.size === expectedQuestions[i], `${questions.size}/${expectedQuestions[i]}`);
  check(`notes:${book}`, calls.size === expectedNotes[i], `${calls.size}/${expectedNotes[i]}`);
  const pages = rows.map((r) => r.page);
  check(
    `pages:${book}`,
    pages.every((p) => p >= ranges[i][0] && p <= ranges[i][1]) &&
      Math.min(...pages) === ranges[i][0] && Math.max(...pages) === ranges[i][1],
    `${Math.min(...pages)}–${Math.max(...pages)} / ${ranges[i][0]}–${ranges[i][1]}`,
  );
}

const critical = {
  "Genèse|Question XXV": 3, "Genèse|Question CXVII": 5,
  "Exode|Question LXXI": 6, "Exode|Question LXXVIII": 4,
  "Exode|Question CXIV": 2, "Exode|Question CXXIX": 2,
  "Exode|Question CLIV": 6, "Exode|Question CLXVI": 2,
  "Exode|Question CLXXVII": 23,
  "Lévitique|Question XX": 5, "Lévitique|Question XXIII": 3,
  "Lévitique|Question XXVI": 3, "Lévitique|Question XXVII": 3,
  "Lévitique|Question XXXVI": 3, "Lévitique|Question XL": 4,
  "Lévitique|Question LIII": 3, "Lévitique|Question LVII": 4,
  "Lévitique|Question LXXVI": 2,
  "Nombres|Question XVI": 6, "Nombres|Question XXX": 2,
  "Nombres|Question XXXIII": 11, "Nombres|Question LIX": 5,
  "Deutéronome|Question IX": 2, "Deutéronome|Question X": 3,
  "Deutéronome|Question XV": 4, "Deutéronome|Question XLVI": 2,
  "Deutéronome|Question XLVIII": 3,
  "Josué|Question IX": 4, "Josué|Question XXI": 4, "Josué|Question XXX": 2,
  "Juges|Question XVII": 4, "Juges|Question XLI": 3, "Juges|Question XLIX": 28,
};
for (const [key, expected] of Object.entries(critical)) {
  const [bookPart, question] = key.split("|");
  const rows = sourceMap.filter((m) => `${m.ref_niv1} ${m.ref_niv1_texte ?? ""}`.includes(bookPart) && m.ref_niv2 === question);
  check(`paragraphes:${key}`, rows.length === expected, `${rows.length}/${expected}`);
}

check("titres_sans_point", segments.every((r) => !/[.]$/.test(r.ref_niv1) && !/[.]$/.test(r.ref_niv2 ?? "")));
check("pages_monotones", segments.slice(1).every((r, i) => r.page >= segments[i].page));
check("guillemets_fermants_rattaches", segments.every((r) => !/^»[.]?\s*/.test(r.segment_texte)));
check(
  "alertes_relues_sur_candidat_courant",
  createHash("sha256").update(alertsText).digest("hex") === review.alerts_sha256 &&
    review.remaining === 0 && review.reviewed === JSON.parse(alertsText).length,
);
check("quatre_titres_sic", new Set(segments.filter((r) => r.ref_niv2?.includes("[<i>sic</i>]")).map((r) => r.ref_niv2)).size === 4);
check("segments_importes_preserves", segments.length === 3262, `${segments.length}/3262`);
check("sept_livres_et_sous_titres", books.length === 7 && segments.every((r) => /^Livre\s/u.test(r.ref_niv1) && /^Questions sur /u.test(r.ref_niv1_texte ?? "")));
check("references_tete_developpees", segments.every((r) => !String(r.ref_niv2_texte ?? "").split("\n").some((ligne) => /^\s*(?:Ib[.,]*|Gen\.|Exod\.|Lev\.|Nomb\.|Deut\.|Jos\.|Juges\.)(?:\s|$)/iu.test(ligne))));
const apparatus = segments.filter((r) => r.nature === "apparat_critique");
check("signature_finale", apparatus.length === 1 && apparatus[0].page === 597 && apparatus[0].ref_niv2 === null);
const result = { generated_at: new Date().toISOString(), checks: 7 * 3 + Object.keys(critical).length + 6, failures, passed: failures.length === 0 };
writeFileSync("editorial-audit.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 2;
