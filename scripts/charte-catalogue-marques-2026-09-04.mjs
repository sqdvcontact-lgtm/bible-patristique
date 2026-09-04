/**
 * § 38.12 : un état qui ne varie pas n'informe pas ; ce qui est prérempli est figé.
 *
 * Trois points de l'auteur du 4 septembre 2026, sur le catalogue des traductions.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-catalogue-marques-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.12 Un état qui ne VARIE pas n’informe pas'

// Ancre : la dernière phrase du § 38.11, recopiée de `parametres.charte_ia`.
const ANCRE = 'Là où l’infobulle dit vraiment quelque chose de plus — pourquoi une case deutérocanonique est vide —, les deux restent.'

const SECTION = `

${MARQUE}, et ce qui est PRÉREMPLI est figé

Trois points de l’auteur du 4 septembre 2026, sur l’onglet « Catalogue des traductions ».

⛔ **UN ÉTAT QUI NE VARIE PAS N’INFORME PAS : ON LE RETIRE.** La mention « ✦ Référence en cours de vérification » paraissait sur **2 488 notices sur 2 499** — les onze autres seules disaient autre chose, et le troisième état, « Non vérifié », n’existait sur aucune. Elle ne distinguait donc rien, et jetait sur tout le catalogue un doute qu’aucune de ces références ne méritait. ⚠️ La tentation est de la RAFFINER — un degré de vérification plus fin, un statut d’import — et l’auteur l’a écartée : « rien de spécial ; en fait, il faut tout bonnement supprimer ». Une ligne qui dit la même chose partout coûte de la place et de l’attention sans rien rendre ; on la retire plutôt que de la farder. ⛔ Et les colonnes qui la servaient cessent d’être demandées : un champ que rien ne lit finit par contredire ce qu’on affiche.

⛔ **UNE ABRÉVIATION QU’IL FAUT SURVOLER POUR LA COMPRENDRE N’EST PAS UNE ÉCONOMIE.** « DP » tenait deux signes et demandait un geste, et son infobulle ne faisait que développer le sigle : deux gestes pour deux mots. « Domaine public » s’écrit en toutes lettres, sans infobulle et sans curseur d’aide. ⚠️ C’est la même règle que celle de la case vide de la Polyglotte, prise par l’autre bout : là on retirait une infobulle qui ne disait rien de plus que le texte ; ici on écrit le texte pour n’avoir plus besoin d’infobulle.

⛔ **CE QUI EST PRÉREMPLI EST FIGÉ.** Une proposition d’œuvre lancée depuis une notice du catalogue en porte l’auteur et le titre : ils SONT la notice, et les laisser modifiables laissait partir une proposition qui ne désignait plus la ligne qu’on avait sous les yeux — l’équipe éditoriale recevait une œuvre sans savoir d’où elle venait. ⚠️ Le verrou se déduit de ce qui a été PASSÉ, non d’un drapeau : le formulaire ouvert seul, qui ne préremplit rien, reste entièrement libre. ⛔ Un champ figé n’est ni grisé ni « en lecture seule » : c’est une VALEUR qu’on montre, non une saisie qu’on refuse, et elle se compose comme une valeur — dans le cadre du champ, pour que la colonne garde son aplomb. ⚠️ Et l’on dit UNE fois pourquoi ces cases ne s’ouvrent pas : un champ figé sans un mot se lit comme un champ en panne.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_catalogue_marques'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
