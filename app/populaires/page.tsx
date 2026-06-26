import { redirect } from 'next/navigation'

// Le contenu de cette page vit désormais dans l'onglet « Versets populaires »
// de la page « Aller plus loin » (app/traductions/AllerPlusLoinClient.tsx).
export default function PopulairesPage() {
  redirect('/traductions?onglet=populaires')
}