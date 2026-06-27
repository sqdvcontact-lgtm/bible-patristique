import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Parametre id manquant.' }, { status: 400 })

  const { data, error: lectureError } = await supabaseAdmin
    .from('essais')
    .select('nb_vues')
    .eq('id', id)
    .maybeSingle()

  if (lectureError || !data) {
    return NextResponse.json({ error: 'Essai introuvable.' }, { status: 404 })
  }

  const nbVues = (data.nb_vues ?? 0) + 1
  const { error } = await supabaseAdmin
    .from('essais')
    .update({ nb_vues: nbVues })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Erreur lors de la mise a jour.' }, { status: 500 })
  return NextResponse.json({ nb_vues: nbVues })
}
