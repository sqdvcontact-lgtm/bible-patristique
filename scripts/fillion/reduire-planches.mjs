// ── Les PLANCHES hors-texte : les ramener au double de leur affichage ────────
//
// `node --env-file=.env.local scripts/fillion/reduire-planches.mjs`               → MESURE seule
// `node --env-file=.env.local scripts/fillion/reduire-planches.mjs --fabriquer`   → écrit dans tmp/
// `node --env-file=.env.local scripts/fillion/reduire-planches.mjs --televerser`  → remplace le web
//
// ⛔ POURQUOI CE SCRIPT EXISTE. `detourer-gravures.mjs` saute les planches — « une
// planche ne se détoure jamais » — et les leur laissait donc telles que leur
// chaîne d'origine les avait faites : 1273 à 1600 px pour 440 affichés, soit
// jusqu'à 3,64×, là où la règle veut le DOUBLE au plus (charte § 35.16.5). Deux
// réductions successives moyennent le trait en un gris mou, et c'est exactement le
// défaut que la règle existe pour empêcher.
//
// ⛔ ON REPART DU MASTER, jamais du fichier servi. Le master est le tirage neutre
// gardé pour cela : redériver depuis un fichier déjà réduit et rattrapé
// empilerait deux rattrapages.
//
// ⛔ ET IL NETTOIE LE PAPIER, QUI NE L'AVAIT JAMAIS ÉTÉ. La chaîne 1.2.0 ne posait
// aucun étalement : le pic de papier de ces planches plafonne à 225-245 au lieu de
// 255, et il n'est pas le MÊME d'une planche à l'autre. Posées dans une page, elles
// paraissent sales — relevé par l'auteur sur la Genèse — et pour une raison qui se
// mesure : leur papier est plus SOMBRE que le passe-partout du site (237), quand un
// tirage doit être plus clair que son montage.
//
// ⚠️ CE SCRIPT NE TOUCHE TOUJOURS PAS AU TON. Les 32 planches vont d'une moyenne de
// 119 à 205 : ce sont des sujets différents, et la puissance de `creuserLesTons` y
// serait posée sans avoir regardé chacune. Le blanc de papier est une remise à
// l'échelle, pas un parti — c'est ce qui l'autorise ici.
//
// ⚠️ Le MASTER de ces planches ne porte pas cet étalement, à la différence de ceux
// du tome VII, et l'on ne peut pas le lui donner : les feuillets JP2 du tome I ne
// sont pas sur le disque. C'est une dette connue ; le script étant déterministe,
// une redérivation le repose à l'identique.

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

// ⛔ Ces trois nombres sont ceux de `app/lib/bibleEdition.ts`, par
//    `partIllustration('hors-texte')` et `largeurServie`. Les changer là-bas
//    oblige à rejouer ce script, sans quoi la page composerait à une taille et le
//    fichier serait fabriqué pour une autre.
const MESURE_COLONNE = 500
const PART_HORS_TEXTE = 0.88
const LARGEUR_SERVIE = Math.round(2 * PART_HORS_TEXTE * MESURE_COLONNE)   // 880

/** Le rattrapage du TON CONTINU, bridé : voir `detourer-gravures.mjs`, où la
 *  mesure qui le fixe est écrite. Les deux fichiers doivent dire la même chose. */
const NETTETE_TON = { sigma: 1.3, m1: 0, m2: 3, y2: 4, y3: 5 }

/** ⛔ LE PLANCHER DIT CE QUI EST DU PAPIER — il ne dit pas ce qu'on blanchit.
 *
 *  Il est celui de la rampe alpha (charte § 35.16.1) et se mesure de la même façon :
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

function bornesDuPapier(gris, total) {
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
 *  seul le témoin le dit, et c'est pour cela qu'on le mesure (§ 35.16.15).
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
const RAYON_ENCRE = 3
const MARGE_ENCRE = 45

/** Dilate un masque booléen par une fenêtre carrée, en deux passes SÉPARABLES :
 *  sans cela le voisinage coûterait 49 lectures par pixel, soit près de six cents
 *  millions d'opérations sur une planche de 2 959 px de large. */
