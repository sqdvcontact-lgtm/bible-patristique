import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

// LA BOÎTE AUX LETTRES DU SITE.
//
// ⛔ Pourquoi cette route existe. `messages_contact` recueille DEUX choses : le
// formulaire de contact (/api/contact) et la proposition d'œuvre du catalogue
// (/api/catalogue/proposer). Les deux routes enregistrent d'abord en base « pour ne
// rien perdre », puis envoient un courriel SI `RESEND_API_KEY` est configurée. Or
// elle ne l'est pas en production, et AUCUNE page du site ne lisait cette table :
// les messages tombaient dans un puits. Deux y dormaient depuis juillet, jamais lus
// (constaté le 2026-09-07). Recevoir sans jamais relever n'est pas recevoir.
//
// La table est fermée par RLS — aucune politique, aucun droit pour `anon` ni
// `authenticated` —, elle ne s'atteint donc que par la clé de service, qui ne quitte
// pas le serveur. D'où cette route, et le contrôle d'administration en tête de
// chacune de ses méthodes.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Assez pour tout voir, assez peu pour ne pas charger une page entière de courrier
// ancien. La purge automatique retire de toute façon ce qui a plus de douze mois
// (migration `purge_messages_contact`).
const LIMITE = 300

export async function GET(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('messages_contact')
    .select('id, nom, courriel, sujet, message, cree_le, traite_le')
    .order('cree_le', { ascending: false })
    .limit(LIMITE)
  if (error) return erreur500(error)

  // ⚠️ `empreinte` n'est JAMAIS rendue : c'est le condensé salé du jour qui remplace
  // l'adresse IP (app/lib/empreinteAnonyme.ts). Elle sert au débit, pas à la lecture.
  return NextResponse.json({
    messages: data ?? [],
    nbATraiter: (data ?? []).filter(m => !m.traite_le).length,
  })
}

// Relever (ou reposer) une lettre. On ne détruit rien pour marquer un message lu.
export async function PATCH(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id, traite } = await request.json().catch(() => ({}))
  if (typeof id !== 'number') return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('messages_contact')
    .update({ traite_le: traite === false ? null : new Date().toISOString() })
    .eq('id', id)
  if (error) return erreur500(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id } = await request.json().catch(() => ({}))
  if (typeof id !== 'number') return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('messages_contact').delete().eq('id', id)
  if (error) return erreur500(error)
  return NextResponse.json({ ok: true })
}
