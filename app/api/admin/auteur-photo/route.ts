import { NextResponse } from 'next/server'
import { erreur500 } from '@/app/lib/apiErreur'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { SEAU_ORIGINAUX_AUTEURS, SEAU_PORTRAITS_AUTEURS, SEAU_VIGNETTES_AUTEURS } from '@/app/lib/photoAuteur'

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
  const vignette = formData.get('vignette')

  if (typeof idAuteur !== 'string' || !idAuteur || !(fichier instanceof File)) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const buffer = Buffer.from(await fichier.arrayBuffer())

  // Vérification des magic bytes — empêche l'upload d'un SVG ou fichier arbitraire
  // déguisé en image via un Content-Type falsifié
  const mime = detecterMimeImage(buffer)
  if (!mime) return NextResponse.json({ error: 'Format non supporté. Utilisez JPEG, PNG, GIF ou WebP.' }, { status: 415 })

  // L'objet porte l'extension .jpg : son type déclaré doit dire la vérité. Les écrans
  // d'administration convertissent en JPEG avant d'envoyer (app/lib/preparerPortrait.ts) ;
  // si un autre format arrive tout de même, on le refuse plutôt que de le ranger sous un
  // nom qui ment — c'est ainsi que le seau s'est retrouvé avec des PNG de 3 Mo en .jpg.
  if (mime !== 'image/jpeg') {
    return NextResponse.json({ error: 'Le portrait doit être un JPEG. Déposez-le depuis l’administration, qui convertit pour vous.' }, { status: 415 })
  }

  // Un portrait se range sous un auteur qui EXISTE : sans quoi le seau garderait un
  // fichier qu'aucune page ne peut montrer.
  const { data: auteur, error: errAuteur } = await supabaseAdmin.from('auteurs').select('id_auteur').eq('id_auteur', idAuteur).maybeSingle()
  if (errAuteur) return erreur500(errAuteur)
  if (!auteur) return NextResponse.json({ error: 'Auteur inconnu.' }, { status: 404 })

  // La vignette est facultative (un appelant ancien n'en envoie pas), mais si elle vient,
  // elle doit être un JPEG, comme le portrait.
  let bufferVignette: Buffer | null = null
  if (vignette instanceof File) {
    bufferVignette = Buffer.from(await vignette.arrayBuffer())
    if (detecterMimeImage(bufferVignette) !== 'image/jpeg') {
      return NextResponse.json({ error: 'La vignette doit être un JPEG.' }, { status: 415 })
    }
  }

  const version = Date.now()
  const { error } = await supabaseAdmin.storage.from(SEAU_PORTRAITS_AUTEURS).upload(`${idAuteur}.jpg`, buffer, {
    // Un an de cache : l'adresse porte la version du dépôt (?v=), si bien qu'un
    // portrait remplacé est une adresse neuve.
    upsert: true, contentType: 'image/jpeg', cacheControl: '31536000',
  })
  if (error) return erreur500(error)

  // Le fichier déposé est aussi ARCHIVÉ tel quel dans le seau privé des originaux :
  // le seau servi peut ensuite être retravaillé (source plus grande, retouche) sans
  // perdre ce qui avait été déposé.
  const { error: errArchive } = await supabaseAdmin.storage.from(SEAU_ORIGINAUX_AUTEURS).upload(`${idAuteur}.jpg`, buffer, {
    upsert: true, contentType: 'image/jpeg',
  })
  if (errArchive) return erreur500(errArchive, 'Le portrait est déposé, mais pas son archive.')

  if (bufferVignette) {
    const { error: errVignette } = await supabaseAdmin.storage.from(SEAU_VIGNETTES_AUTEURS).upload(`${idAuteur}.jpg`, bufferVignette, {
      upsert: true, contentType: 'image/jpeg', cacheControl: '31536000',
    })
    if (errVignette) return erreur500(errVignette, 'Le portrait est déposé, mais pas sa vignette.')
  }

  // ⛔ La version est écrite EN BASE : c'est elle que lisent les pages pour composer
  // l'adresse (`photo_version`, app/lib/photoAuteur.ts).
  const { error: errVersion } = await supabaseAdmin.from('auteurs').update({ photo_version: version }).eq('id_auteur', idAuteur)
  if (errVersion) return erreur500(errVersion, 'Le portrait est déposé, mais sa version n’a pas pu être enregistrée.')

  return NextResponse.json({ ok: true, version })
}
