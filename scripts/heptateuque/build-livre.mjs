// Pipeline générique pour les livres III à VII de l'Heptateuque.
//   node build-livre.mjs levitique
// La configuration et les corrections de chaque livre sont dans `livres/<cle>.mjs`.
// Mêmes conventions que la Genèse et l'Exode :
//   - Titre 2 = « Question » + chiffre romain de l'édition ;
//   - titre introductif italique en 1re ligne du sous-titre, réf biblique en 2e ;
//   - chapitre des réfs restauré en ROMAIN (versets en arabe, comme imprimé) ;
//   - notes = les <ref> de l'édition, renumérotées globalement ;
//   - ⟦sic⟧ → « [ » + « sic » (ital) + « ] » : coquille de l'édition conservée ;
//   - un détecteur signale toute correction dont la cible ne matche pas la source.
import { Document, Packer, Paragraph, TextRun, HeadingLevel, FootnoteReferenceRun } from "docx";
import { readFileSync, writeFileSync } from "fs";
import { enRomain, versEntier } from "./romains.mjs";

const cle = process.argv[2];
if (!cle) { console.error("Usage : node build-livre.mjs <levitique|nombres|deuteronome|josue|juges>"); process.exit(1); }
const L = (await import(`./livres/${cle}.mjs`)).default;

const romVal = versEntier;
function refRomain(ref) {
  return ref.replace(/^(\s*(?:[A-ZÉa-zéÎ0-9]+\.?)\s+)(\d+)/, (m, pre, ch) => pre + (enRomain(ch) || ch));
}

