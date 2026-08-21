import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Désignation des livres bibliques propre à chaque édition, quand elle diffère du canon :
// la Bible de Sacy (1730) compte quatre livres des Rois là où le canon en compte deux de
// Samuel et deux des Rois. Donnée destinée au lecteur, donc publique.
//
// Pourquoi une route et non une lecture directe : la table `parametres` est protégée par
// RLS et le client public n'y voit rien — à raison, elle contient la charte éditoriale.
// On lit donc côté serveur, en n'exposant QUE cette clé. Aucune autre ligne ne sort d'ici.
export const revalidate = 3600

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('parametres')
    .select('valeur')
    .eq('cle', 'livres_editions')
    .maybeSingle()

  if (error) {
    return NextResponse.json({}, { status: 200 })   // l'absence de table ne doit pas casser la page
  }

  try {
    return NextResponse.json(JSON.parse(data?.valeur ?? '{}'))
  } catch {
    return NextResponse.json({})
  }
}
