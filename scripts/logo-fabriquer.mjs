// Fabrique les icônes du site (onglet, favori, écran d'accueil, raccourci du
// serveur) à partir de la MARQUE de la barre de navigation : le chiffre CS
// (`public/ornements/chiffre-cs.png`), dont on ne garde que l'ALPHA, repeint dans
// l'encre du nom sur le vert de la barre.
//
// ⛔ Une seule marque pour tout le site (2026-09-06, puis 2026-09-23 pour les
// icônes) : l'onglet montrait encore la lettrine gothique de `work/logo/`, quand la
// barre porte le chiffre. `monogramme-vert.png` ne sert plus.
//
// ⚠️ Le chiffre est tout en déliés : réduit tel quel, il s'efface sous 32 px. La
// graisse se règle donc PAR TAILLE, jugée sur planche agrandie au plus proche voisin :
//   • 16 et 24 px — le chiffre élargi et épaissi (érosion du fond sur la planche
//     d'origine) : c'est la silhouette qui se lit, non le trait ;
//   • 32 et 48 px — une courbe sur l'alpha, qui rend corps aux déliés ;
//   • au-delà — le dessin tel quel, avec une marge.
// L'icône Apple est un carré plein : iOS arrondit lui-même les coins.
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

/** Le sol de la barre au Clair (`--cs-barre-fond`). */
const FOND = '#3d6b4f'
/** L'encre du nom dans la barre, blanc à 93 %, composée sur ce sol. */
const ENCRE = { r: 242, g: 245, b: 243 }

/** La boîte d'encre du chiffre dans sa planche de 535 × 512. */
const ENCRE_CHIFFRE = { left: 19, top: 20, width: 496, height: 472 }

const planche = sharp(dans('public/ornements/chiffre-cs.png'))
const alpha = await planche.extractChannel(3).extract(ENCRE_CHIFFRE).png().toBuffer()
// Sharp érode le fond noir : c'est l'encre blanche qui s'épaissit.
const alphaEpais = await sharp(alpha).extractChannel(0).erode(4).png().toBuffer()

function reglage(taille) {
  if (taille <= 24) return { part: 0.88, source: alphaEpais, gamma: 1 }
  if (taille <= 48) return { part: 0.82, source: alpha, gamma: 0.7 }
  return { part: 0.72, source: alpha, gamma: 1 }
}

async function icone(taille, { plein = false } = {}) {
  const { part, source, gamma } = reglage(taille)
  const partReelle = plein ? part * 0.92 : part
  const w = Math.round(taille * partReelle)
  const h = Math.round(w * ENCRE_CHIFFRE.height / ENCRE_CHIFFRE.width)
  const { data, info } = await sharp(source).resize(w, h, { kernel: 'lanczos3' })
    .extractChannel(0).raw().toBuffer({ resolveWithObject: true })
  if (info.channels !== 1) throw new Error(`alpha attendu sur un canal, ${info.channels} reçus`)
  const rgba = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    rgba[4 * i] = ENCRE.r
    rgba[4 * i + 1] = ENCRE.g
    rgba[4 * i + 2] = ENCRE.b
    rgba[4 * i + 3] = gamma === 1 ? data[i] : Math.round(255 * Math.pow(data[i] / 255, gamma))
  }
  const rayon = plein ? 0 : Math.round(taille * 0.22)
  const fond = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}">` +
    `<rect width="${taille}" height="${taille}" rx="${rayon}" ry="${rayon}" fill="${FOND}"/></svg>`,
  )
  return sharp(fond)
    .composite([{
      input: rgba,
      raw: { width: w, height: h, channels: 4 },
      left: Math.round((taille - w) / 2),
      top: Math.round((taille - h) / 2),
    }])
    .png({ compressionLevel: 9 })
    .toBuffer()
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

const serie = tailles => Promise.all(tailles.map(async taille => ({ taille, png: await icone(taille) })))

await writeFile(dans('app/icon.png'), await icone(512))
console.log('  app/icon.png — 512×512')
await writeFile(dans('app/apple-icon.png'), await icone(180, { plein: true }))
console.log('  app/apple-icon.png — 180×180, carré plein')

const tailles = [16, 24, 32, 48]
await writeFile(dans('app/favicon.ico'), ico(await serie(tailles)))
console.log(`  app/favicon.ico — ${tailles.join(', ')} px`)

// L'icône du raccourci de lancement du serveur, épinglé à la barre des tâches.
// Elle porte de plus grandes tailles que le favicon : la barre des tâches en
// réclame 32 et 48, et les listes de raccourcis montent jusqu'à 256.
const taillesBureau = [16, 24, 32, 48, 64, 128, 256]
await mkdir(dans('outils'), { recursive: true })
await writeFile(dans('outils/icone-serveur.ico'), ico(await serie(taillesBureau)))
console.log(`  outils/icone-serveur.ico — ${taillesBureau.join(', ')} px`)
