import { createClient } from '@supabase/supabase-js'
import PericopesCatalogueClient from './PericopesCatalogueClient'
import { assemblerCatalogue } from '@/app/lib/pericopes'

// Catalogue des péricopes = données de RÉFÉRENCE publiques, quasi statiques : on les
// charge côté SERVEUR et on met la page en cache ISR (revalidée toutes les 30 min),
// au lieu d'un fetch client au montage. Le composant client ne reçoit que les données
// et ne gère plus que l'interactivité (filtres, recherche, notices).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const revalidate = 1800

export default async function PericopesPage() {
  const [rp, ro, rn] = await Promise.all([
    supabaseAdmin.from('pericopes').select('id, nom, categorie, est_collection'),
    supabaseAdmin.from('pericope_occurrences').select('pericope_id, livre, canon_id_debut, canon_id_fin').eq('est_principale', true),
    // On charge visible_public / usage_recherche pour ÉCARTER les appellations
    // masquées ou marquées « populaire_inexact » : la charte proscrit de surfacer
    // un alias caché ou fautif dans la recherche du catalogue (« trouvé via… »).
    // Filtrage en JS pour conserver les lignes dont usage_recherche est NULL.
    supabaseAdmin.from('pericope_noms').select('pericope_id, nom, visible_public, usage_recherche'),
  ])
  const nomsVisibles = ((rn.data ?? []) as { pericope_id: string; nom: string; visible_public: boolean | null; usage_recherche: string | null }[])
    .filter(n => n.visible_public === true && n.usage_recherche !== 'populaire_inexact')
    .map(n => ({ pericope_id: n.pericope_id, nom: n.nom }))
  const items = assemblerCatalogue(
    (rp.data ?? []) as { id: string; nom: string; categorie: string; est_collection: boolean }[],
    (ro.data ?? []) as { pericope_id: string; livre: string; canon_id_debut: string; canon_id_fin: string | null }[],
    nomsVisibles,
  )
  return <PericopesCatalogueClient items={items} />
}
