import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import {
  cleEditeur,
  construireIndexEditeurs,
  estCoedition,
  partiesCoedition,
  resoudreNomEditeur,
} from '@/app/lib/editeursNormalisation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// CRUD de la table de référence `editeurs`. La RLS n'autorise que la LECTURE au public ;
// les écritures passent ici, avec vérification admin serveur (charte §17).
//
// ⛔ Déclarer une variante, c'est FUSIONNER : la fusion elle-même est en base
// (déclencheurs de `sql/20260829_fusion_autorites_editeurs.sql`), et elle a donc lieu
// quel que soit l'écrivain. Cette route ne fait que deux choses de plus : elle RELÈVE
// ce qui va être absorbé pour pouvoir le dire à l'écran, et elle propage la déclaration
// à `editeurs_valeur`, le référentiel bibliographique, pour que les deux listes disent
// la même chose. Les données des œuvres et des notices ne sont jamais réécrites.
//
// ⛔ Et un NOM d'autorité ne porte jamais de point-virgule : « A ; B » dit que deux
// maisons ont coédité, non qu'il existe une maison de ce nom. Une telle forme se TRAITE
// (action `coedition` : on ouvre ou l'on réemploie chaque maison, puis la fiche composée
// disparaît), elle ne s'enregistre pas. ⚠️ Une VARIANTE composée reste licite : « Veuve
// Jean Camusat ; Pierre Le Petit » est une graphie d'une maison unique.

/** Code d'erreur des déclencheurs de cohérence : une graphie disputée par deux autorités. */
const COLLISION = 'ZE001'

function nettoyerListe(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map(x => String(x ?? '').trim()).filter(Boolean))]
}

