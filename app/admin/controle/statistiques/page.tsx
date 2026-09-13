import { permanentRedirect } from 'next/navigation'

// L'ancienne page des statistiques du corpus.
//
// Ses cartes vivent désormais une par mission, dans le centre de contrôle : chaque mission
// charge ses propres chiffres, et seulement quand on l'ouvre. L'adresse redirige en 308,
// le déplacement étant définitif.
export default function StatistiquesControlePage() {
  permanentRedirect('/admin/controle')
}
