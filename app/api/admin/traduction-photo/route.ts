import { NextResponse } from 'next/server'
import { erreur500 } from '@/app/lib/apiErreur'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

// Une notice de traduction porte DEUX images, et elles ne se remplacent pas : le
// bandeau horizontal coiffe la carte, l'encart au format portrait se pose dans le
// bloc déplié. Deux objets distincts dans le seau, deux colonnes distinctes.
// `variante` absente vaut `bandeau` : c'était le seul dépôt jusqu'ici, et les
// anciens appels ne doivent pas se mettre à écrire ailleurs.
const VARIANTES = {
  bandeau: { colonne: 'photo',        suffixe: ''         },
  encart:  { colonne: 'photo_encart', suffixe: '-encart'  },
} as const
type Variante = keyof typeof VARIANTES

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
  const tradId = formData.get('trad_id')
  const fichier = formData.get('fichier')
  const varianteBrute = formData.get('variante')

  if (typeof tradId !== 'string' || !tradId || !(fichier instanceof File)) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }
  if (varianteBrute !== null && (typeof varianteBrute !== 'string' || !(varianteBrute in VARIANTES))) {
    return NextResponse.json({ error: 'Variante inconnue : attendu « bandeau » ou « encart ».' }, { status: 400 })
  }
  const variante = (varianteBrute ?? 'bandeau') as Variante
  const { colonne, suffixe } = VARIANTES[variante]
  const chemin = `${tradId}${suffixe}.jpg`

  const buffer = Buffer.from(await fichier.arrayBuffer())
  const mime = detecterMimeImage(buffer)
  if (!mime) return NextResponse.json({ error: 'Format non supporté. Utilisez JPEG, PNG, GIF ou WebP.' }, { status: 415 })

  const { error: uploadError } = await supabaseAdmin.storage.from('traductions').upload(chemin, buffer, {
    upsert: true, contentType: mime,
  })
  if (uploadError) return erreur500(uploadError)

  const { data: urlData } = supabaseAdmin.storage.from('traductions').getPublicUrl(chemin)
  // Cache-buster en DB pour contourner le CDN Supabase lors des remplacements
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  const { error: dbError } = await supabaseAdmin.from('traductions').update({ [colonne]: url }).eq('trad_id', tradId)
  if (dbError) return erreur500(dbError)

  return NextResponse.json({ ok: true, url, variante })
}
