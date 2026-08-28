/**
 * La HAUTEUR de l'appel de note : 0,31 em, jamais `vertical-align: super`.
 *
 * Règle d'auteur du 28 août 2026. Le `super` du navigateur hisse l'appel à
 * 0,41 em au-dessus de la ligne de base (mesuré dans le texte de lecture) : le
 * chiffre flotte au-dessus des hampes. On lui substitue un décalage maîtrisé de
 * 0,31 em — la hauteur exacte de l'ordinal des siècles, déjà réglé ainsi.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-hauteur-appel-note-2026-08-28.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '⛔ **Jamais de pointillé sous un appel de note**'

const NOUVEAU = '⛔ **L’appel ne se hisse pas au-dessus des hampes.** Le `vertical-align: super` du navigateur le monte trop haut — 0,41 em au-dessus de la ligne de base, mesuré le 28 août 2026 dans le texte de lecture —, si bien que le chiffre flotte au-dessus du texte au lieu de s’y ranger. On lui donne un décalage MAÎTRISÉ de **0,31 em**, qui est exactement la hauteur de l’ordinal des siècles : un « XIIIᵉ » et un appel de note se lisent ainsi à la même hauteur dans la même ligne, et le haut du chiffre affleure les hampes. Cette hauteur se compte en em du TEXTE PORTEUR et vaut pour les trois variantes d’appel — un appel plus petit ne se lit pas plus bas, il se lit plus petit. Elle ne gonfle pas l’interligne, contrairement à `super`, et elle ne dépend pas de la balise employée.\n\n'

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

const n = data.valeur.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre « pointillé » : ${n} occurrence(s), 1 attendue.`)
if (data.valeur.includes('ne se hisse pas au-dessus des hampes')) throw new Error('règle déjà consignée.')
const texte = data.valeur.split(ANCRE).join(NOUVEAU + ANCRE)

console.log(JSON.stringify({ avant: data.valeur.length, apres: texte.length, delta: texte.length - data.valeur.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
