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
 * Le nombre de requêtes qu'une même lecture garde EN VOL.
 *
 * ⛔ Six, et c'est une borne de POOL, non de débit. Une lecture qui part d'un
 * `Promise.all` sans borne n'est pas seulement rapide : elle occupe à elle seule
 * toutes les connexions que la passerelle accorde, et les requêtes VOISINES de la
 * même page — les notes, les versets, le texte — attendent derrière elle jusqu'au
 * `statement_timeout`. C'est ce qui a fermé les notes de la Cité de Dieu le
 * 2026-09-16 : mesuré au journal, des pointes de 124 requêtes en UNE seconde, et
 * seize annulations « canceling statement due to statement timeout » sur des
 * requêtes qui, prises seules, coûtent douze millisecondes.
 *
 * ⚠️ Six est aussi ce qu'un navigateur accorde par hôte en HTTP/1.1 : la borne est
 * éprouvée par l'usage, et elle ne se paie presque pas. Mesuré le 2026-09-16 sous
 * le rôle du lecteur, un lot de liens bibliques coûte 41 ms : soixante-dix lots
 * passent en une douzaine de tours, une demi-seconde, au lieu de noyer le pool.
 */
export const REQUETES_EN_VOL = 6

/**
 * Lance des requêtes INDÉPENDANTES en en gardant au plus `enVol` à la fois.
 *
 * Les tâches sont des FABRIQUES, et c'est ce qui rend la borne réelle : un
 * `PostgrestFilterBuilder` déjà construit part au premier `then`, et un tableau de
 * requêtes passé à `Promise.all` est donc déjà tout entier en vol.
 *
 * ⛔ L'ordre des résultats est celui des fabriques, jamais celui des réponses :
 * l'appelant apparie souvent le rang d'un résultat à celui d'un lot.
 */
export async function lancerEnParallele<T>(
  fabriques: readonly (() => PromiseLike<T>)[],
  enVol = REQUETES_EN_VOL,
): Promise<T[]> {
  if (!Number.isInteger(enVol) || enVol <= 0) throw new Error(`Nombre de requêtes en vol invalide : ${enVol}`)
  const resultats = new Array<T>(fabriques.length)
  let prochaine = 0
  // ⚠️ Un échec arrête ce qui n'est PAS ENCORE PARTI, jamais ce qui est en vol :
  // continuer à charger la base après une erreur qu'on va lever ne sert personne.
  let abandon = false
  const servir = async (): Promise<void> => {
    while (!abandon) {
      const rang = prochaine++
      if (rang >= fabriques.length) return
      try {
        resultats[rang] = await fabriques[rang]()
      } catch (erreur) {
        abandon = true
        throw erreur
      }
    }
  }
  // ⚠️ `Promise.all` attache un gestionnaire à CHAQUE ouvrier : un second rejet,
  // survenu avant que l'abandon ne soit lu, reste donc géré et ne fait pas tomber
  // le processus.
  await Promise.all(Array.from({ length: Math.min(enVol, fabriques.length) }, servir))
  return resultats
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
 * requête.
 *
 * ⛔ MAIS MULTIPLIER LES LOTS COÛTE, et cette page a dit le contraire jusqu'au
 * 2026-09-16 — « multiplier les lots ne coûte rien, ils partent en parallèle ».
 * C'était vrai de l'ADRESSE et faux du POOL : les lots d'une même lecture partaient
 * tous ensemble et occupaient toutes les connexions, si bien que les requêtes
 * voisines de la page attendaient jusqu'au délai. Une liste découpée se lance donc
 * par `lancerEnParallele`, jamais par un `Promise.all` nu.
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
