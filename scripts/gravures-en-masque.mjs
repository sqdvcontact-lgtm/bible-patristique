// Une gravure au trait, noire sur blanc, transformée en MASQUE de couleur.
//
//   node scripts/gravures-en-masque.mjs <source.png> <sortie.png> [--large 384] [--ecrire]
//
// Le résultat n'est pas une image qu'on pose : c'est un masque. Son ALPHA porte
// la couverture d'encre, ses composantes de couleur ne valent rien, et la page
// le peint par `mask-image` sur un fond `currentColor`. C'est la voie que la
// charte laissait ouverte pour les ornements — « le détourage ne sert que
// l'ALPHA : la couleur, on la repose » — et elle est ici obligatoire : les
// cartons de l'accueil sont sombres, une gravure noire y disparaîtrait, et la
// repeindre en clair demanderait une seconde planche par thème.
//
// ⛔ L'ORDRE compte. On rogne, puis on RÉDUIT sur des pixels encore opaques,
// et l'on dérive l'alpha en dernier : réduire après le détourage mêle de l'encre
// à du transparent et lave le trait (charte, § Les ornements se détourent).
//
// ⚠️ Le fond se MESURE aux quatre coins, il ne se suppose pas blanc, et l'encre
// se mesure par la MÉDIANE de son nuage sombre : se caler sur le pixel le plus
// noir laisse le plein du trait en alpha partiel, ce que l'histogramme dénonce
// aussitôt — un plein n'a aucune raison d'être partiel.
//
// Sans `--ecrire`, le script MESURE et n'écrit rien.

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const [source, sortie] = args.filter((a) => !a.startsWith('--'))
const ecrire = args.includes('--ecrire')
const large = Number(args[args.indexOf('--large') + 1]) || 384
if (!source || !sortie) throw new Error('Usage : <source.png> <sortie.png> [--large 384] [--ecrire]')

const lum = (r, v, b) => 0.2126 * r + 0.7152 * v + 0.0722 * b

const image = sharp(resolve(source)).removeAlpha()
const { width, height } = await image.metadata()
const { data } = await image.raw().toBuffer({ resolveWithObject: true })
const gris = new Float32Array(width * height)
for (let i = 0; i < width * height; i += 1) {
  gris[i] = lum(data[i * 3], data[i * 3 + 1], data[i * 3 + 2])
}

// Le fond : moyenne des quatre coins, sur un carré de 12 pixels.
const coin = (x0, y0) => {
  let somme = 0
  for (let y = y0; y < y0 + 12; y += 1) for (let x = x0; x < x0 + 12; x += 1) somme += gris[y * width + x]
  return somme / 144
}
const fond = (coin(0, 0) + coin(width - 12, 0) + coin(0, height - 12) + coin(width - 12, height - 12)) / 4

// L'encre : médiane du nuage nettement plus sombre que le fond.
const sombres = []
for (let i = 0; i < gris.length; i += 1) if (gris[i] < fond - 60) sombres.push(gris[i])
if (sombres.length === 0) throw new Error('Aucune encre trouvée : la source est-elle bien une gravure au trait ?')
sombres.sort((a, b) => a - b)
const encre = sombres[Math.floor(sombres.length / 2)]

// Le rognage : boîte des pixels qui portent de l'encre, plus une marge d'une
// unité sur cent — un trait qui touche le bord se lit comme un trait coupé.
let x1 = width, y1 = height, x2 = -1, y2 = -1
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (gris[y * width + x] < fond - 12) {
      if (x < x1) x1 = x
      if (x > x2) x2 = x
      if (y < y1) y1 = y
      if (y > y2) y2 = y
    }
  }
}
const marge = Math.round(Math.max(x2 - x1, y2 - y1) / 100)
x1 = Math.max(0, x1 - marge); y1 = Math.max(0, y1 - marge)
x2 = Math.min(width - 1, x2 + marge); y2 = Math.min(height - 1, y2 + marge)
const largeurRognee = x2 - x1 + 1
const hauteurRognee = y2 - y1 + 1

// Réduction sur des pixels ENCORE OPAQUES, puis dérivation de l'alpha.
const cible = largeurRognee >= hauteurRognee
  ? { width: large }
  : { height: large }
const reduite = sharp(resolve(source))
  .removeAlpha()
  .extract({ left: x1, top: y1, width: largeurRognee, height: hauteurRognee })
  .resize({ ...cible, kernel: 'lanczos3' })
const { data: rd, info } = await reduite.raw().toBuffer({ resolveWithObject: true })

const amplitude = Math.max(1, fond - encre)
const rgba = Buffer.alloc(info.width * info.height * 4)
const histo = { transparent: 0, partiel: 0, plein: 0 }
for (let i = 0; i < info.width * info.height; i += 1) {
  const l = lum(rd[i * 3], rd[i * 3 + 1], rd[i * 3 + 2])
  const a = Math.max(0, Math.min(255, Math.round(((fond - l) / amplitude) * 255)))
  rgba[i * 4] = 0; rgba[i * 4 + 1] = 0; rgba[i * 4 + 2] = 0; rgba[i * 4 + 3] = a
  if (a <= 2) histo.transparent += 1
  else if (a >= 250) histo.plein += 1
  else histo.partiel += 1
}
const total = info.width * info.height
const part = (n) => `${((n / total) * 100).toFixed(1)} %`

const png = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9, palette: false })
  .toBuffer()

console.log(JSON.stringify({
  source,
  fond: Math.round(fond),
  encre: Math.round(encre),
  sourceEn: `${width}×${height}`,
  rognee: `${largeurRognee}×${hauteurRognee}`,
  sortieEn: `${info.width}×${info.height}`,
  poids: `${(png.length / 1024).toFixed(1)} ko`,
  histogramme: { transparent: part(histo.transparent), partiels: part(histo.partiel), plein: part(histo.plein) },
  ecrit: ecrire ? sortie : false,
}, null, 1))

if (ecrire) writeFileSync(resolve(sortie), png)
