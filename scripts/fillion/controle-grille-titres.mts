/**
 * LA GRILLE DES TITRES ET LES MANCHETTES — contrôle, livre par livre.
 *
 * Doctrine : charte §§ 35.28 et 35.29. Le rang d'un titre est sa PROFONDEUR dans
 * l'arbre des titres, non son nom de style, non son `scope_kind`, non son marqueur
 * imprimé. Ce script ne décide rien : il MESURE l'écart entre ce que la donnée porte
 * et ce que la grille demande, pour qu'une reprise se fasse livre par livre et jamais
 * en masse.
 *
 * ⛔ Il n'a AUCUNE règle à lui : le rang de chaque bloc vient de
 * `resoudreStyleSemantique`, et les conflits de préséance de `rangsNeutralises` — les
 * fonctions que la page emploie. Une seconde écriture divergerait au premier
 * ajustement, et le contrôle certifierait un site imaginaire.
 *
 * ⛔ Il n'écrit rien, nulle part.
 *
 * ⛔ **IL NE PRÉJUGE PAS DU CHAMP FAUTIF.** Une relation non descendante dit qu'une
 * chose est fausse entre un titre et son parent ; elle ne dit pas laquelle. Selon le
 * cas, c'est le RANG du titre (`semantic_level`) ou sa PARENTÉ (`semantic_parent_key`)
 * qu'il faut reprendre, et cela se tranche à la lecture. ⛔ On ne corrige jamais
 * `semantic_level` au seul motif que la relation est invalide.
 *
 * Les relevés, du plus dur au plus souple :
 *
 *   1. DÉCLARATION IRRECEVABLE — un titre qui déclare un rang d'information, ou
 *      l'inverse. Le rendu l'écarte déjà et retombe sur le registre ; c'est une faute
 *      de donnée pure, et elle doit valoir zéro.
 *   2. CONFLIT DE PRÉSÉANCE — un bloc déclare un rang, et le rendu en retient un autre
 *      parce qu'un alias hérité en porte un. ⛔ Aucune déclaration présente dans les
 *      données ne doit être neutralisée SILENCIEUSEMENT : le rendu garde sa règle, le
 *      contrôle nomme le conflit.
 *   3. RELATION NON DESCENDANTE — inversion (l'enfant domine son parent) ou rang plat
 *      (l'enfant est au rang de son parent). Incohérent par construction.
 *   4. FRATRIE HÉTÉROGÈNE — des titres frères d'un même parent à des rangs différents.
 *      ⚠️ ALERTE, non invariant : le modèle ne garantit pas formellement que deux
 *      frères soient au même étage. On les liste pour examen ; ⛔ aucune normalisation
 *      automatique.
 *   5. SAUT — un enfant à plus d'un rang sous son parent. ⚠️ Ce n'est PAS une faute :
 *      une édition peut n'avoir qu'un seul niveau analytique sous une section. C'est
 *      une question à poser au livre, et le nombre dit s'il faut la poser.
 *   6. MANCHETTES — l'état de clôture des commentaires de rang I4 à I6 (§ 35.29).
 *
 * Usage :
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs \
 *     scripts/fillion/controle-grille-titres.mts [--livre=MAT] [--detail] [--strict]
 *
 * `--detail` liste les cas au lieu de les compter. `--strict` rend le script rouge
 * aussi sur les relations non descendantes et les conflits de préséance.
 */
import { createClient } from '@supabase/supabase-js'
import {
  JETONS_TITRE,
  rangsNeutralises,
  resoudreStyleSemantique,
} from '@/app/lib/bibleHierarchieSemantique'

const args = process.argv.slice(2)
const livreVise = args.find((a) => a.startsWith('--livre='))?.slice(8)?.toUpperCase() ?? null
const detail = args.includes('--detail')
const strict = args.includes('--strict')

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function tout<T>(table: string, colonnes: string, ordre: string): Promise<T[]> {
  const lignes: T[] = []
  for (let depart = 0; ; depart += 1000) {
    const { data, error } = await db.from(table).select(colonnes).order(ordre).range(depart, depart + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    lignes.push(...(data as unknown as T[]))
    if (data.length < 1000) break
  }
  return lignes
}

type Ligne = {
  id: string
  block_key: string
  semantic_style_code: string
  semantic_level: string | null
  embedded_title_level: string | null
  semantic_parent_key: string | null
  scope_book_code: string | null
  canon_id_start: string | null
  heading: string | null
}
type EtatManchette = { id: string; manchette_etat: string | null; manchette_motif: string | null }

const lignes = await tout<Ligne>(
  'v_bible_editorial_body_blocks',
  'id,block_key,semantic_style_code,semantic_level,embedded_title_level,semantic_parent_key,scope_book_code,canon_id_start,heading',
  'block_key',
)
// ⚠️ Les deux colonnes d'état ne sont pas exposées par la vue : elles ne décident de
// rien au rendu, et la vue ne porte que ce que la page lit.
const etats = new Map(
  (await tout<EtatManchette>('bible_editorial_body_blocks', 'id,manchette_etat,manchette_motif', 'id'))
    .map((e) => [e.id, e]),
)

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
  conflits: { axe: string; declare: string; retenu: string }[]
  /** Commentaire de rang I4 à I6 : il peut porter une manchette (§ 35.9). */
  eligibleManchette: boolean
  aIntitule: boolean
  etat: string | null
  motif: string | null
}

