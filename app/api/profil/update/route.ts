import { NextResponse } from 'next/server'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { erreur500 } from '@/app/lib/apiErreur'

export async function POST(req: Request) {
  const sb = await creerSupabaseServeur()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const body = await req.json()
  const champs: Record<string, unknown> = {}

  if ('bio' in body) {
    const bio = body.bio?.trim() || null
    if (bio && bio.length > 800) return NextResponse.json({ error: 'La bio ne peut pas dépasser 800 caractères.' }, { status: 400 })
    champs.bio = bio
  }
  if ('contact_email' in body) {
    const email = body.contact_email?.trim() || null
    if (email && email.length > 200) return NextResponse.json({ error: 'Adresse mail trop longue.' }, { status: 400 })
    champs.contact_email = email
  }
  if ('pub_rang' in body)              champs.pub_rang = Boolean(body.pub_rang)
  if ('pub_essais' in body)            champs.pub_essais = Boolean(body.pub_essais)
  if ('pub_favoris_oeuvre' in body)    champs.pub_favoris_oeuvre = Boolean(body.pub_favoris_oeuvre)
  if ('pub_favoris_versets' in body)   champs.pub_favoris_versets = Boolean(body.pub_favoris_versets)

  if (Object.keys(champs).length === 0)
    return NextResponse.json({ error: 'Aucun champ à mettre à jour.' }, { status: 400 })

  const { error } = await sb.from('profils').update(champs).eq('id', user.id)
  if (error) return erreur500(error, 'Erreur lors de la mise à jour du profil.')

  return NextResponse.json({ ok: true })
}
