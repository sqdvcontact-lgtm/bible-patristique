/**
 * § 35.6.3 : l'ordre d'une bibliographie se CALCULE.
 *
 * Décision de l'auteur du 28 août 2026 : le rangement d'une liste
 * bibliographique ne se lit plus dans la donnée. D'abord la vedette — nom de
 * famille de l'auteur, ou titre pour une œuvre anonyme —, ensuite le titre,
 * article et déterminant initiaux ôtés. `display_order` cesse d'être l'ordre
 * d'affichage : il demeure le rang de la page imprimée, et le dernier recours.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-ordre-bibliographie-2026-08-28.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const SECTION = [
  '### 35.6.3. L’ordre d’une bibliographie se CALCULE',
  'L’ordre d’affichage d’une liste bibliographique ne se lit pas dans la donnée : il se calcule, et de la même manière pour toutes les listes. **D’abord la vedette, ensuite le titre.**',
  '**La vedette** est le nom de famille de l’auteur lorsqu’il y en a un, le titre lorsqu’il n’y en a pas. ⛔ Une œuvre anonyme ne fait pas un bloc à part, ni en tête ni en queue : elle se range à son titre, dans la même suite alphabétique, comme un catalogue le fait. Deux homonymes se départagent par le prénom. ⛔ L’article ne se retire jamais d’un nom d’autorité : « La Taille » est un nom, non un titre précédé d’un article.',
  '**Le titre** se range **article et déterminant initiaux ôtés** : « L’Idée centrale de la Bible » se range à I, « Les Saints Évangiles » à S, « Une histoire du canon » à H. L’accent, la casse, l’apostrophe et le trait d’union ne comptent pas — « Saint-Jean » se range comme « Saint Jean », et « Évangile » tombe entre « Essais » et « Introduction ». ⛔ Le retrait ne vaut QUE pour le classement : le titre affiché garde son article, toujours. ⛔ Un titre qui n’est QUE son article se range sous lui, faute de quoi sa clé serait vide.',
  '⛔ **Le latin n’a pas d’article, et il est ici partout.** Les mots qui sont à la fois articles d’une langue moderne et mots latins ne sont donc pas retirés : `a` (article anglais, mais préposition latine), `de`, `in`, `ex`, `ad`, `pro` (prépositions dans les deux langues), `una` et `uno`. « A solis ortus cardine » se range à A, « De civitate Dei » à D. La liste des mots écartés est CLOSE — français, anglais, allemand — et ne s’étend qu’en connaissance de cause.',
  'À égalité parfaite — même vedette, même prénom, même titre, même sous-titre, même année —, c’est le **rang de la page imprimée** qui départage. ⚠️ `display_order` demeure dans la donnée comme témoin du volume ; ⛔ il n’est plus l’ordre d’affichage.',
].join('\n\n')

const REMPLACEMENTS = [
  {
    nom: 'display_order n’est plus l’ordre d’affichage',
    avant: '`bible_editorial_bibliography_entries` donne l’appartenance à la pièce et l’ordre d’affichage,',
    apres: '`bible_editorial_bibliography_entries` donne l’appartenance à la pièce et le rang de la page imprimée (⚠️ non l’ordre d’affichage, qui se calcule : § 35.6.3),',
  },
  {
    nom: 'section 35.6.3',
    avant: '### 35.7. Les guillemets d’une citation en langue étrangère restent en romain',
    apres: `${SECTION}\n\n### 35.7. Les guillemets d’une citation en langue étrangère restent en romain`,
  },
]

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

let texte = data.valeur
for (const { nom, avant, apres } of REMPLACEMENTS) {
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`motif « ${nom} » : ${n} occurrence(s), 1 attendue.`)
  texte = texte.split(avant).join(apres)
}
console.log(JSON.stringify({
  avant: data.valeur.length, apres: texte.length, delta: texte.length - data.valeur.length,
  essai_seul: essaiSeul,
}, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
