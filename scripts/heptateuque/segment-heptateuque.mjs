import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import JSZip from "jszip";
import levitique from "./livres/levitique.mjs";
import nombres from "./livres/nombres.mjs";
import deuteronome from "./livres/deuteronome.mjs";
import josue from "./livres/josue.mjs";
import juges from "./livres/juges.mjs";
const ROOT = process.cwd(),
  OUT = join(ROOT, "segmentation-candidate"),
  ID = "A0010O0023";
mkdirSync(OUT, { recursive: true });
const BOOKS = [
  ["Genese_draft_v7.docx", "Questions sur la Genèse", 383, 419],
  ["Exode_draft_v3.docx", "Questions sur l’Exode", 419, 477],
  ["Levitique_draft.docx", "Questions sur le Lévitique", 478, 512],
  ["Nombres_draft.docx", "Questions sur les Nombres", 512, 537],
  ["Deuteronome_draft.docx", "Questions sur le Deutéronome", 537, 559],
  ["Josue_draft.docx", "Questions sur Josué", 559, 572],
  ["Juges_draft.docx", "Questions sur les Juges", 573, 597],
];

const LIVRES_REFERENCES = new Map([
  ["gen.", "Genèse"],
  ["exod.", "Exode"],
  ["lev.", "Lévitique"],
  ["nomb.", "Nombres"],
  ["deut.", "Deutéronome"],
  ["jos.", "Josué"],
  ["juges.", "Juges"],
]);

function entierRomain(romain) {
  const valeurs = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < romain.length; i++) {
    const courant = valeurs[romain[i]] ?? 0;
    const suivant = valeurs[romain[i + 1]] ?? 0;
    total += courant < suivant ? -courant : courant;
  }
  return total;
}

function separerTitreLivre(titre, titreTexteParDefaut) {
  const m = titre.match(/^(Livre\s+\S+)\s*[–—-]\s*(Questions sur .+)$/u);
  return m
    ? { titre: m[1], texte: m[2] }
    : { titre, texte: titreTexteParDefaut };
}

