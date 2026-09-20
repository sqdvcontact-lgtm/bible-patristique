import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminServeur } from '@/app/lib/verifAdmin'
import { cleTitreCompose } from '@/app/oeuvre/[id]/compositionTitres'
import type { ChampTitre } from '@/app/oeuvre/[id]/oeuvreTypes'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CHAMPS: ChampTitre[] = [
  'niv1', 'niv1_texte', 'niv2', 'niv2_texte',
  'niv3', 'niv3_texte', 'niv4', 'niv4_texte',
]

/**
 * L'écriture d'UNE composition d'intertitre (`oeuvres.titres_composes`).
 *
 * ⛔ La CLÉ se calcule ICI, par le module partagé, jamais reçue du navigateur : elle indexe
 * un objet de la base, et une clé libre y permettrait d'écrire n'importe quelle entrée.
 * Le client ne dit que le champ visé et le chemin de la division.
 *
 * ⚠️ Une valeur vide RETIRE l'entrée : l'intertitre revient alors à son titre de catalogue,
 * comme « Revenir au titre de catalogue » le fait sur le frontispice.
 */
export async function POST(request: Request) {
  if (!(await estAdminServeur())) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id_oeuvre, champ, groupe, valeur } = await request.json()
  if (!id_oeuvre || !CHAMPS.includes(champ) || !groupe || typeof valeur !== 'string') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }

  const cle = cleTitreCompose(champ as ChampTitre, {
    niv1: String(groupe.niv1 ?? ''),
    niv2: String(groupe.niv2 ?? ''),
    niv3: String(groupe.niv3 ?? ''),
    niv4: String(groupe.niv4 ?? ''),
  })

  const { data, error } = await supabaseAdmin.rpc('admin_titre_compose', {
    p_id_oeuvre: id_oeuvre,
    p_cle: cle,
    p_valeur: valeur.trim() ? valeur : null,
  })
  if (error) {
    console.error('[admin] titre composé refusé', { id_oeuvre, cle, error })
    return NextResponse.json({ error: error.message ?? "Erreur lors de l'enregistrement." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, cle, titres_composes: data })
}
