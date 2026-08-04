import { redirect } from 'next/navigation'

// Le contenu de cette page vit désormais dans la page indépendante « Statistiques ».
export default function PopulairesPage() {
  redirect('/statistiques')
}
