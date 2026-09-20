/**
 * LE REGISTRE DES STYLES SÉMANTIQUES VIT EN DEUX EXEMPLAIRES — contrôle de dérive.
 *
 * Doctrine : charte § 35.30. Deux objets portent le vocabulaire :
 *
 *   work/fillion/semantic_display_hierarchy.json  lu par le RENDU
 *   public.bible_styles_semantiques               lu par le seul VERROU de base
 *
 * ⛔ Ils ne se valent PAS, et ce contrôle ne cherche pas à les rendre égaux. Le JSON
 * porte la COMPOSITION et fait foi ; la table porte le VOCABULAIRE, et c'est tout ce
 * que le déclencheur `bible_style_semantique_connu` lui demande — il ne lit que
 * `code`, `alias_de`, `niveau` et `kind`, et rien d'autre. ⛔ **La table n'est donc
 * jamais une seconde source normative** : on ne corrige pas le JSON pour l'accorder
 * à elle.
 *
 * ⛔ Le script n'a AUCUNE règle à lui : les valeurs attendues viennent de
 * `resoudreStyleSemantique`, la fonction que la page emploie. Une seconde écriture
 * de la composition divergerait au premier ajustement — et c'est exactement ce que
 * ce contrôle existe pour relever.
 *
 * TROIS relevés, et ils ne pèsent pas le même poids :
 *
 *   1. LA SURFACE COMMUNE — `alias_de`, `kind`, `niveau`, plus la présence même du
 *      code. Une divergence y fait diverger le RENDU et le VERROU : l'un compose ce
 *      que l'autre refuse, ou l'inverse. ⛔ C'est une faute, et le script en rougit.
 *   2. LES COPIES DÉCORATIVES D'UNE LIGNE CANONIQUE — `nature`, `axe`, `au_plan`,
 *      `role_intitule`, `niveau_intitule`, `bloc_de_corps`,
 *      `masque_par_navigation`. Elles recopient la composition et ne décident de
 *      RIEN. ⚠️ Une divergence y est une copie périmée : on la signale, et on la
 *      corrige du côté de la TABLE, jamais du côté du JSON.
 *   3. CE QU'UNE LIGNE D'ALIAS NE RÉPÈTE PAS. ⚠️ Par CONVENTION, une ligne de nom
 *      hérité ne porte que ce que l'alias AJOUTE ; le reste y vaut nul ou faux, et le
 *      verrou va le chercher sur le canonique. Ce n'est pas une dérive — mais qui
 *      lirait la table seule s'y tromperait, et le compte le dit.
 *
 * ⚠️ `heading_levels` (la table des rangs de titre portés, § 35.27) n'a AUCUN
 * équivalent en base, et c'est délibéré : le verrou ne compose pas de titre, il n'a
 * donc rien à en faire. `niveau_intitule` en est la forme ANCIENNE, à une seule
 * valeur, qui ne peut pas porter six rangs — la comparer serait comparer deux choses
 * de formes différentes. Le script le dit et passe.
 *
 * Usage :
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs \
 *     scripts/fillion/controle-registre-styles.mts [--detail]
 *
 * ⛔ Il n'écrit rien, nulle part.
 */
import { createClient } from '@supabase/supabase-js'
import registre from '@/work/fillion/semantic_display_hierarchy.json'
import { resoudreStyleSemantique } from '@/app/lib/bibleHierarchieSemantique'

const detail = process.argv.slice(2).includes('--detail')

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

/** Ce que `bible_style_semantique_connu` lit, et rien d'autre. */
const SURFACE_COMMUNE = ['alias_de', 'kind', 'niveau'] as const
/** Ce que la table recopie de la composition sans que rien ne le lise. */
const COPIES_DECORATIVES = [
  'nature', 'axe', 'au_plan', 'role_intitule', 'niveau_intitule',
  'bloc_de_corps', 'masque_par_navigation',
] as const

type LigneSql = Record<string, unknown> & { code: string }

const styles = registre.styles as Record<string, Record<string, unknown>>

