// ── Détourage des gravures Fillion ───────────────────────────────────────────
//
// `node --env-file=.env.local scripts/fillion/detourer-gravures.mjs`              → MESURE seule
// `node --env-file=.env.local scripts/fillion/detourer-gravures.mjs --fabriquer`  → écrit dans tmp/
// `node --env-file=.env.local scripts/fillion/detourer-gravures.mjs --televerser` → dépose la proposition
//
// ⛔ LE TRAIT NE SE TIRE PAS DE LA PAGE COMPOSÉE, MAIS DE SA COUCHE DE TRAIT.
//
// Le PDF du tome VII est une compression à contenu mixte (MRC), et `pdfimages`
// le dit en une ligne : chaque page y porte TROIS images. Un fond JPX de
// 819 × 1363 à 134 points par pouce, une couche d'avant-plan, et un masque
// JBIG2 de 2455 × 4088 **à 1 bit**. Le masque EST le dessin, franc et continu ;
// le fond ne porte que du papier et les bavures de sa propre compression.
//
// Tirer le trait de la page COMPOSÉE, c'est donc le tirer déjà mêlé à la bavure,
// et passer ensuite sa vie à les séparer. Une première chaîne s'y est employée —
// champ plat, points noir et blanc, liseré — et elle marchait ; mais elle
// combattait un mal qu'il suffisait de ne pas lire. Mesuré sur le « Médecin
// pansant un blessé » : 2,0 % d'encre pleine par la page composée avec la seule
// recette des ornements, 2,5 % avec le champ plat et le liseré, **5,1 % par le
// masque**, et sans une étape de nettoyage.
//
// ⛔ Et ce n'était pas qu'une affaire de netteté. Sur « Le paralytique introduit
// par le toit », le registre SUPÉRIEUR — le toit qu'on découvre, c'est-à-dire le
// sujet que la légende nomme — était si pâle dans la page composée que le
// rognage l'ôtait : la gravure servie n'en montrait que la moitié basse. Le
// masque le rend entier, et la hauteur passe de 517 à 726 pixels.
//
// ⚠️ CE CHEMIN NE VAUT QUE POUR LE TRAIT. Sur une photogravure, la trame vit
// dans le FOND, et le masque ne porterait qu'un contour : le script mesure donc
// avant de choisir, et refuse le détourage dès que les gris bordent le trait.

import sharp from 'sharp'
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

// ── Réglages ─────────────────────────────────────────────────────────────────

/** L'encre de la famille, celle des ornements du site (charte). Elle n'est pas
 *  noire : un noir franc sur le crème fait un trait d'imprimante, non une encre. */
const ENCRE = [34, 33, 30]

/** Le noyau d'un trait, en luminance de la page composée. */
const SEUIL_NOYAU = 100

/** Au-dessus de ce taux, les gris BORDENT le trait : ce sont les restes d'une
 *  trame, donc de la structure, et l'on ne détoure pas. Mesuré sur les onze
 *  gravures de Marc, les deux photogravures survivantes rendent 47 et 48 %, les
 *  neuf ruinées 7 à 22 %. L'écart est net et le seuil tombe dedans. */
export const SEUIL_TRAME = 0.35

/** ⛔ UN FICHIER SE SERT AU DOUBLE DE SA TAILLE D'AFFICHAGE, JAMAIS PLUS
 *  (charte). Une vignette de régime A occupe 30 % de la colonne de 502 px, soit
 *  151 px : on sert donc 300. Au-delà, le navigateur réduirait une seconde fois
 *  derrière nous, et deux réductions moyennent le trait en gris mou. */
const LARGEUR_SERVIE = 300

const SEAU = 'bible-illustrations-web'
const DOSSIER_COUCHES = 'tmp/fillion-couches'
const DOSSIER_LOCAL = 'tmp/fillion-detourage'

const args = process.argv.slice(2)
const FABRIQUER = args.includes('--fabriquer') || args.includes('--televerser')
const TELEVERSER = args.includes('--televerser')

