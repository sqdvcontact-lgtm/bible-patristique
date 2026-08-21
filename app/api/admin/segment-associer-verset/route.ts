import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import type { TypeLien } from '@/app/lib/liens'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Contrat hérité conservé (voir la note de `segment-liens`) : l'écran envoie
// « lien_1 » à « lien_3 », on traduit ici en type de lien.
const CHAMPS_AUTORISES = ['lien_1', 'lien_2', 'lien_3']

export async function POST(request: Request) {
  if (!(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id, champ, id_verset, id_versets } = await request.json()
  const nouveaux: string[] = id_versets ?? (id_verset ? [id_verset] : [])
  if (!id || !CHAMPS_AUTORISES.includes(champ) || nouveaux.length === 0) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const type = Number(String(champ).slice(-1)) as TypeLien

  // Le segment doit exister : sans ce contrôle, une clé étrangère invalide
  // remonterait en 500 là où l'appelant attend un 404 parlant.
  const { data: seg, error: e0 } = await supabaseAdmin.from('segments').select('id').eq('id', id).single()
  if (e0 || !seg) return NextResponse.json({ error: 'Segment introuvable.' }, { status: 404 })

  const { data: existants, error: e1 } = await supabaseAdmin
    .from('liens_bibliques').select('canon_id').eq('segment_id', id).eq('type', type)
  if (e1) return NextResponse.json({ error: 'Erreur lors de la lecture des liens.' }, { status: 500 })

  const presents = new Set((existants ?? []).map(l => l.canon_id).filter(Boolean) as string[])
  const aAjouter = [...new Set(nouveaux)].filter(v => !presents.has(v))
  if (aAjouter.length === 0) {
    return NextResponse.json({ error: 'Ces versets figurent déjà dans ce type de lien.' }, { status: 409 })
  }

  const { error } = await supabaseAdmin.from('liens_bibliques').insert(
    aAjouter.map(canon_id => ({
      segment_id: id,
      canon_id,
      type,
      fiabilite: 'vérifié',
      provenance: 'editeur',
      arbitrage_requis: false,
    }))
  )
  if (error) return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 })
  return NextResponse.json({ ok: true, ajoutes: aAjouter })
}
