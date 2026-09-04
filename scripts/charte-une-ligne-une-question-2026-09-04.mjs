/**
 * § 38.16, complément : une ligne de menu répond à une SEULE question.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-une-ligne-une-question-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'UNE LIGNE DE MENU RÉPOND À UNE SEULE QUESTION'

// Ancre : la dernière phrase du § 38.16, recopiée de `parametres.charte_ia`.
const ANCRE = '« Latin » y vise une AUTRE adresse, donc un rendu serveur entier, quand les axes de la Bible se règlent le plus souvent sur place.'

const SECTION = `

⛔ **${MARQUE}** — quelle édition je lis —, et rien d’autre (relevé de l’auteur, le soir même : « ne pas afficher les dates de vie et de mort de l’auteur dans l’onglet de choix de la traduction dans le volet gauche »). « Traduction par René de Ceriziers (1603–1662), 1646 » portait DEUX empans de dates sur la même ligne, dont l’un ne dit rien de l’édition, et l’œil hésitait sur ce que le millésime désignait. ⚠️ **La fiche « À propos de cette édition » est l’endroit d’une notice ; un volet de lecture est l’endroit d’un choix.** Ce qui documente une édition et ce qui la désigne ne se composent pas au même endroit, et la même ligne ne peut pas faire les deux.

⚠️ **La donnée reste en base**, et c’est l’AFFICHAGE qui s’en passe : les dates vivent dans \`metadata\`, portées par les deux seuls textes du corpus à les avoir. ⛔ Mais la fonction qui les lisait est retirée, et la donnée a quitté la SIGNATURE du libellé — *une signature qui ne reçoit plus ce qu’elle ne doit plus afficher est une garde plus sûre qu’un test*, et une fonction que plus rien n’appelle est une seconde vérité qui attend.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_une_ligne_une_question'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
