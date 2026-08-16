// Opuscules — partage d'une étagère d'auteur entre œuvres longues et textes brefs.
//
// Une étagère d'auteur prolifique noie ses œuvres substantielles sous ses textes
// brefs : Jean Chrysostome porte onze homélies isolées pour dix œuvres de fond.
// La bibliothèque replie donc les brèves dans une section « Opuscules ».
//
// Le seuil ne vient pas d'une idée de la longueur, il vient du corpus : mesuré le
// 16 août 2026, aucune œuvre publiée ne compte entre 38 824 et 58 044 signes. La
// coupure tombe dans ce vide. Elle ne tombe PAS sur la médiane (environ 59 000
// signes), qui aurait rangé une œuvre sur deux parmi les opuscules et coupé de
// surcroît la série des commentaires de Jérôme sur les petits prophètes : Abdias
// (59 534) en serait sorti pendant que Jonas et Joël restaient.
export const SEUIL_OPUSCULE = 40000

// En deçà, la section coûte plus qu'elle ne dégage : les brèves restent en liste.
export const MINIMUM_OPUSCULES = 3

// `nb_signes` compte TOUS les segments d'une version, quelle que soit leur nature.
// Ne pas le confondre avec les seuls segments de nature « texte » : le corps de
// plusieurs œuvres vit ailleurs. Boèce est un prosimètre porté par « dialogue » et
// « vers », les commentaires de Jérôme portent le lemme biblique en « citation ».
// Sur la Consolation, s'en tenir à « texte » ne compterait que 3 178 signes sur
// 239 170.
export type OeuvreMesuree = { nb_signes?: number | null }

// Le classement porte sur le GROUPE DE TITRE, jamais sur la version isolée : « La
// Cité de Dieu » a une édition latine de Migne dont seule la préface est intégrée
// (1 411 signes), qui ne doit pas quitter son titre pour rejoindre les opuscules.
export type GroupeMesure<T extends OeuvreMesuree> = { versions: T[] }

// La longueur d'un titre est celle de sa version la plus longue.
export function signesGroupe<T extends OeuvreMesuree>(groupe: GroupeMesure<T>): number | null {
  const mesures = groupe.versions
    .map(v => v.nb_signes)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  return mesures.length ? Math.max(...mesures) : null
}

// Une œuvre sans mesure n'est jamais un opuscule : on ne replie pas ce qu'on n'a
// pas mesuré, sous peine de cacher une œuvre entière sur une donnée manquante.
export function estOpuscule<T extends OeuvreMesuree>(groupe: GroupeMesure<T>): boolean {
  const signes = signesGroupe(groupe)
  return signes != null && signes < SEUIL_OPUSCULE
}

export type PartageOpuscules<G> = { grandes: G[]; opuscules: G[]; sectionne: boolean }

// Le repli exige DEUX conditions : assez d'opuscules pour qu'il dégage vraiment la
// liste, et au moins une œuvre longue pour qu'il reste quelque chose au-dessus.
// Sans la seconde, un auteur qui n'a que des textes brefs (Cyprien de Carthage, la
// Doctrine des Apôtres) verrait son étagère vide, repliée tout entière.
export function partagerOpuscules<T extends OeuvreMesuree, G extends GroupeMesure<T>>(
  groupes: G[]
): PartageOpuscules<G> {
  const opuscules = groupes.filter(g => estOpuscule<T>(g))
  const grandes = groupes.filter(g => !estOpuscule<T>(g))
  return { grandes, opuscules, sectionne: opuscules.length >= MINIMUM_OPUSCULES && grandes.length > 0 }
}
