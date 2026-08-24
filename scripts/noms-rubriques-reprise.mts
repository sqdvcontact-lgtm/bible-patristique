// Reprise des noms d'auteurs en trois rubriques (nom de famille, prénom, pseudonyme)
//
//   npx tsx scripts/noms-rubriques-reprise.ts            → rapport seul, n'écrit rien
//   npx tsx scripts/noms-rubriques-reprise.ts --ecrire   → écrit les fiches non remplies
//   npx tsx scripts/noms-rubriques-reprise.ts --ecrire --force  → réécrit aussi les remplies
//
// Ne touche JAMAIS `auteurs_valeur.nom` : cette colonne est la forme affichée et la clé
// de rapprochement avec les noms des notices. Garde-fou en conséquence : une fiche n'est
// écrite que si `composerNom(parties)` redonne EXACTEMENT le `nom` de départ. Le
// découpage ne fait que reconnaître des morceaux dans une chaîne, il ne la réécrit pas,
// et la reprise ne peut donc changer aucun affichage.
//
// Les auteurs anciens et les collectifs ne sont pas concernés : ils n'ont pas de fiche
// dans `auteurs_valeur` (charte, §29.1), et leur nom reste d'un seul tenant sur leur
// ligne de contributeur, où `nature_personne` dit déjà ce qu'il est.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { decouperNom, composerNom } from '../app/lib/nomsPersonnes'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m![1], m![2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const ECRIRE = process.argv.includes('--ecrire')
const FORCE = process.argv.includes('--force')

type Fiche = { id: number; nom: string; prenom: string | null; nom_famille: string | null; pseudonyme: string | null }

const { data, error } = await sb
  .from('auteurs_valeur')
  .select('id, nom, prenom, nom_famille, pseudonyme')
  .order('nom')
if (error) { console.error('Lecture refusée :', error.message); process.exit(1) }
const fiches = (data ?? []) as Fiche[]

const dejaRemplies: Fiche[] = []
const aEcrire: { id: number; nom: string; prenom: string | null; nom_famille: string | null; pseudonyme: string | null; douteux: boolean; raison: string | null }[] = []
const refusees: { nom: string; recompose: string }[] = []

for (const f of fiches) {
  const remplie = !!(f.prenom || f.nom_famille || f.pseudonyme)
  if (remplie && !FORCE) { dejaRemplies.push(f); continue }
  const d = decouperNom(f.nom)
  const parties = { prenom: d.prenom, nom: d.nom, pseudonyme: d.pseudonyme }
  // Garde-fou : la recomposition doit redonner le nom affiché, au caractère près.
  const recompose = composerNom(parties)
  if (recompose !== f.nom.replace(/'/g, '’').replace(/\s+/g, ' ').trim()) {
    refusees.push({ nom: f.nom, recompose })
    continue
  }
  aEcrire.push({ id: f.id, nom: f.nom, prenom: d.prenom, nom_famille: d.nom, pseudonyme: d.pseudonyme, douteux: d.douteux, raison: d.raison })
}

const douteuses = aEcrire.filter(x => x.douteux)

console.log(`\n── Fiches d'auteurs (auteurs_valeur) ──────────────────────────────`)
console.log(`  total                 ${fiches.length}`)
console.log(`  déjà remplies         ${dejaRemplies.length}`)
console.log(`  à écrire              ${aEcrire.length}`)
console.log(`  dont à contrôler      ${douteuses.length}`)
console.log(`  refusées (garde-fou)  ${refusees.length}`)

if (refusees.length) {
  console.log(`\n⛔ Refusées : la recomposition ne redonne pas le nom affiché.`)
  for (const r of refusees) console.log(`   « ${r.nom} » → « ${r.recompose} »`)
}

if (douteuses.length) {
  console.log(`\n⚠️  À contrôler (${douteuses.length}) — le découpage est une proposition :`)
  for (const d of douteuses) {
    const parts = d.pseudonyme ? `pseudonyme « ${d.pseudonyme} »` : `« ${d.prenom ?? ''} » + « ${d.nom_famille ?? ''} »`
    console.log(`   ${d.nom.padEnd(38)} ${parts}\n      ${d.raison}`)
  }
}

if (!ECRIRE) {
  console.log(`\nRapport seul. Relancer avec --ecrire pour appliquer.\n`)
  process.exit(0)
}

let ecrites = 0
for (const x of aEcrire) {
  const { error: e } = await sb.from('auteurs_valeur')
    .update({ prenom: x.prenom, nom_famille: x.nom_famille, pseudonyme: x.pseudonyme })
    .eq('id', x.id)
  if (e) { console.error(`   ✕ ${x.nom} : ${e.message}`); continue }
  ecrites++
}
console.log(`\n✓ ${ecrites} fiches écrites sur ${aEcrire.length}.\n`)

// ⚠️ Ce script ne s'occupe QUE des fiches d'auteurs. Les noms qui ne paraissent que dans
// le texte libre d'une notice, sans fiche ni ligne de contributeur, sont recensés par
// `scripts/noms-orphelins.mts` et ne sont PAS créés ici : donner une fiche à un auteur
// non noté fait retomber son ouvrage à « à vérifier »
// (internal.calculer_statut_scientifique_ouvrage). C'est un arbitrage éditorial.
