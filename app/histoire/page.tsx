import { createClient } from '@supabase/supabase-js'
import HistoireClient from './HistoireClient'
import { fusionnerDatesFrise, type RangFrise, type RangFriseDates } from '@/app/lib/frise'

// Frise générale de l'histoire de l'Église = données de RÉFÉRENCE publiques, quasi
// statiques : on les charge côté SERVEUR et on met la page en cache ISR (revalidée
// toutes les 30 min), au lieu d'un fetch client au montage. Le composant client ne
// reçoit que les événements déjà fusionnés et ne gère plus que l'interactivité.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const revalidate = 1800

export default async function HistoirePage() {
  // La RPC limite chaque réponse à 500 lignes. Ces plages couvrent la frise
  // entière sans changer l'ordre éditorial porté par la vue riche.
  const plages = [
    { p_date_fin: 999 },
    { p_date_debut: 1000, p_date_fin: 1499 },
    { p_date_debut: 1500, p_date_fin: 1799 },
    { p_date_debut: 1800 },
  ]
  const [rangs, ...resultatsDates] = await Promise.all([
    supabaseAdmin.from('v_frise_generale').select('*').order('ordre_affichage'),
    ...plages.map(plage => supabaseAdmin.rpc('rechercher_frise_v2', {
      p_mode: 'tout',
      p_limite: 500,
      ...plage,
    })),
  ])
  const dates = resultatsDates.flatMap(resultat => (resultat.data ?? []) as RangFriseDates[])
  const evs = fusionnerDatesFrise((rangs.data ?? []) as RangFrise[], dates)
  return <HistoireClient evs={evs} />
}
