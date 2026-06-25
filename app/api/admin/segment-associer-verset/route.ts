import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CHAMPS_AUTORISES = ['lien_1', 'lien_2', 'lien_3']

export async function POST(request: Request) {
  if (!(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id, champ, id_verset, id_versets } = await request.json()
  const nouveaux: string[] = id_versets ?? (id_verset ? [id_verset] : [])
  if (!id || !CHAMPS_AUTORISES.includes(champ) || nouveaux.length === 0) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const { data: seg, error: e0 } = await supabaseAdmin.from('segments').select(champ).eq('id', id).single()
  if (e0 || !seg) return NextResponse.json({ error: 'Segment introuvable.' }, { status: 404 })

  const existants = ((seg as any)[champ] as string | null ?? '').split(';').map(s => s.trim()).filter(Boolean)
  const aAjouter = nouveaux.filter(v => !existants.includes(v))
  if (aAjouter.length === 0) {
    return NextResponse.json({ error: 'Ces versets sont déjà tous associés à ce niveau.' }, { status: 409 })
  }
  const nouvelleValeur = [...existants, ...aAjouter].join('; ')

  const { error } = await supabaseAdmin.from('segments').update({ [champ]: nouvelleValeur }).eq('id', id)
  if (error) return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 })
  return NextResponse.json({ ok: true, ajoutes: aAjouter })
}
