import { createClient } from '@supabase/supabase-js'
import EssaisListeClient from './EssaisListeClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function EssaisPage() {
  const { data: essaisRaw } = await supabaseAdmin
    .from('essais')
    .select('id, titre, sous_titre, resume, categories, nb_vues, created_at, publie_at, user_id, afficher_nom_reel')
    .eq('statut', 'publie')
    .order('publie_at', { ascending: false })

  const essais = essaisRaw ?? []
  const idsAuteurs = [...new Set(essais.map(e => e.user_id))]
  const { data: profils } = idsAuteurs.length > 0
    ? await supabaseAdmin.from('profils').select('id, pseudo, nom, prenom').in('id', idsAuteurs)
    : { data: [] }
  const profilMap: Record<string, { pseudo: string | null; nom: string | null; prenom: string | null }> = {}
  profils?.forEach(p => { profilMap[p.id] = p })

  const essaisResolus = essais.map(e => {
    const p = profilMap[e.user_id]
    const nomAffiche = (e.afficher_nom_reel && p?.nom) ? `${p.prenom ? p.prenom + ' ' : ''}${p.nom}` : (p?.pseudo ?? 'Anonyme')
    return {
      id: e.id, titre: e.titre, sous_titre: e.sous_titre, resume: e.resume,
      categories: e.categories ?? [], nb_vues: e.nb_vues, publie_at: e.publie_at, auteur: nomAffiche,
    }
  })

  return <EssaisListeClient essais={essaisResolus} />
}