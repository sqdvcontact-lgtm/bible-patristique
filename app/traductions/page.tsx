import { Suspense } from 'react'
import AllerPlusLoinClient from './AllerPlusLoinClient'

export const metadata = {
  title: 'Les traductions — Corpus Scriptura',
  description: "Les traductions bibliques éditées sur le site et leurs notices.",
}

export default function AllerPlusLoinPage() {
  return (
    <Suspense fallback={null}>
      <AllerPlusLoinClient />
    </Suspense>
  )
}
