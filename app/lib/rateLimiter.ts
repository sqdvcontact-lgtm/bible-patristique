// LIMITATION DE DÉBIT — fenêtre glissante, en mémoire du processus.
//
// ⚠️ Ce compteur ne survit pas à un redémarrage et n'est PAS partagé entre les
// instances de la fonction. C'est assez pour décourager une boucle ordinaire ; ce
// n'est pas une protection contre une attaque distribuée, qui demanderait un
// magasin partagé (Redis, ou la base) et un captcha.
//
// ⛔ LA CARTE SE PURGE. Sans cela, elle enfle indéfiniment : ces routes sont
// clefées par adresse de client, donc une clé nouvelle par visiteur, et rien ne
// retirait jamais les anciennes. La fuite était d'autant plus discrète que les
// deux copies écrites à la main dans /api/attente et /api/contact, elles,
// purgeaient — c'est la version PARTAGÉE, celle des routes à fort volume, qui ne
// le faisait pas.
//
// La fenêtre est GLISSANTE : on garde les instants des requêtes retenues et on
// compte celles qui tombent dans la fenêtre. Une fenêtre fixe laisse passer deux
// fois le quota à cheval sur sa frontière.

const visites = new Map<string, number[]>()

// Au-delà, on balaie les clés dont plus aucune visite n'est dans sa fenêtre. Le
// seuil est haut exprès : le balayage coûte, et il ne doit pas être la règle.
const SEUIL_PURGE = 5_000

function purger(maintenant: number, fenetreMs: number): void {
  for (const [cle, instants] of visites) {
    if (instants.every(t => maintenant - t >= fenetreMs)) visites.delete(cle)
  }
}

/**
 * Retient une visite et dit si elle est permise.
 *
 * @param cle       ce qu'on limite (« lecture:1.2.3.4 », « vue:… »)
 * @param maximum   nombre de requêtes tolérées dans la fenêtre
 * @param fenetreMs largeur de la fenêtre, en millisecondes
 * @returns `true` si la requête passe, `false` s'il faut répondre 429
 */
export function checkRateLimit(cle: string, maximum: number, fenetreMs: number): boolean {
  const maintenant = Date.now()
  const recentes = (visites.get(cle) ?? []).filter(t => maintenant - t < fenetreMs)
  recentes.push(maintenant)
  visites.set(cle, recentes)

  if (visites.size > SEUIL_PURGE) purger(maintenant, fenetreMs)

  return recentes.length <= maximum
}