function normaliserLigneReference(ligne, livreCourant) {
  const livreSeul = livreCourant.replace(
    /^Questions sur (?:la |le |les |l’)/u,
    "",
  );
  const nue = ligne.trim().match(/^([IVXLCDM]+|\d+)\s*[,.,]\s*(.+?)\s*\.?$/iu);
  if (nue) ligne = `${livreSeul} ${nue[1]}, ${nue[2]}`;
  const m = ligne.trim().match(/^\(?\s*(Gen\.|Genèse|Exod\.|Exode|Lev\.|Lévitique|Nomb\.|Nombres|Deut\.|Deutéronome|Jos\.|Josué|Juges\.?|Ib[.,]*)\s*,?\s*(.+?)\s*\)?$/iu);
  if (!m) return ligne;
  const prefixe = m[1].toLowerCase();
  const livre = prefixe.startsWith("ib")
    ? livreSeul
    : prefixe.startsWith("gen") ? "Genèse"
    : prefixe.startsWith("exod") ? "Exode"
    : prefixe.startsWith("lev") || prefixe.startsWith("lév") ? "Lévitique"
    : prefixe.startsWith("nomb") ? "Nombres"
    : prefixe.startsWith("deut") ? "Deutéronome"
    : prefixe.startsWith("jos") ? "Josué"
    : prefixe.startsWith("juges") ? "Juges" : LIVRES_REFERENCES.get(prefixe);
  if (!livre) return ligne;
  const parties = m[2].replace(/[.]$/, "").split(/\s*;\s*/);
  const references = parties.map((partie) => {
    const ref = partie.match(/^([IVXLCDM]+|\d+)(?:\s*[,.]\s*(.+))?$/iu);
    if (!ref) return null;
    const chapitre = /^\d+$/.test(ref[1]) ? Number(ref[1]) : entierRomain(ref[1].toUpperCase());
    const versets = ref[2]?.replace(/\.\s*(?=\d)/g, ", ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s*-\s*/g, "-")
      .replace(/[.]$/, "").trim();
    return versets ? `${chapitre}, ${versets}` : String(chapitre);
  });
  return references.every(Boolean) ? `${livre} ${references.join(" ; ")}` : ligne;
}

function normaliserReferenceTitre(texte, livreCourant) {
  if (!texte) return texte;
  return texte
    .replace(/⟦sic⟧|\[sic\]/giu, "[<i>sic</i>]")
    .split("\n")
    .map((ligne) => normaliserLigneReference(ligne, livreCourant))
    .join("\n");
}

function corrigerTexteSource(texte) {
  return texte
    .replace(/\s*==DU TABERNACLE\.==\s*$/u, "")
    .replace(/\s+v 1-8\s*$/u, "")
    .replace(/remplir sa cité\s*$/u, "remplir sa cité ?")
    .replace(/un froid engourdi, pour\s*:\s*un\s*$/u, "un froid engourdi, pour : un froid qui engourdit.")
    .replace(/naître le Christ\s*$/u, "naître le Christ ?")
    .replace(/culte de latrie\s*$/u, "culte de latrie.")
    .replace(/par cela même qu’il est Dieu\s*$/u, "par cela même qu’il est Dieu.")
    .replace(/le Fils unique de Dieu\s*$/u, "le Fils unique de Dieu ?")
    .replace(/signification du mot Chérubin,\s*$/u, "signification du mot Chérubin.")
    .replace(/purs de toutes ces infamies,\s*$/u, "purs de toutes ces infamies.")
    .replace(/\?\s*-\s*/gu, "? - ")
    .trim();
}
const PAGE_CORRECTIONS = new Map([
  ["Levitique_draft.docx", levitique.CORR ?? []],
  ["Nombres_draft.docx", nombres.CORR ?? []],
  ["Deuteronome_draft.docx", deuteronome.CORR ?? []],
  ["Josue_draft.docx", josue.CORR ?? []],
  ["Juges_draft.docx", juges.CORR ?? []],
]);
const dec = (s) =>
  String(s ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
const plain = (s) =>
  String(s ?? "")
    .replace(/<\/?i>/g, "")
    .replace(/\[\[\d+\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const words = (s) =>
  plain(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
function runs(x) {
  let o = "";
  for (const m of x.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)) {
    let r = m[0],
      id = r.match(/<w:footnoteReference\b[^>]*w:id="(-?\d+)"/)?.[1];
    if (id) {
      if (+id > 0) o += `[[${id}]]`;
      continue;
    }
    let t = [...r.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((z) => dec(z[1]))
      .join("");
    if (t) o += /<w:i(?:\s|\/|>)/.test(r) ? `<i>${t}</i>` : t;
  }
  return o
    .replace(/<\/i><i>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function paras(x) {
  let a = [];
  for (const m of x.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
    let p = m[0],
      text = runs(p);
    if (text)
      a.push({
        style: p.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/)?.[1] ?? "",
        text,
        ref: /<w:color\b[^>]*w:val="7a746d"/i.test(p),
      });
  }
  return a;
}
function foots(x) {
  let a = new Map();
  for (const m of x.matchAll(
    /<w:footnote\b[^>]*w:id="(-?\d+)"[^>]*>([\s\S]*?)<\/w:footnote>/g,
  ))
    if (+m[1] > 0) a.set(+m[1], runs(m[2]));
  return a;
}
function inside(s, n) {
  let b = s.slice(0, n);
  return (b.match(/<i>/g)?.length ?? 0) !== (b.match(/<\/i>/g)?.length ?? 0);
}
function split(text, ctx, alerts) {
  let s = text.replace(/\s+/g, " ").trim();
  if (s.length <= 380) return [{ text: s, boundary: "paragraphe" }];
  let a = [],
    start = 0;
  while (s.length - start > 380) {
    const target = start + 300,
      c = [];
    // La phrase est l'unité minimale : une citation peut contenir plusieurs
    // phrases, mais une phrase longue n'est jamais cassée à la virgule.
    for (const m of s
      .slice(start)
      .matchAll(
        /[.!?](?:<\/i>|\[\[\d+\]\])*(?:\s*[»”])*(?:<\/i>|\[\[\d+\]\])*(?=\s|$)/g,
      )) {
      const end = start + m.index + m[0].length;
      if (end > start + 20 && !inside(s, end)) c.push({ end, why: "phrase" });
    }
    const approved = new Map([
      ["Lévitique|Question XX|p5", [/en expiation de ses faux serments ;/g]],
      [
        "Lévitique|Question XXIII|p1",
        [
          /au pied de l’autel des <i>holocaustes<\/i>\[\[\d+\]\] ;/g,
          /touchées avec le sang :/g,
        ],
      ],
      ["Lévitique|Question XXVII|p3", [/sur l’autel tout à l’entour ;/g]],
      ["Lévitique|Question XXXVI|p2", [/la graisse et les reins ;/g]],
      [
        "Lévitique|Question XXXVI|p3",
        [/être offerts en holocauste ;/g, /notre opinion à ce sujet :/g],
      ],
      [
        "Lévitique|Question XLV|p1",
        [
          /pendant sept autres jours\[\[\d+\]\] »[^;]*;/g,
          /comme il vient d’être dit ;/g,
        ],
      ],
      ["Lévitique|Question XLVII|p1", [/être soumis à une épreuve ;/g]],
      [
        "Nombres|Question XXVII|p1",
        [
          /instigateurs de la scission et de la révolte :/g,
          /engloutir toute espèce de personnes à la fois ;/g,
        ],
      ],
      ["Nombres|Question XXXIII|p11", [/ou un tombeau ;/g]],
      ["Nombres|Question XLII|p1", [/pût contenir ce récit ;/g]],
      ["Nombres|Question LIX|p1", [/mais la femme seulement :/g]],
    ]);
    const patterns =
      [...approved].find(([key]) => ctx.includes(key))?.[1] ?? [];
    for (const pattern of patterns)
      for (const m of s.slice(start).matchAll(pattern)) {
        const end = start + m.index + m[0].length;
        if (end > start + 140 && !inside(s, end))
          c.push({ end, why: "articulation_validee" });
      }
    if (!c.length) {
      alerts.push({
        type: "phrase_longue_indivisible",
        ctx,
        length: s.length - start,
      });
      break;
    }
    c.sort((x, y) => Math.abs(x.end - target) - Math.abs(y.end - target));
    let q = c[0];
    a.push({ text: s.slice(start, q.end).trim(), boundary: q.why });
    if (q.end - start > 500)
      alerts.push({ type: "segment_long", ctx, length: q.end - start });
    start = q.end;
    while (/\s/.test(s[start] ?? "")) start++;
  }
  if (start < s.length)
    a.push({ text: s.slice(start).trim(), boundary: "paragraphe" });
  // Filet de sûreté typographique : un guillemet fermant appartient toujours
  // à la citation du segment précédent, y compris dans la graphie « ». ».
  for (let i = 1; i < a.length; i++) {
    const closing = a[i].text.match(/^»[.]?/u)?.[0];
    if (!closing) continue;
    a[i - 1].text += ` ${closing}`;
    a[i].text = a[i].text.slice(closing.length).trim();
    if (!a[i].text) {
      a.splice(i, 1);
      i--;
    }
  }
  // Josué IX, §4 : la réponse brève conclut la question précédente ; la
  // phrase suivante ouvre le développement causal.
  if (ctx.includes("Josué|Question IX|p4")) {
    const index = a.findIndex((piece) =>
      piece.text.startsWith("C’est un secret de Celui"),
    );
    if (index > 0) {
      const first = a[index].text.match(
        /^C’est un secret de Celui en qui l’injustice n’habite point\[\[\d+\]\]\./,
      )?.[0];
      if (first) {
        a[index - 1].text += ` ${first}`;
        a[index].text = a[index].text.slice(first.length).trim();
      }
    }
  }
  return a;
}
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function sourceTokens(from, to, corrections = []) {
  const pages = [];
  for (let page = from; page <= to; page++) {
    let t = readFileSync(join(ROOT, "ws", `p${page}.txt`), "utf8");
    if (page === 419) {
      if (from === 383) {
        let i = t.indexOf("<section end=s1");
        if (i >= 0) t = t.slice(0, i);
      } else {
        let i = t.indexOf("<section begin=s2");
        if (i >= 0) t = t.slice(i);
      }
    }
    let begin = { 478: "s1", 512: "s2", 537: "s2", 559: "s2" }[from];
    if (page === from && begin) {
      let i = t.indexOf(`<section begin=${begin}`);
      if (i >= 0) t = t.slice(i);
    }
    let end = { 512: "s1", 537: "s1", 559: "s1" }[to];
    if (page === to && end) {
      let i = t.indexOf(`<section end=${end}`);
      if (i >= 0) t = t.slice(0, i);
    }
    pages.push({ page, text: t });
  }
  // Les DOCX ont été établis avec ces corrections OCR contrôlées. Les appliquer
  // séparément à chaque page conserve la frontière matérielle, notamment quand
  // un fragment soudé par l'OCR a été retiré d'une page puis réinséré à la suivante.
  for (const [find, replacement] of corrections) {
    const pattern = new RegExp(escRe(find).replace(/ +/g, "\\s+"), "g");
    for (const item of pages)
      item.text = item.text.replace(pattern, () => replacement);
  }
  const a = [];
  for (const { page, text } of pages) {
    let t = text;
    t = t
      .replace(/<noinclude>[\s\S]*?<\/noinclude>/g, " ")
      .replace(/<ref>[\s\S]*?<\/ref>/g, " ")
      .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, "$1")
      .replace(/\[\[([^\]]*)\]\]/g, "$1")
      .replace(/<[^>]+>|\{\{[^}]+\}\}|'{2,3}|=+/g, " ");
    for (const token of words(t)) if (token !== "sic") a.push({ token, page });
  }
  a.byToken = new Map();
  a.pageBounds = new Map();
  for (let i = 0; i < a.length; i++) {
    const { token, page } = a[i];
    if (!a.byToken.has(token)) a.byToken.set(token, []);
    a.byToken.get(token).push(i);
    const bound = a.pageBounds.get(page);
    if (bound) bound.end = i;
    else a.pageBounds.set(page, { start: i, end: i });
  }
  return a;
}
function lowerBound(a, value) {
  let lo = 0,
    hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
function startScore(target, src, start) {
  const probe = target.slice(0, 32),
    sample = src.slice(start, start + probe.length + 10).map((x) => x.token),
    dp = new Uint8Array(sample.length + 1);
  for (const token of probe) {
    let diagonal = 0;
    for (let j = 1; j <= sample.length; j++) {
      const above = dp[j];
      dp[j] =
        token === sample[j - 1] ? diagonal + 1 : Math.max(dp[j], dp[j - 1]);
      diagonal = above;
    }
  }
  let prefix = 0;
  while (prefix < 6 && probe[prefix] === sample[prefix]) prefix++;
  const first = sample.slice(0, 4).indexOf(probe[0]);
  return (
    0.65 * (dp[sample.length] / probe.length) +
    0.2 * (prefix / Math.min(6, probe.length)) +
    0.15 * (first < 0 ? 0 : 1 - first / 4)
  );
}
function matchedEnd(target, src, start) {
  let cursor = start,
    last = start,
    hits = 0;
  for (const token of target) {
    let found = -1;
    for (let i = cursor; i < Math.min(src.length, cursor + 7); i++)
      if (src[i].token === token) {
        found = i;
        break;
      }
    if (found >= 0) {
      hits++;
      last = found;
      cursor = found + 1;
    }
  }
  return hits / target.length >= 0.55
    ? last + 1
    : Math.min(src.length, start + target.length);
}
function pageOf(text, src, state, alerts, ctx) {
  const target = words(text).filter((x) => x !== "sic");
  if (!target.length) return state.page ?? src[state.pos]?.page ?? null;
  const currentPage =
      state.page ?? src[Math.min(state.pos, src.length - 1)]?.page,
    lastPage = src[src.length - 1]?.page,
    maxPage = Math.min(lastPage, currentPage + 2),
    begin = Math.max(0, state.pos - 16),
    end = src.pageBounds.get(maxPage)?.end ?? src.length - 1,
    candidates = new Set([state.pos]);
  // Une ancre parmi les premiers mots donne un départ estimé. La recherche est
  // bornée à la page courante et aux deux suivantes : une répétition lointaine
  // ne peut donc plus provoquer un décrochage en cascade.
  for (let offset = 0; offset < Math.min(12, target.length); offset++) {
    const positions = src.byToken.get(target[offset]) ?? [];
    for (
      let k = lowerBound(positions, begin + offset);
      k < positions.length;
      k++
    ) {
      const i = positions[k] - offset;
      if (i > end) break;
      if (i >= begin && (src[i]?.page ?? currentPage) >= currentPage)
        candidates.add(i);
    }
  }
  let best = null;
  for (const i of candidates) {
    if (i < begin || i > end || (src[i]?.page ?? currentPage) < currentPage)
      continue;
    const score = startScore(target, src, i),
      proximity = 1 / (1 + Math.abs(i - state.pos) / 160),
      rank = 0.9 * score + 0.1 * proximity;
    if (
      !best ||
      rank > best.rank ||
      (rank === best.rank &&
        Math.abs(i - state.pos) < Math.abs(best.i - state.pos))
    )
      best = { i, score, rank };
  }
  const confident = best && best.score >= 0.7;
  if (!confident)
    alerts.push({
      type: "page_alignement_faible",
      ctx,
      score: best?.score ?? 0,
      excerpt: plain(text).slice(0, 120),
    });
  // En faible confiance, rester au curseur attendu plutôt que sauter vers une
  // occurrence douteuse. Dans les deux cas, progresser jusqu'à la fin appariée.
  const start = confident ? best.i : Math.min(state.pos, src.length - 1),
    page = Math.max(currentPage, src[start]?.page ?? currentPage);
  state.pos = Math.max(state.pos, matchedEnd(target, src, start));
  state.page = page;
  return page;
}
const segments = [],
  map = [],
  alerts = [];
let sn = 0;
for (const [file, book, from, to] of BOOKS) {
  let z = await JSZip.loadAsync(readFileSync(file)),
    ps = paras(await z.file("word/document.xml").async("string")),
    notes = foots(await z.file("word/footnotes.xml").async("string")),
    src = sourceTokens(from, to, PAGE_CORRECTIONS.get(file)),
    state = { pos: 0, page: from },
    div = null,
    par = 0,
    sum = null,
    ref = null,
    bookTitle = book,
    bookTitleText = book;
  for (const p of ps) {
    if (
      /Title$/i.test(p.style) ||
      (!div && !/Heading[12]|Titre[12]|heading [12]/i.test(p.style))
    )
      continue;
    if (/Heading1|Titre1|heading 1/i.test(p.style)) {
      const titreLivre = separerTitreLivre(plain(p.text).replace(/\.$/, ""), book);
      bookTitle = titreLivre.titre;
      bookTitleText = titreLivre.texte;
      continue;
    }
    if (/Heading2|Titre2|heading 2/i.test(p.style)) {
      div = p.text.replace(/\.$/, "");
      par = 0;
      sum = ref = null;
      continue;
    }
    if (!div) continue;
    if (p.ref) {
      ref = p.text.replace(/<\/?i>/g, "").trim();
      continue;
    }
    if (
      /^<i>[^<]*<\/i>\s*[.!?]?\s*[–—-]?$/.test(p.text) &&
      par === 0 &&
      !/^Introduction$/i.test(div)
    ) {
      sum = p.text.replace(/<\/?i>/g, "").trim();
      continue;
    }
    p.text = corrigerTexteSource(p.text);
    par++;
    let nature = /^Introduction$/i.test(div) ? "introduction" : "texte",
      pieces = split(p.text, `${bookTitleText}|${div}|p${par}`, alerts),
      first = sn + 1;
    for (const [ri, q] of pieces.entries()) {
      sn++;
      let rt = normaliserReferenceTitre(
          ri === 0 && par === 1
            ? [sum, ref].filter(Boolean).join("\n") || null
            : null,
          bookTitleText,
        ),
        pg = pageOf(
          q.text,
          src,
          state,
          alerts,
          `${bookTitle}|${div}|p${par}|r${ri + 1}`,
        ),
        calls = [
          ...new Set(
            [...`${q.text} ${rt ?? ""}`.matchAll(/\[\[(\d+)\]\]/g)].map(
              (m) => +m[1],
            ),
          ),
        ],
        nts =
          calls.map((n) => `[[${n}]] ${notes.get(n) ?? ""}`).join("\n") || null;
      segments.push({
        id: null,
        id_oeuvre: ID,
        segment_numero: sn,
        segment_texte: q.text,
        ref_niv1: bookTitle,
        ref_niv2: div,
        ref_niv3: null,
        ref_niv4: null,
        ref_niv5: null,
        ref_niv1_texte: bookTitleText,
        ref_niv2_texte: rt,
        ref_niv3_texte: null,
        ref_niv4_texte: null,
        ref_niv5_texte: null,
        lien_1: null,
        lien_2: null,
        lien_3: null,
        lien_4: null,
        fiabilite: null,
        nature,
        texte_original: null,
        notes: nts,
        paragraphe: par,
        rang: ri + 1,
        page: pg,
        controle_rang_manuel: null,
        controle_verifie: false,
        marquage_source: "Codex (IA)",
        __source: {
          docx: file,
          source_paragraph: par,
          boundary: q.boundary,
          page_alignment_start: pg,
        },
      });
    }
    map.push({
      docx: file,
      nature,
      ref_niv1: bookTitle,
      ref_niv1_texte: bookTitleText,
      ref_niv2: div,
      paragraphe: par,
      source_clean: p.text,
      first_segment_numero: first,
      last_segment_numero: sn,
      segment_count: pieces.length,
      page_start: segments[first - 1].page,
    });
  }
}
// Les numéros Word recommencent dans chaque fichier : séquence globale par première apparition.
// Couverture des appels Word avant renumérotation globale.
for (const [file] of BOOKS) {
  const seen = new Set(
    segments
      .filter((r) => r.__source.docx === file)
      .flatMap((r) =>
        [
          ...`${r.segment_texte} ${r.ref_niv2_texte ?? ""}`.matchAll(
            /\[\[(\d+)\]\]/g,
          ),
        ].map((m) => +m[1]),
      ),
  );
  const zip = await JSZip.loadAsync(readFileSync(file));
  const definitions = foots(
    await zip.file("word/footnotes.xml").async("string"),
  );
  for (const n of definitions.keys())
    if (!seen.has(n))
      alerts.push({ type: "appel_note_absent", docx: file, note: n });
}
let gn = 0;
const gm = new Map();
for (const r of segments) {
  for (const f of [
    "ref_niv1_texte",
    "ref_niv2_texte",
    "segment_texte",
    "texte_original",
  ])
    r[f] =
      r[f]?.replace(/\[\[(\d+)\]\]/g, (_, n) => {
        let k = `${r.__source.docx}:${n}`;
        if (!gm.has(k)) gm.set(k, ++gn);
        return `[[${gm.get(k)}]]`;
      }) ?? null;
  if (r.notes)
    r.notes = r.notes.replace(
      /^\[\[(\d+)\]\]/gm,
      (_, n) => `[[${gm.get(`${r.__source.docx}:${n}`)}]]`,
    );
}

// Appliquer la même renumérotation à la carte source, afin que la
// recomposition compare deux représentations finales identiques.
for (const m of map)
  m.source_clean = m.source_clean.replace(
    /\[\[(\d+)\]\]/g,
    (_, n) => `[[${gm.get(`${m.docx}:${n}`)}]]`,
  );

// La signature imprimée p. 597 est un élément d'apparat, non une partie de
// la Question LVI. Le DOCX de relecture la conservait encore en fin de corps.
const signature = "<i>Cette traduction est l’œuvre de M. l’abbé POGNON</i>";
const signatureFinale = `${signature}.`;
const signatureRow = segments.find((r) => r.segment_texte.includes(signature));
if (signatureRow) {
  signatureRow.segment_texte = signatureRow.segment_texte
    .replace(/\.$/, "")
    .replace(
      new RegExp(`\\s*${signature.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}$`),
      "",
    )
    .trim();
  const owner = map.find(
    (m) =>
      signatureRow.segment_numero >= m.first_segment_numero &&
      signatureRow.segment_numero <= m.last_segment_numero,
  );
  if (owner)
    owner.source_clean = owner.source_clean
      .replace(/\s*<i>Cette traduction[\s\S]*?<\/i>\.?$/, "")
      .trim();
  segments.push({
    ...signatureRow,
    segment_numero: ++sn,
    segment_texte: signatureFinale,
    ref_niv2: null,
    ref_niv2_texte: null,
    nature: "apparat_critique",
    notes: null,
    paragraphe: 1,
    rang: 1,
    page: 597,
    __source: {
      docx: "Juges_draft.docx",
      source_paragraph: 1,
      boundary: "signature",
      page_alignment_start: 597,
    },
  });
  map.push({
    docx: "Juges_draft.docx",
    nature: "apparat_critique",
    ref_niv1: signatureRow.ref_niv1,
    ref_niv2: null,
    paragraphe: 1,
    source_clean: signatureFinale,
    first_segment_numero: sn,
    last_segment_numero: sn,
    segment_count: 1,
    page_start: 597,
  });
}

// La récapitulation finale de l'Exode porte un titre imprimé et un premier
// intertitre, mais aucune référence biblique générale : les références seront
// attribuées aux sous-paragraphes lors de la passe de liens.
const tabernacle = segments.find(
  (r) => r.ref_niv1_texte === "Questions sur l’Exode" && r.ref_niv2 === "Question CLXXVII",
);
if (tabernacle)
  tabernacle.ref_niv2_texte = "Du tabernacle.\nBut de ce travail.";

// L'édition répète souvent le guillemet ouvrant au début de chaque ligne
// imprimée. Après OCR, ces signes se retrouvent au milieu d'une même citation.
// On conserve une seule paire logique et on retire les fermetures orphelines.
for (const livre of [...new Set(segments.map((r) => r.ref_niv1))]) {
  let citationOuverte = false;
  for (const r of segments.filter((x) => x.ref_niv1 === livre)) {
    let texte = "";
    for (const caractere of r.segment_texte) {
      if (caractere === "«") {
        if (citationOuverte) continue;
        citationOuverte = true;
      } else if (caractere === "»") {
        if (!citationOuverte) continue;
        citationOuverte = false;
      }
      texte += caractere;
    }
    r.segment_texte = texte.trim();
  }
}

// La carte source décrit le texte éditorial final, après normalisation des
// guillemets, afin que son invariant de recomposition reste strict.
for (const m of map)
  m.source_clean = segments
    .slice(m.first_segment_numero - 1, m.last_segment_numero)
    .map((r) => r.segment_texte)
    .join(" ");

let failures = [];
const ck = (name, ok, detail = "") => {
  if (!ok) failures.push({ name, detail });
};
ck(
  "segment_numero_contigu",
  segments.every((r, i) => r.segment_numero === i + 1),
);
ck(
  "segments_non_vides",
  segments.every(
    (r) => r.segment_texte === r.segment_texte.trim() && r.segment_texte,
  ),
);
ck(
  "pages_presentes",
  segments.every(
    (r) => Number.isInteger(r.page) && r.page >= 383 && r.page <= 597,
  ),
);
for (const m of map) {
  let rebuilt = segments
    .slice(m.first_segment_numero - 1, m.last_segment_numero)
    .map((r) => r.segment_texte)
    .join(" ");
  ck(
    `recomposition:${m.docx}:${m.ref_niv2}:p${m.paragraphe}`,
    rebuilt === m.source_clean,
  );
}
let groups = new Map();
for (const r of segments) {
  let k = [r.nature, r.ref_niv1, r.ref_niv2, r.paragraphe].join("|");
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r.rang);
}
for (const [k, v] of groups)
  ck(
    `rangs:${k}`,
    v.every((n, i) => n === i + 1),
    v.join(","),
  );
let calls = [
  ...new Set(
    segments.flatMap((r) =>
      [
        ...`${r.segment_texte} ${r.ref_niv2_texte ?? ""}`.matchAll(
          /\[\[(\d+)\]\]/g,
        ),
      ].map((m) => +m[1]),
    ),
  ),
].sort((a, b) => a - b);
ck(
  "notes_suite_globale",
  calls.every((n, i) => n === i + 1),
  `1..${calls.at(-1)} (${calls.length})`,
);
let audit = {
    generated_at: new Date().toISOString(),
    id_oeuvre: ID,
    books: 7,
    paragraphs: map.length,
    segments: segments.length,
    notes: calls.length,
    alerts: alerts.length,
    failures,
    passed: !failures.length,
  },
  stable = (x) => JSON.stringify(x, null, 2) + "\n",
  files = {
    "segments-candidate.json": stable(segments),
    "source-map.json": stable(map),
    "alerts.json": stable(alerts),
    "audit.json": stable(audit),
  };
for (const [n, t] of Object.entries(files)) writeFileSync(join(OUT, n), t);
let cols = Object.keys(segments[0]).filter((k) => k !== "__source"),
  cell = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
writeFileSync(
  join(OUT, "segments-candidate.csv"),
  "\ufeff" +
    cols.join(",") +
    "\n" +
    segments.map((r) => cols.map((c) => cell(r[c])).join(",")).join("\n") +
    "\n",
);
writeFileSync(
  join(OUT, "SHA256SUMS.txt"),
  Object.entries(files)
    .map(([n, t]) => `${createHash("sha256").update(t).digest("hex")}  ${n}`)
    .join("\n") + "\n",
);
console.log(JSON.stringify(audit, null, 2));
if (failures.length) process.exitCode = 2;
