// ── Détourage des gravures Fillion ───────────────────────────────────────────
//
// `node scripts/fillion/detourer-gravures.mjs`                 → MESURE seule
// `node scripts/fillion/detourer-gravures.mjs --fabriquer`     → écrit dans tmp/
// `node scripts/fillion/detourer-gravures.mjs --televerser`    → dépose la proposition
//
// La recette est celle de la charte (« Les ornements se DÉTOURENT, jamais
// `mix-blend-mode` ») : le papier se mesure par son niveau DOMINANT, le fichier
// se réduit à sa taille servie AVANT de construire l'alpha, l'alpha se calcule
// sur l'encre qu'on REPOSE, et l'on rogne sur ce qui SE VOIT.
//
// ⛔ DEUX ÉTAPES DE PLUS, que les ornements n'avaient pas, et qui sont propres à
// ces fichiers-ci. Le PDF du tome VII est une compression à contenu mixte : le
// trait vient d'un masque JBIG2 à 1 bit, les demi-teintes d'un fond JPX à 134
// points par pouce. La bavure est donc de BASSE FRÉQUENCE et elle FLOTTE, quand
// le trait est franc et continu.
//   1. le CHAMP PLAT retire le voile de basse fréquence sans toucher au trait ;
//   2. le LISERÉ éteint tout gris qui ne borde aucun trait.
// ⚠️ La charte proscrit la correction de champ plat pour les PLANCHES en
// demi-teintes (`process_illustrations.py` : « la précédente correction de champ
// plat effaçait les grandes plages sombres »). Elle est légitime ici, et
// seulement ici, parce que la trame de ces fichiers n'existe plus : c'est ce que
// mesure `partDesGrisAuBordDuTrait`, et le script REFUSE de détourer une gravure
// dont les gris bordent le trait.
//
// Sans ces deux étapes, mesuré sur le « Médecin pansant un blessé » : 17,3 % de
// pixels partiellement opaques, là où la charte attend 3 à 13 % pour un trait.
// Avec elles : 5,9 %. Le trait redevient franc et la bavure disparaît.

import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── Réglages ─────────────────────────────────────────────────────────────────

/** L'encre de la famille, celle des ornements du site (charte). Elle n'est pas
 *  noire : un noir franc sur le crème fait un trait d'imprimante, non une encre. */
const ENCRE = [34, 33, 30]
const LUM_ENCRE = 0.2126 * ENCRE[0] + 0.7152 * ENCRE[1] + 0.0722 * ENCRE[2]
const AMPLITUDE = 255 - LUM_ENCRE
const NETTETE = { sigma: 0.6, m1: 0, m2: 2 }

/** Le noyau d'un trait, en luminance de la source puis en alpha du rendu. */
const SEUIL_NOYAU = 100
const NOYAU_ALPHA = 140
/** Le liseré : plein jusqu'à 2,5 px du trait, éteint au-delà de 6. Réglé à l'œil
 *  sur l'épaule du « Médecin », là où la bavure est la pire. */
const LISERE_PLEIN = 2.5
const LISERE_NUL = 6
/** Points noir et blanc, après champ plat. Le blanc à 235 tombe dans la bande
 *  presque vide qui sépare la bavure du papier (0,39 % de l'image entre 230 et
 *  249, contre 4,90 % entre 200 et 229). */
const POINT_NOIR = 30
const POINT_BLANC = 235
const RAYON_CHAMP_PLAT = 14

/** Au-dessus de ce taux, les gris BORDENT le trait : ce sont les restes d'une
 *  trame, donc de la structure, et l'on ne détoure pas. Mesuré sur les 43 : les
 *  deux photogravures survivantes rendent 54 et 55 %, les neuf gravures ruinées
 *  9 à 28 %. L'écart est net et le seuil tombe dedans. */
export const SEUIL_TRAME = 0.35

const SEAU = 'bible-illustrations-web'
const DOSSIER_LOCAL = 'tmp/fillion-detourage'

// ── Outils ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const FABRIQUER = args.includes('--fabriquer') || args.includes('--televerser')
const TELEVERSER = args.includes('--televerser')

/** ⚠️ `sharpen` et `resize` peuvent rendre trois canaux là où l'on en attend un.
 *  Sans ce contrôle, la boucle lit un octet sur trois et raye l'image. */
async function monocanal(pipeline) {
  const r = await pipeline.removeAlpha().toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
  if (r.info.channels !== 1) throw new Error(`canal unique attendu, reçu ${r.info.channels}`)
  return r
}

