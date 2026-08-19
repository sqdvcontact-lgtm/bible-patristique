// Fabrique les déclinaisons du monogramme « CS » à partir des deux planches
// d'origine rangées dans `work/logo/` :
//
//   • monogramme-vert.png  — carré, encre crème sur aplat vert : c'est l'icône
//     d'onglet et de favori, où le fond fait le travail à 16 px ;
//   • monogramme-creme.png — le monogramme seul sur un fond crème : c'est le
//     logo du site, qui doit se poser sur le papier comme sur la barre verte.
//
// La recette de détourage est celle de la charte (AGENTS.md, « Les ornements se
// DÉTOURENT ») : le fond se MESURE aux quatre coins, jamais on ne le suppose
// blanc, et l'encre se DÉCOMPOSE de ce fond mesuré (c = (vu − fond×(1−a)) / a),
// faute de quoi les bords anti-crénelés gardent le crème et paraissent lavés sur
// la barre verte. On travaille à la résolution native puis on rogne : aucun
// rééchantillonnage ne vient donc mélanger de l'encre avec du transparent.
//
// `sharp` est disponible (dépendance de Next), ce que la charte croyait faux.
//
// Usage : node scripts/logo-fabriquer.mjs

import { createRequire } from 'node:module'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dans = (...p) => path.join(RACINE, ...p)

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b

/** Détoure une planche au trait : renvoie { data, width, height } en RGBA. */
async function detourer(source) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: L, height: H } = info
  const px = (x, y) => {
    const o = (y * L + x) * 4
    return [data[o], data[o + 1], data[o + 2]]
  }

  // Le fond se mesure, il ne se suppose pas : celui-ci est crème, pas blanc.
  const coins = [px(2, 2), px(L - 3, 2), px(2, H - 3), px(L - 3, H - 3)]
  const fond = [0, 1, 2].map(i => coins.reduce((s, c) => s + c[i], 0) / coins.length)
  const lumFond = lum(...fond)

  // L'encre de cette planche n'est pas noire mais gris très foncé, et elle est
  // légèrement marbrée. Rapporter l'alpha au noir absolu laisserait TOUT le
  // plein du trait en partiel, autour de 92 % : le monogramme paraîtrait délavé
  // là où il est plein. On MESURE donc aussi l'encre, et non son pixel le plus
  // sombre — la MÉDIANE du nuage sombre, car l'intérieur d'un plein EST de
  // l'encre pleine. Seuls les bords restent alors partiels.
  const lums = new Float32Array(L * H)
  for (let i = 0; i < L * H; i++) { const o = i * 4; lums[i] = lum(data[o], data[o + 1], data[o + 2]) }
  const sombres = Array.from(lums).filter(v => v < lumFond / 2).sort((a, b) => a - b)
  const lumEncre = sombres.length ? sombres[Math.floor(sombres.length / 2)] : 0
  const amplitude = lumFond - lumEncre

  // Une marge de tolérance sur le fond (le PNG porte du bruit de compression) et
  // une saturation près du plein : sans elles l'aplat garde un voile à alpha 2,
  // et l'intérieur des pleins n'atteint jamais 255.
  const SEUIL_VIDE = 0.02
  const SEUIL_PLEIN = 0.98

  const sortie = Buffer.alloc(L * H * 4)
  for (let i = 0; i < L * H; i++) {
    const o = i * 4
    let a = (lumFond - lums[i]) / amplitude
    if (a <= SEUIL_VIDE) { sortie[o + 3] = 0; continue }
    if (a >= SEUIL_PLEIN) a = 1
    else a = (a - SEUIL_VIDE) / (SEUIL_PLEIN - SEUIL_VIDE)
    // Décomposition : retirer la part de crème que l'anti-crénelage a mêlée à l'encre.
    for (let c = 0; c < 3; c++) {
      const vu = data[o + c]
      sortie[o + c] = Math.max(0, Math.min(255, Math.round((vu - fond[c] * (1 - a)) / a)))
    }
    sortie[o + 3] = Math.round(a * 255)
  }
  return { data: sortie, width: L, height: H, fond, lumFond, lumEncre }
}

/** Rogne au plus près du trait, avec une marge d'un pour cent du plus grand côté. */
function rogner({ data, width: L, height: H }) {
  let x0 = L, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      if (data[(y * L + x) * 4 + 3] > 6) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  const marge = Math.round(Math.max(x1 - x0, y1 - y0) * 0.01)
  x0 = Math.max(0, x0 - marge); y0 = Math.max(0, y0 - marge)
  x1 = Math.min(L - 1, x1 + marge); y1 = Math.min(H - 1, y1 + marge)
  return { gauche: x0, haut: y0, largeur: x1 - x0 + 1, hauteur: y1 - y0 + 1 }
}

