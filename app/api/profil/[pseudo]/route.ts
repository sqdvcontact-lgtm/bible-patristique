import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: Request, { params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo } = await params
  if (!pseudo) return NextResponse.json({ error: 'Pseudo manquant.' }, { status: 400 })

  // contact_email exclu intentionnellement — champ privé non consenti pour exposition publique
  const { data: profil, error } = await sb
    .from('profils')
    .select('id, pseudo, bio, created_at, pub_rang, pub_essais, pub_favoris_oeuvre, pub_favoris_versets')
    .eq('pseudo', pseudo)
    .maybeSingle()

  if (error || !profil) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })

  const rep: Record<string, unknown> = {
    pseudo: profil.pseudo,
    bio: profil.bio ?? null,
    membre_depuis: profil.created_at,
  }

  // Toutes les sections conditionnelles exécutées en parallèle (réduction de N requêtes séquentielles → 1 batch)
  const [classementRes, essaisRes, favsRes, versetsRes, nomReelRes] = await Promise.all([
    profil.pub_rang
      ? sb.from('classement_utilisateurs')
          .select('score, nb_commentaires, nb_valides, nb_likes_recus, nb_essais_publies')
          .eq('user_id', profil.id).maybeSingle()
      : null,
    profil.pub_essais
      ? sb.from('essais')
          .select('id, titre, sous_titre, categories, publie_at, nb_vues')
          .eq('user_id', profil.id).eq('statut', 'publie')
          .order('publie_at', { ascending: false }).limit(10)
      : null,
    profil.pub_favoris_oeuvre
      ? sb.from('favoris').select('ref_id, created_at')
          .eq('user_id', profil.id).eq('type', 'oeuvre')
          .order('created_at', { ascending: false })
      : null,
    profil.pub_favoris_versets
      ? sb.from('prelevements')
          .select('ref_livre_abr, ref_chapitre, ref_verset, texte, traduction, created_at')
          .eq('user_id', profil.id).eq('type', 'biblique')
          .order('created_at', { ascending: false }).limit(6)
      : null,
    sb.from('essais').select('id')
      .eq('user_id', profil.id).eq('statut', 'publie')
      .eq('afficher_nom_reel', true).limit(1),
  ])

  if (profil.pub_rang) {
    rep.classement = classementRes?.data ?? { score: 0, nb_commentaires: 0, nb_valides: 0, nb_likes_recus: 0, nb_essais_publies: 0 }
  }

  if (profil.pub_essais) {
    rep.essais = essaisRes?.data ?? []
  }

  // Bibliothèque personnelle — exposée uniquement si pub_favoris_oeuvre est activé
  if (profil.pub_favoris_oeuvre) {
    const favs = favsRes?.data ?? []
    if (favs.length) {
      const ids = favs.map(f => f.ref_id)
      const { data: oeuvreRows } = await sb
        .from('oeuvres').select('id_oeuvre, titre, id_auteur, note').in('id_oeuvre', ids)

      const oeuvresPubliees = ((oeuvreRows ?? []) as any[]).filter(estOeuvrePubliee)
      const auteurIds = [...new Set(oeuvresPubliees.map(o => o.id_auteur).filter(Boolean))]
      const { data: auteurRows } = await sb
        .from('auteurs').select('id_auteur, nom').in('id_auteur', auteurIds)

      const auteurMap: Record<string, string> = {}
      for (const a of auteurRows ?? []) auteurMap[a.id_auteur] = a.nom

      const oeuvreMap: Record<string, { titre: string; auteur: string }> = {}
      for (const o of oeuvresPubliees) {
        oeuvreMap[o.id_oeuvre] = { titre: o.titre, auteur: auteurMap[o.id_auteur] ?? '' }
      }

      rep.bibliotheque = favs
        .map(f => ({ id: f.ref_id, titre: oeuvreMap[f.ref_id]?.titre, auteur: oeuvreMap[f.ref_id]?.auteur }))
        .filter(item => item.titre)
    } else {
      rep.bibliotheque = []
    }
  }

  if (profil.pub_favoris_versets) {
    rep.versets_favoris = versetsRes?.data ?? []
  }

  // Nom réel — exposé uniquement si l'utilisateur a publié au moins un essai sous son vrai nom
  if (nomReelRes?.data?.length) {
    const { data: identite } = await sb
      .from('profils').select('nom, prenom').eq('id', profil.id).maybeSingle()
    if (identite?.nom) {
      rep.nom_reel = [identite.prenom, identite.nom].filter(Boolean).join(' ')
    }
  }

  return NextResponse.json(rep)
}
