/**
 * § 18 : un volet nomme ce qu'on lit, ce nom est le lien, et rien ne paraît au survol.
 *
 * Deux décisions de l'auteur du 31 août 2026 : « remplacer par le nom raccourci de la
 * traduction […] ; ne pas afficher “en savoir plus sur cette traduction”, mais ouvrir la
 * page quand on clique sur le nom », et « supprimer la fonction d'affichage, au survol du
 * nom de l'auteur, d'une partie de la page auteur ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-nom-du-volet-2026-08-31.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '**Un volet de gauche NOMME ce qu’on lit, et ce nom EST le lien**'

const ANCRE = '⚠️ **Un libellé long s’écrit en DEUX formes, et l’on n’en montre qu’une.** « En savoir plus sur cette traduction » passe à trois lignes sur un volet resserré ; « En savoir plus » y suffit. Les deux sont dans le document, la largeur choisit. ⛔ On ne coupe pas un libellé en JavaScript : il faudrait le mesurer à chaque rendu, et la mesure se ferait après la peinture.'

const REMPLACEMENT = `⛔ ${MARQUE} (décision de l’auteur, 31 août 2026 : « remplacer par le nom raccourci de la traduction, par exemple “Bible Crampon” ; ne pas afficher “en savoir plus sur cette traduction”, mais ouvrir la page quand on clique sur le nom de la traduction »). La carte de la traduction disait deux fois la même chose sans jamais nommer la bible : l’étiquette « Traduction », un lien qui redisait « cette traduction », et pour seul nom celui du traducteur. Le nom de la bible tient les deux rôles à la fois — il nomme, et il ouvre la fiche. ⚠️ C’est la MÊME forme des deux côtés du site, et le même composant : le nom de l’auteur sur une page patristique, celui de la bible sur la page Bible. Un volet de gauche n’a pas deux façons de nommer ce qu’il montre. ⚠️ L’étiquette ne se comprime pas et le NOM s’écrête par la fin : un nom coupé reste lisible — « Traduction officielle liturgi… » —, une étiquette rognée ne dit plus de quoi il s’agit.

⛔ **Rien ne paraît AU SURVOL d’un nom** (décision de l’auteur, 31 août 2026 : « supprimer la fonction d’affichage, au survol du nom de l’auteur, d’une partie de la page auteur »). Le nom d’auteur ouvrait, après deux cent vingt millièmes de seconde de survol, une carte flottante portant le portrait, les dates, les traditions et deux cents signes de la notice — c’est-à-dire un morceau de la page qu’un clic ouvre en entier. Le survol SOULIGNE, et c’est tout : il annonce le lien, il ne le remplace pas. ⚠️ Une surface qui disparaît emporte ce qui la servait : l’écran de cadrage des portraits proposait un cadre « aperçu au survol », et un cadrage qui règle une surface inexistante ment autant qu’un cadre aux mauvaises mesures.

${ANCRE} ⚠️ La règle n’a plus d’exemple dans le site : le libellé qui l’appelait a cédé la place au nom de la bible, et un nom n’a pas de forme courte — il s’écrête. Elle reste bonne pour un libellé ; mais la première question est de savoir s’il en faut un.`

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
const cleSauvegarde = 'charte_ia_sauvegarde_20260831_avant_nom_du_volet'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
