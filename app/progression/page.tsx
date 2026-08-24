import ProgressionClient from './ProgressionClient'
import { HORS_INDEX } from '@/app/lib/metadonneesSeo'

// Espace personnel : il ne regarde que son titulaire, donc aucun index.
export const metadata = { robots: HORS_INDEX, title: 'Ma progression' }

export default function ProgressionPage() {
  return <ProgressionClient />
}
