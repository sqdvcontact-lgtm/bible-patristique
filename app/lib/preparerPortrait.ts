// Préparation d'un portrait avant dépôt. Une seule définition pour les écrans
// d'administration qui en déposent (bibliothèque, traductions).
//
// ⛔ ON NE ROGNE PAS. Un portrait paraît sur deux surfaces dont les cadres n'ont pas
// les mêmes proportions (carte 0,60, fiche 2/3), plus les ronds des lecteurs, et l'administrateur
// les cadre lui-même par `photo_position`, avec un zoom jusqu'à 3,5×. Rogner au dépôt
// jetterait définitivement les parties de l'image que ce cadrage pourrait vouloir
// montrer. C'était le défaut du code précédent, qui rognait en 2:3 centré avant même
// que quiconque ait cadré quoi que ce soit.
//
// On se contente donc de RÉDUIRE à l'intérieur d'une boîte, en conservant les
// proportions d'origine, et de convertir en JPEG. Cela règle du même coup les objets
// `.jpg` qui étaient en réalité des PNG de 3 Mo.

export type Dimensions = { largeur: number; hauteur: number }

/** Deux usages, deux boîtes — la même image réduite au même gabarit servirait mal
 *  l'un des deux.
 *
 *  AUTEUR : portrait vertical. Le plus grand cadre est la fiche, 140 × 210 à la racine
 *  16 et 193 × 289 à la racine 22, zoomé jusqu'à 1,6 : 800 × 1000 le garde net en HiDPI
 *  (600 × 750 tombait sous le double dès qu'on zoomait, audit du 2026-09-24), pour un
 *  poids de 100 à 240 Ko en JPEG.
 *
 *  TRADUCTION — BANDEAU : bandeau PLEINE LARGEUR (app/traductions/AllerPlusLoinClient.tsx,
 *  `width: 100%`, 92 px de haut). C'est la largeur qui commande, pas la hauteur :
 *  une boîte de 600 de large rendrait le bandeau flou sur un écran large.
 *
 *  TRADUCTION — ENCART : l'encart au format portrait du bloc déplié ne dépasse pas
 *  8,75rem de large, soit 140 px, 280 en HiDPI. La boîte est donnée en PORTRAIT,
 *  parce que la réduction se fait à l'intérieur d'un rectangle et qu'une boîte
 *  couchée n'accueillerait qu'une bande de l'image debout qu'on lui donne. */
export const BOITE_AUTEUR: Dimensions = { largeur: 800, hauteur: 1000 }
export const BOITE_TRADUCTION: Dimensions = { largeur: 1600, hauteur: 1200 }
export const BOITE_TRADUCTION_ENCART: Dimensions = { largeur: 600, hauteur: 900 }

export const PORTRAIT_LARGEUR_MAX = BOITE_AUTEUR.largeur
export const PORTRAIT_HAUTEUR_MAX = BOITE_AUTEUR.hauteur
export const PORTRAIT_QUALITE = 0.9

/** La VIGNETTE d'un portrait d'auteur : copie réduite, MÊME proportion (donc même
 *  cadrage), pour les petits ronds des lecteurs — 22 à 72 px, zoom de 1,8 au plus,
 *  au double pour les écrans denses. Elle pèse 10 à 20 Ko là où le portrait en pèse
 *  60 à 160. Déposée dans le seau `auteurs-vignettes` avec son portrait. */
export const BOITE_VIGNETTE_AUTEUR: Dimensions = { largeur: 280, hauteur: 350 }
export const VIGNETTE_QUALITE = 0.84


/** Réduction à l'intérieur de la boîte, proportions conservées. Une image déjà plus
 *  petite n'est jamais agrandie : on ne fabrique pas de la définition qui n'existe pas.
 *  Fonction pure, testée dans preparerPortrait.test.ts. */
export function dimensionsPortrait(
  source: Dimensions,
  boite: Dimensions = BOITE_AUTEUR,
): Dimensions {
  if (source.largeur <= 0 || source.hauteur <= 0) return { largeur: 0, hauteur: 0 }
  const facteur = Math.min(boite.largeur / source.largeur, boite.hauteur / source.hauteur, 1)
  return {
    largeur: Math.max(1, Math.round(source.largeur * facteur)),
    hauteur: Math.max(1, Math.round(source.hauteur * facteur)),
  }
}

/** Nom du fichier déposé : l'extension suit le format réellement produit. */
export function nomJpeg(nom: string): string {
  const point = nom.lastIndexOf('.')
  return (point > 0 ? nom.slice(0, point) : nom) + '.jpg'
}

/** Prépare le fichier choisi par l'administrateur : orientation EXIF respectée,
 *  réduction sans rognage, conversion en JPEG. */
export async function preparerPortrait(fichier: File, boite: Dimensions = BOITE_AUTEUR): Promise<File> {
  // `imageOrientation: 'from-image'` applique l'orientation EXIF, sans quoi une photo
  // prise à la verticale arriverait couchée.
  const bitmap = await createImageBitmap(fichier, { imageOrientation: 'from-image' })
  const { largeur, hauteur } = dimensionsPortrait({ largeur: bitmap.width, hauteur: bitmap.height }, boite)

  try {
    return await reduireEnJpeg(bitmap, largeur, hauteur, PORTRAIT_QUALITE, nomJpeg(fichier.name))
  } finally {
    bitmap.close()
  }
}

/** Le portrait d'un AUTEUR et sa vignette, tirés du même fichier. */
export async function preparerPortraitEtVignette(fichier: File): Promise<{ portrait: File; vignette: File }> {
  const bitmap = await createImageBitmap(fichier, { imageOrientation: 'from-image' })
  try {
    const source = { largeur: bitmap.width, hauteur: bitmap.height }
    const p = dimensionsPortrait(source, BOITE_AUTEUR)
    const v = dimensionsPortrait(source, BOITE_VIGNETTE_AUTEUR)
    const portrait = await reduireEnJpeg(bitmap, p.largeur, p.hauteur, PORTRAIT_QUALITE, nomJpeg(fichier.name))
    const vignette = await reduireEnJpeg(bitmap, v.largeur, v.hauteur, VIGNETTE_QUALITE, 'vignette.jpg')
    return { portrait, vignette }
  } finally {
    bitmap.close()
  }
}

/** Réduit une image par PALIERS de moitié, puis au format voulu, en lissage de haute
 *  qualité, et l'encode en JPEG.
 *  ⛔ Un seul `drawImage` d'une source de plusieurs milliers de pixels vers 750 se fait
 *  en bilinéaire simple, qui amollit et crénelle : c'est la cause probable des portraits
 *  les plus doux du seau (audit du 2026-09-24). Chaque palier ne divise que par deux. */
async function reduireEnJpeg(source: ImageBitmap, largeur: number, hauteur: number, qualite: number, nom: string): Promise<File> {
  let image: CanvasImageSource = source
  let l = source.width
  let h = source.height
  while (l / 2 >= largeur && h / 2 >= hauteur) {
    l = Math.round(l / 2); h = Math.round(h / 2)
    image = dessiner(image, l, h)
  }
  const canvas = dessiner(image, largeur, hauteur)
  const blob = await new Promise<Blob | null>(resoudre => canvas.toBlob(resoudre, 'image/jpeg', qualite))
  if (!blob) throw new Error('Conversion JPEG impossible')
  return new File([blob], nom, { type: 'image/jpeg' })
}

function dessiner(image: CanvasImageSource, largeur: number, hauteur: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Contexte 2D indisponible')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, largeur, hauteur)
  return canvas
}
