// Régénère les icônes du site (favicon / onglet / favoris / Google) à partir
// d'une image source carrée. Produit les trois fichiers de convention Next :
//   app/icon.png        (512×512) — <link rel="icon">
//   app/apple-icon.png  (180×180) — écran d'accueil iOS
//   app/favicon.ico     (16/32/48) — /favicon.ico, encore lu par Google et les navigateurs
//
//   node scripts/generer-favicon.mjs <image-source.png>

import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";
import { argv } from "node:process";

const src = argv[2];
if (!src) { console.error("Usage : node scripts/generer-favicon.mjs <image.png>"); process.exit(1); }

const carre = (n) => sharp(src).resize(n, n, { fit: "cover" }).png();

await carre(512).toFile("app/icon.png");
await carre(180).toFile("app/apple-icon.png");

const buffers = await Promise.all([16, 32, 48].map((n) => carre(n).toBuffer()));
await writeFile("app/favicon.ico", await pngToIco(buffers));

console.log("✓ app/icon.png (512), app/apple-icon.png (180), app/favicon.ico (16/32/48)");
