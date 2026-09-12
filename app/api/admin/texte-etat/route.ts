// app/api/admin/texte-etat/route.ts
//
// L'état de validation d'un texte, le motif qui le retient (charte § 52), et les
// INFORMATIONS COMPLÉMENTAIRES que cette édition déclare — ses manuscrits et leurs
// sigles, ses abréviations, ses conventions de transcription (charte § 5.6).
//
// ⛔ On n'écrit JAMAIS `is_public` : la base le dérive de l'état, du motif, du nombre de
// signes et du motif de l'œuvre, puis recalcule la publication de l'œuvre dans la foulée
// (déclencheurs `oeuvre_textes_publication_*`). La réponse rend ce que la base a décidé,
// pour que l'écran dise la vérité au lieu de la deviner.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { ETATS_VALIDATION, type EtatValidation } from '@/app/lib/etatsPublication'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COLONNES_TEXTE =
  'id_texte, id_oeuvre, titre_version, langue, edition_label, statut, is_public, is_default, nb_signes, motif_non_publication, informations_complementaires'

export async function POST(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id_texte, statut, motif, informations } = await req.json()
  if (typeof id_texte !== 'string' || !id_texte) {
    return NextResponse.json({ error: 'Paramètre id_texte manquant.' }, { status: 400 })
  }
  if (!ETATS_VALIDATION.includes(statut as EtatValidation)) {
    return NextResponse.json({ error: 'État inconnu : valide, termine, en_cours ou invalide.' }, { status: 400 })
  }
  const motifPropre = typeof motif === 'string' && motif.trim() ? motif.trim() : null
  if (statut === 'invalide' && !motifPropre) {
    return NextResponse.json({ error: 'Un texte invalide porte son motif : des droits, un doublon, une version remplacée…' }, { status: 400 })
  }

  // ⚠️ UN CHAMP ABSENT DU CORPS N'EFFACE RIEN : on ne réécrit que ce qui est envoyé,
  //    sans quoi un appelant qui ne connaît pas la rubrique la viderait en réglant l'état.
  //    Une prose vidée à dessein arrive en chaîne vide, et vaut alors 'null'.
  const informationsPropres = informations === undefined
    ? undefined
    : (typeof informations === 'string' && informations.trim() ? informations.trim() : null)

  const { error } = await supabaseAdmin
    .from('oeuvre_textes')
    .update({
      statut,
      motif_non_publication: motifPropre,
      ...(informationsPropres === undefined ? {} : { informations_complementaires: informationsPropres }),
    })
    .eq('id_texte', id_texte)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: texte, error: erreurTexte } = await supabaseAdmin
    .from('oeuvre_textes').select(COLONNES_TEXTE).eq('id_texte', id_texte).single()
  if (erreurTexte || !texte) return NextResponse.json({ error: erreurTexte?.message ?? 'Texte introuvable.' }, { status: 500 })

  const { data: oeuvre, error: erreurOeuvre } = await supabaseAdmin
    .from('oeuvres').select('id_oeuvre, acces_public, motif_non_publication')
    .eq('id_oeuvre', texte.id_oeuvre).single()
  if (erreurOeuvre) return NextResponse.json({ error: erreurOeuvre.message }, { status: 500 })

  return NextResponse.json({ ok: true, texte, oeuvre })
}
