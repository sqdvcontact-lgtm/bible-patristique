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

/**
 * La taille d'une VAGUE : combien de pages on demande d'un coup.
 *
 * ⚠️ Elle se choisit sur la plus longue liste que la surface ait à charger — trois
 * vagues couvrent les 2 499 notices du catalogue des traductions (2026-09-05) — et
 * elle se remesure le jour où cette liste change d'ordre de grandeur.
 */
export const PAGES_PAR_VAGUE = 3

/**
 * Charge toutes les pages d'une requête PostgREST en les demandant PAR VAGUES
 * PARALLÈLES, au lieu de les enchaîner.
 *
 * ⛔ Une pagination par `range` ne sait JAMAIS d'avance combien de pages elle aura :
 * on SPÉCULE donc une première vague, et l'on n'en demande une seconde que si la
 * DERNIÈRE page revenue était pleine — c'est-à-dire sur une preuve, jamais sur une
 * supposition. C'est le prix du parallélisme, et il ne se paie qu'aux frontières.
 *
 * ⚠️ Une page spéculée AU-DELÀ de la fin n'est pas gratuite : sur une vue qui calcule
 * ses colonnes, le nœud de calcul s'exécute pour toutes les lignes jusqu'à
 * `offset + limit` avant de n'en rendre aucune. Mesuré le 2026-09-05 sur
 * `v_catalogue_notices_dates` : 569 ms pour une page qui rend 499 lignes, autant pour
 * une qui n'en rendrait aucune. D'où une vague AJUSTÉE à la liste, non généreuse.
 *
 * ⛔ On garde les pages d'une vague DANS L'ORDRE, y compris celles qui suivent une
 * page courte : les jeter perdrait des lignes en silence si la table a bougé entre
 * deux requêtes, alors que les garder ne peut qu'ajouter ce qui existe.
 *
 * ⚠️ Réservé aux listes qu'on charge ENTIÈREMENT. Une lecture qui s'arrête à la
 * première page garde `chargerToutesPagesSupabase`, qui ne demande rien d'inutile.
 */
export async function chargerPagesEnParallele<T>(
  fabriquer: (debut: number, fin: number) => PromiseLike<ReponsePageSupabase<T>>,
  { taille = 1000, vague = PAGES_PAR_VAGUE }: { taille?: number; vague?: number } = {},
): Promise<T[]> {
  if (!Number.isInteger(taille) || taille <= 0) throw new Error(`Taille de page invalide : ${taille}`)
  if (!Number.isInteger(vague) || vague <= 0) throw new Error(`Taille de vague invalide : ${vague}`)
  const lignes: T[] = []
  for (let premiere = 0; ; premiere += vague) {
    const pages = await Promise.all(
      Array.from({ length: vague }, (_, i) => {
        const debut = (premiere + i) * taille
        return fabriquer(debut, debut + taille - 1)
      }),
    )
    for (const page of pages) {
      if (page.error) throw page.error
      lignes.push(...(page.data ?? []))
    }
    if ((pages[pages.length - 1].data ?? []).length < taille) return lignes
  }
}

/**
 * Le nombre d'octets qu'une liste `in.(…)` peut occuper dans l'adresse.
 *
 * ⛔ NE JAMAIS découper une clause `in` en un NOMBRE fixe de valeurs. Ce qu'une
 * passerelle refuse, c'est une LONGUEUR D'ADRESSE, pas un nombre de valeurs :
 * passé ~25 000 octets d'URL (seuil mesuré sur ce projet le 29 août 2026), elle
 * rend un « 400 Bad Request » nu — pas une erreur PostgREST, pas un message, pas
 * une ligne dans la console qui dise pourquoi — et la requête n'atteint jamais la
 * base. Un lot de taille fixe tient donc sous la barre quand les valeurs sont
 * courtes et la crève quand elles sont longues, sans que rien ne l'annonce.
 *
 * C'est ce qui a fermé « Explication sur le psaume IV » dans le *Commentaire sur
 * les Psaumes* de Jean Chrysostome : ses 392 segments portent des clés de 38 à 66
 * signes, d'où une adresse de 29 635 octets pour aller chercher leurs liens
 * bibliques, et « Erreur de chargement. Réessayer » indéfiniment — pendant que
 * les psaumes voisins, aux clés plus courtes, s'ouvraient sans rien dire.
 *
 * La barre est prise à 6 000 : l'adresse entière reste autour de 7 ko, loin des
 * 25 000 mesurés, et sous les 8 ko qu'un proxy ordinaire accorde à une ligne de
 * requête. Multiplier les lots ne coûte rien — ils partent en parallèle.
 */
export const OCTETS_MAX_CLAUSE_IN = 6000

/**
 * Découpe les valeurs d'une clause `in` en lots dont l'adresse reste courte.
 *
 * Le coût compté est celui que PostgREST écrit VRAIMENT dans l'adresse : la
 * valeur entre guillemets, sa virgule, le tout percent-encodé — un deux-points
 * pèse trois octets, pas un.
 */
export function lotsPourClauseIn(valeurs: string[], octetsMax = OCTETS_MAX_CLAUSE_IN): string[][] {
  const lots: string[][] = []
  let lot: string[] = []
  let octets = 0
  for (const valeur of valeurs) {
    const cout = encodeURIComponent(`"${valeur}",`).length
    if (lot.length > 0 && octets + cout > octetsMax) {
      lots.push(lot)
      lot = []
      octets = 0
    }
    // Une valeur qui dépasse à elle seule la barre part quand même, seule dans son
    // lot : mieux vaut une adresse trop longue qu'une valeur silencieusement perdue.
    lot.push(valeur)
    octets += cout
  }
  if (lot.length > 0) lots.push(lot)
  return lots
}
