import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const formData = await request.formData()
  const tradId = formData.get('trad_id')
  const fichier = formData.get('fichier')

  if (typeof tradId !== 'string' || !tradId || !(fichier instanceof File)) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const buffer = Buffer.from(await fichier.arrayBuffer())
  const { error: uploadError } = await supabaseAdmin.storage.from('traductions').upload(`${tradId}.jpg`, buffer, {
    upsert: true, contentType: 'image/jpeg',
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from('traductions').getPublicUrl(`${tradId}.jpg`)
  // Cache-buster en DB pour contourner le CDN Supabase lors des remplacements
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  const { error: dbError } = await supabaseAdmin.from('traductions').update({ photo: url }).eq('trad_id', tradId)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ ok: true, url })
}
