/**
 * § 7 : la nature de segment `signature` entre au vocabulaire.
 *
 * Le code la promettait — importateurs, chargement, composition au fer à droite —
 * et `chk_segments_nature` la refusait : le rendu était du code mort et zéro segment
 * la portait. La contrainte est élargie (migration 20260829090000) ; la charte doit
 * le dire, sans quoi la table du § 7 ment sur le vocabulaire autorisé.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-nature-signature-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')
const ANCRE = '| `rubrique` |'
const AJOUT = '| `signature` | bloc de signatures fermant un volume — approbations, censeurs, souscripteurs : une suite de lignes courtes que l’édition compose au fer à droite. ⚠️ À distinguer d’`apparat_editeur`, qui porte le paratexte rédigé quand `signature` n’en porte que les noms et les qualités |\n'

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes('| `signature` |')) { console.log('Déjà au vocabulaire.'); process.exit(0) }
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(AJOUT + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
