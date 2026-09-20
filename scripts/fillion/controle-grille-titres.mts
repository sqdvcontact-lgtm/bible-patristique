/**
 * LA GRILLE DES TITRES — contrôle, livre par livre.
 *
 * Doctrine : charte § 35.28. Le rang d'un titre est sa PROFONDEUR dans l'arbre des
 * titres, non son nom de style, non son `scope_kind`, non son marqueur imprimé. Ce
 * script ne décide rien : il MESURE l'écart entre ce que la donnée porte et ce que
 * la grille demande, pour qu'une reprise se fasse livre par livre et jamais en masse.
 *
 * ⛔ Il n'a AUCUNE règle à lui : le rang de chaque bloc vient de
 * `resoudreStyleSemantique`, la fonction que la page emploie. Une seconde écriture
 * divergerait au premier ajustement, et le contrôle certifierait un site imaginaire.
 *
 * ⛔ Il n'écrit rien. La correction est un travail de DONNÉE et de LECTURE.
 *
 * Quatre relevés, du plus dur au plus souple :
 *
 *   1. DÉCLARATION IRRECEVABLE — un titre qui déclare un rang d'information, ou
 *      l'inverse. Le rendu l'écarte déjà et retombe sur le registre ; c'est une faute
 *      de donnée pure, et elle doit valoir zéro. Seule celle-ci rend le script rouge.
 *   2. INVERSION — un titre au rang supérieur ou ÉGAL à celui de son parent. Incohérent
 *      par construction : un enfant ne peut pas dominer son père.
 *   3. FRATRIE HÉTÉROGÈNE — des titres frères d'un même parent à des rangs différents.
 *      Le plan devient alors illisible : deux frères n'ont pas le même poids.
 *   4. SAUT — un enfant à plus d'un rang sous son parent. ⚠️ Ce n'est PAS une faute en
 *      soi : une édition peut n'avoir qu'un seul niveau analytique sous une section.
 *      C'est une question à poser au livre, et le nombre dit s'il faut la poser.
 *
 * Usage :
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs \
 *     scripts/fillion/controle-grille-titres.mts [--livre=MAT] [--detail] [--strict]
 *
 * `--detail` liste les cas au lieu de les compter. `--strict` rend le script rouge
 * aussi sur les inversions.
 */
import { createClient } from '@supabase/supabase-js'
import { resoudreStyleSemantique, JETONS_TITRE } from '@/app/lib/bibleHierarchieSemantique'

const args = process.argv.slice(2)
const livreVise = args.find((a) => a.startsWith('--livre='))?.slice(8)?.toUpperCase() ?? null
const detail = args.includes('--detail')
const strict = args.includes('--strict')

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

type Ligne = {
  block_key: string
  semantic_style_code: string
  semantic_level: string | null
  embedded_title_level: string | null
  semantic_parent_key: string | null
  scope_book_code: string | null
  canon_id_start: string | null
  heading: string | null
  material_order: number | null
}

const COLONNES = [
  'block_key', 'semantic_style_code', 'semantic_level', 'embedded_title_level',
  'semantic_parent_key', 'scope_book_code', 'canon_id_start', 'heading', 'material_order',
].join(',')

const lignes: Ligne[] = []
for (let depart = 0; ; depart += 1000) {
  const { data, error } = await db
    .from('v_bible_editorial_body_blocks')
    .select(COLONNES)
    .order('block_key')
    .range(depart, depart + 999)
  if (error) throw error
  if (!data || data.length === 0) break
  lignes.push(...(data as unknown as Ligne[]))
  if (data.length < 1000) break
}

/** Le livre d'un bloc : ce que la donnée déclare, sinon le préfixe de son créneau. */
function livreDe(l: Ligne): string {
  return l.scope_book_code ?? (l.canon_id_start ? l.canon_id_start.split('.')[0] : '(hors livre)')
}

const rangDe = new Map<string, number>(JETONS_TITRE.map((t, i) => [t, i + 1]))

type Noeud = {
  cle: string
  livre: string
  rang: number | null       // 1..6 pour T1..T6 ; null si ce n'est pas un titre
  jeton: string | null
  parent: string | null
  intitule: string
  irrecevable: boolean
}

const noeuds = new Map<string, Noeud>()
for (const l of lignes) {
  const resolu = resoudreStyleSemantique(l.semantic_style_code, {
    niveau: l.semantic_level,
    titre: l.embedded_title_level,
  })
  if (!resolu) continue
  const estTitre = resolu.kind === 'title'
  // Une déclaration que le rendu a dû écarter : elle ne vaut rien et se relève.
  const attendu = estTitre ? 'T' : 'I'
  const irrecevable = Boolean(l.semantic_level) && !l.semantic_level!.startsWith(attendu)
  noeuds.set(l.block_key, {
    cle: l.block_key,
    livre: livreDe(l),
    rang: estTitre ? (rangDe.get(resolu.level) ?? null) : null,
    jeton: estTitre ? resolu.level : null,
    parent: l.semantic_parent_key,
    intitule: (l.heading ?? '').slice(0, 64),
    irrecevable,
  })
}

