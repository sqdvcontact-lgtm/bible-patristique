import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

// Le lexique de modération (table `moderation_lexique`), tenu par l'auteur depuis
// l'administration (demande du 2026-09-03 : « pour que je puisse en ajouter ou en
// supprimer »). La table est fermée à l'API : lecture et écriture passent ici, avec
// la clé de service et la vérification admin.
//
// ⛔ La liste vit EN BASE et nulle part ailleurs. Les déclencheurs (`trg_garde_lexique`,
// `profils_garde_colonnes`) la lisent à chaque écriture d'un lecteur, et la route
// `creer-profil` l'interroge par `terme_interdit` : un mot ajouté ici agit à l'instant,
// sans déploiement. Il n'y a plus de copie côté site depuis ce jour.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Un terme : des lettres (accents compris), des espaces pour une locution, jusqu'à 40 signes. */
const FORME_TERME = /^[\p{L}][\p{L}' -]{0,38}[\p{L}]$/u

function terme(v: unknown): string | null {
  const t = String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  return FORME_TERME.test(t) ? t : null
}

export async function GET(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { data, error } = await supabaseAdmin.from('moderation_lexique').select('mot, entier').order('mot')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ termes: data ?? [] })
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const corps = await request.json().catch(() => ({}))
  const mot = terme(corps?.mot)
  if (!mot) return NextResponse.json({ error: 'Un terme se compose de lettres, d’espaces ou d’apostrophes, de deux à quarante signes.' }, { status: 400 })
  const entier = corps?.entier === true
  const { error } = await supabaseAdmin.from('moderation_lexique').upsert({ mot, entier }, { onConflict: 'mot' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, mot, entier })
}

export async function DELETE(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const corps = await request.json().catch(() => ({}))
  const mot = String(corps?.mot ?? '').trim().toLowerCase()
  if (!mot) return NextResponse.json({ error: 'Terme manquant.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('moderation_lexique').delete().eq('mot', mot)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
