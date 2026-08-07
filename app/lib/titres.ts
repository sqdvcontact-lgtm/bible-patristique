// Règle éditoriale : jamais de point à la fin d'un TITRE (œuvre, sous-titre,
// niveaux de titre du corps). On retire un point final unique à l'affichage, en
// préservant les points de suspension (« … » ou « ... ») et les points internes.
// À n'appliquer qu'aux titres — pas aux textes/chapeaux, qui sont des phrases.
export function sansPointFinal(titre: string | null | undefined): string {
  if (!titre) return ''
  return titre.replace(/([^.\s])\s*\.\s*$/, '$1')
}

// Clé de tri d'un titre : sans article/déterminant de tête, sans accents, pour un
// classement alphabétique (« La Cité de Dieu » → à « C », « L'Évangile » → à « E »).
// À utiliser avec localeCompare('fr'), avec le titre brut en départage.
const ARTICLE_TETE = /^(l'|d'|le |la |les |un |une |des |du |de |au |aux )/
export function cleTriTitre(titre: string | null | undefined): string {
  if (!titre) return ''
  const t = titre.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'")
  return t.replace(ARTICLE_TETE, '').trim()
}
