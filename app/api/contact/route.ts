import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adresseDuClient, empreinteAnonyme } from '@/app/lib/empreinteAnonyme'

// Formulaire de contact. Deux garanties, dans cet ordre :
//   1. le message est ENREGISTRÉ en base (table fermée par RLS, clé de service) —
//      rien n'est perdu, même si l'envoi d'e-mail n'est pas encore configuré ;
//   2. un e-mail part vers l'éditeur SI un fournisseur est en place (Resend).
//      Sans clé, on saute cette étape sans échouer : le message est déjà sauvé.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Où arrivent les messages. Modifiable par variable d'environnement au besoin.
const DESTINATAIRE = process.env.CONTACT_DESTINATAIRE ?? 'sqdv.contact@gmail.com'

const FORME_COURRIEL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// ── Limitation de débit (en mémoire du processus, comme /api/attente) ─────────
const FENETRE_MS = 10 * 60 * 1000
const MAX_PAR_FENETRE = 5
const visites = new Map<string, number[]>()
function tropDeRequetes(cle: string): boolean {
  const now = Date.now()
  const recentes = (visites.get(cle) ?? []).filter(t => now - t < FENETRE_MS)
  recentes.push(now)
  visites.set(cle, recentes)
  if (visites.size > 5000) for (const [k, v] of visites) if (v.every(t => now - t >= FENETRE_MS)) visites.delete(k)
  return recentes.length > MAX_PAR_FENETRE
}

const propre = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request: Request) {
  // L'adresse ne s'écrit nulle part : une empreinte salée du jour la remplace,
  // pour le débit comme pour la trace (voir app/lib/empreinteAnonyme.ts).
  const empreinte = empreinteAnonyme(adresseDuClient(request), request.headers.get('user-agent') ?? '')
  if (tropDeRequetes(empreinte)) {
    return NextResponse.json({ error: 'Trop de messages envoyés. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(FENETRE_MS / 1000) } })
  }

  let corps: Record<string, unknown>
  try { corps = await request.json() } catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }) }

  const message = propre(corps.message, 5000)
  const nom = propre(corps.nom, 120)
  const sujet = propre(corps.sujet, 200)
  const courriel = propre(corps.courriel, 254)

  if (message.length < 3) return NextResponse.json({ error: 'Le message est vide.' }, { status: 400 })
  if (courriel && !FORME_COURRIEL.test(courriel)) return NextResponse.json({ error: 'L’adresse de réponse ne semble pas valide.' }, { status: 400 })

  // 1. Enregistrement — le filet qui ne perd rien.
  const { error } = await supabaseAdmin.from('messages_contact').insert({
    message, nom: nom || null, sujet: sujet || null, courriel: courriel || null, empreinte,
  })
  if (error) return NextResponse.json({ error: 'L’enregistrement a échoué. Réessayez plus tard.' }, { status: 500 })

  // 2. E-mail, au mieux. Un échec d'envoi ne doit pas perdre le message déjà sauvé.
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        // `onboarding@resend.dev` fonctionne sans domaine vérifié, mais n'envoie
        // qu'à l'adresse du compte Resend. Une fois un domaine vérifié, remplacer
        // par une adresse à ce domaine via CONTACT_EXPEDITEUR.
        from: process.env.CONTACT_EXPEDITEUR ?? 'Corpus Scriptura <onboarding@resend.dev>',
        to: DESTINATAIRE,
        replyTo: courriel || undefined,
        subject: sujet ? `[Contact] ${sujet}` : '[Contact] Nouveau message',
        text: [
          nom ? `De : ${nom}` : '',
          courriel ? `Adresse : ${courriel}` : '',
        ].filter(Boolean).join('\n') + `\n\n${message}`,
      })
    } catch {
      // Silencieux : le message est en base, l'éditeur le verra de toute façon.
    }
  }

  return NextResponse.json({ ok: true })
}
