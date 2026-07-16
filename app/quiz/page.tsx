import { estAdmin as verifierEstAdmin } from '@/app/lib/verifAdmin'
import QuizBibliqueClient from './QuizBibliqueClient'

export const metadata = {
  title: 'Bible games — Corpus Scriptura',
  description: "Un quiz biblique pour retrouver progressivement la référence d'un verset.",
}

export default async function QuizPage() {
  const estAdminReel = await verifierEstAdmin()
  return <QuizBibliqueClient estAdminReel={estAdminReel} />
}
