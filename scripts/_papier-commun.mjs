// ── LE PAPIER D'UNE PLANCHE : ses bornes, et son nettoyage ──────────────────
//
// Ce module porte la recette du 30 août 2026 (charte § 49.1 et § 49.16), écrite
// d'abord pour les planches de Fillion et devenue nécessaire aux ornements : une
// planche à GRAIN marqué ne se détoure pas au seuil « pic moins deux ».
//
// ⛔ IL N'Y A QU'UNE RECETTE, et c'est la raison de ce module. Elle vivait dans
// `scripts/fillion/reduire-planches.mjs` seul ; `scripts/ornements-detourer.mjs`
// blanchissait de son côté, au seuil du pic, et rendait 84 % de partiels sur une
// planche dont le papier s'étale de 208 à 255 — un voile gris sur tout le fond,
// c'est-à-dire l'exact contraire d'un détourage. Deux nettoyages divergents
// auraient donné deux gravures de la même famille qui ne se ressemblent pas.
//
// Le code ci-dessous est celui de `reduire-planches.mjs`, déplacé sans une virgule
// de changement : les planches déjà servies restent reproductibles.
import sharp from 'sharp'

/** ⛔ LE PLANCHER DIT CE QUI EST DU PAPIER — il ne dit pas ce qu'on blanchit.
 *
 *  Il est celui de la rampe alpha (charte § 49.1) et se mesure de la même façon :
 *  la demi-largeur du pic prise de son côté CLAIR, le seul qu'aucune encre ne
 *  peuple. Tout ce qui est plus clair que ce pied EST du papier.
 *
 *  ⚠️ Mais l'employer comme point BLANC — pousser au blanc tout ce qui le dépasse —
 *  mange le trait clair : voir `nettoyerLePapier`. Il sert de CRITÈRE, jamais de
 *  borne d'étalement.
 *
 *  ⚠️ Un étalement au PIC, lui, ne perd rien mais laisse la moucheture et
 *  l'AGGRAVE : le grain du papier est SOUS le pic, et il s'écarte du blanc à mesure
 *  que le pic y monte. Écart-type du papier sur les douze planches de la Genèse :
 *  4,4 à 7,4 avant tout traitement, 1,5 à 3,1 après un étalement au pic. Aucune des
 *  deux bornes ne suffit seule ; c'est leur emploi conjoint qui règle la question. */
const FERMETE_DU_PIED = 0.2
const PART_NOIR = 0.005

export function bornesDuPapier(gris, total) {
  const hist = new Uint32Array(256)
  for (const v of gris) hist[v]++
  const lisse = (v) => (hist[Math.max(0, v - 1)] + hist[v] + hist[Math.min(255, v + 1)]) / 3
  let pic = 150
  for (let v = 150; v < 256; v++) if (lisse(v) > lisse(pic)) pic = v
  let demi = 1
  while (pic + demi < 255 && lisse(pic + demi) >= lisse(pic) * FERMETE_DU_PIED) demi++
  let cum = 0, noir = 0
  for (let v = 0; v < 256; v++) { cum += hist[v]; if (cum / total >= PART_NOIR) { noir = v; break } }
  const plancher = Math.max(noir + 24, pic - demi)
  if (plancher - noir < 24) throw new Error('plage tonale trop étroite, planche suspecte')
  return { pic, plancher, noir }
}

/** ⛔ ET IL SE NETTOIE CHIRURGICALEMENT : LE PLANCHER DUR MANGE LE TRAIT CLAIR.
 *
 *  Porter au blanc TOUT ce qui est plus clair que le plancher nettoie parfaitement
 *  et coûte **11 % de l'encre** — jusqu'à 17 % sur les gravures au trait FIN, dont
 *  les traits minces ont justement des valeurs claires. ⚠️ L'œil ne le voit pas ;
 *  seul le témoin le dit, et c'est pour cela qu'on le mesure (§ 49.15).
 *
 *  Un trait clair est TOUJOURS bordé de trait plus sombre ; le papier ouvert, jamais.
 *  On part donc d'un étalement au PIC, qui ne perd rien, et l'on ne pousse au blanc
 *  que les pixels clairs sans aucune encre alentour. Mesuré sur les huit cas
 *  extrêmes, moucheture du papier et part d'encre gardée :
 *
 *    plancher dur           0,77   ×0,87
 *    plancher plus haut     0,99   ×0,91
 *    CHIRURGICAL            0,47   ×0,95
 *
 *  ⛔ Il gagne sur les DEUX critères à la fois, et c'est ce qui le choisit : une
 *  planche parfaitement propre dont le trait a fondu n'est pas un gain. */
