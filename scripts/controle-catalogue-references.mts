/**
 * CONTRÔLE — le catalogue lit-il bien sa RÉFÉRENCE ? (charte § 47.8)
 *
 * Depuis la fusion du 23 septembre 2026, chaque notice de `catalogue_notices` porte
 * `ouvrage_id`, et la Bibliothèque comme la fiche d'un auteur lisent les champs
 * bibliographiques dans la référence (`app/lib/catalogueReference.ts`). Ce script dit :
 *
 *   1. les notices ORPHELINES : sans `ouvrage_id`, ou dont la référence manque à la vue
 *      du moteur. Ce sont elles qui s'affichent EN REPLI, sur les champs de l'annexe ;
 *   2. les références qui ne disent pas `catalogue` dans `apparait_dans` ;
 *   3. les références PARTAGÉES par plusieurs notices, où la référence peut dire autre
 *      chose que chacune ;
 *   4. les DIVERGENCES entre l'annexe et la référence, champ par champ, telles que la
 *      liste les rend (`mentionsEditionCatalogue`, la fonction de la page).
 *
 * ⛔ Il n'écrit RIEN. Corriger une divergence est un travail de donnée, sur décision.
 *
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/controle-catalogue-references.mts [--visibles] [--exemples=8]
 *
 * `--visibles` borne le relevé aux notices que la Bibliothèque montre (ni sur le site,
 * ni refusées). Sort en 1 s'il reste une orpheline parmi elles.
 */
import { createClient } from '@supabase/supabase-js'

import {
  mentionsEditionCatalogue,
  referencesParNotice,
  SELECTION_REFERENCE_CATALOGUE,
  type LigneReferenceCatalogue,
} from '@/app/lib/catalogueReference'
import { chargerPagesEnParallele } from '@/app/lib/paginationSupabase'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
const sb = createClient(url, cle, { auth: { persistSession: false } })

const argument = (nom: string) => process.argv.find(a => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=')
const VISIBLES = process.argv.includes('--visibles')
const EXEMPLES = Number(argument('exemples') ?? 8)

type Annexe = {
  id: number
  id_ligne: string | null
  auteur: string | null
  titre_stable: string | null
  titre_edition: string | null
  traducteur: string | null
  editeur: string | null
  annee_edition: number | null
  date_edition_affichage_courte: string | null
  date_edition_precision_affichage: string | null
  siecle_edition_affichage: string | null
  presence_sur_le_site: boolean | null
  refuse_admin: boolean | null
}

function filtrer<T extends { eq: (c: string, v: unknown) => T }>(q: T): T {
  return VISIBLES ? q.eq('presence_sur_le_site', false).eq('refuse_admin', false) : q
}

const [annexes, lignesRef, liens, apparait] = await Promise.all([
  chargerPagesEnParallele<Annexe>((d, f) => filtrer(sb.from('v_catalogue_notices_dates')
    .select('id, id_ligne, auteur, titre_stable, titre_edition, traducteur, editeur, annee_edition, date_edition_affichage_courte, date_edition_precision_affichage, siecle_edition_affichage, presence_sur_le_site, refuse_admin'))
    .order('id').range(d, f)),
  chargerPagesEnParallele<LigneReferenceCatalogue>((d, f) => filtrer(sb.from('catalogue_notices')
    .select(SELECTION_REFERENCE_CATALOGUE)).order('id').range(d, f)),
  chargerPagesEnParallele<{ id: number; ouvrage_id: number | null }>((d, f) => filtrer(sb.from('catalogue_notices')
    .select('id, ouvrage_id')).order('id').range(d, f)),
  chargerPagesEnParallele<{ id: number; apparait_dans: string[] | null }>((d, f) => sb.from('ouvrages_bibliographiques')
    .select('id, apparait_dans').order('id').range(d, f)),
])

const references = referencesParNotice(lignesRef)
const ouvrageDe = new Map(liens.map(l => [l.id, l.ouvrage_id]))
const surfaces = new Map(apparait.map(o => [o.id, o.apparait_dans ?? []]))

const nom = (a: Annexe) => `${a.id} ${a.id_ligne ?? ''} — ${a.auteur ?? '?'}, ${a.titre_stable ?? '?'}`

// 1. Orphelines
const sansCle = annexes.filter(a => ouvrageDe.get(a.id) == null)
const sansVue = annexes.filter(a => ouvrageDe.get(a.id) != null && !references.has(a.id))

// 2. Références qui ne se déclarent pas au catalogue
const horsCatalogue = annexes.filter(a => {
  const o = ouvrageDe.get(a.id)
  return o != null && !(surfaces.get(o) ?? []).includes('catalogue')
})

// 3. Références partagées
const parOuvrage = new Map<number, number[]>()
for (const a of annexes) {
  const o = ouvrageDe.get(a.id)
  if (o != null) parOuvrage.set(o, [...(parOuvrage.get(o) ?? []), a.id])
}
const partagees = [...parOuvrage.values()].filter(ids => ids.length > 1)

// 4. Divergences, telles que la liste les rend
type Champ = 'traducteur' | 'editeur' | 'date'
const divergences: Record<Champ, { a: Annexe; avant: string | null; apres: string | null }[]> = { traducteur: [], editeur: [], date: [] }
for (const a of annexes) {
  const reference = references.get(a.id)
  if (!reference) continue
  const avant = mentionsEditionCatalogue(a, null)
  const apres = mentionsEditionCatalogue(a, reference)
  for (const champ of ['traducteur', 'editeur', 'date'] as const) {
    if ((avant[champ] ?? null) !== (apres[champ] ?? null)) divergences[champ].push({ a, avant: avant[champ], apres: apres[champ] })
  }
}

const exemples = <T,>(liste: T[], rendre: (x: T) => string) =>
  liste.slice(0, EXEMPLES).map(x => `    · ${rendre(x)}`).join('\n') + (liste.length > EXEMPLES ? `\n    … et ${liste.length - EXEMPLES} de plus` : '')

console.log(`Catalogue et référence — ${VISIBLES ? 'notices visibles' : 'toutes les notices'} : ${annexes.length}`)
console.log(`  références lues : ${references.size}`)
console.log(`\n1. Orphelines (affichées en repli) : ${sansCle.length + sansVue.length}`)
if (sansCle.length) console.log(`  sans ouvrage_id : ${sansCle.length}\n${exemples(sansCle, nom)}`)
if (sansVue.length) console.log(`  référence absente de la vue : ${sansVue.length}\n${exemples(sansVue, nom)}`)
console.log(`\n2. Références sans « catalogue » dans apparait_dans : ${horsCatalogue.length}`)
if (horsCatalogue.length) console.log(exemples(horsCatalogue, a => `${nom(a)} → ouvrage ${ouvrageDe.get(a.id)}`))
console.log(`\n3. Références partagées : ${partagees.length} (${partagees.reduce((n, ids) => n + ids.length, 0)} notices)`)
console.log('\n4. Ce que la lecture de la référence change à l’écran :')
for (const champ of ['traducteur', 'editeur', 'date'] as const) {
  const liste = divergences[champ]
  console.log(`  ${champ} : ${liste.length}`)
  if (liste.length) console.log(exemples(liste, d => `${nom(d.a)} : « ${d.avant ?? '∅'} » → « ${d.apres ?? '∅'} »`))
}

if (VISIBLES && sansCle.length + sansVue.length > 0) process.exitCode = 1
