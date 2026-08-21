import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
// requêtes suffisait à insérer douze lignes — donc autant qu'on veut, et la
// table devient un dépotoir.
//
// Le compteur vit en mémoire du processus : il ne survit pas à un redémarrage et
// n'est pas partagé entre instances. C'est assez pour décourager un script
// ordinaire ; ce n'est PAS une protection contre une attaque distribuée, qui
// demanderait un magasin partagé (Redis, ou la base) et un captcha.
const FENETRE_MS = 10 * 60 * 1000
const MAX_PAR_FENETRE = 5
const visites = new Map<string, number[]>()

function tropDeRequetes(cle: string): boolean {
  const now = Date.now()
  const recentes = (visites.get(cle) ?? []).filter(t => now - t < FENETRE_MS)
  recentes.push(now)
  visites.set(cle, recentes)

  // Purge : sans cela, la carte enfle indéfiniment et finit par peser.
  if (visites.size > 5000) {
    for (const [k, v] of visites) if (v.every(t => now - t >= FENETRE_MS)) visites.delete(k)
  }
  return recentes.length > MAX_PAR_FENETRE
}

export async function POST(request: Request) {
  // Vercel place l'adresse réelle du client en tête de `x-forwarded-for`.
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue'
  if (tropDeRequetes(ip)) {
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