// ── Outils ───────────────────────────────────────────────────────────────────

/** ⚠️ `resize` et `blur` peuvent rendre trois canaux là où l'on en attend un.
 *  Sans ce contrôle, la boucle lit un octet sur trois et RAYE l'image, sans
 *  qu'aucune erreur ne le dise. Payé deux fois. */
async function monocanal(pipeline) {
  const r = await pipeline.removeAlpha().toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
  if (r.info.channels !== 1) throw new Error(`canal unique attendu, reçu ${r.info.channels}`)
  return r
}

/** Fermeture morphologique 3×3 : comble les entailles d'un pixel que la
 *  substitution de symboles du JBIG2 laisse sur les traits.
 *  ⛔ Dilatation PUIS érosion. L'ordre inverse amincirait le trait. */
function fermer(source, W, H) {
  const passe = (s, dilate) => {
    const o = Buffer.alloc(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = dilate ? 0 : 255
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx
        const p = (yy < 0 || yy >= H || xx < 0 || xx >= W) ? 0 : s[yy * W + xx]
        v = dilate ? Math.max(v, p) : Math.min(v, p)
      }
      o[y * W + x] = v
    }
    return o
  }
  return passe(passe(source, true), false)
}

// ── La mesure qui décide ─────────────────────────────────────────────────────

/** Part des GRIS qui borde un noyau de trait, sur la page COMPOSÉE.
 *
 *  ⛔ Ce n'est PAS un détecteur de planche : les feuillets du tome I portent une
 *  grande masse grise faiblement adjacente, qui est le grain du papier, et le
 *  critère les rangerait à tort. Il ne se lit qu'après avoir écarté les planches
 *  pleine page, que leur nature suffit à désigner. */
export async function partDesGrisAuBordDuTrait(entree) {
  const { data, info } = await monocanal(sharp(entree))
  const W = info.width, H = info.height
  const pres = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[y * W + x] >= SEUIL_NOYAU) continue
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const yy = y + dy, xx = x + dx
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) pres[yy * W + xx] = 1
    }
  }
  let gris = 0, borde = 0
  for (let i = 0; i < W * H; i++) {
    if (data[i] < SEUIL_NOYAU || data[i] >= 235) continue
    gris++
    if (pres[i]) borde++
  }
  return { part: gris ? borde / gris : 0, masseGrise: gris / (W * H) }
}

// ── Les couches d'une page ───────────────────────────────────────────────────

/** Le masque de trait d'une page, extrait par `pdfimages` et gardé en cache.
 *
 *  ⚠️ Le masque se reconnaît à ses PROPRIÉTÉS — un seul canal, la plus grande
 *  définition des trois — et non à son rang dans la sortie de `pdfimages`, qui
 *  n'est garanti par rien.
 *
 *  ⚠️ `pdfimages` vient de poppler. Il n'est pas sur le PATH de Windows ; il est
 *  dans le WSL Ubuntu qui sert déjà Kraken, et la charte donne la recette. Le
 *  script accepte donc un dossier de couches déjà extraites. */
async function masqueDeTrait(pdf, page) {
  mkdirSync(DOSSIER_COUCHES, { recursive: true })
  const prefixe = `${DOSSIER_COUCHES}/p${page}`
  const deja = () => readdirSync(DOSSIER_COUCHES).filter(f => f.startsWith(`p${page}-`) && f.endsWith('.png'))
  if (deja().length === 0) {
    try {
      execFileSync('pdfimages', ['-f', String(page), '-l', String(page), '-png', pdf, prefixe], { stdio: 'ignore' })
    } catch {
      throw new Error(
        `couches de la page ${page} absentes, et \`pdfimages\` introuvable.\n`
        + `  Sous WSL : wsl -e bash -lc 'cd "/mnt/c/.../tmp/fillion-couches" && `
        + `pdfimages -f ${page} -l ${page} -png "<pdf>" p${page}'`
      )
    }
  }
  let choix = null
  for (const f of deja()) {
    const m = await sharp(`${DOSSIER_COUCHES}/${f}`).metadata()
    if (m.channels !== 1) continue
    if (!choix || m.width * m.height > choix.aire) choix = { fichier: `${DOSSIER_COUCHES}/${f}`, aire: m.width * m.height }
  }
  if (!choix) throw new Error(`aucune couche à un seul canal pour la page ${page}`)
  return choix.fichier
}

