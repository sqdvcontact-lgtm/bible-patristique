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

  if (!res.ok) {
    const details = await res.json().catch(() => null)
    throw new Error(details?.error ?? "Erreur d'envoi du signalement")
  }
}
