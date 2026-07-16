import { NextResponse } from 'next/server'
import { erreur500 } from '@/app/lib/apiErreur'
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
  const idAuteur = formData.get('id_auteur')
  const fichier = formData.get('fichier')

  if (typeof idAuteur !== 'string' || !idAuteur || !(fichier instanceof File)) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const buffer = Buffer.from(await fichier.arrayBuffer())
  const version = Date.now()
  const contentType = fichier.type && fichier.type.startsWith('image/') ? fichier.type : 'application/octet-stream'
  const { error } = await supabaseAdmin.storage.from('auteurs').upload(`${idAuteur}.jpg`, buffer, {
    upsert: true, contentType, cacheControl: '60',
  })

  if (error) return erreur500(error)
  return NextResponse.json({ ok: true, version })
}
