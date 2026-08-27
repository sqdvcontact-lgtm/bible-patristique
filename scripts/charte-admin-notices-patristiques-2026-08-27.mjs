/**
 * § 15.5 : les notices patristiques se replient aussi dans l'administration, et
 * n'y reçoivent que les boutons qui les concernent.
 * Décision de l'auteur du 27 août 2026 : « ça apparaît toujours dans ma liste de
 * traductions bibliques (admin) ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-admin-notices-patristiques-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Un invariant interdit désormais la ligne incohérente plutôt que de la surveiller — une traduction non biblique ne peut pas porter de schéma de numérotation, puisqu’un schéma décrit une versification et qu’il n’y en a pas hors de la Bible.'

const AJOUT = `

⚠️ **L’ADMINISTRATION suit la même règle que les pages publiques.** La section « Traductions » est la liste des traductions BIBLIQUES : les quatre notices patristiques y sont repliées, derrière une ligne qui les compte, et viennent en fin de liste lorsqu’on les déplie — leur \`ordre\` les aurait dispersées au milieu. ⛔ Et elles ne reçoivent que les boutons qui les concernent : l’édition et l’apparat, la modification, la suppression. Le dépôt d’un bandeau, celui d’un encart, le cadrage, l’export en CSV et le remplacement des versets leur sont retirés — elles ne paraissent sur aucune page publique et n’ont pas de versets. Un bouton offert et sans effet est une promesse fausse.`

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
if (avant.includes('L’ADMINISTRATION suit la même règle')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
