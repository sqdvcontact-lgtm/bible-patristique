import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const root = fileURLToPath(new URL(".", import.meta.url));
const csv = await fs.readFile(`${root}/segments-candidate.csv`, "utf8");
const audit = JSON.parse(await fs.readFile(`${root}/audit.json`, "utf8"));
const alerts = JSON.parse(await fs.readFile(`${root}/alerts.json`, "utf8"));
const review = JSON.parse(await fs.readFile(`${root}/review-decisions.json`, "utf8"));
const wb = await Workbook.fromCSV(csv, { sheetName: "Segments" });

const summary = wb.worksheets.add("Synthèse");
summary.getRange("A1:D1").merge();
summary.getRange("A1").values = [["Heptateuque — contrôle de segmentation"]];
summary.getRange("A3:B12").values = [
  ["Indicateur", "Valeur"],
  ["ID œuvre", audit.id_oeuvre],
  ["Livres", audit.books],
  ["Paragraphes", audit.paragraphs],
  ["Segments", audit.segments],
  ["Notes", audit.notes],
  ["Alertes signalées", audit.alerts],
  ["Alertes restant à relire", review.remaining],
  ["Échecs d’invariant", audit.failures.length],
  ["Audit technique", audit.passed ? "VALIDE" : "BLOQUÉ"],
];
summary.getRange("A13:D16").values = [
  ["Lecture", "Le changement de page ne crée pas de segment", null, null],
  ["Page", "Page où commence le segment", null, null],
  ["Rangs", "1…k dans chaque paragraphe", null, null],
  ["Import", "Non exécuté — candidat de contrôle", null, null],
];

const alertSheet = wb.worksheets.add("Alertes");
const alertRows = [["Type", "Contexte", "Motif", "Extrait"]];
for (const a of alerts)
  alertRows.push([a.type ?? "", a.ctx ?? "", a.reason ?? "", a.excerpt ?? ""]);
alertSheet.getRangeByIndexes(0, 0, alertRows.length, 4).values = alertRows;

for (const sheet of [summary, alertSheet, wb.worksheets.getItem("Segments")]) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  const used = sheet.getUsedRange();
  used.format.wrapText = true;
  used.format.verticalAlignment = "top";
}
summary.getRange("A1:D1").format = { fill: "#203864", font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 28 };
summary.getRange("A3:B3").format = { fill: "#D9EAF7", font: { bold: true, color: "#203864" }, borders: { preset: "all", style: "thin", color: "#A6A6A6" } };
summary.getRange("A4:B12").format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
summary.getRange("A:A").format.columnWidth = 24;
summary.getRange("B:B").format.columnWidth = 58;
alertSheet.getRange("A1:D1").format = { fill: "#203864", font: { bold: true, color: "#FFFFFF" } };
alertSheet.getRange("A:A").format.columnWidth = 28;
alertSheet.getRange("B:B").format.columnWidth = 48;
alertSheet.getRange("C:C").format.columnWidth = 20;
alertSheet.getRange("D:D").format.columnWidth = 80;
const seg = wb.worksheets.getItem("Segments");
seg.getRange("A1:AI1").format = { fill: "#203864", font: { bold: true, color: "#FFFFFF" } };
seg.getRange("D:D").format.columnWidth = 80;
seg.getRange("J:O").format.columnWidth = 32;

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(`${root}/controle-segmentation.xlsx`);
const preview = await wb.render({ sheetName: "Synthèse", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(`${root}/controle-segmentation-preview.png`, new Uint8Array(await preview.arrayBuffer()));
const inspection = await wb.inspect({ kind: "sheet", include: "id,name", maxChars: 3000 });
await fs.writeFile(`${root}/workbook-inspection.txt`, inspection.ndjson ?? String(inspection));
console.log("controle-segmentation.xlsx + preview créés");
