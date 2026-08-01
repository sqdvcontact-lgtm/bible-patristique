// Pipeline Exode (Livre II) — pages 419-477 (section s2 de la 419).
// DRAFT : structure + chapitres romanisés ; corrections OCR à venir (agents).
import { Document, Packer, Paragraph, TextRun, HeadingLevel, FootnoteReferenceRun } from "docx";
import { readFileSync, writeFileSync } from "fs";

const ROM = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX"];
const romVal = (r) => ROM.indexOf(r);
function refRomain(ref) {
  return ref.replace(/^(\s*(?:[A-ZÉa-zéÎ0-9]+\.?)\s+)(\d+)/, (m, pre, ch) => pre + (ROM[+ch] || ch));
}

const CORR = []; // corrections OCR (agents) — à remplir
// Numéros que l'édition imprime fautivement → [sic] au titre, discriminés par
// (libellé + début de réf). À remplir depuis les signalements des agents.
const LABEL_SIC = []; // ex. [["CXXI", "(Ib. 40, 16"]]
const NORM = [[/ non seulement /g, " non-seulement "]];

function pageBody(n) {
  let t = readFileSync(`ws/p${n}.txt`, "utf8");
  t = t.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, "");
  // L'Exode commence à la section s2 de la p419 (avant = fin de la Genèse).
  if (n === 419) { const c = t.indexOf("<section begin=s2"); if (c !== -1) t = t.slice(c); }
  t = t.replace(/<section\b[^>]*>/g, "");
  t = t.replace(/^\s*-{3,}\s*$/gm, "");
  t = t.replace(/<nowiki\s*\/?>/g, "");
  t = t.replace(/<br\s*\/?>/g, "\n");
  return t.trim();
}
let raw = "";
for (let n = 419; n <= 477; n++) {
  const b = pageBody(n);
  if (!b) continue;
  if (raw && /[\p{L}]$/u.test(raw) && /^[a-zéèêàç-]/u.test(b)) raw += (raw.endsWith("-") ? "" : " ");
  else if (raw) raw += "\n";
  raw += b;
}
const misses = [];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const [a, b] of CORR) {
  const pat = escRe(a).replace(/ +/g, "\\s+"); // tolérant aux sauts de ligne
  if (!new RegExp(pat).test(raw)) { misses.push(a); continue; }
  raw = raw.replace(new RegExp(pat, "g"), () => b);
}
for (const [re, b] of NORM) raw = raw.replace(re, b);

// En-têtes du livre (à retirer)
raw = raw.replace(/=+'*LIVRE DEUXIÈME\.?'*=+\s*/, "");
raw = raw.replace(/==QUESTIONS SUR L’EXODE==\s*/, "");

// Découpage en questions (pas d'introduction). Q1 = « QUESTION PREMIÈRE ».
const parts = raw.split(/'''\s*(–\s*)?(QUESTION PREMIÈRE|PREMIÈRE QUESTION|[IVXLCDM]+|\d+)\.?\s*'''/);
const questions = [];
let cur = null;
for (let i = 1; i < parts.length; i += 3) {
  const label = parts[i + 1];
  const content = (parts[i + 2] || "").trim();
  const isSub = /^\d+$/.test(label);
  if (isSub && cur) { cur.subs.push({ num: label, content }); }
  else {
    const num = /QUESTION/.test(label) ? 1 : romVal(label);
    cur = { num, label, content, subs: [] };
    questions.push(cur);
  }
}

let fnCount = 0;
const footnotes = {};
function buildRuns(text) {
  const runs = [];
  const re = /<ref>([\s\S]*?)<\/ref>|''(.*?)''|⟦sic⟧/g;
  let last = 0, m;
  const pushText = (s) => { if (s) runs.push(new TextRun(s.replace(/\n+/g, " ").replace(/\s+/g, " "))); };
  while ((m = re.exec(text))) {
    pushText(text.slice(last, m.index));
    if (m[0] === "⟦sic⟧") runs.push(new TextRun("["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
    else if (m[1] !== undefined) {
      let nt = m[1].replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]]*)\]\]/g, "$1").trim();
      if (/^[A-Za-zÉéÎ0-9]+\.?\s+\d+/.test(nt)) nt = refRomain(nt);
      fnCount++; footnotes[fnCount] = { children: [new Paragraph({ children: [new TextRun(nt)] })] };
      runs.push(new FootnoteReferenceRun(fnCount));
    } else runs.push(new TextRun({ text: m[2].replace(/\s+/g, " "), italics: true }));
    last = re.lastIndex;
  }
  pushText(text.slice(last));
  return runs;
}
function splitTitle(content) {
  content = content.replace(/^\s*[–—-]\s*/, ""); // tiret parasite avant la réf (Exode)
  let ref = "", rest = content.trim();
  const mr = rest.match(/^\s*\(([^)]*)\)\s*/);
  if (mr) { ref = refRomain(mr[1].trim()); rest = rest.slice(mr[0].length).trim(); }
  let summary = "", body = rest;
  const s = rest.match(/^''(.+?)''\s*(\.?)\s*[–—-]\s+/);
  if (s) { summary = (s[1] + (s[2] || "")).replace(/\s+/g, " ").trim(); body = rest.slice(s[0].length).trim(); }
  return { summary, ref, body };
}
const SOUS = (ref) => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: ref, italics: true, color: "7a746d" })] });

const body = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Questions sur l’Heptateuque")] }),
  new Paragraph({ children: [new TextRun({ text: "Livre deuxième — Questions sur l’Exode. Éd. Raulx, t. IV, 1866, trad. abbé Pognon. DRAFT (structure + romanisation ; corrections OCR à venir).", italics: true })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Livre deuxième — Questions sur l’Exode")] }),
];
for (const q of questions) {
  const hchildren = [new TextRun("Question " + (q.num === 1 ? "I" : q.label))];
  const labSic = LABEL_SIC.some(([lab, rs]) => q.label === lab && q.content.replace(/^\s+/, "").startsWith(rs));
  if (labSic) hchildren.push(new TextRun(" ["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 20 }, children: hchildren }));
  const { summary, ref, body: qbody } = splitTitle(q.content);
  if (summary) body.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: summary, italics: true })] }));
  if (ref) body.push(SOUS(ref));
  body.push(new Paragraph({ children: buildRuns(qbody) }));
  for (const sub of q.subs) body.push(new Paragraph({ children: [new TextRun({ text: sub.num + ". ", bold: true }), ...buildRuns(splitTitle(sub.content).body || sub.content)] }));
}

const doc = new Document({ footnotes, sections: [{ children: body }] });
const buf = await Packer.toBuffer(doc);
writeFileSync("Exode_draft.docx", buf);
console.log("Questions Exode :", questions.length);
console.log("Labels :", questions.map(q => q.label + (q.subs.length ? `(+${q.subs.length})` : "")).join(" "));
console.log("Notes :", fnCount, "| DOCX :", buf.length, "octets");
if (misses.length) {
  console.log(`\n⚠️ Corrections NON appliquées (cible introuvable) : ${misses.length}`);
  for (const m of misses) console.log("   ✗ " + JSON.stringify(m.length > 70 ? m.slice(0, 70) + "…" : m));
} else console.log("✓ Toutes les corrections CORR ont été appliquées.");
