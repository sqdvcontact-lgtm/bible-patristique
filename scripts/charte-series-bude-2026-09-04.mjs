/**
 * § 38.13 : les deux séries du Budé, sur la case d'initiales du catalogue.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-series-bude-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.13 Les deux SÉRIES du Budé'

// Ancre : la dernière phrase du § 38.12, recopiée de `parametres.charte_ia`.
const ANCRE = 'Et l’on dit UNE fois pourquoi ces cases ne s’ouvrent pas : un champ figé sans un mot se lit comme un champ en panne.'

const SECTION = `

${MARQUE} — l’hommage est discret par sa TAILLE, non par sa pâleur

Demande de l’auteur du 4 septembre 2026 : « pour rendre hommage discrètement aux Budé, mettre le petit encart contenant les initiales de l’auteur en couleurs ; en rouge pour les latins, en jaune pour les grecs ; s’inspirer des couleurs Budé et adapter à l’harmonie du site ». La Collection des Universités de France relie ses volumes grecs en jaune safran et ses latins en rouge : sur un rayon, la série se lit avant le titre.

⛔ **L’HOMMAGE EST DISCRET PAR SA TAILLE, NON PAR SA PÂLEUR.** Un premier jeu de teintes lavées a été mesuré puis écarté : ΔE 9,7 entre les deux séries, et 5,0 entre le rouge et la case NEUTRE — on ne les aurait distinguées ni l’une de l’autre, ni d’une case sans couleur. Or ce qui fait le Budé, c’est justement qu’on reconnaît la série de loin. Les teintes sont donc franches, et c’est le CARRÉ qui est petit : quarante-quatre pixels dans une carte de trois cent cinquante. ⚠️ La règle vaut au delà de ce cas : *délaver une couleur pour la rendre discrète, c’est lui retirer ce qu’on lui demandait de dire.*

⛔ **ET CE NE SONT PAS DES COULEURS DE PLUS DANS LA PALETTE.** Elles tombent sur les axes que le site a déjà : le rouge est à 37° de teinte, entre le danger confirmé (31°) et le danger (48°), et sa chroma est celle du premier ; le safran est à 81°, la teinte de la lacune (82°) et de l’or (83°), monté en clarté et en chroma jusqu’au rang d’un aplat. Mesuré : ΔE 51,8 entre les deux séries, 72,9 et 61,6 avec la case neutre — on ne les confond avec rien.

⛔ **CE SONT DES JETONS À ELLES, non deux jetons de rôle réemployés.** Une série de collection n’est ni un danger ni un apparat, et un jeton de RÔLE prêté à une CATÉGORIE finit par changer sous elle le jour où le rôle bouge. ⚠️ En Cuir, elles GARDENT leur teinte — ce sont des catégories encodées par la couleur, comme la frise de l’histoire et les catégories de modération, et les rabattre au monochrome effacerait ce qu’elles disent. Elles s’y RELISENT pourtant : le rouge descend d’un cran, le safran de sept, le second étant seul à risquer l’éclat sur une page sombre.

⛔ **LÀ OÙ LA COLLECTION SE TAIT, LA CASE SE TAIT.** Le Budé ne connaît que ces deux séries : le syriaque, l’arménien, l’arabe et le copte gardent la teinte neutre du site. ⚠️ Et un corpus que les DEUX séries se disputent n’en reçoit aucune — les Actes des martyrs anciens portent quinze notices latines et seize grecques, les Apophtegmes deux et trois : les colorer serait mentir. Une langue TIERCE, elle, ne conteste rien : un auteur latin dont une œuvre n’est conservée qu’en syriaque reste de la série latine. Mesuré sur les 417 auteurs du catalogue : 196 latins, 154 grecs, 5 partagés, 62 d’une autre langue ou sans langue.

⚠️ **La langue se prend sur la PREMIÈRE nommée**, le champ étant du texte libre qui porte souvent une chaîne de transmission : « grec ; version latine de Rufin », « grec perdu ; version syriaque conservée ». L’original ouvre la phrase, et c’est lui qui décide — une œuvre grecque conservée en latin reste grecque. ⛔ On ne cherche pas la langue ailleurs que dans la tête : « ancien français » ne doit pas devenir du latin parce que le mot y paraîtrait plus loin.

⚠️ **Une information portée par la seule COULEUR n’est lisible que de qui connaît le code** : la case porte donc aussi son mot, « Œuvres en latin », « Œuvres en grec ». Ce n’est pas l’infobulle en l’air du § 38.12 : celle-ci dit ce que la couleur seule ne peut pas dire.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_series_bude'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
