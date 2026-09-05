/**
 * § 43.2, complément : la RELECTURE de la page reprend la normalisation de la base.
 *
 * Relevé sur le site le 6 septembre 2026, une heure après la mise en ligne du § 43 :
 * la base rendait 3 249 versets pour « était », la page n'en gardait que 2 153.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-relecture-normalisee-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'LA RELECTURE DE LA PAGE REPREND LA NORMALISATION DE LA BASE'

const ANCRE = '⛔ **La frontière de mot que la page relit est celle de la base** : tout ce qui n’est ni lettre ni chiffre. Une liste de séparateurs écrite à la main finit par en oublier un, et ce qu’elle oublie, elle le jette.'

const SECTION = ANCRE + `

⛔ **LA RELECTURE DE LA PAGE REPREND LA NORMALISATION DE LA BASE, règle par règle.** La page relit chaque ligne rendue pour dire quelles bibles portent le mot et où le marquer ; si elle ne normalise pas comme la base, elle rejette ce que la base a trouvé. Relevé sur le site une heure après la mise en ligne de ce paragraphe : **3 249 versets rendus pour « était », 2 153 gardés** — les 1 096 où seule Sacy porte le mot, sous la graphie « étoit », étaient jetés par une relecture qui ne connaissait que les accents et la casse. Les règles de graphie ancienne de \`norm_fr\` sont donc reprises dans la relecture (« oit » → « ait », « oient » → « aient », « connoître » → « connaître », « foible » → « faible »), et toute règle qui entrerait dans \`norm_fr\` s’y reporte. ⚠️ Seules les règles qui GARDENT LA LONGUEUR du mot y entrent : le marquage retrouve ses positions dans le texte d’origine par leur index dans le texte replié, et une substitution qui allonge ou raccourcit — « tems » → « temps », « enfans » → « enfants », « sçav » → « sav » — décalerait tout ce qui suit. Ces trois-là restent à la base seule : trois mots dont la relecture peut manquer, jamais une position fausse. *Une garde s’éprouve en réintroduisant le défaut ; ici, c’est le site qui l’a fait.*

⚠️ **En famille, la marque couvre le mot fléchi entier** : « aimait », non « aim ». La racine sert à trouver, le mot à montrer.`

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
const apres = avant.split(ANCRE).join(SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_relecture_normalisee'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
