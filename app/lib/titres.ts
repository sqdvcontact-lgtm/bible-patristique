// Règle éditoriale : jamais de point à la fin d'un TITRE (œuvre, sous-titre,
// niveaux de titre du corps). On retire un point final unique à l'affichage, en
// préservant les points de suspension (« … » ou « ... ») et les points internes.
// À n'appliquer qu'aux titres — pas aux textes/chapeaux, qui sont des phrases.
export function sansPointFinal(titre: string | null | undefined): string {
  if (!titre) return ''
  return titre.replace(/([^.\s])\s*\.\s*$/, '$1')
}

// Capitale initiale (locale FR), le reste inchangé.
function capitaliserInitiale(mot: string): string {
  return mot ? `${mot.charAt(0).toLocaleUpperCase('fr-FR')}${mot.slice(1)}` : mot
}

// Titres « techniques » hérités d'un atelier d'import (clés de structure brutes) :
// « caput_002 » → « Caput 2 », « quaestio_089 » → « Quaestio 89 » (séparateur et
// zéros de tête normalisés). Et un mot latin isolé, tout en bas de casse
// (« prolegomena », « subscriptio », « incipit »), reçoit sa capitale initiale.
// Règle éditoriale : un titre ne paraît jamais sous sa forme d'atelier. Fonction
// PURE et idempotente ; ne touche qu'aux formes « mot_nombre » ou au mot unique
// tout en minuscules — un vrai intitulé (« Homélie sur… », « Question 2 sur… »)
// n'est jamais modifié (l'ancrage ^…$ l'exige). Testée dans `titres.test.ts`.
export function normaliserTitreTechnique(titre: string | null | undefined): string {
  if (!titre) return ''
  const t = titre.trim()
  const m = t.match(/^([A-Za-zÀ-ÿ]+)[ _]0*(\d+)$/u)
  if (m) return `${capitaliserInitiale(m[1])} ${parseInt(m[2], 10)}`
  if (/^[a-zà-ÿ]{4,}$/u.test(t)) return capitaliserInitiale(t)
  return titre
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
