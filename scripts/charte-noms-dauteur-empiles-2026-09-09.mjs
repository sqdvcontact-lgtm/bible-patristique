/**
 * § 16.11 : deux régimes pour nommer des co-auteurs, et l'empilement n'a pas de « et ».
 *
 * Décision de l'auteur du 9 septembre 2026 : « le "et" entre les deux noms d'auteur est
 * immonde ; s'en passer. le supprimer, simplement. » — dit du volet de gauche de la page
 * d'œuvre, où `NomVolet` se compose en bloc et où la conjonction tombait seule au milieu
 * de la colonne.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-noms-dauteur-empiles-2026-09-09.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '**Les noms EMPILÉS ne prennent pas de conjonction**'

const ANCRE = 'Le lecteur voit la même chose d\'où qu\'il vienne.'

const REMPLACEMENT = `${ANCRE}

⛔ ${MARQUE} (décision de l’auteur, 9 septembre 2026 : « le “et” entre les deux noms d’auteur est immonde ; s’en passer »). La mise en page décide, et il y a deux régimes. Quand les noms COURENT EN LIGNE — carte de la bibliothèque, fiche d’édition, citation, titre de la page —, ils s’énumèrent à la française : virgules, puis « et » devant le dernier. Quand ils s’EMPILENT, chacun sur sa ligne, rien ne les sépare : la succession les lie déjà. Le volet de gauche de la page d’œuvre relève du second régime, car `+"`NomVolet`"+` se compose en bloc ; la conjonction y tombait donc seule au milieu de la colonne, sans rien à joindre. ⚠️ `+"`separateurAuteurs`"+` ne sert que le premier régime : l’appeler dans une colonne de blocs, c’est y remettre le « et ».`

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
const cleSauvegarde = 'charte_ia_sauvegarde_20260909_avant_noms_empiles'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
