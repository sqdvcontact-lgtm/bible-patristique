// Pipeline Genèse : parse le texte Wikisource (pages 383-419) → DOCX structuré.
// - Titre 1 = livre ; Titre 2 = Introduction + chaque question (« Question Nième ») ;
//   sous-titre = réf biblique (chapitre en ROMAIN par règle, versets en arabe) ;
// - notes de bas de page = les <ref> de l'édition, renumérotées globalement ;
// - couche de corrections OCR issue du contrôle image (pages 383-387 pour l'instant) ;
// - marqueur ⟦sic⟧ → « [ » + « sic » (ital) + « ] ».
// C'est un DRAFT de relecture : les pages non encore contrôlées à l'image gardent
// l'OCR Wikisource (versets/abréviations de notes à revérifier au scan).
import { Document, Packer, Paragraph, TextRun, HeadingLevel, FootnoteReferenceRun } from "docx";
import { readFileSync, writeFileSync } from "fs";
import { enRomain, versEntier } from "./romains.mjs";

const ORD = ["", "première", "deuxième", "troisième", "quatrième", "cinquième", "sixième", "septième", "huitième", "neuvième", "dixième", "onzième", "douzième", "treizième", "quatorzième", "quinzième", "seizième", "dix-septième", "dix-huitième", "dix-neuvième", "vingtième", "vingt-et-unième", "vingt-deuxième", "vingt-troisième", "vingt-quatrième", "vingt-cinquième", "vingt-sixième", "vingt-septième", "vingt-huitième", "vingt-neuvième", "trentième"];
const romVal = versEntier;

// Restaure le chapitre (1er nombre) d'une réf en romain ; versets inchangés.
function refRomain(ref) {
  return ref.replace(/^(\s*(?:[A-ZÉa-zéÎ0-9]+\.?)\s+)(\d+)/, (m, pre, ch) => pre + (enRomain(ch) || ch));
}

