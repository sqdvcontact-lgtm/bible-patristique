/**
 * § 46 : la visite de la RECHERCHE, la sixième. Demande de l'auteur du 7 septembre
 * 2026, sur proposition : c'est la page dont le rapport entre ce qu'on voit et ce
 * qu'il faut savoir était le plus mauvais du site.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node --env-file=.env.local scripts/charte-visite-recherche-2026-09-07.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'La visite de la RECHERCHE'

const ANCRE = '**La visite d’une ŒUVRE** compte sept arrêts'

const TEXTE = [
  '**La visite de la RECHERCHE** compte six arrêts, et c’est la page où le rapport entre ce qu’on voit et ce qu’il faut savoir était le plus mauvais du site. Elle dit ce que nulle part ailleurs on ne peut lire : qu’il y a TROIS façons de chercher et que « Famille de mots » trouve un mot sous toutes ses formes ; qu’on peut chercher dans toutes les bibles et lire le résultat dans une seule ; qu’une recherche se garde avec sa page et sa position ; que les quatre onglets ne font que TROIS corpus, la Polyglotte étant une autre vue sur les mêmes versets ; et que chaque ligne de la répartition RESTREINT les résultats au lieu de les compter seulement.',
  '',
  '⚠️ **UN ARRÊT NE RÉPÈTE PAS UNE INFOBULLE, il dit qu’elle existe.** Le « ? » du mode de recherche donne déjà le détail des trois modes ; l’arrêt ne le recopie donc pas, il nomme les trois et dit lequel sert à quoi. C’est la règle « on n’explique pas ce qui est déjà écrit », prise par son autre bout : ce qui est écrit DERRIÈRE UN SURVOL n’est pas écrit à l’écran, et une visite est faite pour le montrer.',
  '',
  '⛔ **RIEN SUR CE QUI N’EXISTE QUE DANS UN CAS.** Une référence tapée ne lance aucune recherche : la page pose une carte « Passage biblique » et s’arrête là. Le fait mérite d’être su, mais cette carte n’existe QUE dans ce cas, donc jamais au moment où la visite passe. Une étape sans sujet ne se donne pas, et l’on n’explique pas ce qui n’est pas à l’écran.',
  '',
  '⛔ **UNE PAGE DOIT PORTER DE QUOI DONNER SA VISITE, non seulement être prête.** Quatre des six arrêts de la recherche n’existent pas sur une page vide : ni les onglets, ni leur répartition, ni le bouton qui garde la recherche, ni le moindre résultat. La visite ne s’y ouvre donc qu’une fois des résultats affichés, et le bouton de la barre suit la même condition, disparaissant sur une page vide et reparaissant dès qu’une recherche répond. ⛔ Et l’on ne tape PAS à la place du lecteur pour se donner une visite : elle montre la page telle qu’il l’a ouverte, ou elle ne se montre pas.',
  '',
  ANCRE,
].join('\n')

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260907_avant_visite_recherche'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.split(ANCRE).length - 1 !== 1) throw new Error('relecture : l’ancre a bougé.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
