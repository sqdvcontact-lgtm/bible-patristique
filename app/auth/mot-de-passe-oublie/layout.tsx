import type { Metadata } from 'next'
import { HORS_INDEX } from '@/app/lib/metadonneesSeo'

// Une page de service, sans rien à lire : hors de l'index.
export const metadata: Metadata = {
  robots: HORS_INDEX,
  title: 'Mot de passe oublié',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
