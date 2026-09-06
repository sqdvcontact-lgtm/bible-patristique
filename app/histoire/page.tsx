import { createClient } from '@supabase/supabase-js'
import HistoireClient from './HistoireClient'
import {
  fusionnerDatesFrise,
  type RangFrise, type RangFriseDates, type RelationFrise, type SerieFrise,
} from '@/app/lib/frise'

// Frise générale de l'histoire de l'Église = données de RÉFÉRENCE publiques, quasi
// statiques : on les charge côté SERVEUR et on met la page en cache ISR (revalidée
// toutes les 30 min), au lieu d'un fetch client au montage. Le composant client ne
// reçoit que les événements déjà fusionnés et ne gère plus que l'interactivité.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const revalidate = 1800

/**
 * ⛔ LES COLONNES SE NOMMENT. La page tirait toute la vue — soixante-trois colonnes,
 * dont dix-huit que le rendu ne regarde jamais : badges d'essentiel, justification de
 * classement, statut éditorial, version de classification, drapeaux de contrôle. Mesuré
 * le 2026-09-06 sur mille lignes : 2 342 Ko rendus, 1 710 Ko pour ce qui sert. La frise
 * en compte 1 170.
 * ⚠️ Toute colonne nouvellement LUE s'ajoute ici ET dans `RangFrise` : le type est
 * déclaré, il n'est pas vérifié.
 */
const COLONNES_FRISE = [
  'id', 'date_debut', 'date_fin', 'date_affichage', 'qualification_date',
  'titre', 'notice', 'lieu', 'famille', 'famille_id', 'genre', 'genre_id',
  'zone_geographique', 'pays', 'region', 'ville',
  'pays_filtre_codes', 'pays_filtres', 'source_principale', 'source_secondaire',
  'note_datation', 'ordre_affichage',
  'niveau_lecture_fr', 'afficher_mode_essentiel', 'afficher_mode_reperes',
  'afficher_mode_monde_chretien',
  'tradition_codes', 'traditions',
  'series_codes', 'series_titres', 'series_count', 'est_principal_serie',
  'periode', 'periode_code', 'periode_ordre', 'a_des_relations',
].join(', ')

/** Une ligne de `v_series_evenements`. ⛔ On ne fait PAS voyager `membres` tel quel :
 *  son jsonb porte le titre, le niveau, les dates et une justification par membre, tous
 *  déjà présents ailleurs ou inutiles au fil. Seuls l'identifiant, l'ordre et le rôle
 *  descendent au navigateur. */
type LigneSerie = {
  code: string; titre: string; type_serie: string | null
  membres: { evenement_id: string; ordre: number | null; role: string | null }[] | null
}

function compacterSeries(lignes: LigneSerie[]): SerieFrise[] {
  return lignes.map(l => ({
    code: l.code,
    titre: l.titre,
    typeSerie: l.type_serie,
    membres: (l.membres ?? [])
      .map(m => ({ id: m.evenement_id, ordre: m.ordre ?? 0, role: m.role }))
      .sort((a, b) => a.ordre - b.ordre || a.id.localeCompare(b.id)),
  })).filter(s => s.membres.length > 1)
}

export default async function HistoirePage() {
  // La RPC limite chaque réponse à 500 lignes. Ces plages couvrent la frise
  // entière sans changer l'ordre éditorial porté par la vue riche.
  const plages = [
    { p_date_fin: 999 },
    { p_date_debut: 1000, p_date_fin: 1499 },
    { p_date_debut: 1500, p_date_fin: 1799 },
    { p_date_debut: 1800 },
  ]
  const [rangs, series, relations, ...resultatsDates] = await Promise.all([
    supabaseAdmin.from('v_frise_generale').select(COLONNES_FRISE).order('ordre_affichage'),
    // 181 séries, l'ordre et le rôle de leurs 924 membres.
    supabaseAdmin.from('v_series_evenements').select('code, titre, type_serie, membres'),
    // 616 relations affichables. ⛔ Sans `justification` : le fil en dit une phrase, et
    // la justification pèse 71 Ko pour un texte que rien ne rend (116 Ko sans elle,
    // 187 avec, mesuré).
    supabaseAdmin.from('v_evenements_relations')
      .select('evenement_source_id, source_titre, source_date_debut, type_relation, evenement_cible_id, cible_titre, cible_date_debut')
      .eq('est_affiche', true),
    ...plages.map(plage => supabaseAdmin.rpc('rechercher_frise_v2', {
      p_mode: 'tout',
      p_limite: 500,
      ...plage,
    })),
  ])
  const dates = resultatsDates.flatMap(resultat => (resultat.data ?? []) as RangFriseDates[])
  const evs = fusionnerDatesFrise((rangs.data ?? []) as unknown as RangFrise[], dates)
  return (
    <HistoireClient
      evs={evs}
      series={compacterSeries((series.data ?? []) as unknown as LigneSerie[])}
      relations={(relations.data ?? []) as unknown as RelationFrise[]}
    />
  )
}
