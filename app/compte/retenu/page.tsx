import type { Metadata } from 'next'
import CarteRetenue from './CarteRetenue'

export const metadata: Metadata = { title: 'Ce que j’ai retenu' }

export default function PageRetenu() {
  return <CarteRetenue />
}
