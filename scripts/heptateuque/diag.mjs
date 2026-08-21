// Diagnostic : montre le texte source RÉEL autour des cibles CORR non trouvées.
import { readFileSync } from "fs";

function pageBody(n) {
  let t = readFileSync(`ws/p${n}.txt`, "utf8");
  t = t.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, "");
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
const flat = raw.replace(/\s+/g, " ");

const misses = [
  "entrèrent « dans l’arche",
  "cette postérité ; devait être",
  "lui paraissait court, par« ce qu’il l’aimait",
  "dans sa manière de parier ; les dix saisons",
  "en fit un monument. » 2 faut avoir soin de remarquer",
  "boiteux dans toute la longeur de sa cuisse",
  "d’aller ensuite le retrouver àSéïr ?",
  "et il fut attaché de cœur à Dina ; fille de Jacob",
  "Gen. 33, 18-20 ; 34, 1",
  "Des peuples.etdes multitudes de peuples ?",
  "On demande pour quoi : ''et les pendants d’oreilles ?''",
  "indique en effet que la terre : est au-dessus de l’eau",
  "« Et il lui.fitépouserAseneth, fille de Pétéphrès",
  "à croire qu’il ne s’agit pas du : premier",
  "jure-t-il ainsi. « parle salut, de Pharaon » que ses frères",
  "qui vinrent à Jacob eu Mésopotamie de Syrie ; n à combien plus forte",
  "Et c’est à boa droit : car",
  "le pays de Ramessès » 2 faut s’assurer si ce pays",
  "la connaissance des lieux ; procurer des pâturages",
  "il adora Dieu immédiatement ? 2 n’avait pas à rougir",
  "Jésus-Christ ; cal – il est dit de lui",
];

// Pour chaque miss : prend 2-3 mots distinctifs au début, cherche dans le source.
for (const m of misses) {
  const words = m.split(/\s+/).filter(w => w.length > 3);
  // ancre = un mot rare vers le début
  const anchor = words.find(w => /[a-zéèêà]/.test(w) && (flat.split(w).length - 1) >= 1) || words[0];
  const idx = flat.indexOf(anchor);
  console.log("──", JSON.stringify(m.slice(0, 45)));
  if (idx === -1) { console.log("   ancre introuvable:", anchor); continue; }
  console.log("   SOURCE:", JSON.stringify(flat.slice(Math.max(0, idx - 10), idx + m.length + 15)));
}