const noeuds = new Map<string, Noeud>()
for (const l of lignes) {
  const resolu = resoudreStyleSemantique(l.semantic_style_code, {
    niveau: l.semantic_level,
    titre: l.embedded_title_level,
  })
  if (!resolu) continue
  const estTitre = resolu.kind === 'title'
  const attendu = estTitre ? 'T' : 'I'
  const etat = etats.get(l.id)
  noeuds.set(l.block_key, {
    cle: l.block_key,
    livre: livreDe(l),
    rang: estTitre ? (rangDe.get(resolu.level) ?? null) : null,
    jeton: estTitre ? resolu.level : null,
    parent: l.semantic_parent_key,
    intitule: (l.heading ?? '').slice(0, 64),
    irrecevable: Boolean(l.semantic_level) && !l.semantic_level!.startsWith(attendu),
    conflits: rangsNeutralises(l.semantic_style_code, { niveau: l.semantic_level, titre: l.embedded_title_level }),
    eligibleManchette: resolu.kind === 'info' && resolu.nature === 'commentary'
      && ['I4', 'I5', 'I6'].includes(resolu.level),
    aIntitule: Boolean((l.heading ?? '').trim()),
    etat: etat?.manchette_etat ?? null,
    motif: etat?.manchette_motif ?? null,
  })
}

type Bilan = {
  titres: number
  irrecevables: Noeud[]
  conflits: Noeud[]
  nonDescendantes: { enfant: Noeud; parent: Noeud; genre: 'inversion' | 'rang plat' }[]
  sauts: { enfant: Noeud; parent: Noeud; ecart: number }[]
  fratries: { parent: Noeud; jetons: string[] }[]
  manchettes: { eligibles: number; source: number; editoriale: number; absente: number; nonTraite: number; incoherents: Noeud[] }
}
const bilans = new Map<string, Bilan>()
const bilanDe = (livre: string): Bilan => {
  if (!bilans.has(livre)) {
    bilans.set(livre, {
      titres: 0, irrecevables: [], conflits: [], nonDescendantes: [], sauts: [], fratries: [],
      manchettes: { eligibles: 0, source: 0, editoriale: 0, absente: 0, nonTraite: 0, incoherents: [] },
    })
  }
  return bilans.get(livre)!
}

// Le parent de TITRE le plus proche : un bloc d'information qui s'intercale ne rompt
// pas la chaîne des titres, il pend à côté d'elle.
function parentTitre(n: Noeud): Noeud | null {
  let courant = n.parent ? noeuds.get(n.parent) ?? null : null
  while (courant && courant.rang === null) courant = courant.parent ? noeuds.get(courant.parent) ?? null : null
  return courant
}

const fratries = new Map<string, Noeud[]>()

