// Ce qu'un visiteur SANS SESSION — donc un robot d'indexation — obtient de la base.
//
// C'est la question qui commande tout le référencement : des métadonnées posées
// sur une page vide ne valent rien, et Google traite la page vide en *soft 404*,
// qu'il sanctionne plus durement qu'une page absente.
//
// ⚠️ `permission denied for table` n'est PAS un refus de RLS : c'est le GRANT qui
// manque, en deçà de toute politique. Une politique `{public}` peut donc exister
// et ne servir à rien — c'est le cas de « Lecture publique des auteurs ».
//
// Relevé du 2026-08-25 : seules `traductions`, `essais` et `versets_canon`
// répondent. Voir AGENTS.md, « Référencement — la liste de l'OUVERTURE », point 1.
//
//   node --env-file=.env.local scripts/audit-lecture-anonyme.mjs

import { createClient } from '@supabase/supabase-js'

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
)

// Une colonne au hasard suffit : on éprouve le DROIT, non le contenu.
const EPREUVES = [
  ['auteurs', 'nom'],
  ['traductions', 'trad_id'],
  ['livres', 'code'],
  ['essais', 'id'],
  ['versets_canon', 'id'],
  ['versets_v2  (le texte biblique)', 'id', 'versets_v2'],
  ['versets_lecture  (le texte biblique)', 'id_verset', 'versets_lecture'],
  ['oeuvres', 'id_oeuvre'],
  ['oeuvre_textes', 'id_texte'],
  ['segments  (le texte patristique)', 'id', 'segments'],
  ['liens_bibliques', 'id'],
  ['pericopes', 'id'],
  ['pericope_occurrences', 'id'],
  ['pericope_noms', 'id'],
]

console.log('\nLECTURE ANONYME — la position d’un robot d’indexation\n')
let refusees = 0
for (const [libelle, colonne, table] of EPREUVES) {
  const { data, error } = await anon.from(table ?? libelle).select(colonne).limit(1)
  if (error) refusees++
  const verdict = error
    ? `⛔ REFUSÉ  (${error.message})`
    : data?.length ? '✅ lisible' : '⚠️  autorisé mais vide'
  console.log(`  ${libelle.padEnd(40)} ${verdict}`)
}
console.log(`\n  ${refusees} table(s) sur ${EPREUVES.length} refusée(s) à un robot.\n`)
