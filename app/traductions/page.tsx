import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import AllerPlusLoinClient from './AllerPlusLoinClient'
import { JsonLd, donneesBibles } from '@/app/lib/donneesStructurees'

export const metadata = {
  title: 'Les traductions',
  description:
    "Les traductions bibliques éditées sur Corpus Scriptura : Bible de Sacy, Bible Segond, Bible Crampon, Vulgate clémentine, Septante… avec leurs notices.",
  keywords: [
    'Bible de Sacy', 'Bible Segond', 'Bible Crampon', 'Vulgate clémentine', 'Septante',
    'traduction de la Bible', 'Bible française',
  ],
}

// Données de référence publiques : on lit les noms des traductions côté serveur
// (service-role) pour en faire une liste structurée schema.org — inerte tant que
// le site est fermé, mais c'est ce qui fera exister « Bible de Sacy », « Segond »…
// dans les moteurs à l'ouverture.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default async function AllerPlusLoinPage() {
  const { data } = await supabaseAdmin
    .from('traductions')
    .select('trad_id, nom, langue, publication_fin_annee')
    .not('schema_numerotation', 'is', null)
    .order('ordre')
  const bibles = ((data ?? []) as { trad_id: string; nom: string; langue: string | null; publication_fin_annee: number | null }[])
    .map(t => ({ trad_id: t.trad_id, nom: t.nom, langue: t.langue, annee: t.publication_fin_annee }))
  return (
    <>
      {bibles.length > 0 && <JsonLd donnees={donneesBibles(bibles)} />}
      <Suspense fallback={null}>
        <AllerPlusLoinClient />
      </Suspense>
    </>
  )
}
