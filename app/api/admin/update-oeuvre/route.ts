// app/api/admin/update-oeuvre/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { colonnesPeriodeHistorique, normaliserDateHistoriqueTexte } from '@/app/lib/datesHistoriques'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id_oeuvre, champ, valeur } = await req.json()
  if (!id_oeuvre || !champ) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const CHAMPS_AUTORISES = new Set([
    'titre', 'sous_titre', 'note', 'note_traduction', 'statut', 'id_auteur',
    'langue_originale', 'date_composition', 'date_publication', 'trad_date',
    'lien_source', 'couverture', 'categories', 'description', 'sous_genre',
    'fiabilite', 'tags', 'nb_segments', 'traditions', 'ordre',
    'niveaux_sommaire', 'niveaux_corps', 'texte_sommaire', 'texte_corps',
    'afficher_numeros', 'lecture_texte_entier',
    // Champs du formulaire « Modifier l'œuvre » qui manquaient à cette liste blanche :
    // ils étaient rejetés (400) et n'étaient donc PAS enregistrés en base. La RPC
    // admin_update_oeuvre_champ les prend en charge.
    'titre_original', 'trad_auteur', 'editeur', 'collection', 'ville', 'url_source', 'genres',
    // « Commentaires » du formulaire (colonne `commentaire_traduction`) : jusqu'ici la
    // note ne se lisait qu'en pastille, sans moyen de la corriger.
    'commentaire_traduction',
    // Composition du titre pour le frontispice (sauts de ligne éditoriaux). Elle
    // était LUE par la page de titre mais éditable par aucune interface : une
    // correction du titre restait donc invisible sur toute œuvre qui la portait.
    'titre_affichage',
  ])
  if (!CHAMPS_AUTORISES.has(champ)) {
    return NextResponse.json({ error: 'Champ non autorisé.' }, { status: 400 })
  }

  const valeurNormalisee = champ === 'date_publication' || champ === 'date_composition' || champ === 'trad_date'
    ? normaliserDateHistoriqueTexte(valeur)
    : valeur ?? null

  const { error } = champ === 'lecture_texte_entier'
    ? await supabaseAdmin.from('oeuvres').update({ lecture_texte_entier: Boolean(valeur) }).eq('id_oeuvre', id_oeuvre)
    : await supabaseAdmin.rpc('admin_update_oeuvre_champ', {
      p_id_oeuvre: id_oeuvre,
      p_champ: champ,
      p_valeur: valeurNormalisee,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Publication (effacement du marqueur dans `note`) : on estampille la date de
  // mise en ligne à la PREMIÈRE publication seulement (ne pas écraser si déjà fixée).
  if (champ === 'note' && (valeurNormalisee === null || valeurNormalisee === '')) {
    const { error: dateError } = await supabaseAdmin
      .from('oeuvres')
      .update({ date_mise_en_ligne: new Date().toISOString() })
      .eq('id_oeuvre', id_oeuvre)
      .is('date_mise_en_ligne', null)
    if (dateError) return NextResponse.json({ error: dateError.message }, { status: 500 })
  }

  if (champ === 'date_publication' || champ === 'date_composition') {
    const prefixe = champ === 'date_publication' ? 'publication' : 'composition'
    const { error: structureError } = await supabaseAdmin
      .from('oeuvres')
      .update(colonnesPeriodeHistorique(prefixe, valeurNormalisee))
      .eq('id_oeuvre', id_oeuvre)
    if (structureError) return NextResponse.json({ error: structureError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
