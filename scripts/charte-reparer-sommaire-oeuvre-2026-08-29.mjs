/**
 * Le dernier paragraphe perdu du § 35.14 — « Il se compose comme le sommaire d'une
 * ŒUVRE ». Ma fenêtre d'extraction l'avait tronqué à la passe précédente ; la
 * comparaison paragraphe par paragraphe avec l'état d'avant l'écrasement l'a montré.
 *
 * ⛔ Le texte n'est pas recopié ici : il est LU dans le dépôt, au commit e0be912c,
 * dernier miroir d'avant l'écrasement. Recopier à la main, c'est risquer d'écrire
 * une variante de plus.
 *
 * Usage : node scripts/charte-reparer-sommaire-oeuvre-2026-08-29.mjs [--dry]
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')
const OUVERTURE = '**Il se compose comme le sommaire d’une ŒUVRE**'
const ANCRE = '⚠️ Le sommaire part dans la MÊME vague que les versets'

const miroirAvant = execFileSync('git', ['show', 'e0be912c:charte/CHARTE_IA.md'], { cwd: racine, encoding: 'utf8' }).replace(/\r/g, '')
const i = miroirAvant.indexOf(OUVERTURE)
if (i < 0) throw new Error('Le miroir d’avant ne porte pas ce paragraphe.')
const paragraphe = miroirAvant.slice(i, miroirAvant.indexOf('\n\n', i))

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes(OUVERTURE)) { console.log('Déjà restitué.'); process.exit(0) }

const debut = avant.indexOf(ANCRE)
if (debut < 0) throw new Error('ancre introuvable')
const fin = avant.indexOf('\n\n', debut)
const apres = avant.slice(0, fin) + '\n\n' + paragraphe + avant.slice(fin)

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, paragraphe: paragraphe.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Paragraphe restitué. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