// Normalisations valables sur tout le corpus (vérifiées au fac-similé).
const NORM = [
  // Le scan imprime « Ib. » (Ibidem) ; le robot OCR a mis « Id. » dans les renvois.
  // Ciblé sur le lien Crampon seulement : un « Id. » hors lien reste à trancher au scan.
  [/(\[\[Bible_Crampon_1923\|\s*)Id\. /g, "$1Ib. "],
  [/(\[\[Bible_Crampon_1923\|\s*)Id(\]\])/g, "$1Ib$2"],
  [/\s*##Rem\.?\s*/g, " "],
  ...(L.NORM ?? []),
];

function pageBody(n) {
  let t = readFileSync(`ws/p${n}.txt`, "utf8");
  t = t.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, "");
  // Pages partagées avec le livre voisin : ne garder que la bonne section.
  if (n === L.de && L.debutSection) {
    const c = t.indexOf(`<section begin=${L.debutSection}`);
    if (c !== -1) t = t.slice(c);
  }
  if (n === L.a && L.finSection) {
    const c = t.indexOf(`<section end=${L.finSection}`);
    if (c !== -1) t = t.slice(0, c);
  }
  t = t.replace(/<section\b[^>]*>/g, "");
  t = t.replace(/^\s*-{3,}\s*$/gm, "");
  t = t.replace(/<nowiki\s*\/?>/g, "");
  t = t.replace(/<br\s*\/?>/g, "\n");
  return t.trim();
}

let raw = "";
for (let n = L.de; n <= L.a; n++) {
  const b = pageBody(n);
  if (!b) continue;
  // Recoller un mot coupé en fin de page.
  if (raw && /[\p{L}]$/u.test(raw) && /^[a-zéèêàç-]/u.test(b)) raw += (raw.endsWith("-") ? "" : " ");
  else if (raw) raw += "\n";
  raw += b;
}

// Corrections vérifiées au scan, tolérantes aux sauts de ligne.
const misses = [];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const [a, b] of (L.CORR ?? [])) {
  const pat = escRe(a).replace(/ +/g, "\\s+");
  if (!new RegExp(pat).test(raw)) { misses.push(a); continue; }
  raw = raw.replace(new RegExp(pat, "g"), () => b);
}
for (const [re, b] of NORM) raw = raw.replace(re, b);
// Certaines corrections réintroduisent un saut HTML après le nettoyage de
// la page ; les gabarits de langue sont du balisage Wikisource pur.
raw = raw.replace(/\{\{lang\|grc\|([\s\S]*?)\}\}/g, "$1");
raw = raw.replace(/<br\s*\/?>/g, "\n");

// En-têtes wiki du livre (« =LIVRE TROISIÈME= », « ==QUESTIONS SUR…== »…).
raw = raw.replace(/^\s*=+[^=\n]*=+\s*$/gm, "");

// Découpage en questions. Les sous-numéros (« 1. », « 2. ») restent rattachés
// à la question courante.
const parts = raw.split(/'''\s*(–\s*)?(QUESTION PREMIÈRE|PREMIÈRE QUESTION|[IVXLCDM]+|\d+)\.?\s*'''/);
const questions = [];
let cur = null;
for (let i = 1; i < parts.length; i += 3) {
  const label = parts[i + 1];
  const content = (parts[i + 2] || "").trim();
  if (/^\d+$/.test(label) && cur) { cur.subs.push({ num: label, content }); continue; }
  cur = { num: /QUESTION/.test(label) ? 1 : romVal(label), label, content, subs: [] };
  questions.push(cur);
}

// ── Contrôle de continuité de la numérotation ────────────────────────────
// Trois fois déjà, un numéro de question s'est retrouvé INVISIBLE au découpage
// parce que l'OCR avait perdu son balisage gras (Exode CXXVIII, Lévitique XVI,
// première question des Juges). Le trou ne se voyait qu'à l'œil : on le détecte
// désormais. Un saut signalé ici veut dire soit une question à repêcher dans la
// source, soit un numéro que l'édition elle-même saute (à confirmer au scan et à
// déclarer dans LABEL_SIC).
const anomalies = [];
{
  let attendu = 1;
  for (const q of questions) {
    const v = q.num;
    if (!v || v < 0) { anomalies.push(`« ${q.label} » n'est pas un chiffre romain reconnu`); continue; }
    if (v === attendu) { attendu++; continue; }
    if (v === attendu - 1) anomalies.push(`« ${q.label} » (${v}) répété`);
    else if (v > attendu) anomalies.push(`saut : ${attendu === v - 1 ? `${attendu} manque` : `${attendu}…${v - 1} manquent`} avant « ${q.label} »`);
    else anomalies.push(`« ${q.label} » (${v}) en recul après ${attendu - 1}`);
    attendu = v + 1;
  }
}

let fnCount = 0;
const footnotes = {};
function buildInlineRuns(text) {
  const runs = [];
  const re = /''([\s\S]*?)''|⟦sic⟧/g;
  let last = 0, m;
  const pushText = (s) => { if (s) runs.push(new TextRun(s.replace(/\n+/g, " ").replace(/\s+/g, " "))); };
  while ((m = re.exec(text))) {
    pushText(text.slice(last, m.index));
    if (m[0] === "⟦sic⟧") runs.push(new TextRun("["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
    else runs.push(new TextRun({ text: m[1].replace(/\s+/g, " "), italics: true }));
    last = re.lastIndex;
  }
  pushText(text.slice(last));
  return runs;
}
function buildRuns(text) {
  const runs = [];
  const re = /<ref>([\s\S]*?)<\/ref>|''([\s\S]*?)''|⟦sic⟧/g;
  let last = 0, m;
  const pushText = (s) => { if (s) runs.push(new TextRun(s.replace(/\n+/g, " ").replace(/\s+/g, " "))); };
  while ((m = re.exec(text))) {
    pushText(text.slice(last, m.index));
    if (m[0] === "⟦sic⟧") runs.push(new TextRun("["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
    else if (m[1] !== undefined) {
      let nt = m[1].replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]]*)\]\]/g, "$1").trim();
      if (/^[A-Za-zÉéÎ0-9]+\.?\s+\d+/.test(nt)) nt = refRomain(nt);
      fnCount++;
      footnotes[fnCount] = { children: [new Paragraph({ children: buildInlineRuns(nt) })] };
      runs.push(new FootnoteReferenceRun(fnCount));
    } else runs.push(new TextRun({ text: m[2].replace(/\s+/g, " "), italics: true }));
    last = re.lastIndex;
  }
  pushText(text.slice(last));
  return runs;
}

