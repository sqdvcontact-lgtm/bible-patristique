// ── Inscrire ou contrôler le régime et la part des gravures Fillion ──────────
//
// `node --env-file=.env.local scripts/fillion/inscrire-regime-gravures.mjs`            → CONTRÔLE seul
// `node --env-file=.env.local scripts/fillion/inscrire-regime-gravures.mjs --ecrire`   → écrit ce qui diffère
// `node --env-file=.env.local scripts/fillion/inscrire-regime-gravures.mjs --seulement t02-1sa`
//
// ⛔ LA PAGE LIT `bible_edition_assets.regime` ET `.part_colonne` ; C'EST LA CHAÎNE
// QUI LES ÉCRIT. Ce script est la main de la chaîne pour un actif déjà en base :
// il recalcule les deux valeurs par la règle (`regime-gravure.mjs`) et dit où la
// base s'en écarte. Il ne les invente pas :
//
//   · le RÉGIME d'un actif qui a un fichier servi est celui que le fichier
//     RÉALISE (son profil de traitement). Un fichier détouré se compose en masque
//     et un fichier cadré est opaque : composer autrement que le fichier n'est
//     fabriqué rend un aplat d'encre ou un rectangle de papier. Sans fichier, la
//     règle de la largeur imprimée et de la légende s'applique ;
//   · la PART suit la largeur imprimée, quelle que soit la chaîne qui a découpé.
//
// ⚠️ La base REFUSE un actif sans ces deux colonnes : un script de charge qui les
// oublie échoue à l'insertion, ce qui est voulu. Il les prend de `regimeEtPart`.

import { createClient } from '@supabase/supabase-js'

import { largeurImprimee, partColonne, regimeDuProfil, regimeGravure } from './regime-gravure.mjs'

const ECRIRE = process.argv.includes('--ecrire')
const SEULEMENT = (() => {
  const i = process.argv.indexOf('--seulement')
  return i >= 0 ? process.argv.slice(i + 1).filter(a => !a.startsWith('--')) : null
})()

async function principal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  const db = createClient(url, cle, { auth: { persistSession: false } })

  const { data: actifs, error } = await db
    .from('bible_edition_assets')
    .select('id,asset_key,asset_kind,scope_book_code,source_crop_box,printed_caption,metadata,regime,part_colonne')
    .order('asset_key')
  if (error) throw new Error(`actifs illisibles : ${error.message}`)
  const { data: fichiers, error: e2 } = await db
    .from('bible_edition_asset_files')
    .select('asset_id,processing_profile,width_px')
    .eq('variant_role', 'web')
  if (e2) throw new Error(`fichiers illisibles : ${e2.message}`)
  const webParActif = new Map(fichiers.map(f => [f.asset_id, f]))

  const ecarts = []
  let vus = 0
  for (const a of actifs) {
    if (SEULEMENT && !SEULEMENT.some(m => a.asset_key.includes(m))) continue
    vus++
    const web = webParActif.get(a.id)
    const regime = regimeDuProfil(web?.processing_profile)
      ?? regimeGravure({ assetKind: a.asset_kind, decoupe: a.source_crop_box, legende: a.printed_caption, metadata: a.metadata })
    const largeur = largeurImprimee(a.source_crop_box, a.metadata)
    const part = partColonne(regime, largeur)
    const partEnBase = a.part_colonne === null ? null : Number(a.part_colonne)
    const memeRegime = a.regime === regime
    const memePart = partEnBase !== null && Math.abs(partEnBase - part) < 0.0005
    if (memeRegime && memePart) continue
    ecarts.push({ a, regime, part, largeur, web })
  }

  console.log(`${vus} actif(s) contrôlé(s), ${ecarts.length} écart(s).`)
  for (const { a, regime, part, largeur, web } of ecarts) {
    const l = largeur === null ? '—' : largeur.toFixed(3)
    console.log(`  ${a.asset_key.padEnd(30)} base ${String(a.regime).padEnd(10)} ${a.part_colonne ?? '—'}  →  règle ${regime.padEnd(10)} ${part.toFixed(3)}  (largeur imprimée ${l}, fichier ${web?.processing_profile ?? 'aucun'} ${web?.width_px ?? ''})`)
  }
  if (!ECRIRE || ecarts.length === 0) {
    if (ecarts.length) console.log('Rien n’est écrit : passer `--ecrire` pour inscrire la règle.')
    return
  }
  for (const { a, regime, part } of ecarts) {
    const { error: e3 } = await db.from('bible_edition_assets').update({ regime, part_colonne: part }).eq('id', a.id)
    if (e3) throw new Error(`écriture refusée pour ${a.asset_key} : ${e3.message}`)
  }
  console.log(`${ecarts.length} actif(s) inscrit(s).`)
}

principal().catch(e => { console.error(e.message); process.exit(1) })