// ── Corrections OCR vérifiées au scan (pages 383-387) ────────────────────
const CORR = [
  // ── p383-388, 394 (contrôle initial) ──
  ["ils ne doivent pas eu conclure", "ils ne doivent pas en conclure"],
  ["engendrer un grand nombres d’autres", "engendrer un grand nombres ⟦sic⟧ d’autres"],
  ["quelques commentateurs – ont cru", "quelques commentateurs ont cru"],
  ["Origène résout cette question parle moyen", "Origène résout cette question par le moyen"],
  ["parce qu’ils m’auront pas partagé", "parce qu’ils n’auront pas partagé"],
  ["entrèrent « dans l’arche", "entrèrent dans l’arche"],
  ["s’ensuit par qu’elle", "s’ensuit pas qu’elle"],
  ["en partager figure la race", "en partage, figure la race"],
  ["cette postérité ; devait être", "cette postérité devait être"],
  ["cour du roi d’Egyte", "cour du roi d’Egyte ⟦sic⟧"],
  ["descendant de Sein, fils de Noé", "descendant de Sem, fils de Noé"],
  ["lorsque mourut son aère", "lorsque mourut son père"],
  ["Ib. 11, 12-13", "Ib. 11, 12, 13"],
  ["Ib. 12, 12-14", "Ib. 12, 12, 14"],
  ["que Melchaa eu des enfants", "que Melcha a eu des enfants"],

  // ── Agent 1 : p385, 389, 391, 392, 393, 395 ──
  ["mais le texte rappellerait.toutce qui commença de s’opérer à partir du quarantième.", "mais le texte rappellerait tout ce qui commença de s’opérer à partir du quarantième."],
  ["en vertu de la parenté qui résulte – d’une origine commune", "en vertu de la parenté qui résulte d’une origine commune ?"],
  ["et revint, ne trouvant pas ou poser le pied", "et revint, ne trouvant pas ou⟦sic⟧ poser le pied"],
  ["Qu’on apporte de l’eau et je la verserai vos pieds, rafraîchissez-vous sous cet arbre", "Qu’on apporte de l’eau et je la verai⟦sic⟧ vos pieds, rafraîchissez-vous sous cet arbre"],
  ["Horace, liv. 1, Epitre 10", "Horace, liv. 1, Épitre 10"],
  ["<ref>[[La_Cité_de_Dieu_(Augustin)/Livre_IX/Chapitre_IV|De la cité de Dieu, liv. 9, ch. 4]]</ref>", "<ref>Agellius, liv. 19, ch. 4. [[La_Cité_de_Dieu_(Augustin)/Livre_IX/Chapitre_IV|De la cité de Dieu, liv. 9, ch. 4]]</ref>"],
  ["'''XLIV.''' (Ib. 19, 18-19.)", "'''XLIV.''' (Ib. 19, 18. 19.)"],
  ["que les habitants de la ville ne le missent à mort à cause d’elle", "que les habitans⟦sic⟧ de la ville ne le missent à mort à cause d’elle"],
  ["Rom. 9, 7-8", "Rom. 9, 7, 8"],
  ["(Ib. 24, 37-38.)", "(Ib. 24, 37, 38.)"],
  ["Isa. 6, 11-12", "Isa. 6, 11, 12"],
  ["c’était le signe arrivé an serviteur du patriarche et rapporté par lui", "c’était le signe arrivé au serviteur du patriarche et rapporté par lui"],

  // ── Agent 2 : p396-401 ──
  ["''Adieux, faits à Rébecca par ses frères''", "''Adieux faits à Rébecca par ses frères''"],
  ["sois la mère de mille milliers d’enfants", "sois la la⟦sic⟧ mère de mille milliers d’enfants"],
  ["Ci-dessus, question 35.", "Ci-dessus, question 36."],
  ["de ces hypothèses, yen eût-il quelque autre encore", "de ces hypothèses, y en eût-il quelque autre encore"],
  ["1Co. 15, 48", "1Co. 15, 46"],
  ["Abimélech s’émut su point de craindre", "Abimélech s’émut au point de craindre"],
  ["Eph. 6, 31-32", "Eph. 6, 31, 32"],
  ["d’autres traits qui évidera.mentne sont point rapportés", "d’autres traits qui évidemment ne sont point rapportés"],
  ["lui paraissait court, par« ce qu’il l’aimait", "lui paraissait court, parce qu’il l’aimait"],
  ["considérer comme autorisé parle patriarche", "considérer comme autorisé par le patriarche"],
  ["Gen. 30, 3-4, 9", "Gen. 30, 3, 4, 9"],
  ["il ne mettait pas les branches â l’époque de la seconde portée", "il ne mettait pas les branches à l’époque de la seconde portée"],
  ["dans sa manière de parier ; les dix saisons", "dans sa manière de parler, les dix saisons"],
  ["en fit un monument. » 2 faut avoir soin de remarquer", "en fit un monument. » Il faut avoir soin de remarquer"],

  // ── Agent 3 : p402-407 ──
  ["la multitude des Anges elle s’appelle en effet, dans l’Écriture, l’armée des Andes.", "la multitude des Anges : elle s’appelle en effet, dans l’Écriture, l’armée des Anges."],
  ["(Ib, 31, 48-49.)", "(Ib, 31, 48, 49.)"],
  ["Comment dons Jacob veut-il être béni par celui qu’il a surpassé", "Comment donc Jacob veut-il être béni par celui qu’il a surpassé"],
  ["les a prononcées. Saris doute aussi on peut voir", "les a prononcées. Sans doute aussi on peut voir"],
  ["boiteux dans toute la longueur de sa cuisse", "boiteux dans toute la longeur ⟦sic⟧ de sa cuisse"],
  ["la différence du sens st facilement saisie", "la différence du sens est facilement saisie"],
  ["d’aller ensuite le retrouver àSéïr ?", "d’aller ensuite le retrouver à Séïr ?"],
  ["et il fut attaché de cœur à Dina ; fille de Jacob", "et il fut attaché de cœur à Dina, fille de Jacob"],
  ["Gen. 33, 18-20 ; 34, 1", "Gen. 33, 18, 20 ; 34, 1"],
  ["Nombre des personnes de la suite de Jacob", "Nombre des personnes de le ⟦sic⟧ suite de Jacob"],
  ["et dresse là un autel au. Dieu qui t’apparut", "et dresse là un autel au Dieu qui t’apparut"],
  ["Remarquons, à partirde cet endroit", "Remarquons, à partir de cet endroit"],
  ["(Ib. 35, 9-10.)", "(Ib. 35, 9, 10.)"],
  ["sera la – suprême récompense.", "sera la suprême récompense."],
  ["Des peuples.etdes multitudes de peuples ?", "Des peuples et des multitudes de peuples ?"],
  ["On demande pour quoi : ''et les pendants d’oreilles ?''", "On demande pourquoi : ''et les pendants d’oreilles ?''"],
  ["et les ont luis à mort", "et les ont mis à mort"],
  ["et la vulgate, undecim, onze.", "et la vulgate undecim, onze."],
  ["par synedoche, et dans cette expression", "par synedoche ⟦sic⟧, et dans cette expression"],
  ["de tous les rots, d’Edom", "de tous les rois d’Edom"],
  ["et par Balac, son successeur, qui est donné comme le premier roi d’Edom", "et par Balac, son successur ⟦sic⟧, qui est donné comme le premier roi d’Edom"],
  ["(Ib. 36, 6-7.)", "(Ib. 36, 6, 7.)"],
  ["(Ib. 36, 31-32.)", "(Ib. 36, 31, 32.)"],
  ["pour la première fois le mont, Séïr.", "pour la première fois le mont Séïr."],
  ["et qu’il était de Séphoret non de Béor", "et qu’il était de Séphor et non de Béor"],
  ["la nomenclature des rois est des princes de cette nation", "la nomenclature des rois est ⟦sic⟧ des princes de cette nation"],
  ["Gen. 36, 6-43", "Gen. 36, 6-13"],
  ["Je ne veux pas due qu’on ne puisse le prouver", "Je ne veux pas dire qu’on ne puisse le prouver"],
  ["en faire (application à la mère de Joseph", "en faire l’application à la mère de Joseph"],

  // ── Agent 4 : p408-413 ──
  ["(Ib. 37, 23.) ''Les Madianites nommés Ismaélites''", "(Ib. 37, 28.) ''Les Madianites nommés Ismaélites''"],
  ["Phi. 2, 9-10", "Phi. 2, 9, 10"],
  ["comprend bien cette, manière de parler dans ce passage du psaume", "comprend bien cette manière de parler dans ce paassge ⟦sic⟧ du psaume"],
  ["portée sur l’eau comme un navire, Cette manière de parler indique", "portée sur l’eau comme un navire. Cette manière de parler indique"],
  ["indique en effet que la terre : est au-dessus de l’eau", "indique en effet que la terre est au-dessus de l’eau"],
  ["« Et il lui.fitépouserAseneth, fille de Pétéphrès", "« Et il lui fit épouser Aseneth, fille de Pétéphrès"],
  ["est-il question d’un autre Il est plus probable", "est-il question d’un autre ? Il est plus probable"],
  ["à croire qu’il ne s’agit pas du : premier", "à croire qu’il ne s’agit pas du premier"],
  ["qu’il ne devint eunuque.queplus tard, ou par accident", "qu’il ne devint eunuque que plus tard, ou par accident"],
  ["elle reconstitue pas un danger pour la foi", "elle ne constitue pas un danger pour la foi"],
  ["(Ib. 42, 15-16.)", "(Ib. 42, 15, 16.)"],
  ["jure-t-il ainsi. « parle salut, de Pharaon » que ses frères", "jure-t-il ainsi : « par le salut de Pharaon, » que ses frères"],
  ["du moins éviter d e se parjurer pour le salut", "du moins éviter de se parjurer pour le salut"],
  ["l’avez enivrée, et.vousavez mis le comble", "l’avez enivrée, et vous avez mis le comble"],
  ["le mot ''s’enivrer''signifié ''se rassasier''", "le mot ''s’enivrer'' signifie ''se rassasier''"],
  ["(Ib. 46, 6-7.)", "(Ib. 46, 6, 7.)"],
  ["qui vinrent à Jacob eu Mésopotamie de Syrie ; n à combien plus forte", "qui vinrent à Jacob en Mésopotamie de Syrie<ref>Ci-dessus, Question CXVII.</ref> ; » à combien plus forte"],
  ["'''CLII.''' (Ib. 46, 26-27.)", "'''CLII.''' (Ib. 46, 26, 27.)"],
  ["les exemplaires hébreux en font menton en cet endroit", "les exemplaires hébreux en font mention en cet endroit"],
  ["étaient au nombre die onze personnes", "étaient au nombre de onze personnes"],
  ["Gen. 46, 21-32", "Gen. 46, 21, 22, 27"],
  ["Et c’est à boa droit : car", "Et c’est à bon droit : car"],

  // ── Agent 5 : p414-419 ──
  ["à notre image et à notre ressemblante et qu’il domine", "à notre image et à notre ressemblance et qu’il domine"],
  ["il avait été t’ait captif à main armée", "il avait été fait captif à main armée"],
  ["jouiront dans L’éternité d’un bonheur", "jouiront dans l’éternité d’un bonheur"],
  ["'''CLV.''' (Ib. 47, 5-6.)", "'''CLV.''' (Ib. 47, 5, 6.)"],
  ["rappelle brièvement et d’une manière obture", "rappelle brièvement et d’une manière obcure ⟦sic⟧"],
  ["Gen. 37, 28-36", "Gen. 37, 28, 36"],
  ["non seulementlorsqu’il voyageait en Mésopotamie", "non seulement lorsqu’il voyageait en Mésopotamie"],
  ["le pays de Ramessès » 2 faut s’assurer si ce pays", "le pays de Ramessès. » Il faut s’assurer si ce pays"],
  ["la connaissance des lieux ; procurer des pâturages", "la connaissance des lieux, procurer des pâturages"],
  ["Sir. 34, 30-31", "Sir. 34, 30, 31"],
  ["où devait donc.avoirlieu cette sépulture, sinon", "où devait donc avoir lieu cette sépulture, sinon"],
  ["était la figure despéchés.deshommes.", "était la figure des péchés des hommes."],
  ["'''CLXII.''' (Ib. 47, 31.)", "'''CLXII.''' (Ib. 47, 21.)"],
  ["il adora Dieu immédiatement ? 2 n’avait pas à rougir", "il adora Dieu immédiatement ? Il n’avait pas à rougir"],
  ["'''CLXIV.''' (Ib. 48, 5-6.)", "'''CLXIV.''' (Ib. 48, 5, 6.)"],
  ["que Joseph est ainsi comme une parenthèse", "que Josehp ⟦sic⟧ est ainsi comme une parenthèse"],
  ["'''CLXVI.''' (Ib. 48, 14-19.)", "'''CLXVI.''' (Ib. 48, 14, 19.)"],
  ["Jésus-Christ ; cal – il est dit de lui", "Jésus-Christ ; car il est dit de lui"],
  ["Lorsque Joseph envoie les premiers de l’Égypte", "Lersque ⟦sic⟧ Joseph envoie les premiers de l’Égypte"],
  ["fils de Manassé, furent élevés sur les genoux", "fils de Manasse, furent élevés sur les genoux"],
  // Correctifs Wikisource : conserver la leçon réellement imprimée et la
  // signaler, au lieu d’importer silencieusement la correction moderne.
  ["{{corr|Sara|Agar}}", "Sara ⟦sic⟧"],
  ["{{corr|par fois|parfois}}", "par fois ⟦sic⟧"],
];
// Numéros que l'édition imprime fautivement (VÉRIFIÉ au fac-similé p409 :
// « CXXI » pour CXXXI à Gen. XL, 16 ; « CXXX » pour CXXXIII à Gen. XLI, 30).
// [sic] apposé au titre, hors des délimiteurs ''' ''' (sinon casse le découpage).
// Discriminé par (libellé + réf) pour ne pas toucher les VRAIS 121 / 130.
const LABEL_SIC = [["CXXI", "(Ib. 40, 16"], ["CXXX", "(Ib. 41, 30"]];
const NORM = [
  [/ non seulement /g, " non-seulement "],
  // Raccord p398/399 : le changement de page coupe un mot composé.
  [/connut- elle/g, "connut-elle"],
];

