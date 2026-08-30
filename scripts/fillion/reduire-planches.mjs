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
// ⚠️ CE SCRIPT NE TOUCHE PAS AU TON. Les 32 planches vont d'une moyenne de 119 à
// 205 : ce sont des sujets différents sur un papier différent de celui du tome VII,
// et la puissance de `creuserLesTons` y serait posée sans avoir regardé chacune.
// La question du ton d'une planche reste ouverte.

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

const SEAU_MASTER = 'bible-illustrations-master'
const SEAU_WEB = 'bible-illustrations-web'
const DOSSIER_LOCAL = 'tmp/fillion-planches'
const VERSION = '4.3.0'

const FABRIQUER = process.argv.includes('--fabriquer')
const TELEVERSER = process.argv.includes('--televerser')

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
  const lignes = [...web.keys()].sort((a, b) => (parId.get(a) ?? '').localeCompare(parId.get(b) ?? ''))
  console.log('planche'.padEnd(16), 'servi'.padStart(6), 'rapport'.padStart(8), '→', 'neuf'.padStart(6), 'poids'.padStart(18))

  for (const id of lignes) {
    const w = web.get(id), m = master.get(id)
    const nom = parId.get(id) ?? String(id)
    if (!m) { console.log(nom.padEnd(16), '⛔ pas de master : on ne redérive pas depuis le fichier servi'); continue }

    const { data: blob, error: e2 } = await db.storage.from(m.storage_bucket).download(m.storage_path)
    if (e2) { console.log(nom.padEnd(16), '⛔ master illisible :', e2.message); continue }
    const src = Buffer.from(await blob.arrayBuffer())

    // ⚠️ `withoutEnlargement` : un master plus étroit que la cible ne s'agrandit
    //    jamais — on servirait des pixels inventés par un rééchantillonnage.
    const rendu = await sharp(src)
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
      (Math.round(w.byte_size / 1024) + ' → ' + Math.round(webp.length / 1024) + ' Ko').padStart(18))

    if (FABRIQUER || TELEVERSER) writeFileSync(`${DOSSIER_LOCAL}/${nom}.webp`, webp)

    if (TELEVERSER) {
      const { error: e3 } = await db.storage.from(SEAU_WEB)
        .upload(w.storage_path, webp, { contentType: 'image/webp', upsert: true })
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
      }).eq('asset_id', id).eq('variant_role', 'web')
      if (e4) throw new Error(`report refusé pour ${nom} : ${e4.message}`)
    }
  }

  console.log(`\n${faits} planches · ${(avant / 1048576).toFixed(1)} Mio → ${(apres / 1048576).toFixed(1)} Mio`)
  if (!FABRIQUER && !TELEVERSER) console.log('Mesure seule. `--fabriquer` écrit dans ' + DOSSIER_LOCAL + ', `--televerser` remplace le web.')
}

principal().catch((e) => { console.error(e.message); process.exit(1) })
