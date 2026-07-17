import { NextResponse } from 'next/server'
import { erreur500 } from '@/app/lib/apiErreur'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

function detecterMimeImage(buf: Buffer): string | null {
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp'
  return null
}

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

  // Vérification des magic bytes — empêche l'upload d'un SVG ou fichier arbitraire
  // déguisé en image via un Content-Type falsifié
  const mime = detecterMimeImage(buffer)
  if (!mime) return NextResponse.json({ error: 'Format non supporté. Utilisez JPEG, PNG, GIF ou WebP.' }, { status: 415 })

  const version = Date.now()
  const { error } = await supabaseAdmin.storage.from('auteurs').upload(`${idAuteur}.jpg`, buffer, {
    upsert: true, contentType: mime, cacheControl: '60',
  })

  if (error) return erreur500(error)
  return NextResponse.json({ ok: true, version })
}
