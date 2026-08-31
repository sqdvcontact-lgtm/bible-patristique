/**
 * § 18 : l'aération d'un volet se mesure en rem, et un volet large en dit plus.
 *
 * Deux règles fixées par l'auteur le 31 août 2026 : « l'écartement et l'aération des
 * colonnes doivent être proportionnés à la taille de l'écran », et « j'aimerais avoir
 * plus de texte biographique sur grand écran, et aucun sur petit écran ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-echelle-volet-2026-08-31.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '⚠️ **Un libellé long s’écrit en DEUX formes, et l’on n’en montre qu’une.**'
const MARQUE = '**L’aération d’un volet se mesure en rem, jamais en pixels fixes**'

const AJOUT = `⛔ ${MARQUE} (décision de l’auteur, 31 août 2026 : « l’écartement et l’aération des colonnes doivent être proportionnés à la taille de l’écran »). La police racine du site est fluide — seize pixels jusqu’à mille quatre cent quarante de large, vingt-deux à deux mille quatre cents —, et tout ce qui s’écrit en rem la suit. Un blanc écrit en pixels ne la suit pas : sur un grand moniteur, le texte du volet grandissait d’un tiers pendant que ses gouttières ne bougeaient pas d’un pixel, si bien que le volet se SERRAIT à mesure qu’on lui donnait de la place. ⚠️ Le remède tient en une seule écriture : chaque mesure est un \`clamp\` dont le plancher et le plafond sont en rem — donc suivent l’écran — et dont le terme du milieu est en \`cqi\` — donc suit la poignée. Une même déclaration répond alors aux DEUX axes qu’un volet connaît, quand aucune des deux unités n’y suffit seule. ⛔ Le plancher vaut exactement ce que le volet portait avant : une échelle se pose sans déplacer l’état existant, sinon ce n’est pas une échelle, c’est une refonte.

⛔ **Un volet large en dit PLUS, et ce qu’il ajoute tient ENTIER** (décision de l’auteur, 31 août 2026 : « j’aimerais avoir plus de texte biographique sur grand écran, et aucun sur petit écran »). La carte de la traduction découvre ses textes l’un après l’autre à mesure que le volet s’élargit : le libellé entier du lien, puis la référence de l’édition, puis la notice du traducteur, jusque-là réservée à la fiche « En savoir plus ». ⚠️ Le seuil de chacun se MESURE, il ne se choisit pas : on compte les signes du texte le plus long, on compte ce qu’une ligne en porte à cette largeur, et le seuil est celui au-dessous duquel le texte serait coupé. Les neuf notices comptent de cent six à deux cent trente signes ; les deux plus longues tiennent en six lignes dès deux cent cinquante pixels de volet, et c’est de là qu’elles paraissent. ⛔ Rien ne se RETRANCHE en chemin : l’état de départ est celui du volet le plus étroit, et tout le reste s’y ajoute.

⚠️ **Un texte qu’aucune largeur ne porte entier ne se traite pas ainsi : c’est son NOMBRE DE LIGNES qui monte.** La référence d’édition compte de cent soixante à trois cent cinquante signes ; elle paraît sur deux lignes à deux cent soixante pixels, trois à trois cents, quatre à trois cent cinquante, et quatre lignes de trois cent cinquante pixels rendent enfin sept références sur neuf entières. Le premier seuil dit où elle cesse de ne rien dire ; ceux qui suivent disent où elle redevient une phrase.

`

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
const apres = avant.split(ANCRE).join(AJOUT + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// Sauvegarde de la ligne avant écriture, comme la charte l'exige.
const cleSauvegarde = 'charte_ia_sauvegarde_20260831_avant_echelle_volet'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
