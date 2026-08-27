/**
 * § 34 : les deux lignes du frontispice tiennent le même ton, à un pas d'écart,
 * et le pas se prend en mêlant l'accent au papier.
 * Décision de l'auteur du 27 août 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-frontispice-tons-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Un cran plus doux la remet à sa place d’enseigne.'

const AJOUT = `

⚠️ **Les deux lignes qui suivent le titre du frontispice tiennent le MÊME TON, à un pas d’écart.** La devise — « Lectures bibliques et patristiques » — porte le vert d’accent ; la mention qui la suit — « Somme collaborative » — portait \`--cs-etiquette\`, un khaki doré. Deux familles de couleur étrangères l’une à l’autre, empilées à trois lignes d’intervalle : le couple sonnait faux. ⛔ La forme d’étiquette ne commande pas le jeton d’étiquette.

⚠️ **Le pas se prend en MÊLANT l’accent au papier, jamais en écrivant une valeur.** Au Cuir, où le vert d’accent vire à l’or et le papier au brun, le même calcul rend le même rapport ; une valeur écrite aurait tenu au Clair et détonné au sombre. Et la quantité d’accent se règle pour que la ligne garde EXACTEMENT le poids qu’elle avait : on change sa famille, non sa place dans la hiérarchie.`

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
if (avant.includes('tiennent le MÊME TON')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