// Q XXV (p386-387) : l'OCR confond « Charran » (la ville) et « Chanaan » (le pays).
// Dans cette question, tout « Chanaan » vaut « Charran », sauf « terre de Chanaan ».
function fixCharranXXV(t) {
  return t.replace(/'''XXV\.'''[\s\S]*?(?='''XXVI\.''')/, s => s.replace(/(?<!terre de )Chanaan/g, "Charran"));
}

// ── Lecture + nettoyage des pages ────────────────────────────────────────
function pageBody(n) {
  let t = readFileSync(`ws/p${n}.txt`, "utf8");
  t = t.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, "");
  // La Genèse s'arrête à la section s1 de la p419 (l'Exode = section s2 de la même page).
  const cut = t.indexOf("<section end=s1");
  if (n === 419 && cut !== -1) t = t.slice(0, cut);
  t = t.replace(/<section\b[^>]*>/g, "");
  t = t.replace(/^\s*-{3,}\s*$/gm, "");
  t = t.replace(/<nowiki\s*\/?>/g, "");
  t = t.replace(/<br\s*\/?>/g, "\n");
  return t.trim();
}
let raw = "";
for (let n = 383; n <= 419; n++) {
  const b = pageBody(n);
  if (raw && /[\p{L}]$/u.test(raw) && /^[a-zéèêàç-]/u.test(b)) raw += (raw.endsWith("-") ? "" : " ");
  else if (raw) raw += "\n";
  raw += b;
}
// corrections + normalisations (avec détection des cibles non trouvées)
const misses = [];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const [a, b] of CORR) {
  // tolérant aux sauts de ligne / espaces multiples : chaque espace → \s+
  const pat = escRe(a).replace(/ +/g, "\\s+");
  if (!new RegExp(pat).test(raw)) { misses.push(a); continue; }
  raw = raw.replace(new RegExp(pat, "g"), () => b);
}
for (const [re, b] of NORM) raw = raw.replace(re, b);
// Les gabarits de langue et les sauts HTML ne font pas partie du texte.
raw = raw.replace(/\{\{lang\|grc\|([\s\S]*?)\}\}/g, "$1");
raw = raw.replace(/<br\s*\/?>/g, "\n");
raw = fixCharranXXV(raw);

