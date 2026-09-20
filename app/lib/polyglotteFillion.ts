/**
 * La Fillion dans la Polyglotte : ce que la page doit savoir d'une bible qui n'est pas
 * dans `versets_v2`.
 *
 * Son texte est recomposé depuis les tables éditoriales, puis posé sur l'axe canonique
 * par les alignements vérifiés. La page le lit dans `v_polyglotte_fillion`, une table de
 * lecture au contrat de `versets_v2` : mêmes colonnes, mêmes filtres, même cache. Il ne
 * reste donc ici que ce qui lui est propre — la Fillion n'existe pas partout, et son
 * entrée dans le menu se borne aux livres réellement alignés.
 */

/** Une ligne de `v_polyglotte_fillion_livres` : un livre lisible dans une traduction. */
export type LivreFillion = {
  trad_id: string
  livre: string
  nb_versets: number
}

/** trad_id → codes des livres où cette traduction se lit. */
export type LivresParTraduction = Map<string, Set<string>>

export function indexerLivresFillion(lignes: readonly LivreFillion[]): LivresParTraduction {
  const index: LivresParTraduction = new Map()
  for (const ligne of lignes) {
    const livres = index.get(ligne.trad_id) ?? new Set<string>()
    livres.add(ligne.livre)
    index.set(ligne.trad_id, livres)
  }
  return index
}

/**
 * Les bibles servies par `versets_v2` gardent le comportement du menu : elles y sont
 * toujours, et une case vide dit « absent de cette traduction ». La Fillion, elle, n'est
 * alignée que sur une douzaine de livres : l'offrir ailleurs serait promettre un texte
 * qui n'existe pas encore. Elle n'entre donc dans le menu que si l'un des livres
 * AFFICHÉS la porte.
 * ⚠️ Une couverture qui n'a pas pu être lue laisse la Fillion fermée : mieux vaut un
 * menu incomplet qu'une colonne qui s'ouvre sur rien.
 */
export function traductionsDisponiblesPourLivres<T extends { trad_id: string; sourceFillion?: boolean }>(
  traductions: readonly T[],
  livresAffiches: readonly string[],
  livresParTraduction: LivresParTraduction,
): T[] {
  return traductions.filter(traduction => {
    if (!traduction.sourceFillion) return true
    const livres = livresParTraduction.get(traduction.trad_id)
    return livres !== undefined && livresAffiches.some(livre => livres.has(livre))
  })
}

/**
 * Un choix de colonnes gardé dans le navigateur ne doit pas rouvrir la Fillion quand le
 * lecteur quitte les livres qu'elle couvre : la colonne porterait son nom sans rien
 * dessous. Le choix RESTE mémorisé dans `slots` — la colonne se vide, et se remplit
 * d'elle-même au retour dans un livre aligné.
 */
export function masquerTraductionsIndisponibles<T extends { trad_id: string; sourceFillion?: boolean }>(
  slots: readonly string[],
  traductions: readonly T[],
  disponibles: readonly T[],
): string[] {
  const bornees = new Set(traductions.filter(t => t.sourceFillion).map(t => t.trad_id))
  const offertes = new Set(disponibles.map(t => t.trad_id))
  return slots.map(id => (bornees.has(id) && !offertes.has(id) ? '' : id))
}
