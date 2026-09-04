/**
 * § 38.3, suite : l'encre d'une colonne déjà prise descend d'un rang.
 *
 * Demande de l'auteur du 4 septembre 2026, au soir : « dans le menu déroulant de
 * choix des traductions, griser un peu plus le texte des non disponibles ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-gris-traduction-prise-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'ET CETTE ENCRE DESCEND D’UN RANG'

// Ancre : la dernière phrase du paragraphe sur le grisement, recopiée de
// `parametres.charte_ia` (apostrophes droites, comme la base les porte).
const ANCRE = "Le fait se dit dans l'ENCRE du nom et de sa date ; le fond du menu reste d'une seule teinte, où l'accent ne désigne que la ligne retenue."

const SECTION = `

⚠️ **${MARQUE}** (« griser un peu plus le texte des non disponibles »). Le fond retiré, l'encre reste SEULE à porter le fait, et le rang qui suffisait quand un aplat l'accompagnait ne suffit plus : le nom prend l'encre du sous-titre d'une ligne ordinaire, et la ligne entière recule d'un cran. ⛔ **Pas deux rangs** : la ligne reste CLIQUABLE — la choisir échange les deux colonnes — et une ligne qu'on ne lit plus n'est plus une option ; le rang le plus ténu est d'ailleurs le plancher de l'échelle, et la date y est déjà. ⚠️ Sa hiérarchie interne tient alors par le CORPS et la POLICE, non par l'encre : un sérif de treize pixels sur un sans de dix se distingue sans qu'on l'y aide.

⚠️ **Règle générale, et c'est la rectification du même jour prise par l'autre bout : retirer un ornement DÉCHARGE ce qui reste, et ce qui reste doit alors en porter davantage.** On avait mesuré ce qu'on enlevait ; on n'avait pas remesuré ce qui restait seul. Un état qui se disait par deux moyens ne se dit pas de la même façon quand il n'en garde qu'un.`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes(MARQUE)) { console.log('Déjà posé.'); process.exit(0) }

const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_gris_traduction_prise'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
