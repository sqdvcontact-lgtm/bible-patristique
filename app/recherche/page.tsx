// app/recherche/page.tsx
export const metadata = {
  title: 'Recherche — Corpus Scriptura',
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
