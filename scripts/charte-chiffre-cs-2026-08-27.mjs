/**
 * § 34 : le CHIFFRE CS ferme la page d'accueil, à la place du fleuron ❧ ; deux
 * fleuronsseront gardés en réserve. Décision de l'auteur du 27 août 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-chiffre-cs-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Un cran plus doux la remet à sa place d’enseigne.'

const AJOUT = `

**Un CHIFFRE ferme la page d’accueil, et ce n’est pas le monogramme.** Sous le colophon — « en l’An de grâce MMXXVI » — se tenait le fleuron ❧. C’était un CARACTÈRE : son dessin dépendait de la police que le système voulait bien lui donner, il changeait d’une machine à l’autre, et il ne disait rien du site. À sa place vient le chiffre de Corpus Scriptura : le C et le S entrelacés, en capitales didones, gravés pour lui. ⚠️ Ce chiffre n’est PAS le monogramme du frontispice — celui-là est une lettrine gothique, celui-ci une capitale moderne. Deux dessins, deux emplois, deux fichiers, et l’on ne substitue pas l’un à l’autre. Il garde l’or que portait le fleuron : seul le dessin change.

⚠️ **Une planche livrée sur papier photographié se DÉTOURE en alpha avant d’entrer.** Le grain du papier court entre 225 et 250 de luminance : un seuil unique l’aurait gardé en entier ou mangé les bords adoucis du dessin. Le seuillage est donc une RAMPE — opaque en deçà de 96, transparent au-delà de 200, dégradé entre les deux —, le dessin est ensuite rogné à sa boîte et réduit. La planche ne sert alors que d’alpha, comme le monogramme, et prend la couleur qu’on lui donne.

⚠️ **Un ornement gardé EN RÉSERVE se recense comme les autres.** Deux fleurons — une fleur de lys, un brin de lavande — sont entrés le même jour sans qu’aucune page les appelle. Ils figurent au recensement des illustrations sous « En réserve » : une image qui dort dans le dépôt pèse dans le dépôt, et le jour où l’on s’en servira, on saura d’où elle vient.`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes('Un CHIFFRE ferme la page d’accueil')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