// ── Découpage : intro + questions ────────────────────────────────────────
// En-têtes wiki de la p383
raw = raw.replace(/^=QUESTIONS SUR L’HEPTATEUQUE=\s*/m, "");
raw = raw.replace(/^=LIVRE PREMIER\. QUESTIONS SUR LA GENÈSE\.=\s*/m, "");
const introMatch = raw.match(/==INTRODUCTION\.==\s*([\s\S]*?)(?='''(?:–\s*)?(?:PREMIÈRE QUESTION|[IVXLCDM]+|\d+)\.?''')/);
// Wikisource enveloppe toute l’introduction dans un italique absent du scan.
// Retirer uniquement cette enveloppe extérieure permet aussi de convertir la
// note imprimée de la p383, au lieu de la laisser prisonnière du balisage.
const introText = introMatch ? introMatch[1].trim().replace(/^''([\s\S]*)''$/, "$1") : "";
const afterIntro = raw.slice(raw.indexOf(introMatch[0]) + introMatch[0].length);

// tokens de question : '''PREMIÈRE QUESTION.''' | '''XX.''' | '''2.''' | '''– 1.'''
const parts = afterIntro.split(/'''\s*(–\s*)?(PREMIÈRE QUESTION|[IVXLCDM]+|\d+)\.?\s*'''/);
// parts = [before(''), (dash?|undef), label, content, (dash?), label, content, ...]
const questions = [];
let cur = null;
for (let i = 1; i < parts.length; i += 3) {
  const dash = parts[i];
  const label = parts[i + 1];
  const content = (parts[i + 2] || "").trim();
  const isSub = /^\d+$/.test(label); // sous-numéro 1/2/3 → paragraphe de la question courante
  if (isSub && cur) {
    cur.subs.push({ num: label, content });
  } else {
    let num = label === "PREMIÈRE QUESTION" ? 1 : romVal(label);
    cur = { num, label, content, subs: [] };
    questions.push(cur);
  }
}

