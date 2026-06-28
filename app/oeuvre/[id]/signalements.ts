'use client'

import { supabase } from '@/app/lib/supabase'

type SignalementPayload = {
  id_segment: number | null
  message: string
}

export async function insererSignalement(payload: SignalementPayload) {
  const { data } = await supabase.auth.getSession()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const token = data.session?.access_token
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch('/api/signalements', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (res.ok) return

  const details = await res.json().catch(() => null)
  let { error } = await supabase.from('signalements').insert({
    id_segment: payload.id_segment,
    user_id: data.session?.user.id ?? null,
    message: payload.message,
    traite: false,
  })
  if (error && /user_id|schema cache|column/i.test(error.message)) {
    const retry = await supabase.from('signalements').insert({
      id_segment: payload.id_segment,
      message: payload.message,
      traite: false,
    })
    error = retry.error
  }
  if (error) {
    throw new Error(details?.error || error.message || "Erreur d'envoi du signalement")
  }
}
