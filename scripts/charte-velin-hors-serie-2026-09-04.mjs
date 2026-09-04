/**
 * § 38.13, suite : la troisième case n'est pas un gris vide, c'est un VÉLIN.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-velin-hors-serie-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'ET LA TROISIÈME CASE N’EST PAS UN GRIS VIDE'

// Ancre : la dernière phrase du § 38.13, recopiée de `parametres.charte_ia`.
const ANCRE = 'Ce n’est pas l’infobulle en l’air du § 38.12 : celle-ci dit ce que la couleur seule ne peut pas dire.'

const SECTION = `

⛔ **${MARQUE} — c’est un VÉLIN** (demande de l’auteur, le jour même : « j’aimerais au moins des tons un peu plus nobles, plutôt que ce gris vide »). Le volume broché posé entre deux reliures : là où la collection se tait, la case ne prétend rien, mais elle le dit comme une DÉCISION et non comme une donnée manquante. ⚠️ Et le gris n’était pas seulement vide : mesuré, les initiales n’y rendaient que **2,25** de contraste au Clair et 4,09 en Cuir, pour 4,5 exigés à cette taille — le gris de bordure portait l’encre la plus ténue de l’échelle, et cela depuis toujours. Le défaut est antérieur à la couleur des séries ; il se voyait d’autant plus depuis qu’il voisinait deux cases lisibles. 7,12 et 6,70 désormais.

⛔ **ET SURTOUT PAS LE VERT**, essayé et écarté. Le jeton de l’Écriture vaut EXACTEMENT la teinte du vert du site : deux choses différentes auraient été vertes sur le même site, et un carré vert aurait dit « biblique » devant un Père syriaque. Le vert est en outre l’ACCENT, celui qui signifie « actif, c’est ici » : l’exception aurait crié plus fort que la règle. ⚠️ Et un vert PÂLE, pour éviter cela, retombait dans le piège des teintes lavées — ΔE 5,5 de l’ancien gris, on ne l’aurait pas vu.

⚠️ **LE VÉLIN SE DISTINGUE DES DEUX SÉRIES PAR LA CHROMA, NON PAR LA TEINTE** : 15,3 contre 53,8 et 60,9. Une MATIÈRE, non une couleur — et c’est ce qui l’empêche de se lire comme une troisième série, alors même qu’il partage l’axe chaud du safran (84° contre 81°). ⛔ La règle vaut au delà de ce cas : *quand on veut marquer sans classer, on baisse la chroma, jamais la lisibilité.* Mesuré : ΔE 25,8 de la carte, contre 8,8 pour l’ancien gris, qui s’y noyait.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_velin'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
