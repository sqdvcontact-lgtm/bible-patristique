/**
 * § 13.12, décision 11 : l'élargissement aux romains minuscules est SERVI, et il
 * a fait paraître une borne que la charte ne portait pas — aucun livre du canon
 * n'a plus de 150 chapitres.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-borne-chapitre-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'AUCUN LIVRE DU CANON N’A PLUS DE 150 CHAPITRES'

const ANCRE = 'Vérifié sur la vraie fonction : « Cor. XV, 22 » et « Ibid. V, 12 » ne bougent pas. ⚠️ Chaque bloc touché se signale, pour un contrôle par sondage.'

const SECTION = ANCRE + `

✅ **SERVI le 5 septembre 2026**, et la mesure sur le corpus a fait paraître une borne que la charte ne portait pas. Le motif élargi rend **264 réécritures neuves et n’en perd aucune** ; les 235 formes distinctes ont été relues une par une, et toutes sont justes.

⛔ **AUCUN LIVRE DU CANON N’A PLUS DE 150 CHAPITRES**, le Psautier étant le plus long. Un nombre au-delà ne désigne donc rien : c’est le signe que le motif a lu comme un chiffre romain ce qui n’en est pas un. Sans cette borne, l’élargissement fabriquait **six corruptions** — « na m. 2 » rendu « Na 1000, 2 », et « Psalm. 77. » rendu « Ps 1000, 77 », où le « m » d’un mot est pris pour mille. ⚠️ Elle ne coûte rien à l’existant : des 4 038 réécritures d’avant, **pas une** ne dépassait 150.

⚠️ **LE MOTIF RECULE DANS LE MOT QUI PRÉCÈDE, et il faut le lui laisser.** C’est ce recul qui rend « Abdi. 1 » lisible — « Abd » et « i » font Abdias, chapitre 1, et le livre n’en a qu’un. Le lui interdire par un groupe atomique paraissait le remède au « Psalm. 77 » ; mesuré, cela coûterait **treize réécritures justes** et n’écarterait aucune corruption que la borne n’écarte déjà. *Une garde se choisit sur ce qu’elle coûte, non sur ce qu’elle a l’air de protéger.*

⚠️ **Trois sources sont elles-mêmes fautives, et le normaliseur les recopie fidèlement** : « I Cor. xxv, 24 » (la première épître aux Corinthiens n’a que seize chapitres), « I Thess. vi, 12 » (cinq chapitres), « Ap. v, 15 » (le chapitre 5 n’a que quatorze versets). ⛔ On ne CORRIGE pas une référence : on la recompose. Ce sont trois cas pour le sondage, non trois défauts du motif.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_borne_chapitre'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
