import type { Metadata } from 'next'
import RubriquePresentation from './RubriquePresentation'

export const metadata: Metadata = { title: 'Présentation' }

export default function PagePresentation() {
  return <RubriquePresentation />
}
