/**
 * § 38.10 : la lecture en regard — la référence des deux côtés, le verset
 * cliquable, l'élision capitalisée, l'écran traversé, le volet qui s'efface.
 *
 * Cinq demandes de l'auteur du 4 septembre 2026, sur « Bible classique ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-regard-cliquable-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.10 La lecture EN REGARD'

// Ancre : la dernière phrase du § 38.9, recopiée de `parametres.charte_ia`.
const ANCRE = 'c’est le prix d’une colonne étroite justifiée, et l’on ne le paie pas en inventant des coupures.'

const SECTION = `

${MARQUE} — la référence des deux côtés, le verset cliquable

Cinq demandes de l’auteur du 4 septembre 2026, sur la page « Bible classique ».

⚠️ **LA RÉFÉRENCE PARAÎT DES DEUX CÔTÉS** (« la référence biblique doit apparaître des deux côtés : français, et ancien français »). Une édition ne dit sa numérotation PROPRE que lorsqu’elle DIFFÈRE du canon : la colonne qui n’en a pas portait donc une gouttière vide, et le lecteur n’avait de numéro que d’un bord. Elle retombe sur la référence canonique, « 3, 1 », composée comme la native — chiffres arabes, espace après la virgule, jamais le code du livre. ⛔ Ce repli ne prétend pas être une numérotation d’édition : il dit le CRÉNEAU, c’est-à-dire ce que les deux colonnes ont en commun.

⛔ **CLIQUER UN VERSET OUVRE SON APPARAT, ET LA CIBLE EST LA RANGÉE** (« permettre de cliquer sur un verset pour afficher les liens patristiques, sur l’AF et le Français »). Les deux colonnes d’une rangée sont le MÊME verset canonique, et le volet de droite se charge sur ce créneau : il n’y a rien à départager entre elles, et cliquer l’une ou l’autre ouvre le même apparat. ⚠️ Une rangée dont une colonne est vide se clique aussi — l’apparat tient au créneau, non à ce que telle édition en porte. ⚠️ Un second clic relâche, et les teintes sont celles de la lecture simple, pour que le geste se reconnaisse d’une lecture à l’autre. ⛔ Aucun comptage de lecture ici : les lignes d’une segmentation éditoriale ne visent pas la table des versets, et la lecture simple s’en abstient déjà pour elles. ⚠️ L’appel de note, lui, arrête le clic : ouvrir une note ne sélectionne pas le verset qui la porte.

⛔ **UNE MARQUE POSÉE SUR UNE RANGÉE NE DÉPLACE RIEN.** Le fond du survol déborde de quelques pixels sur les côtés, et ce débord se prend en marge NÉGATIVE : pris en rembourrage, il rétrécirait les colonnes, et le fer du texte des versets cesserait de répondre à celui de l’appareil, que la feuille déduit des mêmes mesures. ⚠️ Et il se déclare dans la FEUILLE, jamais en style en ligne — une déclaration en ligne bat toute règle de feuille sans passe-droit, et c’est ainsi qu’un survol meurt sans que rien ne le dise.

⛔ **UNE ÉLISION QUI SUIT UNE PONCTUATION FORTE OUVRE UNE PHRASE** (« à l’affichage, afficher une majuscule après une élision précédée par une ponctuation forte »). Ce qu’on élide entre deux phrases, ce sont des phrases entières : la suivante commence donc comme une phrase, et prend la capitale. ⛔ Rien ne change après un deux-points, un point-virgule ou une virgule, où la phrase n’était pas finie. ⚠️ Le guillemet et la parenthèse fermants ne rompent pas la ponctuation forte : « Il le dit. » finit bien une phrase. ⚠️ C’est la règle de l’initiale d’un extrait, et la même main : elle ne change jamais la longueur du texte, les appels de note s’y posant par décompte de signes.

⛔ **UN ÉTAT QU’ON TRAVERSE NE SE COMPOSE PAS COMME UNE PAGE DE TITRE** (« ouvrir Bible classique soit sur la Genèse, soit sur le dernier livre ouvert par l’utilisateur ; supprimer le dessin »). La barre rouvre désormais la Bible où l’on en était — le dernier livre lu, la Genèse à la première visite — et la gravure des ruines quitte l’écran qui dit qu’une traduction ne comporte pas le livre demandé. Elle y disait bien ce qu’il fallait ; mais l’écran se rencontre plus souvent depuis que la barre rouvre un livre qui n’est pas toujours dans la bible qu’on retrouve, et une planche de soixante pour cent de la hauteur y devient une cérémonie pour un passage. La mention seule reste. ⛔ Et la planche passe en RÉSERVE dans l’inventaire des illustrations : une gravure qu’on cesse de poser se déclasse, elle ne s’oublie pas.

⛔ **LES RÉFÉRENCES DU PASSAGE QU’ON QUITTE S’EFFACENT AUSSITÔT** (« quand je change de segment, au moment du chargement, supprimer immédiatement, de façon smooth, les références déjà affichées ; afficher un petit symbole de chargement »). Le volet gardait la liste précédente sous un mot « Chargement… » : on lisait donc, une seconde durant, l’apparat d’un verset qu’on venait de quitter, et rien ne disait que ce n’était plus le bon. ⚠️ La PLACE, elle, reste : retirer la liste du flux ferait sauter le volet au clic, puis sauter de nouveau à l’arrivée. ⚠️ Et la marque d’attente ne se pose que là où l’on attend vraiment — le volet de la page Bible va chercher ses liens, celui d’une page d’œuvre les a reçus avec sa tranche de texte et ne montre qu’un fondu.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_regard_cliquable'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
