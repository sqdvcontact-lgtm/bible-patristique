/**
 * § 18 : l'étiquette du volet s'efface devant le nom, et l'ordre des questions.
 *
 * Décision de l'auteur du 31 août 2026, quelques heures après la précédente :
 * « supprime le mot "Traduction" ». Le paragraphe posé le matin même disait que
 * l'étiquette ne se comprime pas ; il n'y a plus d'étiquette, et la façon dont on y
 * est venu est ce qu'il faut garder.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-sans-etiquette-volet-2026-08-31.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '**L’étiquette est partie elle aussi**'

const ANCRE = '⚠️ L’étiquette ne se comprime pas et le NOM s’écrête par la fin : un nom coupé reste lisible — « Traduction officielle liturgi… » —, une étiquette rognée ne dit plus de quoi il s’agit.'

const REMPLACEMENT = `⛔ ${MARQUE} (le même jour : « supprime le mot “Traduction” »). Elle annonçait ce que le nom disait déjà, et le volet des pages patristiques n’a jamais écrit « Auteur » au-dessus du nom de l’auteur ; les deux volets se ressemblent enfin. ⚠️ Le nom s’écrête donc par la FIN sur la largeur de la carte — « Traduction officielle liturgi… » —, et les soixante-six pixels que l’étiquette rendait se voient : le plus long des neuf noms tenait entier à quatre cents pixels de volet, il tient désormais à deux cent soixante.

⚠️ **L’ordre des questions, et c’est ici la vraie leçon.** La veille, cette même ligne avait été CONDENSÉE : le lien y était monté à côté de l’étiquette pour ne plus occuper une ligne entière, et l’on avait mesuré au pixel le libellé qui devait s’y loger. Vingt-quatre heures plus tard, le lien et l’étiquette ont disparu tous les deux. ⛔ On avait donc resserré une ligne sans avoir demandé si elle devait exister, et la mesure fine était venue avant la question simple. **Devant un objet trop dense, demander d’abord ce qui peut PARTIR, ensuite seulement comment resserrer ce qui reste.**`

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
const apres = avant.split(ANCRE).join(REMPLACEMENT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// Sauvegarde de la ligne avant écriture, comme la charte l'exige.
const cleSauvegarde = 'charte_ia_sauvegarde_20260831_avant_sans_etiquette_volet'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
