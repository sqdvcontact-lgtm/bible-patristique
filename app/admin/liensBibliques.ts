// Les liens bibliques à traiter : deux files d'un même travail, sous une seule entrée du
// sommaire (demande de l'auteur, 16 septembre 2026 : « Vérifications » et « Constituer liens »
// regroupés en deux onglets, sous un même niveau de titre).
//
// L'onglet ouvert se lit dans l'adresse, `?onglet=liens&vue=constituer`, comme la section
// elle-même : il se partage, se rouvre, et survit au rechargement.
//
// ⚠️ Imports relatifs ou aucun : la suite de tests ne résout pas l'alias du dépôt.

export const VUES_LIENS = [
  { cle: 'verifications', libelle: 'Vérifications' },
  { cle: 'constituer', libelle: 'Constituer liens' },
] as const

export type VueLiens = (typeof VUES_LIENS)[number]['cle']

export const VUE_LIENS_PAR_DEFAUT: VueLiens = 'verifications'

/** La vue nommée par `?vue=`. Une valeur inconnue retombe sur les vérifications. */
export function vueLiens(valeur: string | null | undefined): VueLiens {
  return VUES_LIENS.some(v => v.cle === valeur) ? (valeur as VueLiens) : VUE_LIENS_PAR_DEFAUT
}

/** L'adresse d'une vue, les autres paramètres gardés. ⛔ `onglet` y est reposé : une adresse
 *  de /admin qui le perdrait renverrait à la Bibliothèque. La vue par défaut ne s'écrit pas. */
export function adresseVueLiens(recherche: string, vue: VueLiens): string {
  const params = new URLSearchParams(recherche)
  params.set('onglet', 'liens')
  if (vue === VUE_LIENS_PAR_DEFAUT) params.delete('vue')
  else params.set('vue', vue)
  return `/admin?${params.toString()}`
}

/** Le libellé d'un onglet, avec le compte de sa file quand on le connaît. */
export function libelleAvecCompte(libelle: string, compte: number | null): string {
  return compte === null ? libelle : `${libelle} (${compte || '∅'})`
}

/** Ce que la pastille du sommaire annonce : les deux files ensemble, ou rien tant que l'une
 *  n'est pas comptée. Un total fait d'une seule file dirait moins que ce qui attend. */
export function totalLiens(verifications: number | null, constituer: number | null): number | null {
  return verifications === null || constituer === null ? null : verifications + constituer
}