function dilater(masque, W, H, rayon) {
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

/** ⛔ ON NE ROGNE PAS LES PLANCHES : ELLES LE SONT DÉJÀ (mesuré le 2026-09-02).
 *  Un rognage à la boîte de l'encre a été écrit puis retiré le jour même : sur les
 *  trente-deux planches du tome I, l'encre occupe 96 à 100 % du fichier servi, les
 *  marges de papier ayant été ôtées à la fabrication du master. Ce qui fait paraître
 *  une planche petite, c'est son format PAYSAGE dans une colonne de 500 px, et cela
 *  se règle au rendu (la planche hors-texte prend la mesure de la page, voir
 *  `.cs-bible-gravure--hors-texte` dans globals.css), pas dans le fichier. */

/** Le nettoyage, sur le gris À PLEINE RÉSOLUTION : la moucheture s'efface AVANT la
 *  réduction, sinon la moyenne l'étale au lieu de la retirer. */
async function nettoyerLePapier(png) {
  const r = await sharp(png).removeAlpha().toColourspace('b-w')
    .raw().toBuffer({ resolveWithObject: true })
  if (r.info.channels !== 1) throw new Error('canal unique attendu')
  const W = r.info.width, H = r.info.height, total = W * H
  const { pic, plancher, noir } = bornesDuPapier(r.data, total)

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
    if (r.data[i] >= plancher && !proche[i]) { out[i] = 255; blanchis++ }
  }

  return {
    png: await sharp(out, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer(),
    pic, plancher, noir, blanchis: 100 * blanchis / total,
  }
}

const SEAU_MASTER = 'bible-illustrations-master'
const SEAU_WEB = 'bible-illustrations-web'
const DOSSIER_LOCAL = 'tmp/fillion-planches'
const VERSION = '4.5.1'

const FABRIQUER = process.argv.includes('--fabriquer')
const TELEVERSER = process.argv.includes('--televerser')
// ⛔ `--seulement t01` : les « planches » du tome II (1 Samuel) sont servies par la
//    chaîne des vignettes (`detourer-gravures.mjs`, 4.8.0) à leur largeur imprimée ;
//    les repasser ici les regonflerait à 880 px. Sans filtre, on refuse de téléverser.
const SEULEMENT = process.argv.includes('--seulement') ? process.argv[process.argv.indexOf('--seulement') + 1] : null
if (TELEVERSER && !SEULEMENT) throw new Error('--televerser exige --seulement <préfixe de clé>, par exemple t01')

async function principal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  const db = createClient(url, cle)

  const { data: actifs, error: e0 } = await db
    .from('bible_edition_assets').select('id,asset_key,asset_kind').eq('asset_kind', 'plate')
  if (e0) throw new Error(`actifs illisibles : ${e0.message}`)
  const parId = new Map(actifs.map((a) => [a.id, a.asset_key]))

  const { data: fichiers, error: e1 } = await db
    .from('bible_edition_asset_files')
    .select('asset_id,variant_role,storage_bucket,storage_path,width_px,height_px,byte_size')
    .in('asset_id', actifs.map((a) => a.id))
  if (e1) throw new Error(`fichiers illisibles : ${e1.message}`)

  const web = new Map(fichiers.filter((f) => f.variant_role === 'web').map((f) => [f.asset_id, f]))
  const master = new Map(fichiers.filter((f) => f.variant_role === 'master').map((f) => [f.asset_id, f]))

  if (FABRIQUER || TELEVERSER) mkdirSync(DOSSIER_LOCAL, { recursive: true })

  let avant = 0, apres = 0, faits = 0
  const lignes = [...web.keys()].filter((id) => !SEULEMENT || (parId.get(id) ?? '').startsWith(`fillion-${SEULEMENT}-`)).sort((a, b) => (parId.get(a) ?? '').localeCompare(parId.get(b) ?? ''))
  console.log('planche'.padEnd(16), 'servi'.padStart(6), 'rapport'.padStart(8), '→', 'neuf'.padStart(6), 'poids'.padStart(18))

  for (const id of lignes) {
    const w = web.get(id), m = master.get(id)
    const nom = parId.get(id) ?? String(id)
    if (!m) { console.log(nom.padEnd(16), '⛔ pas de master : on ne redérive pas depuis le fichier servi'); continue }

    const { data: blob, error: e2 } = await db.storage.from(m.storage_bucket).download(m.storage_path)
    if (e2) { console.log(nom.padEnd(16), '⛔ master illisible :', e2.message); continue }
    const src = Buffer.from(await blob.arrayBuffer())

    // ⛔ Le papier se nettoie AVANT la réduction, à pleine résolution.
    const propre = await nettoyerLePapier(src)
    // ⚠️ `withoutEnlargement` : un master plus étroit que la cible ne s'agrandit
    //    jamais — on servirait des pixels inventés par un rééchantillonnage.
    const rendu = await sharp(propre.png)
      .resize({ width: LARGEUR_SERVIE, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
      .sharpen(NETTETE_TON)
      .png().toBuffer()
    const webp = await sharp(rendu).webp({ quality: 90, effort: 6 }).toBuffer()
    const meta = await sharp(rendu).metadata()

    avant += w.byte_size; apres += webp.length; faits++
    console.log(
      nom.replace('fillion-t01-', '').padEnd(16),
      String(w.width_px).padStart(6), ((w.width_px / (PART_HORS_TEXTE * MESURE_COLONNE)).toFixed(2) + '×').padStart(8), '→',
      String(meta.width).padStart(6),
      (Math.round(w.byte_size / 1024) + ' → ' + Math.round(webp.length / 1024) + ' Ko').padStart(18),
      '· papier', String(propre.pic).padStart(3), '→ plancher', String(propre.plancher).padStart(3),
      '· blanchi', (propre.blanchis.toFixed(0) + ' %').padStart(5))

    if (FABRIQUER || TELEVERSER) writeFileSync(`${DOSSIER_LOCAL}/${nom}.webp`, webp)

    if (TELEVERSER) {
      const { error: e3 } = await db.storage.from(SEAU_WEB)
        .upload(w.storage_path, webp, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' })
      if (e3) throw new Error(`web refusé pour ${nom} : ${e3.message}`)
      // ⛔ LA BASE DOIT DIRE CE QUI EST SERVI : la page compose sur ces dimensions.
      const { error: e4 } = await db.from('bible_edition_asset_files').update({
        width_px: meta.width,
        height_px: meta.height,
        byte_size: webp.length,
        mime_type: 'image/webp',
        sha256: createHash('sha256').update(webp).digest('hex'),
        processing_profile: 'fillion-planche-hors-texte',
        processing_version: VERSION,
        updated_at: new Date().toISOString(),
      }).eq('asset_id', id).eq('variant_role', 'web')
      if (e4) throw new Error(`report refusé pour ${nom} : ${e4.message}`)
    }
  }

  console.log(`\n${faits} planches · ${(avant / 1048576).toFixed(1)} Mio → ${(apres / 1048576).toFixed(1)} Mio`)
  if (!FABRIQUER && !TELEVERSER) console.log('Mesure seule. `--fabriquer` écrit dans ' + DOSSIER_LOCAL + ', `--televerser` remplace le web.')
}

principal().catch((e) => { console.error(e.message); process.exit(1) })
