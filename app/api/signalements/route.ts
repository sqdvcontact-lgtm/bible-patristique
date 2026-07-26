import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      return NextResponse.json({ error: 'Configuration Supabase incomplète.' }, { status: 500 })
    }

    const body = await request.json()
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const importanceStr = typeof body?.importance === 'string' ? body.importance : null
    const importance: number = importanceStr === 'bloquant' ? 3 : importanceStr === 'mineur' ? 1 : 2
    const urlSource = typeof body?.url_source === 'string' && body.url_source ? body.url_source.slice(0, 500) : null
    const idSegmentRaw = body?.id_segment
    let idSegment = typeof idSegmentRaw === 'number' && Number.isFinite(idSegmentRaw)
      ? idSegmentRaw
      : typeof idSegmentRaw === 'string' && /^\d+$/.test(idSegmentRaw)
      ? Number(idSegmentRaw)
      : null
    const idVerset = typeof body?.id_verset === 'string' && body.id_verset.trim()
      ? body.id_verset.trim()
      : null
    // Signalement par référence canonique (page Polyglotte) : son modèle repose sur
    // versets_v2/versets_canon, sans id_verset au format de l'ancienne table. On accepte
    // alors une simple référence lisible (« Gn 3, 1 »), consignée en tête du message pour
    // que le modérateur sache de quel verset il s'agit.
    const reference = typeof body?.reference === 'string' && body.reference.trim()
      ? body.reference.trim().slice(0, 120)
      : null
    const profilPseudo = typeof body?.profil_pseudo === 'string' && body.profil_pseudo.trim()
      ? body.profil_pseudo.trim().slice(0, 80)
      : null

    if (!message) {
      return NextResponse.json({ error: 'message manquant' }, { status: 400 })
    }
    if (!idSegment && !idVerset && !reference && !profilPseudo) {
      return NextResponse.json({ error: 'Objet du signalement manquant.' }, { status: 400 })
    }

    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '').trim()
    let userId: string | null = null

    if (!serviceKey) {
      return NextResponse.json({ error: 'Configuration Supabase incomplète.' }, { status: 500 })
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token)
      userId = data.user?.id ?? null
    }

    let referenceStockee = reference
    if (profilPseudo) {
      if (!userId) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
      const { data: profilCible } = await supabaseAdmin
        .from('profils')
        .select('id, pseudo')
        .eq('pseudo', profilPseudo)
        .maybeSingle()
      if (!profilCible) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
      if (profilCible.id === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas signaler votre propre profil.' }, { status: 400 })
      }
      referenceStockee = `Profil @${profilCible.pseudo}`
    }

    if (!idSegment && idVerset) {
      // Validation du format id_verset avant usage dans ILIKE (prévient l'injection de
      // wildcards `%`/`_`). On accepte l'ancien format (« B000139 ») ET le format canon
      // issu de la bascule versets_v2 (« PSA.54.5 », « 1CO.7.38 ») : lettres, chiffres et
      // points seulement — ni `%` ni `_`, donc sûr pour le ILIKE ci-dessous.
      if (!/^[A-Z0-9.]{2,20}$/.test(idVerset)) {
        return NextResponse.json({ error: 'Format id_verset invalide.' }, { status: 400 })
      }
      const colonnes = ['lien_1', 'lien_2', 'lien_3', 'lien_4'] as const
      for (const colonne of colonnes) {
        const { data: segmentLie } = await supabaseAdmin
          .from('segments')
          .select('id')
          .ilike(colonne, `%${idVerset}%`)
          .limit(1)
          .maybeSingle()
        if (segmentLie?.id) {
          idSegment = segmentLie.id
          break
        }
      }
    }

    // Faute de colonne dédiée, la référence de page ou de profil est portée en tête du
    // message : le modérateur la voit, et rien n'est perdu.
    const messageStocke = referenceStockee && !idSegment && !idVerset ? `[Réf. ${referenceStockee}] ${message}` : message
    const insertPayload: Record<string, unknown> = { message: messageStocke, importance, traite: false }
    if (idSegment !== null) insertPayload.id_segment = idSegment
    if (idVerset !== null) insertPayload.id_verset = idVerset
    if (userId !== null) insertPayload.user_id = userId
    if (urlSource !== null) insertPayload.url_source = urlSource

    const { error } = await supabaseAdmin.from('signalements').insert(insertPayload)

    if (error) return erreur500(error, 'Erreur lors de l\'envoi du signalement.')

    return NextResponse.json({ ok: true })
  } catch (error) {
    return erreur500(error)
  }
}
