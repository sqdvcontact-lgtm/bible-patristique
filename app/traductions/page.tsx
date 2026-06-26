import { Suspense } from 'react'
import AllerPlusLoinClient from './AllerPlusLoinClient'

export const metadata = {
  title: 'Aller plus loin — La Bible des Pères',
  description: "Les traductions bibliques, des ressources pour aller plus loin, et votre progression de lecture.",
}

export default function AllerPlusLoinPage() {
  return (
    <Suspense fallback={null}>
      <AllerPlusLoinClient />
    </Suspense>
  )
}