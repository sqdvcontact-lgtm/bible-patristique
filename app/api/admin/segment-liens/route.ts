import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import type { TypeLien } from '@/app/lib/liens'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// L'appelant parle encore la langue des quatre colonnes (« lien_3 », « A;B;C ») :
// c'est l'écran de l'œuvre, qui n'a pas encore migré. On garde ce contrat et on
// traduit ici — le stockage change, l'interface non.
const CHAMPS_AUTORISES = ['lien_1', 'lien_2', 'lien_3', 'lien_4'] as const

export async function POST(request: Request) {
  if (!(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id, champ, valeur } = await request.json()
  if (!id || !CHAMPS_AUTORISES.includes(champ) || typeof valeur !== 'string') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const type = Number(String(champ).slice(-1)) as TypeLien
  const voulus = [...new Set(valeur.split(';').map(v => v.trim()).filter(Boolean))]

  // On ne remplace pas en bloc : les liens déjà posés portent une fiabilité, un
  // motif et une provenance qu'un aller-retour par l'écran ne doit pas effacer.
  // Seuls partent ceux que l'éditeur a retirés, seuls naissent ceux qu'il a ajoutés.
  const { data: existants, error: eLecture } = await supabaseAdmin
    .from('liens_bibliques').select('id, canon_id').eq('segment_id', id).eq('type', type)
  if (eLecture) return NextResponse.json({ error: 'Erreur lors de la lecture des liens.' }, { status: 500 })

  const presents = new Set((existants ?? []).map(l => l.canon_id).filter(Boolean) as string[])
  const aRetirer = (existants ?? []).filter(l => !l.canon_id || !voulus.includes(l.canon_id)).map(l => l.id)
  const aPoser = voulus.filter(c => !presents.has(c))

  if (aRetirer.length) {
    const { error } = await supabaseAdmin.from('liens_bibliques').delete().in('id', aRetirer)
    if (error) return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })
  }
  if (aPoser.length) {
    const { error } = await supabaseAdmin.from('liens_bibliques').insert(
      aPoser.map(canon_id => ({
        segment_id: id,
        canon_id,
        type,
        // Posé à la main par l'éditeur : c'est le degré de certitude le plus haut.
        fiabilite: 'vérifié',
        provenance: 'editeur',
        arbitrage_requis: false,
      }))
    )
    if (error) return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 })
  }

  // La réponse garde la forme héritée, que l'écran réinjecte dans son état local.
  return NextResponse.json({ ok: true, valeur: voulus.join('; ') })
}