// ── Le détourage ─────────────────────────────────────────────────────────────

/** Le masque EST l'alpha. ⛔ Aucune normalisation de papier, aucun point noir,
 *  aucun champ plat, aucun liseré : ce que ces étapes combattaient vit dans une
 *  couche qu'on ne lit pas. */
export async function detourerDepuisMasque(masque, normalise, largeurServie = LARGEUR_SERVIE) {
  const m = await sharp(masque).metadata()
  const [nx0, ny0, nx1, ny1] = normalise
  const box = { left: Math.round(nx0 * m.width), top: Math.round(ny0 * m.height) }
  box.width = Math.round(nx1 * m.width) - box.left
  box.height = Math.round(ny1 * m.height) - box.top

  const brut = await monocanal(sharp(masque).extract(box))
  const W = brut.info.width, H = brut.info.height
  const trait = fermer(brut.data, W, H)

  const rgba = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    const a = trait[i]
    if (!a) continue
    const o = i * 4
    rgba[o] = ENCRE[0]; rgba[o + 1] = ENCRE[1]; rgba[o + 2] = ENCRE[2]; rgba[o + 3] = a
  }

  // ⚠️ La réduction vient APRÈS l'alpha, et c'est elle qui rend au trait bilevel
  //    son bord doux. Bâtir l'alpha en pleine définition puis réduire n'est un
  //    piège que sur une source en demi-teintes ; ici la source EST binaire.
  const reduit = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: Math.min(largeurServie, W), kernel: 'lanczos3' })
    .png().toBuffer()

  // Rogner SUR L'ALPHA. ⛔ Le seuil ne peut pas être « alpha >= 1 » : sous le
  // dessin traînent des pixels isolés, invisibles à l'œil, dont un seul ancre la
  // boîte. Un rang ne compte que s'il en porte trois à 8 ou plus.
  const a = await sharp(reduit).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const RW = a.info.width, RH = a.info.height
  const rangPlein = (horizontal, fixe) => {
    let n = 0
    const long = horizontal ? RW : RH
    for (let k = 0; k < long; k++) {
      const i = horizontal ? fixe * RW + k : k * RW + fixe
      if (a.data[i * 4 + 3] >= 8 && ++n >= 3) return true
    }
    return false
  }
  let haut = 0, bas = RH - 1, gauche = 0, droite = RW - 1
  while (haut < bas && !rangPlein(true, haut)) haut++
  while (bas > haut && !rangPlein(true, bas)) bas--
  while (gauche < droite && !rangPlein(false, gauche)) gauche++
  while (droite > gauche && !rangPlein(false, droite)) droite--
  const MARGE = 4
  const boite = { left: Math.max(0, gauche - MARGE), top: Math.max(0, haut - MARGE) }
  boite.width = Math.min(RW, droite + MARGE + 1) - boite.left
  boite.height = Math.min(RH, bas + MARGE + 1) - boite.top

  let vide = 0, partiels = 0, plein = 0
  for (let i = 0; i < RW * RH; i++) {
    const v = a.data[i * 4 + 3]
    if (!v) vide++; else if (v >= 235) plein++; else partiels++
  }

  // WebP SANS PERTE : le seau n'accepte que du WebP, et une compression avec
  // perte sur une couche alpha rouvrirait la bavure qu'on vient d'ôter.
  const image = sharp(reduit).extract(boite)
  const N = RW * RH
  return {
    webp: await image.clone().webp({ lossless: true, effort: 6 }).toBuffer(),
    png: await image.clone().png({ compressionLevel: 9 }).toBuffer(),
    largeur: boite.width,
    hauteur: boite.height,
    profil: { vide: 100 * vide / N, partiels: 100 * partiels / N, plein: 100 * plein / N },
  }
}

