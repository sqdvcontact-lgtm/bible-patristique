import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const files = [
  "segments-candidate.json",
  "segments-candidate.csv",
  "source-map.json",
  "alerts.json",
  "review-decisions.json",
  "audit.json",
  "editorial-audit.json",
  "controle-segmentation.xlsx",
];
const lines = files.map((file) =>
  `${createHash("sha256").update(readFileSync(file)).digest("hex")}  ${file}`,
);
writeFileSync("FINAL-SHA256SUMS.txt", lines.join("\n") + "\n");
console.log(`${files.length} empreintes finales écrites`);
