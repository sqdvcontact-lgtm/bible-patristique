// Le quiz (« Holy Guessr ») est en cours de développement : la page est MASQUÉE
// en production — /quiz renvoie un 404 tant qu'il n'est pas prêt. Le composant
// QuizBibliqueClient reste dans le dépôt et continue d'évoluer sur la branche de
// travail ; seule la route publique est neutralisée ici.
import { notFound } from 'next/navigation'

export const metadata = { title: 'Corpus Scriptura' }

export default function QuizPage() {
  notFound()
}
