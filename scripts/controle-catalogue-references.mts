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
 *   4. les notices d'EXCEPTION (`EXCEPTIONS_REFERENCE_CATALOGUE`), qui retombent sur
 *      leurs propres champs parce que leur référence est fausse ou incomplète, et celles
 *      dont la référence ne diverge plus (l'exception est alors à retirer) ;
 *   5. les DIVERGENCES entre l'annexe et la référence, champ par champ, telles que la
 *      liste les rend (`mentionsEditionCatalogue`, la fonction de la page).
 *
 * ⛔ Il n'écrit RIEN. Corriger une divergence est un travail de donnée, sur décision.
 *
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/controle-catalogue-references.mts [--visibles] [--exemples=8] [--exceptions]
 *
 * `--visibles` borne le relevé aux notices que la Bibliothèque montre (ni sur le site,
 * ni refusées). `--exceptions` liste TOUTES les notices d'exception, avec ce que
 * l'annexe et la référence disent : c'est la liste à transmettre pour corriger les
 * références. Sort en 1 s'il reste une orpheline parmi les notices visibles.
 */
import { createClient } from '@supabase/supabase-js'

import {
  EXCEPTIONS_REFERENCE_CATALOGUE,
  LIBELLES_MOTIF_EXCEPTION,
  mentionsEditionCatalogue,
  motifDException,
  type MotifException,
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
const LISTER_EXCEPTIONS = process.argv.includes('--exceptions')

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
const referencesBrutes = referencesParNotice(lignesRef, { avecExceptions: true })
const ouvrageDe = new Map(liens.map(l => [l.id, l.ouvrage_id]))
const surfaces = new Map(apparait.map(o => [o.id, o.apparait_dans ?? []]))

const nom = (a: Annexe) => `${a.id} ${a.id_ligne ?? ''} — ${a.auteur ?? '?'}, ${a.titre_stable ?? '?'}`

// 1. Orphelines
const sansCle = annexes.filter(a => ouvrageDe.get(a.id) == null)
const sansVue = annexes.filter(a => ouvrageDe.get(a.id) != null && !referencesBrutes.has(a.id))

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
const tradPropre = annexes.filter(a => references.get(a.id)?.partagee && (a.traducteur ?? '').trim()
  && mentionsEditionCatalogue(a, references.get(a.id)).traducteur !== mentionsEditionCatalogue(a, { ...references.get(a.id)!, partagee: false }).traducteur)

// 4. Exceptions
const parId = new Map(annexes.map(a => [a.id, a]))
type EtatException = { id: number; motif: MotifException; a: Annexe | undefined; diverge: boolean | null; ref: string; annexe: string }
const exceptions: EtatException[] = (Object.entries(EXCEPTIONS_REFERENCE_CATALOGUE) as [MotifException, readonly number[]][])
  .flatMap(([motif, ids]) => ids.map(id => {
    const a = parId.get(id)
    const brute = referencesBrutes.get(id)
    if (!a || !brute) return { id, motif, a, diverge: null, ref: '∅', annexe: '∅' }
    const av = mentionsEditionCatalogue(a, null)
    // La référence se juge ELLE-MÊME : la règle du volume partagé ne la corrige pas.
    const ap = mentionsEditionCatalogue(a, { ...brute, partagee: false })
    const diverge = av.traducteur !== ap.traducteur || av.editeur !== ap.editeur
    return { id, motif, a, diverge, ref: `${ap.traducteur ?? '∅'} · ${ap.editeur ?? '∅'}`, annexe: `${av.traducteur ?? '∅'} · ${av.editeur ?? '∅'}` }
  }))

// 5. Divergences, telles que la liste les rend
type Champ = 'traducteur' | 'editeur' | 'date'
const divergences: Record<Champ, { a: Annexe; avant: string | null; apres: string | null }[]> = { traducteur: [], editeur: [], date: [] }
for (const a of annexes) {
  if (motifDException(a.id)) continue
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
console.log(`  dont traducteur propre à l’œuvre (annexe) sur une référence partagée : ${tradPropre.length}`)
if (tradPropre.length) console.log(exemples(tradPropre, nom))
const inutiles = exceptions.filter(e => e.diverge === false)
const absentes = exceptions.filter(e => e.diverge === null)
console.log(`\n4. Notices d’exception, sur leurs propres champs : ${exceptions.length}`)
for (const motif of Object.keys(EXCEPTIONS_REFERENCE_CATALOGUE) as MotifException[]) {
  console.log(`  ${motif} (${LIBELLES_MOTIF_EXCEPTION[motif]}) : ${exceptions.filter(e => e.motif === motif).length}`)
}
console.log(`  devenues inutiles (la référence ne diverge plus) : ${inutiles.length}`)
if (inutiles.length) console.log(exemples(inutiles, e => String(e.id)))
console.log(`  hors du relevé (notice absente ou sans référence) : ${absentes.length}`)
if (absentes.length) console.log(exemples(absentes, e => String(e.id)))
if (LISTER_EXCEPTIONS) {
  for (const e of exceptions) {
    console.log(`    · ${e.motif} ${e.a ? nom(e.a) : e.id} → ouvrage ${ouvrageDe.get(e.id) ?? '∅'}`)
    console.log(`        annexe : ${e.annexe}`)
    console.log(`        référence : ${e.ref}`)
  }
}
console.log('\n5. Ce que la lecture de la référence change à l’écran (hors exceptions) :')
for (const champ of ['traducteur', 'editeur', 'date'] as const) {
  const liste = divergences[champ]
  console.log(`  ${champ} : ${liste.length}`)
  if (liste.length) console.log(exemples(liste, d => `${nom(d.a)} : « ${d.avant ?? '∅'} » → « ${d.apres ?? '∅'} »`))
}

if (VISIBLES && sansCle.length + sansVue.length > 0) process.exitCode = 1
