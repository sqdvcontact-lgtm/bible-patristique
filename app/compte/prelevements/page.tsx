import type { Metadata } from 'next'
import PagePrelevements from './PagePrelevements'

// ⚠️ Le titre seul : `robots` se pose dans le layout de l'espace et ne se redéclare
// jamais ici, sous peine de laisser la page entrer à l'index.
export const metadata: Metadata = { title: 'Mes citations' }

export default function Citations() {
  return <PagePrelevements />
}
