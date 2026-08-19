import { createClient } from '@supabase/supabase-js'
import EssaisListeClient from './EssaisListeClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const revalidate = 1800

export const metadata = {
  title: 'Publications',
  description: 'Liste des publications de la communauté Corpus Scriptura.',
}

export default async function EssaisPage() {
  const { data: essaisRaw } = await supabaseAdmin
    .from('essais')
    .select('id, titre, sous_titre, resume, categories, nb_vues, created_at, publie_at, user_id, afficher_nom_reel, couverture')
    .eq('statut', 'publie')
    .order('publie_at', { ascending: false })

  const essais = essaisRaw ?? []
  const idsAuteurs = [...new Set(essais.map(e => e.user_id))]
  const ids = essais.map(e => e.id)
  const [profilsRes, appreciationsRes] = await Promise.all([
    idsAuteurs.length > 0
      ? supabaseAdmin.from('profils').select('id, pseudo, nom, prenom').in('id', idsAuteurs)
      : Promise.resolve({ data: [] as { id: string; pseudo: string | null; nom: string | null; prenom: string | null }[] }),
    ids.length > 0
      ? supabaseAdmin.from('essais_appreciations').select('id_essai').in('id_essai', ids)
      : Promise.resolve({ data: [] as { id_essai: number }[] }),
  ])
  const profils = profilsRes.data
  const appreciations = appreciationsRes.data
  const profilMap: Record<string, { pseudo: string | null; nom: string | null; prenom: string | null }> = {}
  profils?.forEach(p => { profilMap[p.id] = p })
  const likesParEssai = new Map<number, number>()
  ;(appreciations ?? []).forEach((l: { id_essai: number }) => likesParEssai.set(l.id_essai, (likesParEssai.get(l.id_essai) ?? 0) + 1))

  const essaisResolus = essais.map(e => {
    const p = profilMap[e.user_id]
    const nomAffiche = (e.afficher_nom_reel && p?.nom) ? `${p.prenom ? p.prenom + ' ' : ''}${p.nom}` : (p?.pseudo ?? 'Anonyme')
    return {
      id: e.id, titre: e.titre, sous_titre: e.sous_titre, resume: e.resume,
      categories: e.categories ?? [], nb_vues: e.nb_vues, nb_likes: likesParEssai.get(e.id) ?? 0,
      publie_at: e.publie_at, auteur: nomAffiche, user_id: e.user_id,
    }
  })

  return <EssaisListeClient essais={essaisResolus} />
}
