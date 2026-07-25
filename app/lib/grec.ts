// Césure du grec ancien et code de langue — partagés par la page Polyglotte de lecture
// (`app/polyglotte/page.tsx`) et la Polyglotte de la page Recherche.
//
// Aucun navigateur n'a de dictionnaire de coupure pour le grec : « hyphens: auto » y reste
// sans effet, et le texte justifié de la Septante creuse des blancs ou déborde. On fabrique
// donc les points de coupe, en insérant des tirets conditionnels (U+00AD) aux frontières de
// syllabes. La CSS « hyphens: auto » les honore : le tiret ne PARAÎT que si la ligne doit
// être coupée là. Syllabation approchée mais fidèle aux règles usuelles — voyelle ou
// diphtongue = noyau ; une consonne isolée va à la syllabe suivante ; un groupe consonantique
// reste soudé s'il peut commencer un mot grec (occlusive + liquide/nasale, σ + consonne…).

// `grc` (grec ancien) n'a de dictionnaire de coupure nulle part — voulu : mieux vaut aucune
// césure qu'une fausse sur une langue à l'accentuation réglée. `el` déclencherait le grec MODERNE.
export function codeLangue(langue: string | null | undefined): string {
  const l = (langue ?? "").toLowerCase();
  if (l.startsWith("lat")) return "la";
  if (l.startsWith("grec") || l.startsWith("gr")) return "grc";
  return "fr";
}

const SHY = "­";
const VOY_GR = new Set(["α", "ε", "η", "ι", "ο", "υ", "ω"]);
const ONSETS2_GR = new Set([
  "πλ", "πρ", "βλ", "βρ", "φλ", "φρ", "τρ", "δρ", "θλ", "θρ", "κλ", "κρ", "γλ", "γρ", "χλ", "χρ",
  "πν", "κν", "γν", "χν", "θν", "μν",
  "στ", "σπ", "σκ", "σθ", "σφ", "σχ", "σβ", "σμ",
  "κτ", "πτ", "φθ", "χθ",
]);
function baseGr(cl: string): string {
  const b = cl.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return b === "ς" ? "σ" : b;
}
export function cesurerGrec(texte: string): string {
  return texte.replace(/[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͯ]*/g, (mot) => {
    const cl = mot.match(/[Ͱ-Ͽἀ-῿][̀-ͯ]*/g);
    if (!cl || cl.length < 4) return mot;
    const n = cl.length;
    const base = cl.map(baseGr);
    const estV = base.map((b) => VOY_GR.has(b));
    const diaer = cl.map((c) => c.normalize("NFD").includes("̈"));
    // Noyaux : voyelle seule ou diphtongue (2ᵉ élément ι/υ sans tréma).
    const noy: { s: number; e: number }[] = [];
    for (let i = 0; i < n; ) {
      if (estV[i]) {
        let e = i;
        if (i + 1 < n && estV[i + 1] && !diaer[i + 1]
          && ["α", "ε", "η", "ο", "ω", "υ"].includes(base[i]) && ["ι", "υ"].includes(base[i + 1])) e = i + 1;
        noy.push({ s: i, e });
        i = e + 1;
      } else i++;
    }
    if (noy.length < 2) return mot;
    const coupe = new Set<number>(); // insérer un SHY AVANT ce cluster
    for (let k = 0; k < noy.length - 1; k++) {
      const A = noy[k], B = noy[k + 1];
      const run = B.s - A.e - 1; // consonnes entre les deux noyaux
      let bnd: number;
      if (run <= 0) bnd = B.s;                       // hiatus : coupe entre les voyelles
      else if (run === 1) bnd = B.s - 1;             // consonne unique → syllabe suivante
      else {
        const c1 = base[B.s - 2], c2 = base[B.s - 1];
        if (c1 === c2) bnd = B.s - 1;                // géminée : on sépare
        else if (ONSETS2_GR.has(c1 + c2)) bnd = B.s - 2; // groupe soudé → syllabe suivante
        else bnd = B.s - 1;                          // sinon la dernière consonne seule
      }
      if (bnd >= 2 && bnd <= n - 2) coupe.add(bnd);  // ≥ 2 lettres de chaque côté
    }
    if (!coupe.size) return mot;
    return cl.map((c, i) => (coupe.has(i) ? SHY + c : c)).join("");
  });
}
