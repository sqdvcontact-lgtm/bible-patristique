// VERSEMENT DES CAS DE L'AUDIT STRUCTUREL DANS `points_sensibles`.
//
//   node scripts/points-sensibles-verser-audit-structure.mjs --fichier audit/points-sensibles-proposes-2026-09-07.json
//   … --ecrire        # sans quoi il ne fait que dire ce qu'il ferait
//   … --remplacer     # retire d'abord les lignes du même relevé (idempotent)
//
// ⛔ L'audit PROPOSE, ce script VERSE, et les deux gestes restent séparés : on relit le
// rapport avant d'écrire dans la liste que la Polyglotte teint en rouge.
//
// ⚠️ Toute ligne versée porte sa provenance dans `notes` (voir MARQUE) : le lot entier se
// retrouve et se retire d'une requête, ce qui est la condition pour qu'une passe de
// relevé automatique n'abîme jamais les 210 points écrits à la main.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const arg = (nom, def) => { const i = process.argv.indexOf(nom); return i >= 0 ? process.argv[i + 1] : def }
const FICHIER = arg('--fichier', null)
const ECRIRE = process.argv.includes('--ecrire')
const REMPLACER = process.argv.includes('--remplacer')

if (!FICHIER) {
  console.error('Usage : --fichier audit/points-sensibles-proposes-<date>.json [--ecrire] [--remplacer]')
  process.exit(1)
}

/** La marque de provenance, qui rend le lot retrouvable et réversible. */
const MARQUE = 'scripts/audit-structure-versets.mjs'

const lignes = JSON.parse(readFileSync(FICHIER, 'utf8'))
if (!Array.isArray(lignes) || !lignes.length) { console.error('Fichier vide.'); process.exit(1) }
for (const l of lignes) {
  if (!l.notes?.includes(MARQUE)) { console.error(`Ligne sans marque de provenance : ${l.reference}`); process.exit(1) }
}

const { data: dejaLa, error: erLecture } = await sb
  .from('points_sensibles').select('id').like('notes', `%${MARQUE}%`)
if (erLecture) { console.error(`Lecture de points_sensibles : ${erLecture.message}`); process.exit(1) }

console.log(`  ${lignes.length} cas à verser.`)
console.log(`  ${dejaLa.length} lignes du même relevé déjà en base.`)

if (dejaLa.length && !REMPLACER) {
  console.error('\n  ⛔ Le relevé est déjà versé. Ajouter --remplacer pour le refaire, ou ne rien faire.')
  process.exit(1)
}

const parStatut = new Map()
for (const l of lignes) parStatut.set(l.statut, (parStatut.get(l.statut) || 0) + 1)
for (const [s, n] of [...parStatut].sort((a, b) => b[1] - a[1])) console.log(`    ${s.padEnd(12)} ${n}`)

// ⚠️ Pas de `process.exit(0)` sur le chemin nominal : le client Supabase garde des
// handles ouverts, et Windows lève alors une assertion libuv à la sortie forcée.
if (!ECRIRE) console.log('\n  (simulation — ajouter --ecrire pour verser)')
else await verser()

async function verser() {
if (dejaLa.length) {
  const { error } = await sb.from('points_sensibles').delete().like('notes', `%${MARQUE}%`)
  if (error) { console.error(`Retrait du relevé précédent : ${error.message}`); process.exit(1) }
  console.log(`  ${dejaLa.length} lignes du relevé précédent retirées.`)
}

// Par lots : une insertion de 424 lignes de prose passe mal en une requête.
const LOT = 50
let verses = 0
for (let i = 0; i < lignes.length; i += LOT) {
  const { error } = await sb.from('points_sensibles').insert(lignes.slice(i, i + LOT))
  if (error) { console.error(`Insertion (lot ${i / LOT + 1}) : ${error.message}`); process.exit(1) }
  verses += Math.min(LOT, lignes.length - i)
  process.stdout.write(`\r  ${verses} versées…`)
}
process.stdout.write('\n')

const { count, error: erControle } = await sb
  .from('points_sensibles').select('id', { count: 'exact', head: true }).like('notes', `%${MARQUE}%`)
if (erControle) { console.error(`Contrôle : ${erControle.message}`); process.exit(1) }
console.log(`  contrôle : ${count} lignes portent la marque du relevé.`)
if (count !== lignes.length) { console.error('  ⛔ Compte inattendu.'); process.exit(1) }
}
