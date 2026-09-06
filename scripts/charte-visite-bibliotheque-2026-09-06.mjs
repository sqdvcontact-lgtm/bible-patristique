/**
 * § 46 : la visite de la Bibliothèque, et la règle du pli imposé. Demande de
 * l'auteur du 6 septembre 2026 au soir (« prépare le tuto de la page Patristique »).
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-visite-bibliotheque-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '**La visite de la Bibliothèque**'

const ANCRE = '⚠️ **Un même champ ne se présente pas deux fois de la même façon.** La recherche d’un livre est le champ de la Bible classique, au repère près, les deux pages partageant leur volet ; mais ce qu’elle FAIT diffère, et l’étape le dit : sur la Polyglotte, une référence n’emmène pas ailleurs, elle vise le verset dans le tableau. Une étape se règle sur ce que la chose fait ICI, non sur le composant qui la dessine.'

const TEXTE = [
  ANCRE,
  '',
  '**La visite de la Bibliothèque** — la page que la barre appelle « Patristique » — compte sept arrêts : la recherche du site, les trois sections, ce qui restreint la liste, une carte d’auteur, ce qu’elle déplie, ce qu’une ligne d’édition offre, et la façon de tourner les pages. Une seule colonne, donc pas de question d’ordre entre volets : tout se descend. ⛔ Elle dit ce qu’aucune page voisine ne dit — que la liste ne porte QUE les auteurs dont une œuvre est en ligne, que le catalogue en recense bien d’autres qui ne le sont pas, et que l’étoile d’une ligne d’édition remplit l’onglet Favoris. Le reste se voit.',
  '',
  '⛔ **UN PLI IMPOSÉ NE SE REFERME PAS D’UNE ÉTAPE À L’AUTRE quand la suivante vit dedans.** L’étape des œuvres déplie la première carte, celle de l’étoile cerne une ligne qui s’y trouve : refermer entre les deux ne laisserait rien à cerner. Le pli se rend à la FIN de la visite, non au changement d’étape. ⚠️ Et il s’IMPOSE sans se POSER : l’état du lecteur reste dessous, intact, et reparaît de lui-même — c’est la même règle que la colonne des notes de la Polyglotte, prise par l’autre bout.',
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

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_visite_bibliotheque'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