// ── Construction des runs (italiques '' '', notes <ref>, ⟦sic⟧) ──────────
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
  // segmente sur <ref>…</ref>, '' '' et ⟦sic⟧
  const re = /<ref>([\s\S]*?)<\/ref>|''([\s\S]*?)''|⟦sic⟧/g;
  let last = 0, m;
  const pushText = (s) => { if (s) runs.push(new TextRun(s.replace(/\n+/g, " ").replace(/\s+/g, " "))); };
  while ((m = re.exec(text))) {
    pushText(text.slice(last, m.index));
    if (m[0] === "⟦sic⟧") {
      runs.push(new TextRun("["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
    } else if (m[1] !== undefined) {
      // note : extraire le texte affiché ([[cible|texte]] ou texte brut), romaniser une réf biblique
      let nt = m[1].replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]]*)\]\]/g, "$1").trim();
      if (/^[A-Za-zÉéÎ0-9]+\.?\s+\d+/.test(nt)) nt = refRomain(nt);
      fnCount++;
      footnotes[fnCount] = { children: [new Paragraph({ children: buildInlineRuns(nt) })] };
      runs.push(new FootnoteReferenceRun(fnCount));
    } else {
      runs.push(new TextRun({ text: m[2].replace(/\s+/g, " "), italics: true }));
    }
    last = re.lastIndex;
  }
  pushText(text.slice(last));
  return runs;
}