function entier(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

type Erreur = { message: string; code?: string }

/** Une collision se dit au demandeur (409) ; le reste est une panne (500). */
function reponseErreur(error: Erreur) {
  const collision = error.code === COLLISION
  return NextResponse.json({ error: error.message }, { status: collision ? 409 : 500 })
}

/** Les autorités que cette fiche va absorber : celles dont le NOM est l'une de ses
 *  variantes. Relevé AVANT l'écriture, puisque après elles n'existent plus. */
async function autoritesAbsorbees(
  table: 'editeurs' | 'editeurs_valeur',
  colonneNom: 'nom_complet' | 'nom',
  variantes: string[],
  id: number | null,
): Promise<string[]> {
  if (!variantes.length) return []
  const cles = new Set(variantes.map(cleEditeur).filter(Boolean))
  const { data } = await supabaseAdmin.from(table).select(`id, ${colonneNom}`)
  return ((data ?? []) as Record<string, unknown>[])
    .filter(l => l.id !== id && cles.has(cleEditeur(String(l[colonneNom] ?? ''))))
    .map(l => String(l[colonneNom] ?? ''))
}

/** Porte la déclaration dans `editeurs_valeur`, quand l'autorité correspondante y existe.
 *  ⛔ On n'en crée aucune : ouvrir une autorité bibliographique depuis le référentiel des
 *  éditions primaires est un geste éditorial, pas un effet de bord d'un enregistrement. */
async function propagerAuxAutorites(nom: string, variantes: string[]) {
  if (!variantes.length) return { fusions: [] as string[], avertissement: null as string | null }

  const cle = cleEditeur(nom)
  const { data } = await supabaseAdmin.from('editeurs_valeur').select('id, nom, aliases')
  const lignes = (data ?? []) as { id: number; nom: string; aliases: string[] | null }[]
  const autorite = lignes.find(l => cleEditeur(l.nom) === cle)
  if (!autorite) return { fusions: [], avertissement: null }

  const connues = new Set((autorite.aliases ?? []).map(cleEditeur))
  const ajouts = variantes.filter(v => !connues.has(cleEditeur(v)))
  if (!ajouts.length) return { fusions: [], avertissement: null }

  const fusions = await autoritesAbsorbees('editeurs_valeur', 'nom', ajouts, autorite.id)
  const { error } = await supabaseAdmin
    .from('editeurs_valeur')
    .update({ aliases: [...(autorite.aliases ?? []), ...ajouts] })
    .eq('id', autorite.id)

  // La maison est enregistrée : un refus ici ne défait pas l'enregistrement, il se dit.
  if (error) return { fusions: [], avertissement: `Référentiel bibliographique : ${error.message}` }
  return { fusions, avertissement: null }
}

/** Une coédition se traite maison par maison : celle qui est déjà répertoriée — fût-ce
 *  sous une variante — est RÉEMPLOYÉE, les autres s'ouvrent. La fiche composée ne
 *  disparaît qu'ensuite, quand plus rien n'est perdu à la retirer. */
async function traiterCoedition(body: Record<string, unknown>) {
  const parties = nettoyerListe(body.parties)
  if (parties.length < 2) {
    return NextResponse.json({ error: 'Une coédition compte au moins deux maisons.' }, { status: 400 })
  }
  if (parties.some(estCoedition)) {
    return NextResponse.json({ error: 'Le nom d’une maison ne porte pas de point-virgule.' }, { status: 400 })
  }

  const { data } = await supabaseAdmin.from('editeurs').select('nom_complet, variantes, ville')
  const index = construireIndexEditeurs(
    (data ?? []) as { nom_complet: string; variantes: string[] | null; ville: string | null }[],
  )

  const creees: string[] = []
  const reemployees: string[] = []
  for (const partie of parties) {
    const connue = resoudreNomEditeur(partie, index)
    if (connue) { reemployees.push(connue); continue }
    const { error } = await supabaseAdmin.from('editeurs').insert({ nom_complet: partie, variantes: [] })
    if (error) return reponseErreur(error)
    creees.push(partie)
  }

  let separee: string | null = null
  const id = entier(body.id)
  if (id) {
    const { data: fiche } = await supabaseAdmin
      .from('editeurs').select('nom_complet, variantes').eq('id', id).maybeSingle()
    const composee = fiche as { nom_complet: string; variantes: string[] | null } | null
    if (composee) {
      // ⛔ Une fiche composée qui porte des variantes ne se retire pas en silence : ses
      // graphies n'auraient plus d'autorité où se ranger.
      if ((composee.variantes ?? []).length) {
        return NextResponse.json({
          error: `« ${composee.nom_complet} » porte des variantes : rattachez-les d’abord à une maison.`,
        }, { status: 409 })
      }
      const { error } = await supabaseAdmin.from('editeurs').delete().eq('id', id)
      if (error) return reponseErreur(error)
      separee = composee.nom_complet
    }
  }

  return NextResponse.json({ ok: true, creees, reemployees, separee })
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json()
  if (body?.action === 'coedition') return traiterCoedition(body)

  const nom_complet = String(body.nom_complet ?? '').trim()
  if (!nom_complet) return NextResponse.json({ error: 'Le nom complet est requis.' }, { status: 400 })

  // ⛔ « A ; B » n'est pas une maison : c'est une coédition. On ne l'enregistre pas, on
  // rend ses parties pour que l'écran propose de les ouvrir séparément.
  if (estCoedition(nom_complet)) {
    return NextResponse.json({
      error: 'Le point-virgule sépare deux maisons qui ont coédité : ce n’est pas le nom d’un éditeur.',
      coedition: partiesCoedition(nom_complet),
    }, { status: 409 })
  }

  const ligne = {
    nom_complet,
    variantes: nettoyerListe(body.variantes),
    ville: body.ville ? String(body.ville).trim() : null,
    annee_debut: entier(body.annee_debut),
    annee_fin: entier(body.annee_fin),
    notes: body.notes ? String(body.notes).trim() : null,
  }

  const id = entier(body.id)
  const fusions = await autoritesAbsorbees('editeurs', 'nom_complet', ligne.variantes, id)

  const { data, error } = id
    ? await supabaseAdmin.from('editeurs').update(ligne).eq('id', id).select().single()
    : await supabaseAdmin.from('editeurs').insert(ligne).select().single()
  if (error) return reponseErreur(error)

  const propagation = await propagerAuxAutorites(nom_complet, ligne.variantes)
  return NextResponse.json({
    ok: true,
    editeur: data,
    fusions,
    fusionsAutorites: propagation.fusions,
    avertissement: propagation.avertissement,
  })
}

export async function DELETE(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('editeurs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
