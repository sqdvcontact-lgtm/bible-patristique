import type { Metadata } from 'next'
import PageParcours from './PageParcours'

export const metadata: Metadata = { title: 'Mon parcours' }

export default function Parcours() {
  return <PageParcours />
}
