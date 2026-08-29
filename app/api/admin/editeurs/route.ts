import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { cleEditeur } from '@/app/lib/editeursNormalisation'

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

/** Code d'erreur des déclencheurs de cohérence : une graphie disputée par deux autorités. */
const COLLISION = 'ZE001'

function nettoyerVariantes(v: unknown): string[] {
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

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json()
  const nom_complet = String(body.nom_complet ?? '').trim()
  if (!nom_complet) return NextResponse.json({ error: 'Le nom complet est requis.' }, { status: 400 })

  const ligne = {
    nom_complet,
    variantes: nettoyerVariantes(body.variantes),
    ville: body.ville ? String(body.ville).trim() : null,
    annee_debut: entier(body.annee_debut),
    annee_fin: entier(body.annee_fin),
    notes: body.notes ? String(body.notes).trim() : null,
  }

  const id = body.id ? Number(body.id) : null
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
