/**
 * § 7.4 : l'alinéa poétique se LIT, et l'échelle en compte CINQ.
 *
 * Défaut relevé par l'auteur le 31 août 2026 : `RANG_MAX = 3` écrasait le quatrième
 * cran de Mirandol, dont la recollation venait de renseigner les 1 092 vers.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-alinea-cinq-rangs-2026-08-31.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '#### Le texte biblique attend sa donnée'
const TITRE = "#### L'alinéa poétique se LIT, et l'échelle en compte CINQ"

const AJOUT = `${TITRE}

⛔ **Il ne se DEVINE pas.** La règle d'avant le déduisait de la parité du rang — le
second vers du distique est rentré —, et mesurée sur Boèce elle était juste pour un
dixième des vers, fausse pour tout le reste. C'est l'océrisation qui le porte :
\`segment_metadata.indent_inches\` donne la position du bord gauche de chaque ligne sur
la page imprimée. ⚠️ C'est une MESURE, non un rang, et elle se rabat POÈME PAR POÈME —
deux poèmes posés à des places différentes n'ont pas la même origine, et ce qui compte
est l'écart de chaque ligne au bord gauche de SON poème.

⛔ **L'échelle compte CINQ positions, et le plafond doit les admettre toutes** : le fer,
puis \`Em1\` à \`Em4\`, un quart de pouce par cran. \`RANG_MAX\` a valu 3 jusqu'au
31 août 2026, soit un rang de trop peu. ⚠️ **Un plafond ne borne pas une échelle, il
ÉCRASE** : tout ce qui dépasse retombe sur le dernier rang, et deux niveaux que
l'édition distingue se composent au même retrait.

Le cas est le mètre XIV du Livre quatrième chez Mirandol, seul poème du corpus où les
quatre rentrées coexistent — 16 vers au fer, 5 à 0,25 pouce, 10 à 0,50, 4 à 0,75 et 6 à
1,00. Les six derniers se composaient comme les quatre précédents. ⛔ **Le remède n'est
pas de rabattre les mesures** : les cinq niveaux sont attestés par le témoin, et les
1 092 vers de Mirandol sont renseignés ligne à ligne depuis la recollation.

⚠️ **Un plafond fait un SECOND travail, qu'il ne faut pas lui découvrir par surprise :
il borne aussi le rabattage d'une océrisation bruitée.** Chez Ceriziers 1646, dont les
mesures sont continues — 206 valeurs de 0,003 à 0,864 pouce —, la construction des
paliers monte jusqu'au rang 6, et le passage de 3 à 4 y déplace **99 vers sur 1 213,
dans 13 poèmes**, d'un pas vers la droite. Mirandol, dont les mesures sont propres, n'en
déplace que les six vers du mètre en cause. **Un plafond plus haut ne se pose qu'après
avoir compté ce qu'il libère.**

⚠️ **La largeur se MESURE, elle ne se ressent pas** — comme celle des colonnes de la
lecture en regard (§ 12.2). Le rang 4 vaut 7,5 em de retrait, base comprise. Les 3 231
vers de Boèce rendus un par un sans enroulement : les six vers de rang 4 du mètre XIV
demandent 221 à 243 px quand la plus étroite colonne française en offre 354. Le nouveau
plafond n'ajoute aucun enroulement en lecture ordinaire ni en bilingue ; il en ajoute un
en traductions parallèles et six sur mobile, tous chez Ceriziers. ⚠️ Ce n'est pas un
hasard : une édition rentre les vers COURTS, et un retrait profond tombe donc sur une
ligne brève.

`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes(TITRE)) { console.log('Déjà posé.'); process.exit(0) }

const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(AJOUT + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// Sauvegarde de la ligne avant écriture, comme la charte l'exige.
const cleSauvegarde = 'charte_ia_sauvegarde_20260831_avant_alinea_cinq_rangs'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(TITRE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
