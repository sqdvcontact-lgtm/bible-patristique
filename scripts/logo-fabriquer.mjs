// Fabrique les icônes du site à partir de la planche d'origine rangée dans
// `work/logo/` :
//
//   • monogramme-vert.png — carré, encre crème sur aplat vert : c'est l'icône
//     d'onglet et de favori, où le fond fait le travail à 16 px.
//
// ⛔ Le script ne fabrique plus les deux monogrammes détourés de `public/logo/`
// (encre et crème). Ils ont été supprimés le 14 septembre 2026, sur décision de
// l'auteur : le site a pour marque le CHIFFRE (`public/ornements/chiffre-cs.png`),
// et plus aucune page ne les appelait. Les recréer ferait reparaître deux images
// que l'inventaire des illustrations ne connaît plus. La recette de détourage des
// planches vit dans `scripts/ornements-detourer.mjs`, et la version d'avant de ce
// script dans l'historique du dépôt.
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

// L'icône du raccourci de lancement du serveur, épinglé à la barre des tâches.
// Elle porte de plus grandes tailles que le favicon : la barre des tâches en
// réclame 32 et 48, et les listes de raccourcis montent jusqu'à 256.
const taillesBureau = [16, 24, 32, 48, 64, 128, 256]
const pngBureau = await Promise.all(taillesBureau.map(async taille => ({
  taille,
  png: await sharp(VERT).resize(taille, taille, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer(),
})))
await mkdir(dans('outils'), { recursive: true })
await writeFile(dans('outils/icone-serveur.ico'), ico(pngBureau))
console.log(`  outils/icone-serveur.ico — ${taillesBureau.join(', ')} px`)
