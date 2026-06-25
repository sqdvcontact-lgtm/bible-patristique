// app/recherche/page.tsx
export const metadata = {
  title: 'Recherche — Bible & Tradition',
  description: 'Rechercher dans la Bible et la tradition patristique.',
}

import RechercheClient from './RechercheClient'

export default function RecherchePage() {
  return <RechercheClient />
}