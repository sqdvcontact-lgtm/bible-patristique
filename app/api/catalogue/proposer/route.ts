import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adresseDuClient, empreinteAnonyme } from '@/app/lib/empreinteAnonyme'

// Proposition d'une œuvre depuis le Catalogue des traductions (bouton « + » à côté
// du cœur). Deux garanties, comme /api/contact :
//   1. la proposition est ENREGISTRÉE en base (messages_contact, clé de service) —
//      rien n'est perdu si l'e-mail n'est pas configuré ;
//   2. un e-mail part vers l'éditeur SI Resend est en place. Sans clé, on saute
//      cette étape sans échouer.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DESTINATAIRE = process.env.CONTACT_DESTINATAIRE ?? 'sqdv.contact@gmail.com'

// Limitation de débit (en mémoire du processus, comme /api/contact).
const FENETRE_MS = 10 * 60 * 1000
const MAX_PAR_FENETRE = 10
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
    return NextResponse.json({ error: 'Trop de propositions envoyées. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(FENETRE_MS / 1000) } })
  }

  let corps: Record<string, unknown>
  try { corps = await request.json() } catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }) }

  const auteur = propre(corps.auteur, 200)
  const titre = propre(corps.titre, 300)
  const commentaire = propre(corps.commentaire, 3000)
  if (!auteur || !titre) return NextResponse.json({ error: 'Auteur ou titre manquant.' }, { status: 400 })

  // Identité du proposant, si connecté (pour que l'éditeur puisse répondre).
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  let courriel: string | null = null
  if (token) {
    const { data } = await supabaseAdmin.auth.getUser(token)
    courriel = data.user?.email ?? null
  }

  const sujet = `Proposition d'œuvre : ${titre}`
  const message = [
    `Auteur : ${auteur}`,
    `Œuvre : ${titre}`,
    commentaire ? `\nCommentaire :\n${commentaire}` : '',
  ].filter(Boolean).join('\n')

  // 1. Enregistrement — le filet qui ne perd rien.
  const { error } = await supabaseAdmin.from('messages_contact').insert({
    message, sujet, courriel: courriel || null, empreinte,
  })
  if (error) return NextResponse.json({ error: 'L’enregistrement a échoué. Réessayez plus tard.' }, { status: 500 })

  // 2. E-mail, au mieux.
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.CONTACT_EXPEDITEUR ?? 'Corpus Scriptura <onboarding@resend.dev>',
        to: DESTINATAIRE,
        replyTo: courriel || undefined,
        subject: `[Proposition] ${sujet}`,
        text: (courriel ? `Proposant : ${courriel}\n\n` : '') + message,
      })
    } catch {
      // Silencieux : la proposition est en base, l'éditeur la verra.
    }
  }

  return NextResponse.json({ ok: true })
}
