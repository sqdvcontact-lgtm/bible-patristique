import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Modification du texte d'un verset depuis la page Polyglotte.
// Vérification serveur obligatoire (charte §17) : jamais de confiance au client.
export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdminServeur())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { id, texte } = await request.json()
  if (!id || typeof texte !== 'string') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }
  if (texte.length > 8000) {
    return NextResponse.json({ error: 'Texte trop long.' }, { status: 400 })
  }
  // seule la balise <i> est admise dans le texte des versets (enrichissement d'édition)
  if (/<(?!\/?i>)[^>]*>/.test(texte)) {
    return NextResponse.json({ error: 'Seule la balise <i> est autorisée.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('versets_v2')
    .update({ texte, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
