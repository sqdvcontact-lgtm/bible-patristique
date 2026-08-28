/**
 * § 3.8 et § 7 : le style des citations bibliques longues DÉCOUPÉES EN VERSETS.
 * Décision de l'auteur du 28 août 2026 : « dans le style des citations sortie, mais
 * sans grand espace entre paragraphes de même style ; un léger blanc suffit ; avec
 * retrait gauche ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-style-versets-2026-08-28.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

// Fin de la cinquième règle du § 3.8 (les seuils de longueur), juste avant le § 3.9.
const ANCRE_REGLE = 'un seuil de 200 en viserait 1 373.'

const AJOUT_REGLE = `

⚠️ **Une citation POSÉE VERSET PAR VERSET ne se recolle pas.** La règle qui précède réunit les segments d’une citation en un seul bloc coulant, pour que la segmentation technique reste invisible. Mais quand l’édition ne coule pas la citation biblique dans sa prose et la pose verset par verset, chacun sur sa ligne, la coupure n’est plus technique : elle est VOULUE, et l’effacer serait effacer le verset. Ces segments prennent alors la nature \`verset\` — un segment, un verset — et la suite des versets consécutifs forme la citation.

Le style reprend celui de la citation sortie : corps légèrement réduit, justification, ni guillemets ni filet, et le même retrait de 8 mm, ramené à 5 mm sur écran étroit. Il en change deux choses. Le retrait ne se pose qu’à **gauche** : la citation sortie est un bloc unique que deux marges égales enferment, tandis qu’une suite de versets est déjà rentrée, et une seconde marge ne ferait qu’étrangler la colonne. Et deux versets ne sont pas séparés par le blanc de paragraphe, qui dirait qu’on change de sujet à chaque verset : un **léger blanc** suffit. Le blanc de paragraphe entier, lui, reste AUTOUR du bloc, car c’est la citation qui est un paragraphe, non chacun de ses versets.`

// Table des natures de segment, § 7 : la ligne du `verset` se place après la
// `citation`, donc juste avant celle du `lemme`.
const ANCRE_TABLE = '| `lemme` |'

const AJOUT_TABLE = `| \`verset\` | verset d’une citation biblique que l’édition pose verset par verset : un segment, un verset, et la suite des versets consécutifs forme la citation (§ 3.8) |
`

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
if (avant.includes('verset par verset')) throw new Error('La règle est déjà posée.')
for (const [nom, ancre] of [['règle', ANCRE_REGLE], ['table', ANCRE_TABLE]]) {
  const n = avant.split(ancre).length - 1
  if (n !== 1) throw new Error(`ancre ${nom} : ${n} occurrence(s), 1 attendue.`)
}
const apres = avant
  .split(ANCRE_REGLE).join(ANCRE_REGLE + AJOUT_REGLE)
  .split(ANCRE_TABLE).join(AJOUT_TABLE + ANCRE_TABLE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n\'a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
