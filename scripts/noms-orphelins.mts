// Noms nommés sur une notice et rattachés à rien
//
//   npx tsx scripts/noms-orphelins.mts
//
// Un ouvrage porte ses auteurs à DEUX endroits, et les deux ne disent pas la même chose :
//  · le texte libre de la notice (`ouvrages_bibliographiques.auteurs / directeurs /
//    traducteurs`), qui est la liste FIDÈLE et complète ;
//  · les lignes de `ouvrage_contributeurs_scientifiques`, qui sont la normalisation
//    PARTIELLE de cette liste, celle qui entre dans le calcul de la valeur.
//
// Ce script recense les noms du premier qui n'ont d'écho ni dans le second, ni dans les
// fiches d'auteurs. Il ne crée rien, et c'est délibéré : donner une fiche à un auteur non
// noté fait retomber son ouvrage à « à vérifier »
// (internal.calculer_statut_scientifique_ouvrage, branche `auteur_non_evalue`). Combler
// ces trous est un arbitrage éditorial, pas une reprise mécanique.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { separerNoms } from '../app/lib/nomsPersonnes'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m![1], m![2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

type Ouvrage = { id: number; titre: string; auteurs: string | null; directeurs: string | null; traducteurs: string | null }

const [{ data: ouvrages }, { data: fiches }, { data: contribs }] = await Promise.all([
  sb.from('ouvrages_bibliographiques').select('id, titre, auteurs, directeurs, traducteurs').order('titre'),
  sb.from('auteurs_valeur').select('nom'),
  sb.from('ouvrage_contributeurs_scientifiques').select('nom_affiche'),
])

const connus = new Set<string>()
for (const f of (fiches ?? []) as { nom: string }[]) connus.add(f.nom)
for (const c of (contribs ?? []) as { nom_affiche: string }[]) connus.add(c.nom_affiche)

const orphelins = new Map<string, { role: string; ouvrages: { id: number; titre: string }[] }>()
for (const o of (ouvrages ?? []) as Ouvrage[]) {
  for (const [role, brut] of [['auteur', o.auteurs], ['directeur', o.directeurs], ['traducteur', o.traducteurs]] as const) {
    for (const nom of separerNoms(brut ?? '')) {
      if (connus.has(nom)) continue
      const e = orphelins.get(nom) ?? { role, ouvrages: [] }
      e.ouvrages.push({ id: o.id, titre: o.titre })
      orphelins.set(nom, e)
    }
  }
}

const tries = [...orphelins.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
console.log(`\n── Noms de notice rattachés à rien : ${tries.length} ─────────────────\n`)
for (const [nom, e] of tries) {
  console.log(`  ${nom}  (${e.role}, ${e.ouvrages.length} ouvrage${e.ouvrages.length > 1 ? 's' : ''})`)
  for (const o of e.ouvrages.slice(0, 3)) console.log(`      #${o.id} ${o.titre.slice(0, 72)}`)
  if (e.ouvrages.length > 3) console.log(`      … et ${e.ouvrages.length - 3} autres`)
}
console.log('')