// Réf de tête « (…) » + titre introductif italique avant le tiret parasite.
function splitTitle(content) {
  // Tiret parasite, ou ponctuation restée collée au numéro dans la source
  // (« '''XXXVII.'''. ») : sans cela la réf n'est pas reconnue et reste dans le corps.
  let rest = content.replace(/^\s*[.,;:–—-]\s*/, "").trim();
  let ref = "";
  const mr = rest.match(/^\s*\(([^)]*)\)\s*\.?\s*/);
  if (mr) { ref = refRomain(mr[1].trim()); rest = rest.slice(mr[0].length).trim(); }
  let summary = "", body = rest;
  const s = rest.match(/^''(.+?)''\s*(\.?)\s*[–—-]\s+/);
  if (s) { summary = (s[1] + (s[2] || "")).replace(/\s+/g, " ").trim(); body = rest.slice(s[0].length).trim(); }
  return { summary, ref, body };
}
function buildSubtitleRuns(ref) {
  const parts = ref.replace(/''/g, "").split("⟦sic⟧");
  const runs = [];
  parts.forEach((part, i) => {
    if (part) runs.push(new TextRun({ text: part, italics: true, color: "7a746d" }));
    if (i < parts.length - 1) runs.push(new TextRun("["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
  });
  return runs;
}
const SOUS = (ref) => new Paragraph({ spacing: { after: 60 }, children: buildSubtitleRuns(ref) });

const body = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Questions sur l’Heptateuque")] }),
  new Paragraph({ children: [new TextRun({ text: `Œuvres complètes de saint Augustin, éd. Raulx, t. IV, Bar-le-Duc, L. Guérin & Cie, 1866. Traduction de l’abbé Pognon. DRAFT de relecture — ${L.titreCourt} (pages ${L.de}-${L.a} du scan). Les [sic] signalent des coquilles de l’édition conservées ; les fautes d’OCR sont corrigées silencieusement contre le fac-similé.`, italics: true })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(L.titre)] }),
];
for (const q of questions) {
  const hchildren = [new TextRun("Question " + (q.num === 1 ? "I" : q.label))];
  const labSic = (L.LABEL_SIC ?? []).some(([lab, rs]) => q.label === lab && q.content.replace(/^\s+/, "").startsWith(rs));
  if (labSic) hchildren.push(new TextRun(" ["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 20 }, children: hchildren }));
  const { summary, ref, body: qbody } = splitTitle(q.content);
  if (summary) body.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: summary, italics: true })] }));
  if (ref) body.push(SOUS(ref));
  body.push(new Paragraph({ children: buildRuns(qbody) }));
  for (const sub of q.subs) {
    body.push(new Paragraph({ children: [new TextRun({ text: sub.num + ". ", bold: true }), ...buildRuns(splitTitle(sub.content).body || sub.content)] }));
  }
}

const doc = new Document({ footnotes, sections: [{ children: body }] });
const buf = await Packer.toBuffer(doc);
const nom = `${L.fichier}.docx`;
writeFileSync(nom, buf);
console.log(`${L.titreCourt} : ${questions.length} questions | ${fnCount} notes | ${buf.length} octets`);
console.log("Labels :", questions.map(q => q.label + (q.subs.length ? `(+${q.subs.length})` : "")).join(" "));
if (misses.length) {
  console.log(`\n⚠️ Corrections NON appliquées (cible introuvable) : ${misses.length}`);
  for (const m of misses) console.log("   ✗ " + JSON.stringify(m.length > 70 ? m.slice(0, 70) + "…" : m));
} else console.log(`✓ ${(L.CORR ?? []).length} corrections appliquées → ${nom}`);
if (anomalies.length) {
  console.log(`\n⚠️ Numérotation : ${anomalies.length} anomalie(s) à trancher au fac-similé`);
  for (const a of anomalies) console.log("   • " + a);
} else console.log("✓ Numérotation continue de I à " + questions.length);
