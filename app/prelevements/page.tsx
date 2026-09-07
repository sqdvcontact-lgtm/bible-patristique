import { permanentRedirect } from 'next/navigation'

// « Mes citations » a rejoint l'espace du lecteur le 7 septembre 2026.
//
// ⛔ `permanentRedirect` (308), jamais `redirect` (307) : le déplacement est DÉFINITIF,
// et seul le permanent transmet les signaux d'une adresse à l'autre. Trois déplacements
// du site étaient servis en temporaire, ce que l'audit du 2026-08-25 a relevé.
//
// ⚠️ L'adresse est gardée parce qu'elle a circulé : elle est dans les favoris des
// lecteurs de la bêta, et le menu de compte l'a portée un mois durant.
export default function PrelevementsDeplaces(): never {
  permanentRedirect('/compte/prelevements')
}
