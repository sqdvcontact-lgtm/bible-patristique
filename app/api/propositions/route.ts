import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'

const LIMITE_JOUR = 3

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function identifierUtilisateur(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await sb.auth.getUser(token)
  return user ?? null
}

function debutJour() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// GET — quota restant pour l'utilisateur connecté
export async function GET(req: Request) {
  const user = await identifierUtilisateur(req)
  if (!user) return NextResponse.json({ restantes: 0, limite: LIMITE_JOUR })
  const { count } = await sb
    .from('propositions_oeuvres')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', debutJour())
  const restantes = Math.max(0, LIMITE_JOUR - (count ?? 0))
  return NextResponse.json({ restantes, limite: LIMITE_JOUR })
}

// POST — créer une proposition avec vérification de la limite journalière
export async function POST(req: Request) {
  try {
    const user = await identifierUtilisateur(req)
    if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

    // Vérification limite journalière
    const { count } = await sb
      .from('propositions_oeuvres')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', debutJour())

    if ((count ?? 0) >= LIMITE_JOUR) {
      return NextResponse.json(
        { error: `Limite atteinte : ${LIMITE_JOUR} propositions par jour maximum. Revenez demain.`, limite: true },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { auteur_nom, titre, texte } = body
    if (!auteur_nom?.trim() || !titre?.trim() || !texte?.trim()) {
      return NextResponse.json({ error: 'Les champs auteur, titre et texte sont obligatoires.' }, { status: 400 })
    }

    const { error } = await sb.from('propositions_oeuvres').insert({
      user_id: user.id,
      auteur_nom: auteur_nom.trim(),
      titre: titre.trim(),
      traducteur: body.traducteur?.trim() || null,
      editeur: body.editeur?.trim() || null,
      collection: body.collection?.trim() || null,
      ville: body.ville?.trim() || null,
      date_publication: body.date_publication?.trim() || null,
      siecle: body.siecle?.trim() || null,
      langue: body.langue?.trim() || null,
      note: body.note?.trim() || null,
      texte: texte.trim(),
      afficher_nom: body.afficher_nom ?? false,
    })
    if (error) return erreur500(error)

    const restantes = LIMITE_JOUR - (count ?? 0) - 1
    return NextResponse.json({ ok: true, restantes })
  } catch (e) {
    return erreur500(e)
  }
}
