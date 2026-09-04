/**
 * § 38.17 : une notification est une LETTRE, et un bloc ne se pose pas dans un bloc.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-notification-lettre-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.17 Une NOTIFICATION est une lettre'

// Ancre : la dernière phrase du § 38.16, recopiée de `parametres.charte_ia`.
const ANCRE = 'et une fonction que plus rien n’appelle est une seconde vérité qui attend.'

const SECTION = `

${MARQUE}, et un BLOC ne se pose pas dans un BLOC

Cinq relevés de l’auteur sur le volet des notifications, 2026-09-04 : « ne pas faire un bloc dans un bloc ; utiliser tout l’espace disponible » ; « se passer du bandeau vert sur le côté gauche » ; « chaque ligne a un niveau de hiérarchie, ça brouille tout : simplifier » ; « un message de validation doit être vert ; un message de refus doit être rouge (maroquin ?) ; un message basique reste grisâtre » ; « pas de "archiver" ; au survol, s’affiche "archiver" ».

⛔ **UN BLOC NE SE POSE PAS DANS UN BLOC.** Chaque notification était une CARTE — fond propre, filet, coins arrondis, rembourrage — posée dans un volet qui a déjà tout cela. Deux cadres emboîtés, et une gouttière perdue de chaque côté pour un volet de 26 rem : le texte y perdait le sixième de sa mesure sans rien y gagner. ⚠️ **Une liste dans un cadre se compose en RANGÉES**, pleine largeur, séparées d’un filet, et son rembourrage est celui de l’en-tête du cadre — sans quoi les fers ne tombent pas au même endroit. ⛔ Et pas de bandeau au flanc : il disait « nouvelle », ce que l’onglet dit déjà, et il rentrait le texte de trois pixels de plus.

⛔ **UNE NOTIFICATION PORTE QUATRE CHOSES : expéditeur, objet, message, date**, et un lien au bas. C’est le modèle de la LETTRE, et il suffit. Elle en portait SIX, sur six rangs typographiques — un titre en capitales vertes, l’objet en sérif, la date, un « À propos : … » en italique, une ligne « Message de X », le corps. ⚠️ **Trois de ces six disaient la même chose sous trois formes** : « Publication acceptée », puis « Votre publication a été acceptée et publiée. », et le titre du document ailleurs. *Un rang de plus n’ajoute pas un renseignement : il ajoute une hésitation sur l’ordre de lecture.*

⛔ **LE CORPS EST VIDE QUAND L’OBJET DIT TOUT.** Une phrase par défaut qui paraphrase l’objet est pire qu’une ligne absente : elle occupe le rang où l’on cherche ce que la modération a réellement écrit. Le message ne paraît donc que s’il porte des mots de quelqu’un.

⛔ **LE TON EST UNE COULEUR, non un titre.** Vert pour une validation, l’encre du danger confirmé pour un refus, gris pour le reste : la couleur dit en un coup d’œil ce que six mots en capitales disaient à la ligne au-dessus. ⚠️ **Elle ne colore QUE l’objet** — un rang coloré parmi trois se lit ; trois rangs colorés ne se lisent plus. ⚠️ Et « à revoir » se range avec les REFUS : la publication n’a pas été acceptée en l’état, et le lecteur a quelque chose à faire.

⛔ **LE MAROQUIN NE SERT PAS AU REFUS, et la question méritait d’être tranchée.** Il est \`--cs-peres\` : il DIT un domaine du corpus, sur la page de recherche comme sur le carton de l’accueil, et le prêter à un rôle d’interface le ferait dire deux choses. C’est \`--cs-danger-fonce\` qui convient, l’encre du danger CONFIRMÉ, déjà transposée dans les deux thèmes. *Une teinte qui encode une catégorie ne se prête pas à un rôle, et l’inverse est déjà écrit au § « Palette ».*

⛔ **UNE ACTION QUI NE VIENT QU’AU SURVOL EST HORS D’ATTEINTE.** « Archiver » ne paraît plus qu’au survol, comme demandé — mais aussi au FOYER et sur un écran TACTILE, où rien ne se survole. C’est la règle déjà payée sur la gouttière d’actions des prélèvements. ⚠️ Et il garde sa PLACE quand il ne se voit pas — opacité, non \`display\` — sans quoi la ligne se recomposerait sous le curseur au moment même où on le vise.

⚠️ **Un lien ne s’écrit que s’il mène quelque part.** « Aller au commentaire » se composait depuis toujours et ne paraissait jamais : la notification ne portait pas d’adresse. Elle la tire maintenant de \`id_verset\`, ⛔ sans traduction imposée — la page biblique choisit alors celle du lecteur, et il retrouve son verset dans SA bible.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_notification_lettre'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
