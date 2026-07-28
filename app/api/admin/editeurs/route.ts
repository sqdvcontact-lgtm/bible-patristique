import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// CRUD de la table de référence `editeurs`. La RLS n'autorise que la LECTURE au public ;
// les écritures passent ici, avec vérification admin serveur (charte §17).

function nettoyerVariantes(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map(x => String(x ?? '').trim()).filter(Boolean))]
}

function entier(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
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

  if (body.id) {
    const { data, error } = await supabaseAdmin.from('editeurs').update(ligne).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, editeur: data })
  }
  const { data, error } = await supabaseAdmin.from('editeurs').insert(ligne).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, editeur: data })
}

export async function DELETE(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('editeurs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