/** Histogramme du canal alpha : le contrôle que la charte demande avant de committer. */
function controler(nom, data) {
  let vide = 0, plein = 0, partiel = 0
  for (let o = 3; o < data.length; o += 4) {
    if (data[o] === 0) vide++
    else if (data[o] === 255) plein++
    else partiel++
  }
  const n = data.length / 4
  const pc = v => (v / n * 100).toFixed(1)
  console.log(`  ${nom} : ${pc(vide)} % transparent, ${pc(plein)} % encre pleine, ${pc(partiel)} % partiels`)
}

/** Un .ico multi-tailles, chaque image étant un PNG embarqué (Vista+ et tous les navigateurs). */
function ico(images) {
  const entetes = Buffer.alloc(6 + 16 * images.length)
  entetes.writeUInt16LE(0, 0)
  entetes.writeUInt16LE(1, 2) // type icône
  entetes.writeUInt16LE(images.length, 4)
  let offset = entetes.length
  images.forEach(({ taille, png }, i) => {
    const e = 6 + 16 * i
    entetes.writeUInt8(taille >= 256 ? 0 : taille, e)
    entetes.writeUInt8(taille >= 256 ? 0 : taille, e + 1)
    entetes.writeUInt8(0, e + 2) // palette
    entetes.writeUInt8(0, e + 3)
    entetes.writeUInt16LE(1, e + 4) // plans
    entetes.writeUInt16LE(32, e + 6) // bits par pixel
    entetes.writeUInt32LE(png.length, e + 8)
    entetes.writeUInt32LE(offset, e + 12)
    offset += png.length
  })
  return Buffer.concat([entetes, ...images.map(i => i.png)])
}

const VERT = dans('work/logo/monogramme-vert.png')
const CREME = dans('work/logo/monogramme-creme.png')

console.log('Icône (aplat vert) — pas de détourage : à 16 px, le fond fait le travail.')
for (const [cible, taille] of [['app/icon.png', 512], ['app/apple-icon.png', 180]]) {
  await sharp(VERT).resize(taille, taille, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(dans(cible))
  console.log(`  ${cible} — ${taille}×${taille}`)
}
const tailles = [16, 32, 48]
const png = await Promise.all(tailles.map(async taille => ({
  taille,
  png: await sharp(VERT).resize(taille, taille, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer(),
})))
await writeFile(dans('app/favicon.ico'), ico(png))
console.log(`  app/favicon.ico — ${tailles.join(', ')} px`)

console.log('\nLogo (monogramme détouré) — le fond crème devient un vrai canal alpha.')
const brut = await detourer(CREME)
console.log(`  fond mesuré : rgb(${brut.fond.map(v => Math.round(v)).join(', ')}) — encre mesurée à la luminance ${brut.lumEncre.toFixed(1)}`)
controler('avant rognage', brut.data)
const boite = rogner(brut)
console.log(`  rogné à ${boite.largeur}×${boite.hauteur} (depuis ${brut.width}×${brut.height})`)

await mkdir(dans('public/logo'), { recursive: true })
const decoupe = () => sharp(brut.data, { raw: { width: brut.width, height: brut.height, channels: 4 } })
  .extract({ left: boite.gauche, top: boite.haut, width: boite.largeur, height: boite.hauteur })

// L'encre, pour le papier de la page de titre.
const encre = await decoupe().png({ compressionLevel: 9 }).toBuffer()
await writeFile(dans('public/logo/monogramme-encre.png'), encre)
controler('public/logo/monogramme-encre.png', (await sharp(encre).raw().toBuffer({ resolveWithObject: true })).data)

// Le même trait teinté crème, pour la barre verte : on garde l'alpha et on
// remplace la couleur, plutôt que de demander une seconde planche.
const CREME_CLAIR = { r: 244, g: 231, b: 200 }
const { data: rgba } = await decoupe().raw().toBuffer({ resolveWithObject: true })
const creme = Buffer.from(rgba)
for (let o = 0; o < creme.length; o += 4) {
  creme[o] = CREME_CLAIR.r
  creme[o + 1] = CREME_CLAIR.g
  creme[o + 2] = CREME_CLAIR.b
}
await sharp(creme, { raw: { width: boite.largeur, height: boite.hauteur, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(dans('public/logo/monogramme-creme.png'))
console.log(`  public/logo/monogramme-creme.png — teinté rgb(${CREME_CLAIR.r}, ${CREME_CLAIR.g}, ${CREME_CLAIR.b})`)
