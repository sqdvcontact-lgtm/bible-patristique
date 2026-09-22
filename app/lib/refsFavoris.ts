// Référence d’un favori d’œuvre.
//
// Un favori se désigne d’ordinaire par l’identifiant de l’édition. Le TEXTE ORIGINAL
// d’une œuvre est un texte de cette œuvre, sans ligne d’`oeuvres` à lui. On le
// désigne donc par l’identifiant de l’édition suivi de « #la ». La table `favoris`
// ne référence pas `oeuvres` : ce suffixe ne casse aucune clé étrangère, et une
// édition en langue originale AUTONOME garde, elle, son propre identifiant.
//
// Module sans « use client » : il sert aussi au rendu serveur (profil public).

const SUFFIXE_ORIGINAL = '#la'

export const refFavoriOriginal = (idOeuvre: string) => idOeuvre + SUFFIXE_ORIGINAL
export const estRefOriginal = (ref: string) => ref.endsWith(SUFFIXE_ORIGINAL)
export const idOeuvreDeRef = (ref: string) =>
  estRefOriginal(ref) ? ref.slice(0, -SUFFIXE_ORIGINAL.length) : ref
