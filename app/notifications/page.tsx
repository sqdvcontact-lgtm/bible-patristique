import { redirect } from 'next/navigation'

// Les notifications ne sont plus une page mais un VOLET ouvert depuis la cloche de
// la barre de navigation (cf. app/components/VoletNotifications). Cette route, encore
// pointée par d'anciens liens/marque-pages, renvoie simplement à l'accueil.
export default function NotificationsPage() {
  redirect('/')
}
