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

  // « Commentaires privés » : notes de travail de l'administration. Elles ne sont
  // PAS une colonne d'`oeuvres` — la page publique de l'œuvre lit cette table avec
  // select('*') sous la session du lecteur, une colonne de plus y aurait donc été
  // servie à tout compte connecté. Elles vivent dans une table sans droit de lecture
  // pour anon ni authenticated, atteinte ici par la clé de service.
  if (champ === 'commentaire_prive') {
    const texte = typeof valeur === 'string' ? valeur.trim() : ''
    const { error: erreurPrive } = texte
      ? await supabaseAdmin.from('oeuvres_commentaires_prives')
          .upsert({ id_oeuvre, commentaire: texte, modifie_le: new Date().toISOString() })
      : await supabaseAdmin.from('oeuvres_commentaires_prives').delete().eq('id_oeuvre', id_oeuvre)
    if (erreurPrive) return NextResponse.json({ error: erreurPrive.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // PUBLICATION. ⛔ Elle ne passe pas par la RPC : celle-ci coupe les triggers
  // (session_replication_role = replica), et `acces_public` est gardé par
  // `oeuvres_depublication_textes`, qui refuse de retirer une œuvre dont un texte est
  // encore public. On écrit donc la colonne DIRECTEMENT, sous la clé de service (qui
  // passe la RLS mais pas les triggers), et le refus de la base remonte tel quel — son
  // message dit ce qu'il reste à faire.
  // ⚠️ La date de mise en ligne s'estampille à la PREMIÈRE publication seulement,
  // comme avant, quand elle suivait l'effacement du marqueur dans `note`.
  if (champ === 'acces_public') {
    const ouvrir = valeur === true
    const { error: erreurAcces } = await supabaseAdmin
      .from('oeuvres')
      .update({ acces_public: ouvrir, acces_public_modifie_le: new Date().toISOString() })
      .eq('id_oeuvre', id_oeuvre)
    if (erreurAcces) return NextResponse.json({ error: erreurAcces.message }, { status: 409 })
    if (ouvrir) {
      const { error: dateError } = await supabaseAdmin
        .from('oeuvres')
        .update({ date_mise_en_ligne: new Date().toISOString() })
        .eq('id_oeuvre', id_oeuvre)
        .is('date_mise_en_ligne', null)
      if (dateError) return NextResponse.json({ error: dateError.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  const CHAMPS_AUTORISES = new Set([
    'titre', 'sous_titre', 'note_traduction', 'statut', 'id_auteur',
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
    // Les trois notes éditoriales de l'œuvre (3 septembre 2026). `note`, qui portait
    // la prose ET le marqueur de dépublication, n'existe plus.
    'note_editoriale_complete', 'note_editoriale_complement', 'note_editoriale_titre',
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
