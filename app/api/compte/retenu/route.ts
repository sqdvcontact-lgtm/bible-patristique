// LA CARTE DU LECTEUR — « ce que j'ai retenu ».
//
// Le calcul vit dans app/lib/retenuServeur.ts, qu'elle partage avec les hauts faits :
// deux séries s'y comptent sur les mêmes chiffres, et deux calculs concurrents
// auraient fini par donner douze Pères d'un côté et onze de l'autre.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { erreur500 } from '@/app/lib/apiErreur'
import { calculerRetenu, type SiecleRetenu } from '@/app/lib/retenuServeur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export type CarteRetenue = {
  total: number
  retenus: number
  siecles: SiecleRetenu[]
  /** Le siècle où il manque le MOINS d'auteurs, et combien. */
  prochain: { libelle: string; manquent: number } | null
}

export async function GET() {
  const sb = await creerSupabaseServeur()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    const retenu = await calculerRetenu(supabaseAdmin, user.id)

    // ⛔ LE PETIT ÉCART, ET LUI SEUL. Loewenstein : la curiosité naît d'un écart perçu
    // entre ce qu'on sait et ce qu'on veut savoir, et les PETITS écarts l'excitent
    // quand les grands l'éteignent. On ne montre donc jamais l'immensité de ce qui
    // reste, mais le siècle où il manque le moins d'auteurs. À égalité, le plus ancien.
    const incomplets = retenu.siecles
      .map(s => ({ libelle: s.libelle, rang: s.rang, manquent: s.auteurs.filter(a => !a.retenu).length }))
      .filter(s => s.manquent > 0)
      .sort((a, b) => a.manquent - b.manquent || a.rang - b.rang)

    const carte: CarteRetenue = {
      total: retenu.totalAuteurs,
      retenus: retenu.auteursRetenus,
      siecles: retenu.siecles,
      prochain: incomplets[0] ? { libelle: incomplets[0].libelle, manquent: incomplets[0].manquent } : null,
    }

    return NextResponse.json(carte, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    return erreur500(e, 'La carte n’a pas pu être établie.')
  }
}
