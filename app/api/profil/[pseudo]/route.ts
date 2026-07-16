import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: Request, { params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo } = await params
  if (!pseudo) return NextResponse.json({ error: 'Pseudo manquant.' }, { status: 400 })

  // Lecture du profil (service role contourne la RLS)
  const { data: profil, error } = await sb
    .from('profils')
    .select('id, pseudo, bio, contact_email, created_at, pub_rang, pub_essais, pub_favoris_oeuvre, pub_favoris_versets')
    .eq('pseudo', pseudo)
    .maybeSingle()

  if (error || !profil) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })

  const rep: Record<string, unknown> = {
    pseudo: profil.pseudo,
    bio: profil.bio ?? null,
    contact_email: profil.contact_email ?? null,
    membre_depuis: profil.created_at,
  }

  // Rang & statistiques
  if (profil.pub_rang) {
    const { data: cl } = await sb
      .from('classement_utilisateurs')
      .select('score, nb_commentaires, nb_valides, nb_likes_recus, nb_essais_publies')
      .eq('user_id', profil.id)
      .maybeSingle()
    rep.classement = cl ?? { score: 0, nb_commentaires: 0, nb_valides: 0, nb_likes_recus: 0, nb_essais_publies: 0 }
  }

  // Essais publiés
  if (profil.pub_essais) {
    const { data: essais } = await sb
      .from('essais')
      .select('id, titre, sous_titre, categories, publie_at, nb_vues')
      .eq('user_id', profil.id)
      .eq('statut', 'publie')
      .order('publie_at', { ascending: false })
      .limit(10)
    rep.essais = essais ?? []
  }

  // Bibliothèque personnelle (favoris oeuvres) — toujours publique
  {
    const { data: favs } = await sb
      .from('favoris')
      .select('ref_id, created_at')
      .eq('user_id', profil.id)
      .eq('type', 'oeuvre')
      .order('created_at', { ascending: false })

    if (favs?.length) {
      const ids = favs.map(f => f.ref_id)
      const { data: oeuvreRows } = await sb
        .from('oeuvres')
        .select('id_oeuvre, titre, id_auteur')
        .in('id_oeuvre', ids)

      const auteurIds = [...new Set((oeuvreRows ?? []).map(o => o.id_auteur).filter(Boolean))]
      const { data: auteurRows } = await sb
        .from('auteurs')
        .select('id_auteur, nom')
        .in('id_auteur', auteurIds)

      const auteurMap: Record<string, string> = {}
      for (const a of auteurRows ?? []) auteurMap[a.id_auteur] = a.nom

      const oeuvreMap: Record<string, { titre: string; auteur: string }> = {}
      for (const o of oeuvreRows ?? []) {
        oeuvreMap[o.id_oeuvre] = { titre: o.titre, auteur: auteurMap[o.id_auteur] ?? '' }
      }

      rep.bibliotheque = favs
        .map(f => ({ id: f.ref_id, titre: oeuvreMap[f.ref_id]?.titre, auteur: oeuvreMap[f.ref_id]?.auteur }))
        .filter(item => item.titre)
    } else {
      rep.bibliotheque = []
    }
  }

  // Versets favoris (les 6 derniers enregistrés)
  if (profil.pub_favoris_versets) {
    const { data: versets } = await sb
      .from('prelevements')
      .select('ref_livre_abr, ref_chapitre, ref_verset, texte, traduction, created_at')
      .eq('user_id', profil.id)
      .eq('type', 'biblique')
      .order('created_at', { ascending: false })
      .limit(6)
    rep.versets_favoris = versets ?? []
  }

  // Nom réel — exposé uniquement si l'utilisateur a publié au moins un essai sous son vrai nom
  const { data: essaiNomReel } = await sb
    .from('essais')
    .select('id')
    .eq('user_id', profil.id)
    .eq('statut', 'publie')
    .eq('afficher_nom_reel', true)
    .limit(1)

  if (essaiNomReel?.length) {
    const { data: identite } = await sb
      .from('profils')
      .select('nom, prenom')
      .eq('id', profil.id)
      .maybeSingle()
    if (identite?.nom) {
      rep.nom_reel = [identite.prenom, identite.nom].filter(Boolean).join(' ')
    }
  }

  return NextResponse.json(rep)
}