/** ⛔ LE PIED DU PAPIER — la queue SOMBRE du pic, qu'aucune symétrie ne donne.
 *
 *  Le plancher ci-dessus suppose le pic symétrique et prend sa demi-largeur du côté
 *  CLAIR. C'est juste sur un papier propre, où les deux flancs se valent ; c'est faux
 *  dès que la planche a du GRAIN, car le grain ne peuple que le flanc sombre. Mesuré
 *  sur le fleuron en croix, le 9 septembre 2026 : pic à 238, flanc clair éteint à 244,
 *  flanc sombre qui traîne jusqu'à 216. Le plancher tombait à 232 et laissait **14 %**
 *  du plan en papier non blanchi, à alpha 17 — un voile qui se voit.
 *
 *  Le pied se MESURE donc sur ce flanc-là : on descend depuis le pic tant que la queue
 *  porte plus d'un millième du plan. ⚠️ Sur un papier propre, elle s'éteint aussitôt et
 *  le pied rejoint le plancher : la mesure ne change rien là où il n'y avait rien à
 *  corriger — vérifié sur les sept planches déjà servies.
 *
 *  ⛔ Il ne sert QU'AU BLANCHIMENT. Le critère d'encre reste pendu au plancher : le
 *  faire descendre avec le pied retirerait leur protection aux traits gris moyens,
 *  c'est-à-dire précisément à ce que le nettoyage chirurgical existe pour garder. */
const QUEUE_DU_PAPIER = 0.001

export function piedDuPapier(gris, total, { pic, plancher, noir }) {
  const hist = new Uint32Array(256)
  for (const v of gris) hist[v]++
  const seuil = QUEUE_DU_PAPIER * total
  let pied = pic
  while (pied > noir + 24 && hist[pied - 1] > seuil) pied--
  return Math.max(noir + 24, Math.min(plancher, pied))
}
const RAYON_ENCRE = 3
const MARGE_ENCRE = 45

/** Dilate un masque booléen par une fenêtre carrée, en deux passes SÉPARABLES :
 *  sans cela le voisinage coûterait 49 lectures par pixel, soit près de six cents
 *  millions d'opérations sur une planche de 2 959 px de large. */
export function dilater(masque, W, H, rayon) {
  const tmp = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    const base = y * W
    let compte = 0
    for (let x = 0; x < W + rayon; x++) {
      if (x < W && masque[base + x]) compte++
      const sortant = x - 2 * rayon - 1
      if (sortant >= 0 && masque[base + sortant]) compte--
      const cible = x - rayon
      if (cible >= 0 && cible < W) tmp[base + cible] = compte > 0 ? 1 : 0
    }
  }
  const out = new Uint8Array(W * H)
  for (let x = 0; x < W; x++) {
    let compte = 0
    for (let y = 0; y < H + rayon; y++) {
      if (y < H && tmp[y * W + x]) compte++
      const sortant = y - 2 * rayon - 1
      if (sortant >= 0 && tmp[sortant * W + x]) compte--
      const cible = y - rayon
      if (cible >= 0 && cible < H) out[cible * W + x] = compte > 0 ? 1 : 0
    }
  }
  return out
}

/** Le nettoyage, sur le gris À PLEINE RÉSOLUTION : la moucheture s'efface AVANT la
 *  réduction, sinon la moyenne l'étale au lieu de la retirer. */
export async function nettoyerLePapier(png) {
  const r = await sharp(png).removeAlpha().toColourspace('b-w')
    .raw().toBuffer({ resolveWithObject: true })
  if (r.info.channels !== 1) throw new Error('canal unique attendu')
  const W = r.info.width, H = r.info.height, total = W * H
  const { pic, plancher, noir } = bornesDuPapier(r.data, total)
  const pied = piedDuPapier(r.data, total, { pic, plancher, noir })

  // 1. L'étalement au PIC : il porte le papier au blanc sans rien écrêter du trait.
  const amplitude = Math.max(1, pic - noir)
  const out = Buffer.alloc(total)
  for (let i = 0; i < total; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round((r.data[i] - noir) * 255 / amplitude)))
  }

  // 2. Le papier OUVERT, et lui seul, passe au blanc franc.
  const encre = new Uint8Array(total)
  const seuilEncre = plancher - MARGE_ENCRE
  for (let i = 0; i < total; i++) if (r.data[i] < seuilEncre) encre[i] = 1
  const proche = dilater(encre, W, H, RAYON_ENCRE)
  let blanchis = 0
  for (let i = 0; i < total; i++) {
    if (r.data[i] >= pied && !proche[i]) { out[i] = 255; blanchis++ }
  }

  return {
    png: await sharp(out, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer(),
    pic, plancher, pied, noir, blanchis: 100 * blanchis / total,
  }
}
