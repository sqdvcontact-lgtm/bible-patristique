import { EcranAttente } from '@/app/lib/attenteEnCreux'

// L'attente d'une page de l'administration : le mot, au milieu de la colonne.
//
// Le sommaire, posé par le layout, reste en place pendant qu'une autre page se charge. Sans cet
// écran, le layout étant partagé, le routeur gardait la page quittée jusqu'à l'arrivée de la
// suivante, et rien ne disait que le clic avait porté.
// ⚠️ L'écran de la racine (`app/loading.tsx`) ne peut pas servir ici : il vit AU-DESSUS du
// layout de l'administration, et une frontière posée au-dessus d'un layout partagé ne paraît
// pas quand on navigue en dessous.
export default function AttenteAdministration() {
  return <EcranAttente />
}
