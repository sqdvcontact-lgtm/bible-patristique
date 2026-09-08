import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/app/lib/rateLimiter'
import { adresseDuClient, empreinteAnonyme } from '@/app/lib/empreinteAnonyme'

// Recueille une adresse depuis la page du chantier, pour prévenir la personne à
// l'ouverture. La table est fermée par RLS : c'est cette route, et elle seule,
// qui y écrit — avec la clé de service, qui ne quitte jamais le serveur.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Contrôle volontairement large : la seule validation qui vaille est l'envoi
// d'un message. On écarte ce qui ne peut pas être une adresse, rien de plus.
const FORME = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// ── Limitation de débit ──────────────────────────────────────────────────────
// La route est publique par nécessité. Sans garde-fou, une boucle de douze
// requêtes suffisait à insérer douze lignes — donc autant qu'on veut, et la table
// devient un dépotoir. Le compteur est celui de `app/lib/rateLimiter.ts`, partagé
// avec les autres routes publiques : il y en avait trois copies, dont une qui ne
// purgeait pas sa carte.
const FENETRE_MS = 10 * 60 * 1000
const MAX_PAR_FENETRE = 5

export async function POST(request: Request) {
  // L'adresse ne sert qu'à compter : une empreinte salée du jour la remplace, comme
  // dans /api/contact — le débit se limite sans qu'aucune adresse ne soit retenue.
  const empreinte = empreinteAnonyme(adresseDuClient(request), request.headers.get('user-agent') ?? '')
  if (!checkRateLimit(`attente:${empreinte}`, MAX_PAR_FENETRE, FENETRE_MS)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(FENETRE_MS / 1000) } }
    )
  }

  let courriel: unknown
  try {
    ({ courriel } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  if (typeof courriel !== 'string') {
    return NextResponse.json({ error: 'Adresse manquante.' }, { status: 400 })
  }
  const adresse = courriel.trim()
  if (adresse.length > 254 || !FORME.test(adresse)) {
    return NextResponse.json({ error: 'Cette adresse ne semble pas valide.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('inscriptions_attente')
    .insert({ courriel: adresse, source: 'accueil' })

  // 23505 = doublon sur l'index unique. Une personne qui s'inscrit deux fois
  // n'a pas commis d'erreur : on lui répond comme si c'était la première.
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: "L'enregistrement a échoué. Réessayez plus tard." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
