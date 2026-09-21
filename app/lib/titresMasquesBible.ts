/**
 * LES RANGS DE TITRE QU'UNE ÉDITION BIBLIQUE NE REND PAS — réglage d'administration
 * (demande de l'auteur, 2026-09-21 : « trop de niveaux de titre dans la Fillion »).
 *
 * La donnée vit dans `bible_edition_families.titres_masques` ; la page la lit sous la
 * RLS du lecteur, et la roue crantée du volet gauche l'écrit par la route
 * `/api/admin/bible-titres-masques`. Module pur : aucune requête, aucun rendu.
 *
 * ⛔ On MASQUE un titre, on ne le supprime pas : il reste dans la donnée, avec sa place
 * dans l'axe analytique (`baliserBlocs`), et le corps du bloc qui le porte paraît
 * toujours. Seul l'intitulé se tait — et le sous-titre qui lui appartient avec lui.
 */

export const RANGS_TITRE_BIBLE = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'] as const
export type RangTitreBible = typeof RANGS_TITRE_BIBLE[number]

/** Le nom que la planche des styles donne à chaque rang (§ 35 de la charte). */
export const LIBELLES_RANG_TITRE: Record<RangTitreBible, string> = {
  T1: 'Titre de livre',
  T2: 'Partie, introduction',
  T3: 'Section',
  T4: 'Sous-section',
  T5: 'Paragraphe',
  T6: 'Péricope',
}

/** Lit ce que la base (ou un corps de requête) déclare : rangs connus, sans doublon,
 *  dans l'ordre de l'échelle. Tout le reste est ignoré. */
export function lireTitresMasques(valeur: unknown): RangTitreBible[] {
  if (!Array.isArray(valeur)) return []
  const vus = new Set(valeur.map(String))
  return RANGS_TITRE_BIBLE.filter((rang) => vus.has(rang))
}

/** Le titre de ce rang est-il masqué ? Un rang absent (null) ne l'est jamais. */
export function titreMasque(
  rang: string | null | undefined,
  masques: readonly string[] | null | undefined,
): boolean {
  return !!rang && !!masques && masques.includes(rang)
}
