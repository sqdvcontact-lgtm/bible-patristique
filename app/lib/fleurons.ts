/**
 * LE REGISTRE DES FLEURONS — l'ornement qui sépare la page de titre du texte.
 *
 * ⛔ Le vocabulaire est CLOS, et la donnée n'y ajoute rien : `oeuvres.fleuron` porte
 * une CLÉ de cette liste, et une clé inconnue retombe sur le fleuron du site. C'est le
 * parti d'`essais.couverture` et de `profils.theme_lecture` — colonne nullable, aucune
 * contrainte en base, la validation ici. Une liste d'ornements est éditoriale : elle
 * bougera, et un ornement retiré ne doit ni bloquer une écriture ni vider un frontispice.
 *
 * ⚠️ `null` est le cas ORDINAIRE, et il ne veut pas dire « aucun fleuron » : il veut dire
 * « celui du site ». Régler une œuvre la distingue ; changer le fleuron de toutes les
 * autres est une ligne ici. C'est la mécanique de `titre_affichage`, qui l'emporte quand
 * elle est renseignée et laisse parler le titre de catalogue quand elle ne l'est pas.
 *
 * ⛔ Les DIMENSIONS de chaque planche sont écrites, et un test les confronte aux fichiers.
 * Elles ne se déduisent pas d'un rapport CSS : c'est la règle posée pour la marque de la
 * barre, où un enfant de flex effondré à zéro ne se serait vu sur aucune page.
 *
 * ⚠️ La HAUTEUR de pose est propre à chaque ornement, et elle se MESURE. Un dessin dense
 * pèse plus qu'un dessin ajouré à taille égale ; un fleuron très allongé disparaît si on
 * lui donne la hauteur d'un fleuron carré. Toutes ont été jugées à la taille RÉELLE, sur
 * planche agrandie au plus proche voisin — un ornement au trait ne se juge pas dans
 * l'éditeur. ⛔ La changer oblige à REJOUER la planche : une planche se sert au double de
 * sa taille d'affichage, jamais plus (`scripts/ornements-detourer.mjs`).
 */

export type Fleuron = {
  /** Ce que porte `oeuvres.fleuron`. */
  cle: string
  /** Ce que lit l'auteur dans le panneau. */
  nom: string
  /** Le nom de la planche sous `public/ornements/`, sans extension. */
  fichier: string
  /** Les pixels du FICHIER, mesurés. */
  planche: { largeur: number; hauteur: number }
  /** La hauteur que la page pose, en rem. */
  hauteur: string
}

/** ⚠️ L'ordre est celui du panneau : les fleurons d'abord, les figures ensuite. */
export const FLEURONS: readonly Fleuron[] = [
  { cle: "croix", nom: "Croix fleurdelisée", fichier: "fleuron-croix", planche: { largeur: 70, hauteur: 86 }, hauteur: "2.75rem" },
  { cle: "fleur-de-lys", nom: "Fleur de lys", fichier: "fleuron-fleur-de-lys", planche: { largeur: 63, hauteur: 80 }, hauteur: "2.5rem" },
  { cle: "acanthe", nom: "Acanthe", fichier: "fleuron-acanthe", planche: { largeur: 63, hauteur: 88 }, hauteur: "2.75rem" },
  { cle: "entrelacs", nom: "Entrelacs", fichier: "ornement-entrelacs", planche: { largeur: 66, hauteur: 87 }, hauteur: "2.75rem" },
  { cle: "volutes", nom: "Volutes", fichier: "fleuron-volutes", planche: { largeur: 60, hauteur: 103 }, hauteur: "3.25rem" },
  { cle: "pendentif", nom: "Pendentif", fichier: "fleuron-pendentif", planche: { largeur: 52, hauteur: 127 }, hauteur: "4rem" },
  { cle: "lavande", nom: "Brin de lavande", fichier: "fleuron-lavande", planche: { largeur: 83, hauteur: 96 }, hauteur: "3rem" },
  { cle: "fleur", nom: "Fleur à cinq pétales", fichier: "fleur-cinq-petales", planche: { largeur: 85, hauteur: 79 }, hauteur: "2.5rem" },
  { cle: "croix-gothique", nom: "Croix gothique", fichier: "croix-gothique", planche: { largeur: 58, hauteur: 88 }, hauteur: "2.75rem" },
  { cle: "oeil", nom: "Œil fleurdelisé", fichier: "oeil-fleurdelise", planche: { largeur: 81, hauteur: 90 }, hauteur: "2.75rem" },
  { cle: "couronne-epines", nom: "Couronne d’épines", fichier: "couronne-epines", planche: { largeur: 73, hauteur: 70 }, hauteur: "2.5rem" },
  { cle: "memento-mori", nom: "Memento mori", fichier: "ornement-memento-mori", planche: { largeur: 66, hauteur: 89 }, hauteur: "2.75rem" },
  { cle: "poisson", nom: "Poisson", fichier: "poisson-ichthys", planche: { largeur: 68, hauteur: 86 }, hauteur: "2.75rem" },
  { cle: "serpent", nom: "Serpent", fichier: "serpent-love", planche: { largeur: 76, hauteur: 91 }, hauteur: "2.875rem" },
  { cle: "serpent-croissant", nom: "Serpent au croissant", fichier: "serpent-croissant", planche: { largeur: 60, hauteur: 116 }, hauteur: "3.625rem" },
]

/** Le fleuron du SITE — celui que porte toute œuvre qui n'en demande pas d'autre.
 *  ⚠️ Le changer change le frontispice de toutes les œuvres non réglées : c'est voulu,
 *  et c'est le seul endroit où l'on peut le faire d'un geste. */
export const FLEURON_DU_SITE = 'croix'

/** L'ornement à poser. ⛔ Tolérante par construction : une clé absente, vide ou inconnue
 *  rend celui du site. Une donnée qu'on ne reconnaît plus ne vide jamais un frontispice. */
export function fleuronDe(cle: string | null | undefined): Fleuron {
  const trouve = cle ? FLEURONS.find(f => f.cle === cle) : undefined
  return trouve ?? FLEURONS.find(f => f.cle === FLEURON_DU_SITE) ?? FLEURONS[0]
}

/** Dit si une clé est au registre. Sert à la SAISIE, jamais à la lecture — un rendu qui
 *  refuserait une clé inconnue laisserait un blanc là où le fleuron du site suffit. */
export function estFleuronConnu(cle: string | null | undefined): boolean {
  return typeof cle === 'string' && FLEURONS.some(f => f.cle === cle)
}

/** L'adresse publique de la planche. */
export function adresseFleuron(f: Fleuron): string {
  return `/ornements/${f.fichier}.png`
}
