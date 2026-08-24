// app/recherche/page.tsx
import { HORS_INDEX } from '@/app/lib/metadonneesSeo'

// Une page de résultats n'est pas un document mais une vue sur d'autres
// documents : une infinité de requêtes ferait une infinité d'adresses aux
// contenus qui se recouvrent.
export const metadata = {
  robots: HORS_INDEX,
  title: 'Recherche',
  description: 'Rechercher dans les lectures bibliques et patristiques.',
}

import RechercheClient from './RechercheClient'
import { Suspense } from 'react'

export default function RecherchePage() {
  return (
    <Suspense fallback={null}>
      <RechercheClient />
    </Suspense>
  )
}
