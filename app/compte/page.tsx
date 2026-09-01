import RubriqueCompte from './RubriqueCompte'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { codesTraductionsLecture } from '@/app/lib/traductions'

// « Mon compte » — la porte de l'espace. Le titre et la consigne d'indexation
// viennent du layout.
//
// ⚠️ Les traductions se lisent ICI, côté serveur, et par `codesTraductionsLecture` :
// une traduction déclarée mais non matérialisée dans `versets_lecture` ferait
// échouer toute la page de lecture si on la retenait par défaut (charte, « piège
// d'apparat vide »).
export default async function PageCompte() {
  const sb = await creerSupabaseServeur()
  const [{ data: lignes }, lisibles] = await Promise.all([
    sb.from('traductions').select('trad_id, nom').order('trad_id'),
    codesTraductionsLecture(sb),
  ])
  const traductions = (lignes ?? [])
    .filter(t => lisibles.includes(t.trad_id as string))
    .map(t => ({ id: t.trad_id as string, nom: t.nom as string }))

  return <RubriqueCompte traductions={traductions} />
}