// ── Passe ────────────────────────────────────────────────────────────────────

/** Les bornes de la découpe, en fractions de la page. */
function normaliserDecoupe(boite) {
  if (!boite) return null
  if (Array.isArray(boite.normalized) && boite.normalized.length === 4) return boite.normalized
  const W = boite.page_width_px, H = boite.page_height_px
  if (!W || !H) return null
  const { left, top, right, bottom } = boite
  if ([left, top, right, bottom].some(v => typeof v !== 'number')) return null
  return [left / W, top / H, right / W, bottom / H]
}

const PDF = 'tmp/pdfs/fillion/lasaintebibletex07fill.pdf'

async function principal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  const db = createClient(url, cle)

  const { data, error } = await db
    .from('v_bible_edition_assets')
    .select('asset_key,asset_kind,public_uri,source_page_index,source_crop_box')
    .order('asset_key')
  if (error) throw new Error(`actifs illisibles : ${error.message}`)

  if (FABRIQUER) mkdirSync(DOSSIER_LOCAL, { recursive: true })
  const rapport = []
  for (const a of data) {
    // ⛔ Une PLANCHE ne se détoure jamais : c'est une page entière du volume,
    //    avec son filet gravé, sa légende imprimée et son papier.
    if (a.asset_kind === 'plate') {
      rapport.push({ cle: a.asset_key, regime: 'C', part: null, motif: 'planche pleine page' })
      continue
    }
    const source = Buffer.from(await (await fetch(a.public_uri)).arrayBuffer())
    const m = await partDesGrisAuBordDuTrait(source)
    if (m.part >= SEUIL_TRAME) {
      rapport.push({ cle: a.asset_key, regime: 'B', part: m.part, motif: 'les gris bordent le trait, la trame est de la structure' })
      continue
    }
    const ligne = { cle: a.asset_key, regime: 'A', part: m.part, motif: 'les gris flottent, la trame est perdue' }
    if (FABRIQUER) {
      // ⚠️ `normalized` manque sur une découpe (la proposition composite de
      //    Marc 4, 8). Elle se CALCULE des bornes absolues et des dimensions de
      //    page, toutes deux présentes : ce n'est pas deviner, c'est diviser.
      const n = normaliserDecoupe(a.source_crop_box)
      if (!n) {
        ligne.motif = '⚠️ découpe illisible : ni bornes normalisées, ni page mesurée'
      } else {
        const masque = await masqueDeTrait(PDF, a.source_page_index)
        const r = await detourerDepuisMasque(masque, n)
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
    }
    rapport.push(ligne)
  }

  for (const r of rapport) {
    const p = r.part === null ? '   —' : `${(100 * r.part).toFixed(0).padStart(3)} %`
    const dim = r.largeur ? `  ${String(r.largeur).padStart(3)}×${String(r.hauteur).padStart(3)}` : ''
    const prof = r.profil ? `  plein ${r.profil.plein.toFixed(1)} %  partiels ${r.profil.partiels.toFixed(1)} %` : ''
    console.log(`${r.regime}  ${r.cle.padEnd(38)} gris au bord du trait ${p}${dim}${prof}`)
  }
  const par = (g) => rapport.filter(r => r.regime === g).length
  console.log(`\nA ${par('A')} · B ${par('B')} · C ${par('C')}`)
  if (!FABRIQUER) console.log(`Mesure seule. \`--fabriquer\` écrit dans ${DOSSIER_LOCAL}, \`--televerser\` dépose la proposition.`)
}

if (process.argv[1].endsWith('detourer-gravures.mjs')) {
  principal().catch(e => { console.error(e.message); process.exit(1) })
}
