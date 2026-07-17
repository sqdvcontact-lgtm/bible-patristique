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

    if (!message) {
      return NextResponse.json({ error: 'message manquant' }, { status: 400 })
    }
    if (!idSegment && !idVerset) {
      return NextResponse.json({ error: 'id_segment ou id_verset manquant' }, { status: 400 })
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

    if (!idSegment && idVerset) {
      // Validation du format id_verset avant usage dans ILIKE (prévient l'injection de wildcards)
      if (!/^[A-Z][0-9]{1,8}$/.test(idVerset)) {
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

    const insertPayload: Record<string, unknown> = { message, importance, traite: false }
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
