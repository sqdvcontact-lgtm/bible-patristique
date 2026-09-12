/**
 * CONTRÔLE — les `editorial_role` que la base porte et que le site ne sait pas lire.
 *
 * ⛔ Un rôle hors vocabulaire ne casse rien : `libelleTypeNote` rend « Note », et le
 * lecteur ne voit pas la différence avec une note qui n'a jamais été typée. C'est
 * précisément ce qui l'a laissé passer — 1 037 blocs mesurés le 9 septembre 2026,
 * dont 258 notes du traducteur qui s'annonçaient « Note » depuis leur import.
 *
 * ⛔ LE VOCABULAIRE SE LIT DANS LE CODE, jamais recopié ici : `app/lib/typeNote.ts`
 * en est la source, et une copie dans ce script serait la seconde vérité que la
 * charte § 13.12 refuse. Le script échoue plutôt que de deviner si l'extraction rate.
 *
 * Usage : node scripts/controle-roles-notes.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = resolve(import.meta.dirname, '..')
const NL = String.fromCharCode(10)

const source = readFileSync(resolve(racine, 'app/lib/typeNote.ts'), 'utf8')
const bloc = source.match(/export const TYPES_NOTE = \[([\s\S]*?)\] as const/u)
if (!bloc) throw new Error('TYPES_NOTE introuvable dans app/lib/typeNote.ts : le contrôle ne peut pas deviner le vocabulaire.')
const nommes = [...bloc[1].matchAll(/'([a-z_]+)'/gu)].map(m => m[1])
// `critical_apparatus` entre par la constante d'`apparatCritique.ts`, non par un littéral.
// ⛔ Il n'est PLUS une responsabilité (charte § 13.12.1) : `typeNoteSur` le résout vers
// `source_editorial_note`, si bien que le site le lit encore. Il se compte donc à part,
// comme une dette de DONNÉE — ce qui reste à porter au vocabulaire d'aujourd'hui.
const roleApparat = readFileSync(resolve(racine, 'app/lib/apparatCritique.ts'), 'utf8')
  .match(/ROLE_APPARAT_CRITIQUE = '([a-z_]+)'/u)?.[1]
if (!roleApparat) throw new Error('ROLE_APPARAT_CRITIQUE introuvable dans app/lib/apparatCritique.ts.')
const VOCABULAIRE = new Set([...nommes, roleApparat])

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Clé de comptage : le rôle ET le texte. ⚠️ La valeur porte les deux champs, pour
// n'avoir jamais à refendre la clé — un séparateur qu'on relit est un séparateur qui
// se trompera le jour où l'un des deux en contiendra un.
const compte = new Map()
for (let de = 0; ; de += 1000) {
  const { data, error } = await db
    .from('texte_note_blocs').select('id_texte, metadata').range(de, de + 999)
  if (error) throw error
  if (data.length === 0) break
  for (const ligne of data) {
    const role = ligne.metadata?.editorial_role
    if (typeof role !== 'string') continue
    const cle = role + ' @ ' + ligne.id_texte
    const vu = compte.get(cle)
    if (vu) vu.blocs += 1
    else compte.set(cle, { role, texte: ligne.id_texte, blocs: 1 })
  }
  if (data.length < 1000) break
}

const toutes = [...compte.values()].sort((a, b) => b.blocs - a.blocs)
const lignes = toutes.filter(l => !VOCABULAIRE.has(l.role))
const heritees = toutes.filter(l => l.role === roleApparat)

console.log(`Vocabulaire lu dans le code : ${[...VOCABULAIRE].sort().join(', ')}`)

// ⚠️ Une dette, non un défaut : ces blocs SE LISENT (« Note de l’édition »), mais ils
// portent encore une valeur que la charte a dépréciée. Le contrôle les nomme et ne
// tombe pas — la migration appartient à la donnée.
if (heritees.length > 0) {
  const restant = heritees.reduce((n, l) => n + l.blocs, 0)
  console.log(`${NL}⚠️  ${restant} bloc(s) portent encore le rôle déprécié « ${roleApparat} » :`)
  for (const l of heritees) console.log(`  ${String(l.blocs).padStart(5)}  ${l.texte}`)
  console.log(`  → à porter à « source_editorial_note » (charte § 13.12.1).`)
}

if (lignes.length === 0) {
  console.log(`${NL}✅ Aucun rôle hors vocabulaire.`)
  process.exit(0)
}
const total = lignes.reduce((n, l) => n + l.blocs, 0)
console.log(`⛔ ${total} bloc(s) portent un rôle que le site ne sait pas lire, et s'annoncent « Note » :\n`)
for (const l of lignes) console.log(`  ${String(l.blocs).padStart(5)}  ${l.role.padEnd(28)} ${l.texte}`)
process.exitCode = 1
