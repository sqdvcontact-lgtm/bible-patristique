import { permanentRedirect } from 'next/navigation'

// Les notifications ne sont plus une page mais un VOLET ouvert depuis la cloche de
// la barre de navigation (cf. app/components/VoletNotifications). Cette route, encore
// pointée par d'anciens liens/marque-pages, renvoie simplement à l'accueil.
//
// ⛔ Vers `/accueil`, JAMAIS vers `/` : la racine sert la Bible dès qu'elle porte
// des paramètres et ne redirige vers l'accueil qu'à défaut — passer par elle
// coûtait donc DEUX redirections en chaîne pour une seule destination.
// ⛔ Et `permanentRedirect` (308), non `redirect` (307) : la page n'existe plus.
export default function NotificationsPage() {
  permanentRedirect('/accueil')
}