// Extrait la réf de tête « (…) » d'un contenu de question.
// Une ponctuation parasite peut suivre le numéro dans la source (« '''XXXVII.'''. »),
// auquel cas la réf n'était pas reconnue et restait dans le corps, non romanisée.
function splitRef(content) {
  const c = content.replace(/^\s*[.,;:]\s*/, "");
  const m = c.match(/^\s*\(([^)]*)\)\s*/);
  if (!m) return { ref: "", rest: c.trim() };
  return { ref: refRomain(m[1].trim()), rest: c.slice(m[0].length).trim() };
}

// extrait réf + titre introductif italique (avant le tiret parasite) + corps
function splitTitle(content) {
  const { ref, rest } = splitRef(content);
  let summary = "", body = rest;
  // titre = italique en tête, suivi d'un « . » facultatif puis d'un tiret –/—/-
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
  new Paragraph({ children: [new TextRun({ text: "Œuvres complètes de saint Augustin, éd. Raulx, t. IV, Bar-le-Duc, L. Guérin & Cie, 1866. Traduction de l’abbé Pognon. DRAFT de relecture — Genèse (pages 383-419 du scan), contrôle image intégral effectué. Les [sic] signalent des coquilles de l’édition conservées ; les fautes d’OCR sont corrigées silencieusement contre le fac-similé.", italics: true })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Livre premier — Questions sur la Genèse")] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Introduction")] }),
  new Paragraph({ children: buildRuns(introText) }),
];
for (const q of questions) {
  const hchildren = [new TextRun("Question " + (q.num === 1 ? "I" : q.label))];
  const labSic = LABEL_SIC.some(([lab, rs]) => q.label === lab && q.content.replace(/^\s+/, "").startsWith(rs));
  if (labSic) hchildren.push(new TextRun(" ["), new TextRun({ text: "sic", italics: true }), new TextRun("]"));
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 20 }, children: hchildren }));
  const { summary, ref, body: qbody } = splitTitle(q.content);
  // titre introductif italique (ref_niv2_texte, 1re ligne)
  if (summary) body.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: summary, italics: true })] }));
  // référence biblique (ref_niv2_texte, 2e ligne — saut de ligne au-dessus)
  if (ref) body.push(SOUS(ref));
  body.push(new Paragraph({ children: buildRuns(qbody) }));
  for (const s of q.subs) {
    body.push(new Paragraph({ children: [new TextRun({ text: s.num + ". ", bold: true }), ...buildRuns(splitRef(s.content).rest || s.content)] }));
  }
}

const doc = new Document({ footnotes, sections: [{ children: body }] });
const buf = await Packer.toBuffer(doc);
writeFileSync("Genese_draft_v7.docx", buf);
const avecTitre = questions.filter(q => splitTitle(q.content).summary).length;
console.log("Ex. titres :", questions.slice(7, 11).map(q => `${q.label}→ “${splitTitle(q.content).summary || "(aucun)"}” / ${splitTitle(q.content).ref}`).join(" | "));
console.log(`Questions avec titre introductif : ${avecTitre}/${questions.length}`);
console.log(`Questions détectées : ${questions.length}`);
console.log("Labels :", questions.map(q => q.label + (q.subs.length ? `(+${q.subs.length})` : "")).join(" "));
console.log(`Notes de bas de page : ${fnCount}`);
if (misses.length) {
  console.log(`\n⚠️ Corrections NON appliquées (cible introuvable) : ${misses.length}`);
  for (const m of misses) console.log("   ✗ " + JSON.stringify(m.length > 70 ? m.slice(0, 70) + "…" : m));
} else console.log("\n✓ Toutes les corrections CORR ont été appliquées.");
console.log(`DOCX : Genese_draft_v7.docx (${buf.length} octets)`);
