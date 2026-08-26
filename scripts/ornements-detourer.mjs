// Fabrique une gravure d'ornement à partir de sa planche brute : le papier devient une
// vraie couche alpha, l'encre est reposée en une teinte unique, et le fichier est servi
// à la taille où la page l'affiche. Patron : `scripts/logo-fabriquer.mjs`.
// Doctrine : AGENTS.md, « Les ornements se DÉTOURENT, jamais mix-blend-mode ».
//
//   node scripts/ornements-detourer.mjs --source <chemin> --nom <nom> --affichage <px>
//        [--garder-haut] [--ecrire]
//   node scripts/ornements-detourer.mjs --profil <nom>…
//
// Sans `--ecrire`, le script MESURE et ne touche à rien : c'est ainsi qu'on relève une
// planche avant de la fabriquer. `--profil` rend le profil alpha d'une planche déjà servie.
// Les originaux sont copiés hors du dépôt avant toute écriture.
//
// ⚠️ Ce script a été réécrit le 2026-08-26 après quatre défauts trouvés à l'usage, chacun
// invisible au code et visible seulement à l'œil. Ils sont décrits à l'endroit où on les
// corrige ; ne pas retirer une étape sans avoir relu la note qui l'accompagne.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DOSSIER = 'public/ornements';
const SAUVEGARDE = 'C:/Corpus Scriptura/ornements-originaux-20260823';

// ── Les constantes de la recette ────────────────────────────────────────────
//
// L'ENCRE de la famille, mesurée sur la tour de Babel ruinée : un gris chaud très sombre.
// Toutes les gravures la partagent, de sorte qu'une même absence se dise partout de la
// même voix. ⛔ Elle n'est pas noire : un noir franc sur le crème du site fait un trait
// d'imprimante, non une encre.
const ENCRE = [34, 33, 30];
const LUM_ENCRE = 0.2126 * ENCRE[0] + 0.7152 * ENCRE[1] + 0.0722 * ENCRE[2]; // ≈ 33
// Le pourtour rogné avant tout traitement. Voir « le liseré de bord » plus bas.
const MARGE = 32;
// Le rattrapage de netteté, léger : il compense la seule réduction qui reste, celle du
// navigateur. Plus fort, il cerne les traits d'un liseré clair.
const NETTETE = { sigma: 0.6, m1: 0, m2: 2 };

const args = process.argv.slice(2);
const opt = (nom) => { const i = args.indexOf('--' + nom); return i >= 0 ? args[i + 1] : null; };
const ECRIRE = args.includes('--ecrire');
const GARDER_HAUT = args.includes('--garder-haut');

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Profil alpha d'une planche déjà servie. Une gravure au TRAIT rend beaucoup de
 *  transparents pour peu de partiels — les bords, et eux seuls. Un dessin en DEMI-TEINTES
 *  rend 60 % et plus de partiels, ce que la charte signale comme suspect. */
async function profil(fichier) {
  const chemin = path.join(DOSSIER, fichier.endsWith('.png') ? fichier : fichier + '.png');
  const { data, info } = await sharp(chemin).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  let z = 0, part = 0, plein = 0, poids = 0, somme = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 1) { z++; continue; }
    if (a >= 235) plein++; else part++;
    const w = (a / 255) ** 2; poids += w;
    for (let k = 0; k < 3; k++) somme[k] += data[i + k] * w;
  }
  const encre = somme.map(v => Math.round(v / poids));
  // Le bord gauche, là où se voyait le liseré des planches de Midjourney.
  const colonne = x => { let s = 0; for (let y = 0; y < info.height; y++) s += data[(y * info.width + x) * 4 + 3]; return Math.round(s / info.height); };
  return {
    fichier, taille: info.width + 'x' + info.height,
    transparent: +(100 * z / n).toFixed(1),
    partiels: +(100 * part / n).toFixed(1),
    pleins: +(100 * plein / n).toFixed(1),
    encreLuminance: Math.round(lum(...encre)),
    bordGauche: Array.from({ length: 6 }, (_, x) => colonne(x)).join(' '),
  };
}

/** Fabrique une planche depuis sa source brute.
 *  `affichage` est la largeur que la page lui donne à la RACINE 16, le cas courant.
 *  Le rapport y vaut alors exactement 2. Sur un très grand écran, où la police racine
 *  monte à 22, la pose grandit et le rapport retombe vers 1,45 : c'est une réduction
 *  douce, sans commune mesure avec les 2,9 à 3,6 qui faisaient baver le trait. */
