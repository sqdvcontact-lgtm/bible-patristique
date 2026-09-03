import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/app/lib/rateLimiter'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveAuth(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return null
  const db = admin()
  const { data: { user } } = await db.auth.getUser(token)
  return user ?? null
}

export async function GET(request: Request, { params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo } = await params
  const user = await resolveAuth(request)
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const db = admin()

  const { data: partenaire } = await db
    .from('profils')
    .select('id, pseudo, mecene_depuis, pub_mecene')
    .eq('pseudo', decodeURIComponent(pseudo))
    .maybeSingle()

  if (!partenaire) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  if (partenaire.id === user.id) return NextResponse.json({ error: 'Impossible de vous écrire à vous-même' }, { status: 400 })

  const uid = user.id
  const pid = partenaire.id

  const { data: msgs, error } = await db
    .from('messages')
    .select('id, expediteur_id, contenu, lu, created_at')
    .or(`and(expediteur_id.eq.${uid},destinataire_id.eq.${pid}),and(expediteur_id.eq.${pid},destinataire_id.eq.${uid})`)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Marquer les messages reçus comme lus
  const nonLus = (msgs ?? []).filter(m => m.expediteur_id === pid && !m.lu).map(m => m.id)
  if (nonLus.length > 0) {
    await db.from('messages').update({ lu: true }).in('id', nonLus)
  }

  return NextResponse.json({
    partenaire_pseudo: partenaire.pseudo,
    // ⚠️ `pub_mecene` compte ICI : cette route lit `profils` avec la clé de service et
    // n'a donc pas le filtre de la vue `mecenes_publics` derrière elle.
    partenaire_mecene: !!partenaire.mecene_depuis && partenaire.pub_mecene !== false,
    messages: (msgs ?? []).map(m => ({
      id: m.id,
      de_moi: m.expediteur_id === uid,
      contenu: m.contenu,
      lu: m.lu,
      created_at: m.created_at,
    })),
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo } = await params
  const user = await resolveAuth(request)
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  // Trente messages par dix minutes et par compte : assez pour une conversation,
  // trop peu pour une rafale. En mémoire du processus, comme /api/contact.
  if (!checkRateLimit(`messagerie:${user.id}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de messages envoyés. Réessayez dans quelques minutes.' }, { status: 429, headers: { 'Retry-After': '600' } })
  }

  const body = await request.json().catch(() => ({}))
  const contenu = typeof body?.contenu === 'string' ? body.contenu.trim() : ''
  if (!contenu || contenu.length > 2000) {
    return NextResponse.json({ error: 'Message invalide (1–2000 caractères)' }, { status: 400 })
  }

  const db = admin()

  const { data: partenaire } = await db
    .from('profils')
    .select('id')
    .eq('pseudo', decodeURIComponent(pseudo))
    .maybeSingle()

  if (!partenaire) return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
  if (partenaire.id === user.id) return NextResponse.json({ error: 'Impossible de vous écrire à vous-même' }, { status: 400 })

  const { error } = await db.from('messages').insert({
    expediteur_id: user.id,
    destinataire_id: partenaire.id,
    contenu,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
