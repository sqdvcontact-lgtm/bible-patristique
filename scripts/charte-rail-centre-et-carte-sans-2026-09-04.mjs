/**
 * §§ 38.4 et 38.5, suite : la carte prend la police de ce qu'elle surmonte, et le
 * rail centre son texte.
 *
 * Trois demandes de l'auteur du 4 septembre 2026, sur la page « Bible classique ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-rail-centre-et-carte-sans-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'UNE CARTE DE VOLET PREND LA POLICE DE CE QU’ELLE SURMONTE'

// Ancre 1 : la dernière phrase du § 38.4, recopiée de `parametres.charte_ia`.
const ANCRE_CARTE = "⛔ La mesure vaut pour TOUTE la famille, l'apparat des bibles comme les listes des notices : il n'y a qu'une composition bibliographique sur le site."

const SECTION_CARTE = `

⛔ **LA CARTE DE TRADUCTION SE COMPOSE EN SANS** (citant la carte de Segond : « Louis Segond (1810-1885) D’après l’édition de Paris, Société biblique britannique et étrangère, 1910 // sans sérif »). Elle avait pris la SERIF du volet des œuvres, dont elle est copiée ; mais ce volet-là surmonte un texte en serif, et sa carte est de la même encre que ce qu’elle annonce. Celle-ci surmonte une LISTE DE LIVRES, qui est en sans, et le nom de la bible qui la coiffe l’est aussi : la serif y faisait deux régimes dans une carte de trois lignes. ⚠️ **Règle générale : ${MARQUE}, non celle du volet dont on l’a copiée.** Que deux volets se ressemblent ne dit rien de ce qu’ils annoncent, et c’est ce qu’ils annoncent qui décide. ⚠️ La divergence avec le volet des œuvres est donc assumée : ce n’est pas la même page.`

// Ancre 2 : la dernière phrase du § 38.5, recopiée de `parametres.charte_ia`.
const ANCRE_RAIL = "⚠️ Le champ reste LU : il nomme le responsable d'une ÉDITION CRITIQUE dans l'intitulé qui suit le nom, là où il apprend quelque chose."

const SECTION_RAIL = `

⚠️ **LE RAIL CENTRE SON TEXTE, ET SON CHEVRON RESTE EN TÊTE** (« centrer verticalement le texte ; réduire un peu la taille de police »). Un rail fait toute la hauteur de la lecture : le libellé posé sous le chevron pendait en haut d’une bande de huit cents pixels, quand un dos de livre porte son titre au milieu. ⛔ Le chevron, lui, ne descend pas avec lui — il est là où l’œil arrive, et c’est la cible qu’on vise, non le mot. ⚠️ Le groupe se centre d’un BLOC, le libellé et le repère ensemble : les centrer chacun pour soi détacherait le passage lu du nom qu’il accompagne.

⚠️ **Et son texte descend d’un rang** — le libellé de onze pixels à dix et demi, le repère de onze et demi à onze. Sur une bande de trente pixels de large, un texte plus menu se lit encore et pèse moins : la contrainte n’est pas la lisibilité mais l’encombrement, un rail devant se faire oublier tant qu’on ne le cherche pas.`

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
for (const [nom, ancre, section] of [['carte', ANCRE_CARTE, SECTION_CARTE], ['rail', ANCRE_RAIL, SECTION_RAIL]]) {
  const n = apres.split(ancre).length - 1
  if (n !== 1) throw new Error(`ancre ${nom} : ${n} occurrence(s), 1 attendue.`)
  apres = apres.split(ancre).join(ancre + section)
}
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_rail_centre_et_carte_sans'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
