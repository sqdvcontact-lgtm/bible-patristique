/**
 * Les traductions rangées pour la liste d'administration (2026-09-13).
 *
 * Ordre ALPHABÉTIQUE du nom, à la française : « Bible Crampon » avant « Bible de Sacy ».
 * Les membres d'une même famille d'édition forment un BLOC, que l'alphabet place d'après
 * son premier membre ; dans le bloc, c'est l'ordre de la famille qui décide
 * (`display_order` : la traduction avant son texte source). Une traduction sans famille
 * forme un bloc à elle seule.
 *
 * ⛔ Le regroupement se lit dans `bible_edition_members`, jamais dans une table écrite à la
 * main : une famille créée demain doit se regrouper sans que personne ait à y penser.
 */

/** La place d'une traduction dans sa famille d'édition. */
export type Appartenance = { famille: string; rang: number }

const COLLATION = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

export function rangerEnBlocs<T extends { trad_id: string; nom: string }>(
  lignes: T[],
  familles: Record<string, Appartenance | undefined>,
): T[][] {
  const blocs = new Map<string, T[]>()
  for (const ligne of lignes) {
    const cle = familles[ligne.trad_id]?.famille ?? `seule:${ligne.trad_id}`
    const bloc = blocs.get(cle)
    if (bloc) bloc.push(ligne)
    else blocs.set(cle, [ligne])
  }
  const rang = (ligne: T) => familles[ligne.trad_id]?.rang ?? 0
  return [...blocs.values()]
    .map(bloc => [...bloc].sort((a, b) => rang(a) - rang(b) || COLLATION.compare(a.nom, b.nom)))
    .sort((a, b) => COLLATION.compare(a[0].nom, b[0].nom))
}
