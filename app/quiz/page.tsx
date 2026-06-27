import QuizBibliqueClient from './QuizBibliqueClient'

export const metadata = {
  title: 'Où est-il écrit ? — La Bible des Pères',
  description: "Un quiz biblique pour retrouver progressivement la référence d'un verset.",
}

export default function QuizPage() {
  return <QuizBibliqueClient />
}
