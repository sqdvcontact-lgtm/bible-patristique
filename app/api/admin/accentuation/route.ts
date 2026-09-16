import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { lireEntree } from '@/app/admin/accentuation'

// Le lexique d'accentuation (table `accentuation_mots`), tenu par l'auteur dans
// l'administration : lire, ajouter, modifier, retirer un mot. La table est fermée à l'API :
// tout passe ici, par la clé de service, après la vérification de l'administrateur.
//
// ⛔ La validation vit dans `app/admin/accentuation.ts`, testée, et la base la redit par
// ses contraintes : un mot mal formé est refusé des deux côtés.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COLONNES = 'id, mot, faux_positif, note'
const DEJA_LA = 'Ce mot est déjà dans la liste.'
// 23514 : une contrainte de forme a refusé ce que la route avait laissé passer. Les deux
// validations disent la même chose ; si elles divergent un jour, l'auteur lit un refus, non
// une erreur serveur.
const FORME_REFUSEE = 'La base refuse cette forme : un mot se compose de lettres, d’apostrophes, de traits d’union ou d’espaces.'

const refus = () => NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

/** L'identifiant d'une ligne, venu du corps : un entier positif, ou rien. */
function identifiant(corps: unknown): number | null {
  const id = corps && typeof corps === 'object' ? Number((corps as Record<string, unknown>).id) : NaN
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function GET(request: Request) {
  if (!(await estAdminUtilisateur(request))) return refus()
  const { data, error } = await supabaseAdmin.from('accentuation_mots').select(COLONNES).order('mot')
  if (error) return erreur500(error, 'La liste n’a pas pu être lue.')
  return NextResponse.json({ mots: data ?? [] })
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return refus()
  const entree = lireEntree(await request.json().catch(() => null))
  if ('erreur' in entree) return NextResponse.json({ error: entree.erreur }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('accentuation_mots').insert(entree).select(COLONNES).single()
  if (error?.code === '23505') return NextResponse.json({ error: DEJA_LA }, { status: 409 })
  if (error?.code === '23514') return NextResponse.json({ error: FORME_REFUSEE }, { status: 400 })
  if (error) return erreur500(error, 'Le mot n’a pas pu être ajouté.')
  return NextResponse.json({ mot: data })
}

export async function PATCH(request: Request) {
  if (!(await estAdminUtilisateur(request))) return refus()
  const corps = await request.json().catch(() => null)
  const id = identifiant(corps)
  if (!id) return NextResponse.json({ error: 'Mot à modifier introuvable.' }, { status: 400 })
  const entree = lireEntree(corps)
  if ('erreur' in entree) return NextResponse.json({ error: entree.erreur }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('accentuation_mots')
    .update({ ...entree, mis_a_jour: new Date().toISOString() })
    .eq('id', id).select(COLONNES).maybeSingle()
  if (error?.code === '23505') return NextResponse.json({ error: DEJA_LA }, { status: 409 })
  if (error?.code === '23514') return NextResponse.json({ error: FORME_REFUSEE }, { status: 400 })
  if (error) return erreur500(error, 'Le mot n’a pas pu être modifié.')
  if (!data) return NextResponse.json({ error: 'Ce mot n’existe plus : la liste a changé entre-temps.' }, { status: 404 })
  return NextResponse.json({ mot: data })
}

export async function DELETE(request: Request) {
  if (!(await estAdminUtilisateur(request))) return refus()
  const id = identifiant(await request.json().catch(() => null))
  if (!id) return NextResponse.json({ error: 'Mot à retirer introuvable.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('accentuation_mots').delete().eq('id', id)
  if (error) return erreur500(error, 'Le mot n’a pas pu être retiré.')
  return NextResponse.json({ ok: true })
}
