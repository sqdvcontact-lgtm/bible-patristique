import { permanentRedirect } from 'next/navigation'

// Le contenu de cette page vit désormais dans la page indépendante « Statistiques ».
// ⛔ `permanentRedirect` (308) et non `redirect` (307) : le déplacement est
// DÉFINITIF, et seul le permanent transmet les signaux d'indexation à la page
// d'arrivée. Un 307 dit « repassez plus tard », ce qui est faux ici.
export default function PopulairesPage() {
  permanentRedirect('/statistiques')
}
