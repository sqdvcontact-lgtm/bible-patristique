/**
 * Prépare trois fleurons livrés en PNG opaque — un fleuron sur papier photographié,
 * grain compris — pour l'usage du site : détourage en ALPHA, rognage au dessin,
 * réduction.
 *
 * ⛔ La couleur n'est PAS conservée. Comme le monogramme du frontispice (charte § 34),
 * ces planches ne servent que d'alpha : elles se posent en MASQUE et c'est le fond de
 * l'élément qui peint. C'est ce qui leur permet de suivre le thème sans qu'on ait à
 * dessiner deux fois le même trait.
 *
 * ⚠️ Le seuillage est une RAMPE, non un couperet. Le papier des trois planches est
 * texturé — un grain qui court entre 225 et 250 de luminance — et un seuil unique
 * l'aurait soit gardé en entier, soit mangé les bords adoucis du dessin. Tout ce qui
 * est plus clair que SEUIL_PAPIER devient transparent, tout ce qui est plus sombre que
 * SEUIL_ENCRE devient opaque, et l'entre-deux se dégrade linéairement.
 *
 * Usage : node scripts/preparer-ornements-2026-08-27.mjs
 */
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const SEUIL_ENCRE = 96    // en deçà : opaque
const SEUIL_PAPIER = 200  // au-delà : transparent
const MARGE = 0.04        // marge autour du dessin, en part de sa plus grande dimension
const HAUTEUR = 512       // les fleurons paraissent à quelques dizaines de pixels

const SOURCE = 'C:/Users/Sébastien/Downloads/'
const PLANCHES = [
  { entree: 'u1625762875_A_very_simple_typographic_fleuron_of_a_fleur-de-l_fd842a0e-79ec-4857-8809-e0266704f8c1_1.png', sortie: 'fleuron-fleur-de-lys.png' },
  { entree: 'u1625762875_A_very_simple_typographic_fleuron_of_a_lavender_s_efb6cde7-b51c-4e81-b398-829098f695d0_1.png', sortie: 'fleuron-lavande.png' },
  { entree: 'u1625762875_A_very_simple_and_elegant_typographic_fleuron_for_468b4e8a-733e-4177-ba51-de9c16de0e53_1.png', sortie: 'chiffre-cs.png' },
]

mkdirSync('public/ornements', { recursive: true })

for (const { entree, sortie } of PLANCHES) {
  const { data, info } = await sharp(SOURCE + entree)
    .greyscale().raw().toBuffer({ resolveWithObject: true })
  const { width: L, height: H } = info

  const alpha = Buffer.alloc(L * H)
  let x0 = L, y0 = H, x1 = -1, y1 = -1
  for (let i = 0; i < L * H; i++) {
    const l = data[i * info.channels]
    let a = 0
    if (l <= SEUIL_ENCRE) a = 255
    else if (l < SEUIL_PAPIER) a = Math.round(255 * (SEUIL_PAPIER - l) / (SEUIL_PAPIER - SEUIL_ENCRE))
    alpha[i] = a
    // La boîte du dessin se prend sur ce qui est franchement encré : un pixel à
    // peine teinté par le grain n'a pas à agrandir le cadre.
    if (a > 128) {
      const x = i % L, y = (i / L) | 0
      if (x < x0) x0 = x; if (x > x1) x1 = x
      if (y < y0) y0 = y; if (y > y1) y1 = y
    }
  }
  if (x1 < 0) throw new Error(`${entree} : aucun dessin trouvé`)

  const marge = Math.round(Math.max(x1 - x0, y1 - y0) * MARGE)
  const gauche = Math.max(0, x0 - marge), haut = Math.max(0, y0 - marge)
  const largeur = Math.min(L - gauche, x1 - x0 + 1 + 2 * marge)
  const hauteur = Math.min(H - haut, y1 - y0 + 1 + 2 * marge)

  // Le dessin est posé en NOIR pur sous son alpha : la couleur ne sera jamais lue,
  // mais un pixel noir sous un alpha nul évite les franges claires au redimensionnement.
  const noir = Buffer.alloc(L * H * 4)
  for (let i = 0; i < L * H; i++) noir[i * 4 + 3] = alpha[i]

  const info2 = await sharp(noir, { raw: { width: L, height: H, channels: 4 } })
    .extract({ left: gauche, top: haut, width: largeur, height: hauteur })
    .resize({ height: HAUTEUR, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(`public/ornements/${sortie}`)
  console.log(`✓ ${sortie} — ${info2.width}×${info2.height}, ${(info2.size / 1024).toFixed(1)} Ko`)
}
