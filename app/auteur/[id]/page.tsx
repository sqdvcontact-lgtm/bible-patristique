'use client'

// La fiche auteur n'est plus une page à part entière mais une FENÊTRE (voir
// app/components/ModaleAuteur). Cette route ne subsiste que pour les liens directs
// (résultats de recherche, favoris partagés…) : elle ouvre la fenêtre par-dessus un
// fond neutre et, à la fermeture, ramène à la Bibliothèque.

import { useRouter, useParams } from 'next/navigation'
import ModaleAuteur from '@/app/components/ModaleAuteur'

export default function PageAuteur() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const fermer = () => { if (window.history.length > 1) router.back(); else router.push('/bibliotheque') }
  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef' }}>
      <ModaleAuteur id={id} onClose={fermer} />
    </main>
  )
}
