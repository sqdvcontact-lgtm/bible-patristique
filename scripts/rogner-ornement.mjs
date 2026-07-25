// Rogne le blanc autour d'un ornement (cul-de-lampe, palme, etc.) pour que l'image
// épouse le dessin. Sans ça, le PNG carré garde une large marge et le texte placé
// dessous reste loin. Modèle réutilisable : à repasser sur tout nouvel ornement.
//
//   node scripts/rogner-ornement.mjs public/ornements/mon-ornement.png
//
// Options : --seuil=N (tolérance blanc, 0-255, défaut 12) · --marge=N (marge conservée
// en px après rognage, défaut 8) · --sortie=chemin (défaut : écrase l'entrée).

import sharp from "sharp";
import { argv } from "node:process";

const args = argv.slice(2);
const entree = args.find((a) => !a.startsWith("--"));
if (!entree) {
  console.error("Usage : node scripts/rogner-ornement.mjs <image.png> [--seuil=12] [--marge=8] [--sortie=...]");
  process.exit(1);
}
const opt = (nom, def) => {
  const a = args.find((x) => x.startsWith(`--${nom}=`));
  return a ? a.split("=")[1] : def;
};
const seuil = Number(opt("seuil", 12));
const marge = Number(opt("marge", 8));
const sortie = opt("sortie", entree);

const avant = await sharp(entree).metadata();

// `trim` rogne les bords dont la couleur est proche du fond (ici le blanc du papier).
// On passe par un tampon pour pouvoir écraser le fichier d'entrée.
let img = sharp(entree).trim({ background: "#ffffff", threshold: seuil });
if (marge > 0) {
  img = img.extend({ top: marge, bottom: marge, left: marge, right: marge, background: { r: 255, g: 255, b: 255, alpha: 0 } });
}
const buf = await img.png().toBuffer();
const apres = await sharp(buf).metadata();
await sharp(buf).toFile(sortie);

console.log(`✓ ${entree}`);
console.log(`  ${avant.width}×${avant.height}  →  ${apres.width}×${apres.height}  (marge ${marge}px)  → ${sortie}`);
