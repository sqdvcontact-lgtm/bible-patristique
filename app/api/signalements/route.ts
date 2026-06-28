import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceKey ?? anonKey!,
      token && !serviceKey ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
    )

    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token)
      userId = data.user?.id ?? null
    }

    if (!idSegment && idVerset) {
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

    const signalement = {
      id_segment: idSegment,
      id_verset: idVerset,
      user_id: userId,
      message,
      traite: false,
    }

    let { error } = await supabaseAdmin.from('signalements').insert(signalement)
    if (error && /user_id|schema cache|column/i.test(error.message)) {
      const minimal = { id_segment: idSegment, id_verset: idVerset, message, traite: false }
      const retry = await supabaseAdmin.from('signalements').insert(minimal)
      error = retry.error
    }
    if (error && idSegment && /id_verset|schema cache|column/i.test(error.message)) {
      const ancienSchema = { id_segment: idSegment, message, traite: false }
      const retry = await supabaseAdmin.from('signalements').insert(ancienSchema)
      error = retry.error
    }

    if (error) {
      console.error('signalements insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('signalements api error:', error)
    return NextResponse.json({ error: error?.message ?? 'erreur inconnue' }, { status: 500 })
  }
}
