/**
 * § 46 : la Polyglotte présente la recherche d'un livre. Demande de l'auteur du
 * 6 septembre 2026 au soir — c'était elle, et non celle de la barre, qu'il visait.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-visite-poly-recherche-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'compte huit arrêts : la recherche du site, le nombre de colonnes, la recherche d’un livre'

const ANCRE = '**La visite de la Polyglotte** compte sept arrêts : la recherche du site, le nombre de colonnes, le choix du passage, l’en-tête où l’on change de bible, la rangée et sa double numérotation, les actions d’une cellule, la colonne des notes. ⚠️ Le nombre de colonnes précède le passage, et c’est la règle d’ordre appliquée : mesuré sur la page servie, le bloc des traductions visibles ouvre le volet à 154 px du haut quand la liste des livres n’y vient qu’à 354. ⛔ Elle ne dit rien de la recherche d’un livre, qui est le champ de la Bible classique mot pour mot, le volet étant partagé ; ni des versets surnuméraires, et c’est un arbitrage : ils ne paraissent que sur une minorité de chapitres, et une étape qui s’efface coûte à tout le monde l’attente qu’il faut pour constater son absence.'

const TEXTE = '**La visite de la Polyglotte** compte huit arrêts : la recherche du site, le nombre de colonnes, la recherche d’un livre, le choix du passage, l’en-tête où l’on change de bible, la rangée et sa double numérotation, les actions d’une cellule, la colonne des notes. ⚠️ Le volet se descend dans l’ordre où il se VOIT, et c’est la règle d’ordre appliquée : mesuré sur la page servie, le bloc des traductions visibles ouvre le volet à 154 px du haut, le champ de recherche vient à 308, la liste des livres à 354. ⛔ Elle ne dit rien des versets surnuméraires, et c’est un arbitrage : ils ne paraissent que sur une minorité de chapitres, et une étape qui s’efface coûte à tout le monde l’attente qu’il faut pour constater son absence.\n\n⚠️ **Un même champ ne se présente pas deux fois de la même façon.** La recherche d’un livre est le champ de la Bible classique, au repère près, les deux pages partageant leur volet ; mais ce qu’elle FAIT diffère, et l’étape le dit : sur la Polyglotte, une référence n’emmène pas ailleurs, elle vise le verset dans le tableau. Une étape se règle sur ce que la chose fait ICI, non sur le composant qui la dessine.'

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
if (n !== 1) throw new Error('ancre : ' + n + ' occurrence(s), 1 attendue.')
const apres = avant.split(ANCRE).join(TEXTE)

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_poly_recherche'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
