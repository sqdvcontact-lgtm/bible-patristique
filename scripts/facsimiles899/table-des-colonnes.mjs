// La TABLE DES COLONNES de la Bible du XIIIe siècle : ce que la fenêtre du fac-similé
// sait de chaque image, sans lire le manifeste (494 Ko) ni le TEI (7,8 Mo).
//
//   node scripts/facsimiles899/table-des-colonnes.mjs
//
// Écrit `app/lib/facsimiles899.json`, une ligne par colonne dans l'ordre du manuscrit :
// [clé de colonne, fichier, largeur, hauteur, folio natif].
//
// ⛔ LA CLÉ N'EST PAS LE FOLIO. Les identifiants de ligne du TEI (`f296r_a_l01`), que les
// segments recopient dans `source_line_start`, suivent la numérotation des IMAGES, c'est-à-
// dire des feuillets matériels. Le manuscrit, lui, saute le folio 296 : l'image `f296r_a`
// montre le folio 297r. Le folio natif se lit donc sur le `<pb n>` qui précède la colonne.
// ⚠️ Le fichier, lui non plus, n'est pas la clé : 393 images portent un numéro complété de
// zéros (`f001v_b.png` pour la colonne `f1v_b`).
//
// Lecture seule des assets de la Bible 899 : ce script n'écrit que sous `app/lib/`.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const racine = path.resolve(import.meta.dirname, '../..')
const manifeste = JSON.parse(readFileSync(path.join(racine, 'data/manuscrits/bible-899/manifest.json'), 'utf8'))
const tei = readFileSync(path.join(racine, 'data/manuscrits/bible-899/Bible_899_master.xml'), 'utf8')

const cleDuFichier = (fichier) => fichier.replace(/\.png$/u, '').replace(/^f0*/u, 'f')

// Le folio natif de chaque image, dans l'ordre où le TEI les appelle.
const folioDuFichier = new Map()
const ordre = []
let folio = null
for (const balise of tei.matchAll(/<(pb|cb)\b([^>]*)>/gu)) {
  const attributs = balise[2]
  if (balise[1] === 'pb') folio = /\bn="([^"]+)"/u.exec(attributs)?.[1] ?? folio
  const facs = /\bfacs="([^"]+)"/u.exec(attributs)?.[1]
  if (!facs) continue
  const fichier = path.posix.basename(facs)
  if (!folioDuFichier.has(fichier)) ordre.push(fichier)
  folioDuFichier.set(fichier, folio)
}

const images = new Map(manifeste.images.map((image) => [image.file, image]))
const colonnes = []
const cles = new Set()
for (const fichier of ordre) {
  const image = images.get(fichier)
  if (!image) throw new Error(`Colonne ${fichier} appelée par le TEI, absente du manifeste`)
  const cle = cleDuFichier(fichier)
  if (cles.has(cle)) throw new Error(`Clé de colonne en double : ${cle}`)
  cles.add(cle)
  colonnes.push([cle, fichier, image.width, image.height, folioDuFichier.get(fichier)])
}
if (colonnes.length !== manifeste.images.length) {
  throw new Error(`${colonnes.length} colonnes tirées du TEI pour ${manifeste.images.length} images au manifeste`)
}

// Une colonne par ligne : le fichier reste lisible, et un changement se relit au diff.
const sortie = `[\n${colonnes.map((c) => JSON.stringify(c)).join(',\n')}\n]\n`
writeFileSync(path.join(racine, 'app/lib/facsimiles899.json'), sortie)
console.log(`${colonnes.length} colonnes écrites (${Buffer.byteLength(sortie)} octets)`)
