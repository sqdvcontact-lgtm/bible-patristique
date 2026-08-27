/**
 * § 37 : clair ne veut pas dire blanc. La clarté du ton d'une fiche descend de
 * 96,5 % à 91 %, mesuré sur le blanc de la carte. Décision de l'auteur du
 * 27 août 2026, après qu'il n'a rien vu paraître.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-ton-clarte-visible-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const AVANT = 'La teinte se pose en ligne, en deux propriétés personnalisées ; les deux clartés sont écrites une fois pour toutes dans la feuille globale, une par thème.'

const APRES = 'La teinte se pose en ligne, en deux propriétés personnalisées ; les deux clartés sont écrites une fois pour toutes dans la feuille globale, une par thème. ⚠️ CLAIR ne veut pas dire BLANC. La clarté du Clair a d’abord été posée à 96,5 %, par crainte de salir la fiche : il n’en restait, sur le blanc de la carte, qu’un écart de six à douze valeurs sur deux cent cinquante-cinq, et l’auteur ne voyait rien paraître. À 91 % le ton se voit sans que la fiche cesse d’être claire — la Bible de Sacy y donne un ivoire chaud, rgb(240 233 224), qui s’accorde à la terre cuite de son portrait.'

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
const n = avant.split(AVANT).length - 1
if (n !== 1) throw new Error(`motif : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(AVANT).join(APRES)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