async function fabriquer({ source, nom, affichage }) {
  const meta = await sharp(source).metadata();

  // ── 1. ROGNER LE POURTOUR ────────────────────────────────────────────────
  // ⛔ Les planches de Midjourney portent un LISERÉ sombre sur leur bord : 243 de
  // luminance contre 247 à 249 pour le papier. Il passe sous le seuil de normalisation,
  // devient donc de l'encre, et se voit comme une barre noire le long du bord. Il
  // empêche en outre le rognage des marges, un bord sombre l'arrêtant aussitôt.
  const brut = await sharp(source).removeAlpha()
    .extract({ left: MARGE, top: MARGE, width: meta.width - 2 * MARGE, height: meta.height - 2 * MARGE })
    .raw().toBuffer({ resolveWithObject: true });
  const { data, info } = brut;

  // ── 2. MESURER LE PAPIER, PAR SON NIVEAU DOMINANT ────────────────────────
  // ⛔ Le papier ne se suppose pas blanc, et il ne se lit pas non plus aux quatre COINS,
  // comme le faisait la version d'avant : celui d'une planche est à 253, celui d'une
  // autre à 247, et leurs coins seuls sont à 255. Le script prenait alors les 90 % de
  // papier pour une encre très pâle et rendait 87 % de partiels au lieu de 6 %.
  // Même raisonnement que pour l'encre : c'est la valeur DOMINANTE qui fait foi.
  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += info.channels) hist[Math.round(lum(data[i], data[i + 1], data[i + 2]))]++;
  const papier = 200 + hist.slice(200).indexOf(Math.max(...hist.slice(200)));
  for (let i = 0; i < data.length; i += info.channels) {
    if (lum(data[i], data[i + 1], data[i + 2]) >= papier - 2) { data[i] = data[i + 1] = data[i + 2] = 255; }
  }

  // ── 3. ROGNER LES MARGES, puis rendre une lisière ────────────────────────
  // La lisière n'est pas décorative : sans elle, un trait qui affleure le bord se
  // retrouve coupé net par le cadre.
  const rogne = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png().trim({ background: '#ffffff', threshold: 5 }).toBuffer({ resolveWithObject: true });
  const borde = await sharp(rogne.data)
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: '#ffffff' }).toBuffer();

  // ── 4. RÉDUIRE À DEUX FOIS LA TAILLE D'AFFICHAGE, puis raviver ───────────
  // ⛔ UN FICHIER SE SERT AU DOUBLE DE SA TAILLE D'AFFICHAGE, JAMAIS PLUS. Au delà, le
  // navigateur réduit une seconde fois derrière la nôtre, et deux réductions successives
  // moyennent les hachures fines en un GRIS MOU : le trait cesse d'être noir. Mesuré, une
  // cité servie en 1 600 px dans une colonne qui l'affiche à 549 bavait, quand la même
  // planche servie au double exact restait franche.
  const cible = Math.min(2 * affichage, rogne.info.width);
  const gris = await sharp(borde)
    .resize({ width: cible, fit: 'inside', withoutEnlargement: true })
    .sharpen(NETTETE).removeAlpha().toColourspace('b-w')
    .raw().toBuffer({ resolveWithObject: true });

  // ── 5. DÉTOURER, ET REPOSER L'ENCRE ──────────────────────────────────────
  // ⛔ L'ALPHA SE CALCULE SUR L'ENCRE QU'ON REPOSE, non sur la médiane de la planche.
  // La version d'avant prenait « amplitude = papier − médiane de l'encre », ce qui est
  // juste tant qu'on GARDE l'encre décomposée pixel par pixel. Dès qu'on repose une encre
  // plus sombre, les deux ne s'accordent plus et tout le dégradé qui borde un trait
  // s'assombrit : un gris à 180 rendait 136, un gris à 140 rendait 76.
  // ⚠️ Et l'on ne décompose plus : sur un papier presque blanc, diviser par un alpha
  // faible fait exploser l'écart entre canaux, d'où 12 208 teintes de moyenne BLEUE sur
  // une planche. La charte l'avait déjà tranché pour le monogramme — « le détourage ne
  // sert que l'ALPHA : la couleur, on la repose ».
  const amplitude = 255 - LUM_ENCRE;
  const W = gris.info.width, H = gris.info.height;
  const sortie = Buffer.alloc(W * H * 4);
  let z = 0, part = 0, plein = 0;
  for (let p = 0; p < W * H; p++) {
    const a = Math.max(0, Math.min(1, (255 - gris.data[p]) / amplitude));
    const o = p * 4;
    if (a < 0.004) { z++; continue; }
    sortie[o] = ENCRE[0]; sortie[o + 1] = ENCRE[1]; sortie[o + 2] = ENCRE[2];
    sortie[o + 3] = Math.round(a * 255);
    if (sortie[o + 3] >= 235) plein++; else part++;
  }

  // ── 6. ROGNER SUR L'ALPHA ────────────────────────────────────────────────
  // ⛔ Le rognage de l'étape 3 se fait sur le BLANC, et il laisse passer ce qui n'est
  // blanc qu'à peu près. Mesuré sur la cité ruinée : 310 lignes entièrement
  // transparentes subsistaient sous les ruines, soit le quart de la planche, et la
  // légende se posait d'autant plus bas — à plus de cent pixels du sol dessiné.
  // Après détourage la mesure est sans ambiguïté : on rogne sur l'alpha, en gardant
  // deux pixels de lisière. Une planche hugge ainsi son encre, et la page peut poser
  // son texte À QUELQUES PIXELS du dessin sans avoir à deviner le vide.
  // ⛔ Le seuil ne peut pas être « alpha >= 1 » : sous le dessin traînent des pixels
  // ISOLÉS à alpha 1 à 8, invisibles à l'œil, et un seul d'entre eux ancre la boîte.
  // Mesuré sur la cité ruinée : 312 lignes de vide gardées par une douzaine de mouchetures.
  // Un rang ne compte donc que s'il porte au moins trois pixels RÉELLEMENT visibles.
  const ALPHA_VU = 8, MIN_PIXELS = 3;
  const rangReel = new Array(H).fill(0), colReelle = new Array(W).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (sortie[(y * W + x) * 4 + 3] >= ALPHA_VU) { rangReel[y]++; colReelle[x]++; }
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) if (rangReel[y] >= MIN_PIXELS) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  // ⚠️ Le vide du HAUT n'est pas toujours un défaut : sur une planche à horizon bas, le
  // ciel EST la composition et le rogner ampute le dessin. Le vide du BAS, lui, éloigne
  // toujours la légende, et il se rogne sans discussion. `--garder-haut` sépare les deux.
  if (GARDER_HAUT) y0 = 0;
  for (let x = 0; x < W; x++) if (colReelle[x] >= MIN_PIXELS) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  if (x1 < 0 || y1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
  const LISIERE = 2;
  x0 = Math.max(0, x0 - LISIERE); y0 = Math.max(0, y0 - LISIERE);
  x1 = Math.min(W - 1, x1 + LISIERE); y1 = Math.min(H - 1, y1 + LISIERE);
  const LA = x1 - x0 + 1, HA = y1 - y0 + 1;
  const ajuste = Buffer.alloc(LA * HA * 4);
  for (let y = 0; y < HA; y++) {
    sortie.copy(ajuste, y * LA * 4, ((y + y0) * W + x0) * 4, ((y + y0) * W + x1 + 1) * 4);
  }

  const bilan = {
    nom, papier, source: path.basename(source),
    videOte: (W - LA) + 'x' + (H - HA),
    rogne: rogne.info.width + 'x' + rogne.info.height,
    servi: LA + 'x' + HA, affichage, rapport: +(LA / affichage).toFixed(2),
    transparent: +(100 * z / (W * H)).toFixed(1),
    partiels: +(100 * part / (W * H)).toFixed(1),
    pleins: +(100 * plein / (W * H)).toFixed(1),
  };

  if (ECRIRE) {
    fs.mkdirSync(SAUVEGARDE, { recursive: true });
    const copie = path.join(SAUVEGARDE, nom + '-source.png');
    if (!fs.existsSync(copie)) fs.copyFileSync(source, copie);
    const dest = path.join(DOSSIER, nom + '.png');
    await sharp(ajuste, { raw: { width: LA, height: HA, channels: 4 } })
      .png({ compressionLevel: 9 }).toFile(dest + '.tmp');
    fs.renameSync(dest + '.tmp', dest);
    bilan.ecrit = dest;
    bilan.poidsKo = Math.round(fs.statSync(dest).size / 1024);
  }
  return bilan;
}

const profils = args.indexOf('--profil');
if (profils >= 0) {
  for (const f of args.slice(profils + 1).filter(a => !a.startsWith('--'))) {
    console.log(JSON.stringify(await profil(f)));
  }
} else {
  const source = opt('source'), nom = opt('nom'), affichage = Number(opt('affichage'));
  if (!source || !nom || !affichage) {
    console.error('Usage : --source <chemin> --nom <nom> --affichage <px CSS à la racine 16> [--ecrire]');
    console.error('        --profil <nom>…');
    process.exit(1);
  }
  console.log(JSON.stringify(await fabriquer({ source, nom, affichage }), null, 1));
}
