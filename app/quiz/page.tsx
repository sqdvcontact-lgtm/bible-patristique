import QuizBibliqueClient from './QuizBibliqueClient'

export const metadata = {
  title: 'Bible games — Corpus Scriptura',
  description: "Un quiz biblique pour retrouver progressivement la référence d'un verset.",
}

export default function QuizPage() {
  return <QuizBibliqueClient />
}
