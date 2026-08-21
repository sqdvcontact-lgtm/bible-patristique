import { NextResponse } from 'next/server'

export function erreur500(err?: unknown, msg = 'Erreur serveur.') {
  if (err) console.error('[API]', err)
  return NextResponse.json({ error: msg }, { status: 500 })
}
