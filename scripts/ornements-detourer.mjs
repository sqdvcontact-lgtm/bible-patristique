// Détoure une gravure : le fond crème devient une vraie couche alpha, l'encre est
// décomposée et reposée. Patron : `scripts/logo-fabriquer.mjs`, doctrine : AGENTS.md,
// « Les ornements se DÉTOURENT, jamais mix-blend-mode ».
//
// ⚠️ Onze planches sur dix-neuf n'avaient jamais été détourées (relevé du 2026-08-23),
// dont sept sans la moindre couche alpha. Sur le papier crème du site, un fond crème
// opaque ne se voit pas : le défaut a donc vécu jusqu'à ce qu'un sol sombre le montre,
// chaque gravure s'y encadrant d'un rectangle.
//
//   node scripts/ornements-detourer.mjs [--ecrire] [fichier…]
//
// Sans `--ecrire`, le script MESURE et ne touche à rien. Les originaux sont copiés
// hors du dépôt avant toute écriture.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DOSSIER = 'public/ornements';
const SAUVEGARDE = 'C:/Corpus Scriptura/ornements-originaux-20260823';
const ECRIRE = process.argv.includes('--ecrire');
const demandes = process.argv.slice(2).filter(a => !a.startsWith('--'));

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

async function detourer(fichier) {
  const chemin = path.join(DOSSIER, fichier);
  const { data, info } = await sharp(chemin).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };

  // ⚠️ LE FOND SE MESURE, il ne se suppose pas blanc : celui de ces planches est
  // crème. Moyenne des quatre coins, sur un carré de 8px pour amortir le bruit.
  const coins = [];
  for (const [cx, cy] of [[0, 0], [W - 8, 0], [0, H - 8], [W - 8, H - 8]]) {
    for (let y = cy; y < cy + 8; y++) for (let x = cx; x < cx + 8; x++) coins.push(px(x, y));
  }
  const fond = [0, 1, 2].map(k => coins.reduce((s, p) => s + p[k], 0) / coins.length);
  const lumFond = lum(...fond);

  // ⚠️ L'ENCRE AUSSI SE MESURE, ET PAR SA MÉDIANE. Prendre `amplitude = lumFond`
  // revient à supposer l'encre noire ; se caler sur le pixel le plus sombre ne vaut
  // pas mieux, l'encre étant marbrée. C'est la médiane du nuage sombre qui vaut 255,
  // puisque l'intérieur d'un plein EST de l'encre pleine.
  const sombres = [];
  for (let i = 0; i < data.length; i += C) {
    const l = lum(data[i], data[i + 1], data[i + 2]);
    if (l < lumFond - 30) sombres.push(l);
  }
  if (sombres.length < 50) return { fichier, verdict: 'pas d\u2019encre franche : planche laissée telle quelle' };
  sombres.sort((a, b) => a - b);
  const lumEncre = sombres[Math.floor(sombres.length / 2)];
  const amplitude = Math.max(1, lumFond - lumEncre);

  const sortie = Buffer.alloc(W * H * 4);
  let z = 0, part = 0, plein = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * C, o = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let a = (lumFond - lum(r, g, b)) / amplitude;
    a = Math.max(0, Math.min(1, a));
    if (a < 0.004) { sortie[o] = sortie[o + 1] = sortie[o + 2] = sortie[o + 3] = 0; z++; continue; }
    // DÉCOMPOSITION de l'encre : sans elle, les bords anti-crénelés gardent le crème
    // et paraissent lavés sur un fond plus sombre.
    for (let k = 0; k < 3; k++) {
      const vu = data[i + k];
      sortie[o + k] = Math.max(0, Math.min(255, Math.round((vu - fond[k] * (1 - a)) / a)));
    }
    sortie[o + 3] = Math.round(a * 255);
    if (sortie[o + 3] >= 235) plein++; else part++;
  }

  const n = W * H;
  const bilan = {
    fichier,
    fond: 'rgb(' + fond.map(Math.round).join(',') + ')',
    encreMediane: Math.round(lumEncre),
    transparent: +(100 * z / n).toFixed(1),
    partiels: +(100 * part / n).toFixed(1),
    pleins: +(100 * plein / n).toFixed(1),
  };

  if (ECRIRE) {
    fs.mkdirSync(SAUVEGARDE, { recursive: true });
    const copie = path.join(SAUVEGARDE, fichier);
    if (!fs.existsSync(copie)) fs.copyFileSync(chemin, copie);
    await sharp(sortie, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(chemin + '.tmp');
    fs.renameSync(chemin + '.tmp', chemin);
    bilan.ecrit = true;
  }
  return bilan;
}

const cibles = demandes.length ? demandes : fs.readdirSync(DOSSIER).filter(f => f.endsWith('.png'));
for (const f of cibles) {
  try { console.log(JSON.stringify(await detourer(f))); }
  catch (e) { console.log(JSON.stringify({ fichier: f, erreur: e.message })); }
}
