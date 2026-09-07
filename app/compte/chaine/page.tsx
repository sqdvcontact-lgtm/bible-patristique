import type { Metadata } from 'next'
import PageChaine from './PageChaine'

// ⚠️ Le titre seul : `robots` se pose dans le layout de l'espace et ne se redéclare
// jamais ici, sous peine de laisser la page entrer à l'index.
export const metadata: Metadata = { title: 'Ma chaîne' }

export default function Chaine() {
  return <PageChaine />
}
