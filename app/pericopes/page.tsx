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
    supabaseAdmin.from('pericope_noms').select('pericope_id, nom'),
  ])
  const items = assemblerCatalogue(
    (rp.data ?? []) as { id: string; nom: string; categorie: string; est_collection: boolean }[],
    (ro.data ?? []) as { pericope_id: string; livre: string; canon_id_debut: string; canon_id_fin: string | null }[],
    (rn.data ?? []) as { pericope_id: string; nom: string }[],
  )
  return <PericopesCatalogueClient items={items} />
}
