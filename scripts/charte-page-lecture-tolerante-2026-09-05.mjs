/**
 * § 18 : une page de lecture ne tombe pas sur une couche SECONDAIRE, et elle dit
 * ce qui lui manque.
 *
 * Demande de l'auteur du 5 septembre 2026, devant « Cette page n'a pas pu
 * s'afficher » sur les Confessions : « consolide le code pour que ça se produise le
 * moins possible ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-page-lecture-tolerante-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '**Une page de lecture ne tombe pas sur une couche SECONDAIRE'

// Ancre : la dernière phrase du paragraphe « Une lecture qui ne sert qu’à ORNER… »
// du § 18, recopiée de `parametres.charte_ia`.
const ANCRE = '⚠️ Le prix de ce repli est qu’une lenteur ne s’y signale nulle part, et qu’on ne la trouve qu’en regardant le journal.'

const SECTION = `

⛔ ${MARQUE}, et elle DIT ce qui lui manque** (décision de l’auteur, 5 septembre 2026 : « consolide le code pour que ça se produise le moins possible »). Le texte est la seule couche dont l’échec ferme la page : sans lui il n’y a rien à lire. Tout ce qui l’accompagne se charge à part : notes structurées des deux textes, renvois bibliques, versets cités et leurs traductions, original en regard, apparat critique. Quand l’une de ces couches manque, la page s’ouvre sans elle, l’échec part au journal du serveur, et un bandeau sous le frontispice nomme au lecteur ce qui manque et l’invite à recharger ; l’administrateur y lit le détail. ⛔ Ce n’est pas un repli SILENCIEUX, et le paragraphe précédent garde sa raison : une page servie sans ses renvois n’est fausse que si elle se donne pour complète. Déclarée, elle ne ment pas. ⚠️ Le chargement des liens LÈVE toujours ; c’est la page qui l’attrape et le déclare au lieu de tomber.

Le cas qui l’a imposé. Le 5 septembre 2026, pendant qu’une écriture en base reprenait les notes des Confessions, UNE ancre de note est restée un moment sans sa note. La page levait sur cette ancre (« Ancre de note structurée incomplète ») et fermait l’œuvre entière à tout lecteur, puis rouvrait d’elle-même l’écriture achevée : un quart d’heure plus tard, l’ancre était complète et aucune ancre du corpus n’était en défaut. Un import n’est pas atomique, et le lecteur ne doit pas payer l’intervalle. ⚠️ Le journal de la base ne montrait rien : la panne n’était pas une requête en échec mais une donnée en transition, et seul le journal de l’hébergeur portait le repère de la panne avec sa cause. ⛔ Une ancre incomplète est donc laissée de côté et COMPTÉE, jamais levée (§ 13.6 : l’erreur est remontée, pas tue) ; et la projection des appels qui LÈVE reste la projection de contrôle des scripts et des tests, une page emploie celle qui ne faillit pas.

⚠️ Le second cas est de la même famille, et il a sa mesure. Les liens d’un chapitre biblique se lisaient par un motif \`like\` sur \`canon_id\`, qui n’est pas « leakproof » sous la politique de lecture par ligne : la base devait juger chaque ligne de la table avant de regarder le motif, et aucun index ne pouvait servir. Mesuré : 66 236 lignes sondées pour 2 741 rendues, 2 337 ms au repos, huit secondes sous charge, quatorze réponses en échec le 4 septembre sur les métadonnées de la page Bible et d’une péricope. Deux colonnes engendrées de \`canon_id\`, un index, et un \`=\` à la place du motif : 2 773 lignes sondées, 169 ms. Le détail technique est dans \`AGENTS.md\`.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_page_lecture_tolerante'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
