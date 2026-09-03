import { createClient } from '@supabase/supabase-js'
import EssaisListeClient from './EssaisListeClient'
import { NOM_ANONYME, nomSigne } from '@/app/lib/signatureEssai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ⚠️ Le rayon est une page RÉGÉNÉRÉE, pas une page calculée à chaque visite.
// À 1800 s, un auteur qui venait de publier ne se voyait pas paraître pendant une
// demi-heure, et pas davantage en rechargeant : Next.js sert d'abord la copie
// périmée et ne régénère qu'ENSUITE, si bien qu'il fallait deux visites après
// l'expiration pour voir la nouveauté. Une minute laisse le cache faire son office
// sur les rafales de visites sans faire mentir la page à celui qui vient d'écrire.
export const revalidate = 60

export const metadata = {
  title: 'Communauté',
  description: 'Liste des publications de la communauté Corpus Scriptura.',
}

export default async function EssaisPage() {
  const { data: essaisRaw } = await supabaseAdmin
    .from('essais')
    .select('id, titre, sous_titre, resume, categories, nb_vues, created_at, publie_at, user_id, afficher_nom_reel, anonyme, couverture, embleme')
    .eq('statut', 'publie')
    .order('publie_at', { ascending: false })

  const essais = essaisRaw ?? []
  const idsAuteurs = [...new Set(essais.map(e => e.user_id))]
  const ids = essais.map(e => e.id)
  const [profilsRes, appreciationsRes] = await Promise.all([
    idsAuteurs.length > 0
      ? supabaseAdmin.from('profils').select('id, pseudo, nom, prenom, mecene_depuis, pub_mecene').in('id', idsAuteurs)
      : Promise.resolve({ data: [] as { id: string; pseudo: string | null; nom: string | null; prenom: string | null; mecene_depuis: string | null; pub_mecene: boolean }[] }),
    ids.length > 0
      ? supabaseAdmin.from('essais_appreciations').select('id_essai').in('id_essai', ids)
      : Promise.resolve({ data: [] as { id_essai: number }[] }),
  ])
  const profils = profilsRes.data
  const appreciations = appreciationsRes.data
  const profilMap: Record<string, { pseudo: string | null; nom: string | null; prenom: string | null; mecene_depuis: string | null; pub_mecene: boolean }> = {}
  profils?.forEach(p => { profilMap[p.id] = p })
  const likesParEssai = new Map<number, number>()
  ;(appreciations ?? []).forEach((l: { id_essai: number }) => likesParEssai.set(l.id_essai, (likesParEssai.get(l.id_essai) ?? 0) + 1))

  const essaisResolus = essais.map(e => {
    const p = profilMap[e.user_id]
    // ⛔ Une publication anonyme ne laisse RIEN partir vers le navigateur qui la relie
    // au compte : ni l'identifiant, ni la marque de mécène (app/lib/signatureEssai.ts).
    const anonyme = !!e.anonyme
    return {
      id: e.id, titre: e.titre, sous_titre: e.sous_titre, resume: e.resume,
      categories: e.categories ?? [], nb_vues: e.nb_vues, nb_likes: likesParEssai.get(e.id) ?? 0,
      publie_at: e.publie_at, auteur: nomSigne(e, p) ?? NOM_ANONYME, user_id: anonyme ? null : e.user_id,
      // ⚠️ La couverture et l'emblème étaient LUS en base et jamais passés au carton :
      // toute couverture choisie retombait sur la couleur tirée de l'identifiant.
      couverture: e.couverture ?? null, embleme: e.embleme ?? null,
      // ⚠️ `pub_mecene` compte ICI, comme dans la vue `mecenes_publics` : cette page
      // lit `profils` avec la clé de service et n'a donc aucun filtre derrière elle.
      mecene: !anonyme && !!p?.mecene_depuis && p.pub_mecene !== false,
    }
  })

  return <EssaisListeClient essais={essaisResolus} />
}
