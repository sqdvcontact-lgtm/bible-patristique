import type { Metadata } from 'next'
import { HORS_INDEX } from '@/app/lib/metadonneesSeo'

// Une page de service, atteinte par le lien d'un courriel : hors de l'index.
export const metadata: Metadata = {
  robots: HORS_INDEX,
  title: 'Nouveau mot de passe',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
