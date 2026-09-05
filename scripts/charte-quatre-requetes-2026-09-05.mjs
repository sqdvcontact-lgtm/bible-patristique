/**
 * § 38.23 : des requêtes qui ne s'attendent pas partent ENSEMBLE, et une panne se DIT.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-quatre-requetes-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '38.23 Des requêtes qui ne s’ATTENDENT pas partent ENSEMBLE'

const ANCRE = 'Et son COMPTE se lit — il était deux rangs sous son libellé et à demi effacé, quand c’est lui qui dit qu’un filtre ne servira à rien avant qu’on l’essaie.'

const SECTION = `

### ${MARQUE}

Relevé de l’auteur, 2026-09-05 : « le temps d’affichage me paraît un peu lent » sur l’onglet « Catalogue des traductions ». Mesuré : **1 807 ms** avant que la liste paraisse, en **quatre allers-retours EN SÉRIE** — la session, puis trois pages de notices, puis les votes — dont **aucun n’avait besoin de ce que le précédent rapportait**. Lancés ensemble : **932 ms**.

⛔ **Une cascade se juge sur les DÉPENDANCES, non sur l’ordre où l’on a écrit les lignes.** C’est la règle déjà payée sur la page Bible (§ « le coût, c’est le NOMBRE d’allers-retours ») et sur la page d’œuvre ; elle vaut à l’identique pour une liste chargée par le navigateur. Une requête n’attend que ce qu’elle CONSOMME.

⚠️ **Le plafond de PostgREST est de mille lignes, et il ne se contourne pas** : pour 2 499 notices, trois pages sont inévitables. Ce qui ne l’était pas, c’est qu’elles s’attendent.

⛔ **Une page SPÉCULÉE au-delà de la fin n’est pas gratuite.** Une pagination par tranche ne sait jamais d’avance combien de pages elle aura : demander une vague en parallèle, c’est parier. Or sur une vue qui CALCULE ses colonnes, le nœud de calcul s’exécute pour toutes les lignes jusqu’à la borne haute avant de n’en rendre aucune — mesuré, 569 ms pour une page qui ne rendrait rien. La vague se taille donc sur la liste qu’on charge, jamais « large pour être tranquille », et l’on n’en demande une seconde que si la dernière page revenue était PLEINE, c’est-à-dire sur une preuve.

⛔ **ON NE DEMANDE PAS DEUX MILLE CINQ CENTS IDENTIFIANTS POUR EN RAPPORTER TROIS.** La table des votes en compte trois, et sa politique de lecture est déjà publique : la clause \`in.(…)\` pesait douze kilo-octets d’adresse. ⚠️ Et elle était plus fragile qu’il n’y paraît — PostgREST renvoie l’adresse ENTIÈRE dans son en-tête de réponse, si bien qu’un client node refuse déjà la réponse pour dépassement d’en-tête. Un navigateur tolère davantage ; la clause était à un millier de notices de casser, et sans un mot. C’est la règle des lots d’une clause \`in\`, prise par l’autre bout : *quand le filtre coûte plus cher que ce qu’il écarte, on ne filtre pas.*

⛔ **UNE PANNE SE DIT.** Les quatre requêtes de cet onglet ne lisaient jamais leur \`error\` : un échec s’y rendait « Aucun auteur ne correspond à ces critères », c’est-à-dire un catalogue vide donné pour un catalogue sans réponse. C’est la règle déjà écrite pour la carte « Bibliothèque » du compte — *un panneau discret journalise son erreur, sans quoi rien ne distingue « vide » de « cassé »* — et le remède est le même : le chargeur lève, la page le dit, et propose de réessayer.

⚠️ **Ce que l’audit a démenti, et qui vaut d’être écrit.** Le regroupement de 2 499 notices à chaque rendu — deux mille \`localeCompare\` en français, sans collateur réemployé — était le premier suspect. Mesuré : **3 ms**, et un \`Intl.Collator\` gardé sous la main n’y change rien, le moteur le mettant déjà en cache. *Un soupçon de lenteur se mesure avant d’être corrigé : celui-là aurait coûté une refonte pour trois millisecondes.*

⚠️ **Et ce qui reste, qui est de la BASE.** Les trois colonnes de date de la vue du catalogue coûtent à elles seules **1,3 s** sur les trois pages : cinq fonctions PL/pgSQL, aucune sous-expression partagée — la même est calculée deux fois par ligne — pour 515 dates distinctes sur 2 499 lignes. Deux barrières d’optimisation suffiraient à la faire tomber de 597 à 148 ms, le planificateur y ajoutant de lui-même un cache par valeur. Éprouvé, à l’identique au caractère près sur les 2 645 lignes ; non appliqué, faute d’arbitrage.

⚠️ **Comment on mesure une liste chargée par le NAVIGATEUR** : depuis le poste, en rejouant ses requêtes exactes. Le chemin réseau est le même que celui du lecteur, puisque c’est son navigateur qui parle à la base — à la différence d’une page servie, où il faut mesurer en ligne (§ 18).`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_quatre_requetes'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
