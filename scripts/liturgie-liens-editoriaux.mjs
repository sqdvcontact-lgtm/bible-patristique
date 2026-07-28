// Passe 1 de la Divine Liturgie de saint Jean Chrysostome (A0014O0001).
// Les références de l'édition ont d'abord été reconstruites en notes [[1]] à
// [[20]]. Ce relevé rattache ensuite chaque fragment effectivement cité au
// créneau sémantique de l'ossature. Il ne produit que des citations de type 1.
//
//   node scripts/liturgie-liens-editoriaux.mjs          # diagnostic seul
//   node scripts/liturgie-liens-editoriaux.mjs --write  # insertion

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierLienMecanique } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0001'

// [segment_id, note éditoriale, ...canon_id]
const RELEVE = [
  [185005, 1, 'PSA.5.8', 'PSA.5.9', 'PSA.5.10'],
  [185006, 1, 'PSA.5.11', 'PSA.5.12'],
  [185007, 1, 'PSA.5.12', 'PSA.5.13'],
  [185015, 2, 'ISA.61.10'],
  [185017, 3, 'EXO.15.6', 'EXO.15.7'],
  [185019, 4, 'PSA.118.73'], // l'édition imprime fautivement « Ps. 110, 73 »
  [185024, 5, 'PSA.132.2'],
  [185029, 6, 'PSA.44.4', 'PSA.44.5'],
  [185032, 7, 'PSA.131.9'],
  [185034, 8, 'PSA.25.6', 'PSA.25.7', 'PSA.25.8'],
  [185035, 8, 'PSA.25.9', 'PSA.25.10', 'PSA.25.11'],
  [185036, 8, 'PSA.25.11', 'PSA.25.12'],
  [185047, 9, 'ISA.53.7'],
  [185049, 10, 'ISA.53.7'],
  [185051, 11, 'ISA.53.8'],
  [185053, 12, 'ISA.53.8'],
  [185056, 13, 'ISA.53.8'],
  [185061, 14, 'JHN.19.34', 'JHN.19.35'],
  [185067, 15, 'PSA.44.10'],
  [185096, 16, 'MAT.2.9'],
  [185099, 17, 'PSA.92.1', 'PSA.92.2'],
  [185100, 17, 'PSA.92.3', 'PSA.92.4'],
  [185101, 17, 'PSA.92.5'],
  [185387, 18, 'PSA.50.20', 'PSA.50.21'],
  [185388, 18, 'PSA.50.21'],
  [185481, 19, 'PSA.50.12'],
  [185483, 20, 'PSA.50.13'],
]

const segmentIds = [...new Set(RELEVE.map(([id]) => id))]
const canonIds = [...new Set(RELEVE.flatMap(([, , ...ids]) => ids))]

const [{ data: segments, error: erreurSegments }, { data: cibles, error: erreurCibles }] = await Promise.all([
  sb.from('segments').select('id, id_oeuvre, segment_numero, segment_texte').in('id', segmentIds),
  sb.from('versets_canon').select('id').in('id', canonIds),
])
if (erreurSegments) throw erreurSegments
if (erreurCibles) throw erreurCibles
if (segments.length !== segmentIds.length || segments.some((s) => s.id_oeuvre !== OEUVRE))
  throw new Error(`Segments attendus : ${segmentIds.length} ; trouvés dans l'œuvre : ${segments.length}`)
if (cibles.length !== canonIds.length) {
  const trouves = new Set(cibles.map((v) => v.id))
  throw new Error(`Cibles absentes : ${canonIds.filter((id) => !trouves.has(id)).join(', ')}`)
}

const liens = RELEVE.flatMap(([segment_id, note, ...ids]) => ids.map((canon_id) => ({
  segment_id,
  canon_id,
  type: 1,
  fiabilite: 'probable',
  provenance: 'editeur',
  arbitrage_requis: false,
  motif: `Citation liturgique identifiée par la référence éditoriale [[${note}]] ; cible contrôlée sur le contenu dans l'ossature.`,
})))
liens.forEach(verifierLienMecanique)

const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type').in('segment_id', segmentIds)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map((l) => `${l.segment_id}|${l.canon_id}|${l.type}`))
const aEcrire = liens.filter((l) => !deja.has(`${l.segment_id}|${l.canon_id}|${l.type}`))

console.log(`${OEUVRE} : ${liens.length} liens type 1 attendus sur ${segmentIds.length} segments.`)
console.log(`${aEcrire.length} à écrire ; ${liens.length - aEcrire.length} déjà présents.`)
for (const l of liens) console.log(`${l.segment_id}\t${l.canon_id}\t[[${l.motif.match(/\[\[(\d+)\]\]/)[1]}]]`)

if (!WRITE) {
  console.log('\nDiagnostic terminé : aucune écriture. Relancer avec --write.')
  process.exit(0)
}

if (aEcrire.length) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire)
  if (error) throw error
}

const maintenant = new Date().toISOString()
const { error: erreurMarquage } = await sb.from('segments').update({
  liens_revus_le: maintenant,
  liens_revus_par: 'Codex (IA) — passe 1 références éditoriales',
}).in('id', segmentIds)
if (erreurMarquage) throw erreurMarquage

console.log(`\n✓ ${aEcrire.length} liens écrits ; ${segmentIds.length} segments de la passe marqués comme relus.`)
