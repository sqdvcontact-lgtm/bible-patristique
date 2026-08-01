// Règle éditoriale : jamais de point à la fin d'un TITRE (œuvre, sous-titre,
// niveaux de titre du corps). On retire un point final unique à l'affichage, en
// préservant les points de suspension (« … » ou « ... ») et les points internes.
// À n'appliquer qu'aux titres — pas aux textes/chapeaux, qui sont des phrases.
export function sansPointFinal(titre: string | null | undefined): string {
  if (!titre) return ''
  return titre.replace(/([^.\s])\s*\.\s*$/, '$1')
}
