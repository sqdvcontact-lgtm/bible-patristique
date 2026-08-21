type ReponsePageSupabase<T> = {
  data: T[] | null
  error: unknown | null
}

/** Charge toutes les pages d'une requête PostgREST sans supposer que le plafond
 * du projet dépasse 1 000 lignes. La fabrique doit appliquer un ordre stable. */
export async function chargerToutesPagesSupabase<T>(
  fabriquer: (debut: number, fin: number) => PromiseLike<ReponsePageSupabase<T>>,
  taille = 1000,
): Promise<T[]> {
  if (!Number.isInteger(taille) || taille <= 0) throw new Error(`Taille de page invalide : ${taille}`)
  const lignes: T[] = []
  for (let debut = 0; ; debut += taille) {
    const page = await fabriquer(debut, debut + taille - 1)
    if (page.error) throw page.error
    const donnees = page.data ?? []
    lignes.push(...donnees)
    if (donnees.length < taille) return lignes
  }
}
