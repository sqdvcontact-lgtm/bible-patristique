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

// ⛔ CHAQUE CLÉ GARDE SA PROPRE FENÊTRE (2026-09-22). Le balayage prenait celle de
// l'appel qui le déclenche : une vérification à la minute effaçait alors une clé
// JOURNALIÈRE dont plus aucune visite ne datait de la dernière minute, c'est-à-dire
// qu'un quota du jour repartait de zéro sans que rien ne le dise. Une clé n'est
// désormais balayée que sur SA fenêtre.
const visites = new Map<string, { fenetreMs: number; instants: number[] }>()

// Au-delà, on balaie les clés dont plus aucune visite n'est dans sa fenêtre. Le
// seuil est haut exprès : le balayage coûte, et il ne doit pas être la règle.
const SEUIL_PURGE = 5_000

function purger(maintenant: number): void {
  for (const [cle, suivi] of visites) {
    if (suivi.instants.every(t => maintenant - t >= suivi.fenetreMs)) visites.delete(cle)
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
  const recentes = (visites.get(cle)?.instants ?? []).filter(t => maintenant - t < fenetreMs)
  recentes.push(maintenant)
  visites.set(cle, { fenetreMs, instants: recentes })

  if (visites.size > SEUIL_PURGE) purger(maintenant)

  return recentes.length <= maximum
}