/** Distance de chaque pixel au noyau le plus proche, par deux balayages. */
function distanceAuNoyau(estNoyau, W, H) {
  const GRAND = 1e6
  const d = new Float32Array(W * H).fill(GRAND)
  for (let i = 0; i < W * H; i++) if (estNoyau(i)) d[i] = 0
  const maj = (i, j, c) => { if (d[j] + c < d[i]) d[i] = d[j] + c }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (x > 0) maj(i, i - 1, 1)
    if (y > 0) maj(i, i - W, 1)
    if (x > 0 && y > 0) maj(i, i - W - 1, 1.414)
    if (x < W - 1 && y > 0) maj(i, i - W + 1, 1.414)
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x
    if (x < W - 1) maj(i, i + 1, 1)
    if (y < H - 1) maj(i, i + W, 1)
    if (x < W - 1 && y < H - 1) maj(i, i + W + 1, 1.414)
    if (x > 0 && y < H - 1) maj(i, i + W - 1, 1.414)
  }
  return d
}

// ── La mesure qui décide ─────────────────────────────────────────────────────

/** Part des GRIS qui borde un noyau de trait, et masse de ces gris.
 *
 *  ⛔ Ce n'est PAS un détecteur de planche : les feuillets du tome I portent une
 *  grande masse grise faiblement adjacente (le grain du papier), et le critère
 *  les rangerait à tort. Il ne se lit qu'APRÈS avoir écarté les planches pleine
 *  page, qui ne se détourent jamais. */
export async function partDesGrisAuBordDuTrait(entree) {
  const { data, info } = await monocanal(sharp(entree))
  const W = info.width, H = info.height
  const d = distanceAuNoyau(i => data[i] < SEUIL_NOYAU, W, H)
  let gris = 0, borde = 0
  for (let i = 0; i < W * H; i++) {
    if (data[i] < SEUIL_NOYAU || data[i] >= 235) continue
    gris++
    if (d[i] <= 2) borde++
  }
  return { part: gris ? borde / gris : 0, masseGrise: gris / (W * H) }
}

// ── Le détourage ─────────────────────────────────────────────────────────────

