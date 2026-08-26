/**
 * § 35.4 : le sous-titre d'une partie prend l'ENCRE de son titre, et le blanc
 * qui les sépare est chiffré. Décision de l'auteur du 26 août 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-sous-titre-encre-2026-08-26.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const AVANT = 'Deux rôles sont arrêtés. Le sous-titre d’une partie n’est pas un préambule mais le chapeau de son titre, tombé dans un bloc voisin par l’ordre matériel : il se centre sous lui, avec un blanc très faible avant et le blanc ordinaire après, et il n’ouvre aucun niveau au sommaire.'

const APRES = 'Deux rôles sont arrêtés. Le sous-titre d’une partie n’est pas un préambule mais le chapeau de son titre, tombé dans un bloc voisin par l’ordre matériel : il se centre sous lui, garde son italique, et il n’ouvre aucun niveau au sommaire. ⛔ Il prend l’ENCRE DE SON TITRE, non celle du texte second : une encre plus claire en faisait un commentaire du titre, quand il en est la suite. ⚠️ Et le blanc qui les sépare se chiffre — mesuré avant reprise, douze pixels entre les deux boîtes et trente-cinq entre les lignes de base, de quoi lire deux choses là où il n’y en a qu’une. Le titre rend donc sa marge basse à qui le suit : il reste trois pixels, vingt-six entre les lignes de base. Le blanc ordinaire revient après le sous-titre, non entre eux.'

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