/**
 * Le code, son canonique quand c'est un nom hérité, et ce que SA LIGNE déclare.
 *
 * ⚠️ `titre` est le rang du titre porté tel que la base sait l'écrire : UNE valeur.
 * La table `heading_levels` d'un canonique (§ 35.27) n'en a pas d'équivalent, et
 * `niveau_intitule` y vaut donc nul à bon droit.
 */
type Inscrit = { code: string; aliasDe: string | null; niveau: string | null; titre: string | null }
const inscrits: Inscrit[] = []

for (const [code, e] of Object.entries(styles)) {
  inscrits.push({
    code,
    aliasDe: null,
    niveau: (e.level as string) ?? null,
    titre: (e.heading_level as string) ?? null,
  })
  const alias = (e.aliases ?? {}) as Record<string, string | Record<string, unknown> | null>
  for (const [nom, valeur] of Object.entries(alias)) {
    // ⚠️ Un alias peut n'AJOUTER RIEN (valeur nulle) : il renvoie alors au canonique,
    // dont le rang s'applique tel quel. C'est le cas des noms hérités de TITRE, un
    // titre portant son rang dans le nom de son style canonique.
    const porte = valeur === null ? {} : typeof valeur === 'string' ? { niveau: valeur } : valeur
    inscrits.push({
      code: nom,
      aliasDe: code,
      niveau: (porte.niveau as string) ?? null,
      titre: (porte.titre as string) ?? null,
    })
  }
}

/**
 * Ce que le RENDU compose pour un code, par la fonction de la page.
 *
 * ⚠️ Une nature d'information n'a pas de rang au registre : sans rang déclaré, la
 * résolution rend `null` — c'est la règle même du regroupement (§ 7.2). On la sonde
 * donc à un rang quelconque, les champs qu'on compare ici n'en dépendant pas.
 */
function compose(code: string) {
  return resoudreStyleSemantique(code) ?? resoudreStyleSemantique(code, { niveau: 'I1' })
}

const { data, error } = await db.from('bible_styles_semantiques').select('*').order('code')
if (error) throw error
const lignes = (data ?? []) as LigneSql[]
const parCode = new Map(lignes.map((l) => [l.code, l]))

type Ecart = { code: string; colonne: string; rendu: unknown; base: unknown }
const surfaceCommune: Ecart[] = []
const copiesPerimees: Ecart[] = []
const nonRepetes: Ecart[] = []
const absentsEnBase: string[] = []
const inconnusDuRendu: string[] = []

for (const { code, aliasDe, niveau, titre } of inscrits) {
  const ligne = parCode.get(code)
  if (!ligne) { absentsEnBase.push(code); continue }
  const resolu = compose(code)
  if (!resolu) { inconnusDuRendu.push(code); continue }

  // 1. La surface commune. ⛔ Sur une ligne de nom hérité, `kind` vaut nul en base et
  // le verrou le reprend sur le canonique : c'est la convention, non une dérive.
  const attenduCommun = { alias_de: aliasDe, kind: aliasDe ? null : resolu.kind, niveau }
  for (const colonne of SURFACE_COMMUNE) {
    if ((ligne[colonne] ?? null) !== attenduCommun[colonne]) {
      surfaceCommune.push({ code, colonne, rendu: attenduCommun[colonne], base: ligne[colonne] ?? null })
    }
  }

  // 2 et 3. Ce que la table recopie de la composition.
  const attenduCompose: Record<string, unknown> = {
    nature: resolu.nature,
    axe: resolu.hierarchyAxis,
    au_plan: resolu.includeInOutline,
    role_intitule: resolu.headingRole,
    // ⚠️ On ne compare que ce que la ligne DÉCLARE : la base n'écrit qu'une valeur, et
    // la table `heading_levels` d'un canonique n'en a pas d'équivalent.
    niveau_intitule: titre,
    bloc_de_corps: resolu.bodyBlock,
    masque_par_navigation: resolu.redondantAvecNavigation,
  }
  for (const colonne of COPIES_DECORATIVES) {
    const enBase = ligne[colonne] ?? null
    if (enBase === attenduCompose[colonne]) continue
    const ecart = { code, colonne, rendu: attenduCompose[colonne], base: enBase }
    // Une ligne d'alias qui se tait n'est pas périmée : elle hérite.
    if (aliasDe && (enBase === null || enBase === false)) nonRepetes.push(ecart)
    else copiesPerimees.push(ecart)
  }
}
for (const l of lignes) if (!inscrits.some((i) => i.code === l.code)) inconnusDuRendu.push(l.code)

