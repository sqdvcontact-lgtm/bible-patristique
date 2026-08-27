// Préparation d'un portrait avant dépôt. Une seule définition pour les trois écrans
// d'administration qui en déposent (bibliothèque, auteurs, traductions).
//
// ⛔ ON NE ROGNE PAS. Un portrait paraît sur trois surfaces dont les cadres n'ont pas
// les mêmes proportions — carte 0,60, fiche 0,80, aperçu 0,765 — et l'administrateur
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
 *  AUTEUR : vignette verticale. Le plus grand cadre est la carte, 120 × 200 ; la
 *  charte retient 600 × 750, soit le double environ, pour rester net en HiDPI sans
 *  peser sur une page qui affiche quinze portraits à la suite.
 *
 *  TRADUCTION — BANDEAU : bandeau PLEINE LARGEUR (app/traductions/AllerPlusLoinClient.tsx,
 *  `width: 100%`, 92 px de haut). C'est la largeur qui commande, pas la hauteur :
 *  une boîte de 600 de large rendrait le bandeau flou sur un écran large.
 *
 *  TRADUCTION — ENCART : l'encart au format portrait du bloc déplié ne dépasse pas
 *  8,75rem de large, soit 140 px, 280 en HiDPI. La boîte est donnée en PORTRAIT,
 *  parce que la réduction se fait à l'intérieur d'un rectangle et qu'une boîte
 *  couchée n'accueillerait qu'une bande de l'image debout qu'on lui donne. */
export const BOITE_AUTEUR: Dimensions = { largeur: 600, hauteur: 750 }
export const BOITE_TRADUCTION: Dimensions = { largeur: 1600, hauteur: 1200 }
export const BOITE_TRADUCTION_ENCART: Dimensions = { largeur: 600, hauteur: 900 }

export const PORTRAIT_LARGEUR_MAX = BOITE_AUTEUR.largeur
export const PORTRAIT_HAUTEUR_MAX = BOITE_AUTEUR.hauteur
export const PORTRAIT_QUALITE = 0.9


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

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close(); throw new Error('Contexte 2D indisponible') }
  ctx.drawImage(bitmap, 0, 0, largeur, hauteur)
  bitmap.close()

  const blob = await new Promise<Blob | null>(resoudre =>
    canvas.toBlob(resoudre, 'image/jpeg', PORTRAIT_QUALITE))
  if (!blob) throw new Error('Conversion JPEG impossible')

  return new File([blob], nomJpeg(fichier.name), { type: 'image/jpeg' })
}
