'use client'

import { supabase } from '@/app/lib/supabase'

type SignalementPayload = {
  id_segment: number | null
  message: string
}

function erreurColonneUserId(error: { message?: string } | null) {
  return /user_id|schema cache|Could not find/i.test(error?.message ?? '')
}

export async function insererSignalement(payload: SignalementPayload) {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id ?? null

  const { error } = await supabase.from('signalements').insert({
    ...payload,
    user_id: userId,
    traite: false,
  })

  if (!error) return

  if (erreurColonneUserId(error)) {
    const fallback = await supabase.from('signalements').insert({
      ...payload,
      traite: false,
    })
    if (!fallback.error) return
    throw fallback.error
  }

  throw error
}
