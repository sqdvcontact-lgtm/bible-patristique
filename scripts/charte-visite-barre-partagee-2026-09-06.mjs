/**
 * § 46 : l'arrêt de la barre est PARTAGÉ par toutes les visites, et la Polyglotte
 * prend l'ordre de sa page. Demande de l'auteur du 6 septembre 2026, au soir.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-visite-barre-partagee-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'L’ARRÊT DE LA BARRE EST PARTAGÉ PAR TOUTES LES VISITES'

const RETOUCHES = [
  {
    nom: 'partage',
    ancre: '⛔ **LE VOILE PASSE AU-DESSUS DE LA BARRE DE NAVIGATION**, et il le doit.',
    texte: [
      '⛔ **L’ARRÊT DE LA BARRE EST PARTAGÉ PAR TOUTES LES VISITES, et il ne se recopie pas.** La barre est la seule chose qui ne change pas d’une page à l’autre : son étape s’écrit une fois et chaque scénario l’ouvre en tête. Deux exemplaires d’une même explication divergeraient au premier ajustement, et le lecteur qui ferait deux visites lirait deux fois la même chose de deux façons. ⚠️ Elle ne se répète pas pour autant : chaque page ne montre la sienne qu’une fois, et rien ne dit qu’un lecteur passera par la Bible classique avant d’ouvrir la Polyglotte.',
      '',
      '⛔ **LE VOILE PASSE AU-DESSUS DE LA BARRE DE NAVIGATION**, et il le doit.',
    ].join('\n'),
  },
  {
    nom: 'polyglotte',
    ancre: '**La visite de la Polyglotte** compte six arrêts : le choix du passage, le nombre de colonnes, l’en-tête où l’on change de bible, la rangée et sa double numérotation, les actions d’une cellule, la colonne des notes. ⛔ Elle ne dit rien des versets surnuméraires, et c’est un arbitrage : ils ne paraissent que sur une minorité de chapitres, et une étape qui s’efface coûte à tout le monde l’attente qu’il faut pour constater son absence.',
    texte: '**La visite de la Polyglotte** compte sept arrêts : la recherche du site, le nombre de colonnes, le choix du passage, l’en-tête où l’on change de bible, la rangée et sa double numérotation, les actions d’une cellule, la colonne des notes. ⚠️ Le nombre de colonnes précède le passage, et c’est la règle d’ordre appliquée : mesuré sur la page servie, le bloc des traductions visibles ouvre le volet à 154 px du haut quand la liste des livres n’y vient qu’à 354. ⛔ Elle ne dit rien de la recherche d’un livre, qui est le champ de la Bible classique mot pour mot, le volet étant partagé ; ni des versets surnuméraires, et c’est un arbitrage : ils ne paraissent que sur une minorité de chapitres, et une étape qui s’efface coûte à tout le monde l’attente qu’il faut pour constater son absence.',
  },
]

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

let apres = avant
for (const r of RETOUCHES) {
  const n = apres.split(r.ancre).length - 1
  if (n !== 1) throw new Error('ancre ' + r.nom + ' : ' + n + ' occurrence(s), 1 attendue.')
  apres = apres.split(r.ancre).join(r.texte)
}

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_barre_partagee'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
