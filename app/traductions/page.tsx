import { Suspense } from 'react'
import AllerPlusLoinClient from './AllerPlusLoinClient'

export const metadata = {
  title: 'Aller plus loin — Corpus Scriptura',
  description: "Lectures bibliques et patristiques.",
}

export default function AllerPlusLoinPage() {
  return (
    <Suspense fallback={null}>
      <AllerPlusLoinClient />
    </Suspense>
  )
}