const avecTableDeTitres = Object.entries(styles)
  .filter(([, e]) => e.heading_levels)
  .map(([code]) => code)

console.log('LE REGISTRE DES STYLES — le rendu contre le verrou')
console.log(`  styles au registre (canoniques + noms hérités) : ${inscrits.length}`)
console.log(`  lignes en base                                 : ${lignes.length}`)
console.log('')

const fautes = surfaceCommune.length + absentsEnBase.length + inconnusDuRendu.length
if (fautes === 0) {
  console.log('✓ La surface commune concorde — le rendu et le verrou disent la même chose.')
} else {
  console.log(`⛔ SURFACE COMMUNE : ${surfaceCommune.length} écart(s), ${absentsEnBase.length} style(s) absent(s) de la base, ${inconnusDuRendu.length} code(s) que le rendu ne sait pas composer.`)
  for (const c of absentsEnBase) console.log(`    ⛔ absent de la base    ${c}  (le rendu le compose, le verrou le refuse)`)
  for (const c of inconnusDuRendu) console.log(`    ⛔ inconnu du rendu     ${c}  (le verrou l'accepte, le rendu ne sait pas le composer)`)
  for (const e of surfaceCommune) {
    console.log(`    ⛔ ${e.code} · ${e.colonne} : le rendu dit ${JSON.stringify(e.rendu)}, la base ${JSON.stringify(e.base)}`)
  }
}

console.log('')
if (copiesPerimees.length === 0) {
  console.log('✓ Les copies décoratives sont à jour.')
} else {
  console.log(`⚠️ COPIES PÉRIMÉES : ${copiesPerimees.length}. Elles ne décident de rien ; le rendu fait foi, la table se rattrape.`)
  for (const e of copiesPerimees) {
    console.log(`    ⚠️ ${e.code} · ${e.colonne} : le rendu compose ${JSON.stringify(e.rendu)}, la base porte ${JSON.stringify(e.base)}`)
  }
}

console.log('')
console.log(`⚠️ CONVENTION : ${nonRepetes.length} colonne(s) qu'une ligne de nom hérité ne répète pas.`)
console.log('   Une ligne d\'alias ne porte que ce que l\'alias AJOUTE ; le verrou va chercher')
console.log('   le reste sur le canonique. ⛔ Qui lirait la table SEULE s\'y tromperait.')
if (detail) for (const e of nonRepetes) {
  console.log(`       ${e.code} · ${e.colonne} : le rendu compose ${JSON.stringify(e.rendu)}, la base porte ${JSON.stringify(e.base)}`)
}

console.log('')
console.log(`⚠️ SANS ÉQUIVALENT EN BASE, PAR CONSTRUCTION : heading_levels sur ${avecTableDeTitres.join(', ') || '(aucun style)'}.`)
console.log('   Le verrou ne compose aucun titre ; `niveau_intitule` en est la forme ancienne,')
console.log('   à une seule valeur, et ne peut pas porter six rangs. Ce n\'est pas une lacune.')

console.log('')
console.log(JSON.stringify({
  styles_registre: inscrits.length,
  lignes_sql: lignes.length,
  surface_commune_ecarts: surfaceCommune.length,
  absents_en_base: absentsEnBase.length,
  inconnus_du_rendu: inconnusDuRendu.length,
  copies_perimees: copiesPerimees.length,
  colonnes_non_repetees_sur_un_alias: nonRepetes.length,
}, null, 2))

if (fautes > 0) process.exitCode = 1