export async function detourer(entree, largeurServie) {
  const brut = await monocanal(sharp(entree))

  // 1. LE PAPIER par son niveau dominant, jamais aux quatre coins.
  const hist = new Uint32Array(256)
  for (const v of brut.data) hist[v]++
  let papier = 200
  for (let v = 200; v < 256; v++) if (hist[v] > hist[papier]) papier = v
  const nivele = Buffer.from(brut.data)
  for (let i = 0; i < nivele.length; i++) if (nivele[i] >= papier - 2) nivele[i] = 255

  // 2. RÉDUIRE À LA TAILLE SERVIE d'abord, puis raviver. ⛔ Jamais l'inverse :
  //    bâtir l'alpha en pleine définition puis réduire moyenne le trait en gris mou.
  const red = await monocanal(
    sharp(nivele, { raw: { width: brut.info.width, height: brut.info.height, channels: 1 } })
      .resize({ width: largeurServie, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
      .sharpen(NETTETE)
  )
  const W = red.info.width, H = red.info.height

  // 3. CHAMP PLAT, puis 4. POINTS NOIR ET BLANC.
  const fond = await monocanal(sharp(red.data, { raw: { width: W, height: H, channels: 1 } }).blur(RAYON_CHAMP_PLAT))
  const gris = Buffer.alloc(W * H)
  for (let i = 0; i < W * H; i++) {
    const plat = Math.min(255, Math.round(255 * red.data[i] / Math.max(1, fond.data[i])))
    gris[i] = Math.max(0, Math.min(255, Math.round((plat - POINT_NOIR) * 255 / (POINT_BLANC - POINT_NOIR))))
  }

  // 5. L'ALPHA SE CALCULE SUR L'ENCRE QU'ON REPOSE, jamais sur la médiane de la
  //    planche : sinon tout le dégradé qui borde un trait s'assombrit.
  const rgba = Buffer.alloc(W * H * 4)
  for (let p = 0; p < W * H; p++) {
    const a = Math.max(0, Math.min(1, (255 - gris[p]) / AMPLITUDE))
    if (a < 0.004) continue
    const o = p * 4
    rgba[o] = ENCRE[0]; rgba[o + 1] = ENCRE[1]; rgba[o + 2] = ENCRE[2]
    rgba[o + 3] = Math.round(a * 255)
  }

  // 6. LE LISERÉ. Tout gris qui ne borde aucun trait est un artefact du fond JPX.
  const dist = distanceAuNoyau(i => rgba[i * 4 + 3] >= NOYAU_ALPHA, W, H)
  let vide = 0, partiels = 0, plein = 0
  for (let i = 0; i < W * H; i++) {
    const o = i * 4
    if (!rgba[o + 3]) { vide++; continue }
    const k = dist[i] <= LISERE_PLEIN ? 1
      : dist[i] >= LISERE_NUL ? 0
        : (LISERE_NUL - dist[i]) / (LISERE_NUL - LISERE_PLEIN)
    rgba[o + 3] = Math.round(rgba[o + 3] * k)
    if (!rgba[o + 3]) vide++
    else if (rgba[o + 3] >= 235) plein++
    else partiels++
  }

  // 7. ROGNER SUR L'ALPHA. ⛔ Le seuil ne peut pas être « alpha >= 1 » : sous le
  //    dessin traînent des pixels isolés à alpha 1 à 8, invisibles à l'œil, dont
  //    un seul ancre la boîte. Un rang ne compte que s'il en porte trois à 8 ou plus.
  const rangPlein = (horizontal, fixe) => {
    let n = 0
    const long = horizontal ? W : H
    for (let k = 0; k < long; k++) {
      const i = horizontal ? fixe * W + k : k * W + fixe
      if (rgba[i * 4 + 3] >= 8) n++
      if (n >= 3) return true
    }
    return false
  }
  let haut = 0, bas = H - 1, gauche = 0, droite = W - 1
  while (haut < bas && !rangPlein(true, haut)) haut++
  while (bas > haut && !rangPlein(true, bas)) bas--
  while (gauche < droite && !rangPlein(false, gauche)) gauche++
  while (droite > gauche && !rangPlein(false, droite)) droite--
  const MARGE = 6
  const boite = {
    left: Math.max(0, gauche - MARGE),
    top: Math.max(0, haut - MARGE),
  }
  boite.width = Math.min(W, droite + MARGE + 1) - boite.left
  boite.height = Math.min(H, bas + MARGE + 1) - boite.top

  // WebP SANS PERTE : le seau n'accepte que du WebP, et une compression avec
  // perte sur une couche alpha rouvrirait exactement la bavure qu'on vient d'ôter.
  const image = sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract(boite)
  const N = W * H
  return {
    webp: await image.clone().webp({ lossless: true, effort: 6 }).toBuffer(),
    png: await image.clone().png({ compressionLevel: 9 }).toBuffer(),
    largeur: boite.width,
    hauteur: boite.height,
    papier,
    profil: { vide: 100 * vide / N, partiels: 100 * partiels / N, plein: 100 * plein / N },
  }
}

// ── Passe ────────────────────────────────────────────────────────────────────

async function principal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  const db = createClient(url, cle)

  const { data, error } = await db
    .from('v_bible_edition_assets')
    .select('asset_key,asset_kind,public_uri,width_px,height_px,printed_caption,editorial_caption')
    .order('asset_key')
  if (error) throw new Error(`actifs illisibles : ${error.message}`)

  if (FABRIQUER) mkdirSync(DOSSIER_LOCAL, { recursive: true })
  const rapport = []
  for (const a of data) {
    const source = Buffer.from(await (await fetch(a.public_uri)).arrayBuffer())
    // ⛔ Une PLANCHE ne se détoure jamais : c'est une page entière du volume, avec
    //    son filet gravé, sa légende imprimée et son papier.
    if (a.asset_kind === 'plate') {
      rapport.push({ cle: a.asset_key, regime: 'C', part: null, motif: 'planche pleine page' })
      continue
    }
    const m = await partDesGrisAuBordDuTrait(source)
    if (m.part >= SEUIL_TRAME) {
      rapport.push({ cle: a.asset_key, regime: 'B', part: m.part, motif: 'les gris bordent le trait, la trame est de la structure' })
      continue
    }
    const ligne = { cle: a.asset_key, regime: 'A', part: m.part, motif: 'les gris flottent, ce sont des bavures de compression' }
    if (FABRIQUER) {
      const r = await detourer(source, 600)
      Object.assign(ligne, { largeur: r.largeur, hauteur: r.hauteur, profil: r.profil })
      writeFileSync(`${DOSSIER_LOCAL}/${a.asset_key}.png`, r.png)
      if (TELEVERSER) {
        const chemin = `fillion/propositions/${a.asset_key}/detouree.webp`
        const { error: e } = await db.storage.from(SEAU)
          .upload(chemin, r.webp, { contentType: 'image/webp', upsert: true })
        if (e) throw new Error(`téléversement refusé pour ${a.asset_key} : ${e.message}`)
        ligne.depose = chemin
      }
    }
    rapport.push(ligne)
  }

  for (const r of rapport) {
    const p = r.part === null ? '   —' : `${(100 * r.part).toFixed(0).padStart(3)} %`
    const prof = r.profil ? `  vide ${r.profil.vide.toFixed(1)} %  partiels ${r.profil.partiels.toFixed(1)} %` : ''
    console.log(`${r.regime}  ${r.cle.padEnd(38)} gris au bord du trait ${p}${prof}`)
  }
  const par = (g) => rapport.filter(r => r.regime === g).length
  console.log(`\nA ${par('A')} · B ${par('B')} · C ${par('C')}`)
  if (!FABRIQUER) console.log('Mesure seule. `--fabriquer` écrit dans ' + DOSSIER_LOCAL + ', `--televerser` dépose la proposition.')
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('detourer-gravures.mjs')) {
  principal().catch(e => { console.error(e.message); process.exit(1) })
}
