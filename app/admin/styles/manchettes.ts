/**
 * La règle des MANCHETTES — comment se posent les légendes dans la marge.
 *
 * Une légende voudrait se caler sur le haut de l'unité qu'elle nomme. Mais une
 * unité peut être plus courte que sa notice — un paragraphe fait trente pixels,
 * sa notice en fait cent cinquante —, et deux légendes se recouvrent alors. C'est
 * exactement ce qui est arrivé au premier jet, et ce que cette règle répare.
 *
 * Chaque légende se pose donc au plus bas de DEUX repères : le haut de son unité,
 * ou le bas de la précédente augmenté d'un blanc. C'est la règle des manchettes
 * d'un livre imprimé, où la note glisse vers le bas plutôt que de mordre sa voisine.
 *
 * ⛔ Elle ne remonte JAMAIS une légende au-dessus de son unité : la marge peut
 * prendre du retard sur le texte, elle ne peut pas le devancer, sans quoi le filet
 * de repère pointerait vers un passage qu'on n'a pas encore lu.
 *
 * Module pur, testé par `manchettes.test.ts`.
 */

/** Le blanc minimal entre deux légendes qui se suivent. */
export const BLANC_ENTRE_LEGENDES = 14

export type PoseDesManchettes = {
  /** Le haut de chaque légende, dans le repère de la colonne. */
  hauts: number[]
  /** Ce que la marge occupe en tout : la hauteur que l'épreuve doit réserver. */
  hauteurTotale: number
}

/**
 * @param ancres    le haut de chaque unité, dans le repère de la colonne
 * @param hauteurs  la hauteur mesurée de chaque légende
 * @param blanc     le blanc minimal entre deux légendes
 */
export function calerManchettes(
  ancres: readonly number[],
  hauteurs: readonly number[],
  blanc: number = BLANC_ENTRE_LEGENDES,
): PoseDesManchettes {
  const hauts: number[] = []
  let plancher = 0
  ancres.forEach((ancre, i) => {
    const pose = Math.max(ancre, plancher)
    hauts.push(pose)
    plancher = pose + (hauteurs[i] ?? 0) + blanc
  })
  return { hauts, hauteurTotale: ancres.length === 0 ? 0 : plancher - blanc }
}
