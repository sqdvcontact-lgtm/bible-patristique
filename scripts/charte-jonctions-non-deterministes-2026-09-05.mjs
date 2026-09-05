/**
 * Registre GPT ↔ Claude : la règle annoncée le matin même ne tient pas.
 *
 * La charte disait que la famille des 4 476 jonctions `join_before` fautives
 * « attend une passe dédiée, déterministe ». La passe a été montée puis
 * abandonnée dans la journée : arbitrée par un lexique du corpus, elle
 * corromprait à peu près autant de jonctions qu'elle en réparerait. On corrige
 * la charte plutôt que de laisser une règle fausse attendre son exécutant.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-jonctions-non-deterministes-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'LE RESTE DE LA FAMILLE NE SE RÉPARE PAS PAR RÈGLE'

const ANCRE = 'Les quatre jonctions du périmètre de Mt 1,25 ont été corrigées le 5 septembre 2026 ; le reste de la famille attend une passe dédiée, déterministe, dont la règle est celle rappelée ici.'

const SECTION = `Les quatre jonctions du périmètre de Mt 1,25 ont été corrigées le 5 septembre 2026, à la lecture.

⛔ **LE RESTE DE LA FAMILLE NE SE RÉPARE PAS PAR RÈGLE.** La passe déterministe a été montée le jour même, puis abandonnée avant toute écriture, mesure à l’appui. Les 4 476 contradictions ont été arbitrées par un lexique bâti sur les mots INTÉRIEURS de ligne, qui ne sont jamais coupés par une fin de ligne : 17 247 formes, 318 595 occurrences. **2 635 se tranchent, et le balisage a tort 1 244 fois quand la donnée courante a tort 1 391 fois.** Ni \`join_before\` ni \`break="no"\` ne fait donc autorité : une passe fondée sur l’une ou sur l’autre corromprait à peu près autant de jonctions qu’elle en réparerait. Sur quatorze cas tirés au sort dans le sens « poser une espace », sept brisaient un mot juste — \`lamoit\`, \`sacorde\`, \`anceles\`, \`deniers\`, \`demandassent\`, \`phelipe\`, \`uenanz\`.

⚠️ **Le sous-ensemble sûr existe, et il est étroit.** 469 jonctions où la forme soudée est attestée, où une des deux moitiés n’est pas un mot, et où la donnée pose pourtant une espace : le lecteur y voit un mot brisé, et le remède ne fait aucun doute. Les 922 cas inverses sont probables et moins sûrs, une forme soudée rare pouvant n’être attestée nulle part ailleurs — \`suruinrent\` en est l’exemple. Restent 1 058 ambigus et 783 indécidables, qui demandent une lecture. Le plan et son arbitrage sont conservés dans \`internal.backup_bible899_join_before_20260905_plan\`, une ligne par jonction avec les deux mots, la forme soudée et leurs fréquences ; le lexique dans \`internal.bible899_lexique_mots_interieurs_20260905\`.

⚠️ *Une mesure qui valide une règle dans un sens ne la valide pas dans l’autre.* Le contrôle de falsification employé d’abord — 98,9 % des lignes portant \`break="no"\` finissent par une lettre — était juste et ne prouvait rien du cas symétrique, celui des lignes qui auraient dû le porter et ne le portent pas. C’est là que le balisage se trompe le plus.`

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
const apres = avant.split(ANCRE).join(SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_jonctions_non_deterministes'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