type Bilan = {
  titres: number
  irrecevables: Noeud[]
  inversions: { enfant: Noeud; parent: Noeud }[]
  plats: { enfant: Noeud; parent: Noeud }[]
  sauts: { enfant: Noeud; parent: Noeud; ecart: number }[]
  fratries: { parent: Noeud; jetons: string[] }[]
}
const bilans = new Map<string, Bilan>()
const bilanDe = (livre: string): Bilan => {
  if (!bilans.has(livre)) bilans.set(livre, { titres: 0, irrecevables: [], inversions: [], plats: [], sauts: [], fratries: [] })
  return bilans.get(livre)!
}

// Le parent de TITRE le plus proche : un bloc d'information qui s'intercale ne
// rompt pas la chaîne des titres, il pend à côté d'elle.
function parentTitre(n: Noeud): Noeud | null {
  let courant = n.parent ? noeuds.get(n.parent) ?? null : null
  while (courant && courant.rang === null) courant = courant.parent ? noeuds.get(courant.parent) ?? null : null
  return courant
}

const fratries = new Map<string, Noeud[]>()

for (const n of noeuds.values()) {
  const b = bilanDe(n.livre)
  if (n.irrecevable) b.irrecevables.push(n)
  if (n.rang === null) continue
  b.titres += 1
  const p = parentTitre(n)
  if (!p || p.rang === null) continue
  if (n.rang < p.rang) b.inversions.push({ enfant: n, parent: p })
  else if (n.rang === p.rang) b.plats.push({ enfant: n, parent: p })
  else if (n.rang > p.rang + 1) b.sauts.push({ enfant: n, parent: p, ecart: n.rang - p.rang })
  const groupe = fratries.get(p.cle) ?? []
  groupe.push(n)
  fratries.set(p.cle, groupe)
}

for (const [cleParent, enfants] of fratries) {
  const jetons = [...new Set(enfants.map((e) => e.jeton!))].sort()
  if (jetons.length <= 1) continue
  const p = noeuds.get(cleParent)!
  bilanDe(p.livre).fratries.push({ parent: p, jetons })
}

const livres = [...bilans.keys()].filter((l) => !livreVise || l === livreVise).sort()
let totalIrrecevables = 0
let totalInversions = 0

console.log('livre    titres  irrecev.  invers.  plats  fratries  sauts')
for (const livre of livres) {
  const b = bilans.get(livre)!
  totalIrrecevables += b.irrecevables.length
  totalInversions += b.inversions.length
  if (b.irrecevables.length + b.inversions.length + b.plats.length + b.fratries.length + b.sauts.length === 0) continue
  console.log(
    livre.padEnd(9) + String(b.titres).padStart(5)
    + String(b.irrecevables.length).padStart(10)
    + String(b.inversions.length).padStart(9)
    + String(b.plats.length).padStart(7)
    + String(b.fratries.length).padStart(10)
    + String(b.sauts.length).padStart(7),
  )
  if (!detail) continue
  for (const n of b.irrecevables) console.log(`    ⛔ déclaration irrecevable  ${n.cle} « ${n.intitule} »`)
  for (const { enfant, parent } of b.inversions) {
    console.log(`    ⛔ inversion  ${enfant.jeton} « ${enfant.intitule} »  sous  ${parent.jeton} « ${parent.intitule} »`)
  }
  for (const { enfant, parent } of b.plats) {
    console.log(`    ⛔ rang plat  ${enfant.jeton} « ${enfant.intitule} »  sous  ${parent.jeton} « ${parent.intitule} »`)
  }
  for (const { parent, jetons } of b.fratries) {
    console.log(`    ⚠️ fratrie    ${jetons.join(' + ')}  sous  ${parent.jeton} « ${parent.intitule} »`)
  }
  for (const { enfant, parent, ecart } of b.sauts) {
    console.log(`    ⚠️ saut ${ecart}  ${parent.jeton} → ${enfant.jeton}  « ${enfant.intitule} »`)
  }
}

const somme = (f: (b: Bilan) => number) => livres.reduce((n, l) => n + f(bilans.get(l)!), 0)
console.log('')
console.log(JSON.stringify({
  livres: livres.length,
  titres: somme((b) => b.titres),
  declarations_irrecevables: somme((b) => b.irrecevables.length),
  inversions: somme((b) => b.inversions.length),
  rangs_plats: somme((b) => b.plats.length),
  fratries_heterogenes: somme((b) => b.fratries.length),
  sauts: somme((b) => b.sauts.length),
}, null, 2))

if (totalIrrecevables > 0) {
  console.error(`\n⛔ ${totalIrrecevables} déclaration(s) de rang irrecevable(s) : le rendu les écarte, la donnée doit être corrigée.`)
  process.exitCode = 1
} else if (strict && totalInversions > 0) {
  console.error(`\n⛔ ${totalInversions} inversion(s) de rang.`)
  process.exitCode = 1
}
