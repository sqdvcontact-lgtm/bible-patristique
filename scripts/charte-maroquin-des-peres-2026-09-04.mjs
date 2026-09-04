/**
 * § 38.6 : la couleur d'un corpus se prend là où le lecteur l'a déjà vue.
 *
 * Demande de l'auteur du 4 septembre 2026 : « dans la barre de recherche,
 * recherche, résultats qui s'affichent, etc., utiliser plutôt le maroquin de la
 * page d'accueil pour les résultats liés à la patristique ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-maroquin-des-peres-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.6 La COULEUR d’un corpus'

// Ancre : la dernière phrase du § 38.5, recopiée de `parametres.charte_ia`.
const ANCRE = "⚠️ Le champ reste LU : il nomme le responsable d'une ÉDITION CRITIQUE dans l'intitulé qui suit le nom, là où il apprend quelque chose."

const SECTION = `

${MARQUE} se prend là où le lecteur l’a déjà vue

Demande de l’auteur du 4 septembre 2026 : « dans la barre de recherche, recherche, résultats qui s’affichent, etc., utiliser plutôt le maroquin de la page d’accueil pour les résultats liés à la patristique ».

⛔ **UNE MATIÈRE NE SE NOMME PAS DE DEUX FAÇONS SELON L’ÉCRAN.** Les Pères portaient un POURPRE DE RUBRIQUE dans la recherche et un MAROQUIN sur la page d’accueil, dont le carton est une reliure rouge depuis le 31 août. Chacune des deux teintes se défendait pour elle-même, et c’est le piège : le lecteur, lui, n’a pas deux Patristiques. La couleur d’un corpus se prend donc là où il l’a déjà rencontrée, et l’accueil est la première page de toutes. ⚠️ Le pourpre n’était pas faux — il tenait ses écarts et sa lisibilité ; il n’était simplement nulle part ailleurs sur le site.

⚠️ **Une teinte reprise garde son RANG là où elle peut, et le change là où elle doit.** L’aplat de la rubrique prend la teinte du carton telle quelle : c’est le même office, un fond coloré qui porte un texte clair. L’ENCRE du Cuir ne le peut pas, les deux teintes du carton y étant sombres quand il faut là une encre CLAIRE ; c’est alors le même maroquin monté au rang d’encre, teinte tenue. ⛔ Ce qui se transpose est la TEINTE, jamais la valeur.

⚠️ **Et la reprise se paie en profondeur, ce qui est assumé.** Le maroquin est plus sombre que le vert de l’Écriture et que l’or de la Communauté — L* 23,6 contre 41,3 et 41,9 — si bien que la bande des Pères se lit plus sombre que les deux autres. C’est le caractère d’un maroquin, non un écart à corriger : sur l’accueil, les cartons de la Bible et des Pères sont tous deux à cette profondeur, « maroquin vert et maroquin rouge, les deux reliures d’un même ensemble ». ⛔ L’éclaircir pour l’aligner sur ses sœurs, ce serait le reprendre à l’accueil, qui est justement d’où il vient.

⚠️ **Les deux exemplaires restent LITTÉRAUX, et se renvoient l’un à l’autre.** Le carton est une gamme DESSINÉE, le jeton une teinte de RÔLE, et la charte les tient séparés depuis le jour où des jetons d’encre ont fait s’inverser les cartons en Cuir. Chacun porte donc sa valeur en clair, et un renvoi vers l’autre : reteinter le carton sans reteinter les jetons ferait dire deux choses au même corpus.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_maroquin_des_peres'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