for (const n of noeuds.values()) {
  const b = bilanDe(n.livre)
  if (n.irrecevable) b.irrecevables.push(n)
  if (n.conflits.length) b.conflits.push(n)

  if (n.eligibleManchette) {
    const m = b.manchettes
    m.eligibles += 1
    if (n.etat === 'source') m.source += 1
    else if (n.etat === 'editoriale') m.editoriale += 1
    else if (n.etat === 'absente') m.absente += 1
    else m.nonTraite += 1
    // ⚠️ L'état doit répondre de ce que le bloc porte : « source » sans intitulé, ou
    // « absente » avec un intitulé, disent le contraire de la donnée.
    if ((n.etat === 'source' && !n.aIntitule) || (n.etat === 'absente' && n.aIntitule)) m.incoherents.push(n)
  }

  if (n.rang === null) continue
  b.titres += 1
  const p = parentTitre(n)
  if (!p || p.rang === null) continue
  if (n.rang < p.rang) b.nonDescendantes.push({ enfant: n, parent: p, genre: 'inversion' })
  else if (n.rang === p.rang) b.nonDescendantes.push({ enfant: n, parent: p, genre: 'rang plat' })
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
let totalConflits = 0
let totalNonDescendantes = 0

console.log('livre    titres  irrecev.  conflits  non desc.  fratries  sauts   manch. à relire')
for (const livre of livres) {
  const b = bilans.get(livre)!
  totalIrrecevables += b.irrecevables.length
  totalConflits += b.conflits.length
  totalNonDescendantes += b.nonDescendantes.length
  const aDire = b.irrecevables.length + b.conflits.length + b.nonDescendantes.length
    + b.fratries.length + b.sauts.length + b.manchettes.nonTraite + b.manchettes.incoherents.length
  if (aDire === 0) continue
  console.log(
    livre.padEnd(9) + String(b.titres).padStart(5)
    + String(b.irrecevables.length).padStart(10)
    + String(b.conflits.length).padStart(10)
    + String(b.nonDescendantes.length).padStart(11)
    + String(b.fratries.length).padStart(10)
    + String(b.sauts.length).padStart(7)
    + `${b.manchettes.nonTraite}/${b.manchettes.eligibles}`.padStart(17),
  )
  if (!detail) continue
  for (const n of b.irrecevables) console.log(`    ⛔ déclaration irrecevable  ${n.cle} « ${n.intitule} »`)
  for (const n of b.conflits) {
    for (const c of n.conflits) {
      console.log(`    ⛔ conflit de préséance  ${n.cle} : la donnée déclare ${c.axe} ${c.declare}, le rendu retient ${c.retenu} (alias hérité)`)
    }
  }
  for (const { enfant, parent, genre } of b.nonDescendantes) {
    console.log(`    ⛔ ${genre}  ${enfant.jeton} « ${enfant.intitule} »  sous  ${parent.jeton} « ${parent.intitule} »`)
    console.log('       ↳ à reprendre : le RANG du titre, ou sa PARENTÉ. Le contrôle ne tranche pas.')
  }
  for (const { parent, jetons } of b.fratries) {
    console.log(`    ⚠️ fratrie    ${jetons.join(' + ')}  sous  ${parent.jeton} « ${parent.intitule} »`)
  }
  for (const { enfant, parent, ecart } of b.sauts) {
    console.log(`    ⚠️ saut ${ecart}  ${parent.jeton} → ${enfant.jeton}  « ${enfant.intitule} »`)
  }
  for (const n of b.manchettes.incoherents) {
    console.log(`    ⛔ manchette « ${n.etat} » contredite par la donnée  ${n.cle} (intitulé ${n.aIntitule ? 'présent' : 'absent'})`)
  }
}

const somme = (f: (b: Bilan) => number) => livres.reduce((n, l) => n + f(bilans.get(l)!), 0)
console.log('')
console.log(JSON.stringify({
  livres: livres.length,
  titres: somme((b) => b.titres),
  declarations_irrecevables: somme((b) => b.irrecevables.length),
  conflits_de_preseance: somme((b) => b.conflits.length),
  relations_non_descendantes: {
    total: somme((b) => b.nonDescendantes.length),
    inversions: somme((b) => b.nonDescendantes.filter((r) => r.genre === 'inversion').length),
    rangs_plats: somme((b) => b.nonDescendantes.filter((r) => r.genre === 'rang plat').length),
  },
  fratries_heterogenes: somme((b) => b.fratries.length),
  sauts: somme((b) => b.sauts.length),
  manchettes: {
    eligibles: somme((b) => b.manchettes.eligibles),
    source: somme((b) => b.manchettes.source),
    editoriale: somme((b) => b.manchettes.editoriale),
    absente: somme((b) => b.manchettes.absente),
    non_traite: somme((b) => b.manchettes.nonTraite),
    incoherents: somme((b) => b.manchettes.incoherents.length),
  },
}, null, 2))

const incoherents = somme((b) => b.manchettes.incoherents.length)
if (totalIrrecevables > 0 || incoherents > 0) {
  console.error(`\n⛔ ${totalIrrecevables} déclaration(s) de rang irrecevable(s), ${incoherents} état(s) de manchette contredit(s) par la donnée.`)
  process.exitCode = 1
} else if (strict && (totalNonDescendantes > 0 || totalConflits > 0)) {
  console.error(`\n⛔ ${totalNonDescendantes} relation(s) non descendante(s), ${totalConflits} conflit(s) de préséance.`)
  process.exitCode = 1
}
