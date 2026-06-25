import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  if (!(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id_oeuvre, niveau, action, valeur, schemaTexte, groupe } = await request.json()
  if (!id_oeuvre || ![1, 2, 3, 4].includes(niveau) || !groupe) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  let champs: Record<string, string>
  if (action === 'supprimer') {
    // Niveau 1 : ref_niv1 sert aussi de clé de regroupement, on ne touche jamais ce champ.
    champs = niveau === 1 ? { ref_niv1_texte: '' } : { [`ref_niv${niveau}`]: '', [`ref_niv${niveau}_texte`]: '' }
  } else {
    if (typeof valeur !== 'string') return NextResponse.json({ error: 'Valeur manquante.' }, { status: 400 })
    const champ = niveau === 1 ? 'ref_niv1_texte' : (schemaTexte ? `ref_niv${niveau}_texte` : `ref_niv${niveau}`)
    champs = { [champ]: valeur }
  }

  let q: any = supabaseAdmin.from('segments').update(champs).eq('id_oeuvre', id_oeuvre).eq('ref_niv1', groupe.niv1)
  if (niveau >= 2) q = q.eq('ref_niv2', groupe.niv2)
  if (niveau >= 3) q = q.eq('ref_niv3', groupe.niv3)
  if (niveau >= 4) q = q.eq('ref_niv4', groupe.niv4)

  const { error } = await q
  if (error) return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
