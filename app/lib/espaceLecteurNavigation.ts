// ── LE SOMMAIRE DE L'ESPACE DU LECTEUR ───────────────────────────────────────
//
// Refonte du 1er septembre 2026, sur six consignes de l'auteur : deux pages
// distinctes — « Mon compte » et « Mon parcours » —, tout affiché sur une seule
// page, un sommaire FIXE à gauche qui ne sert qu'à CIRCULER, et « oublie les
// bandeaux sur le côté à gauche ; reprendre le modèle de sommaire de la page Bible ».
//
// ⛔ CE SOMMAIRE N'EST PLUS UN MENU. Il ne mène nulle part ailleurs : ses entrées
// sautent à une ancre de la page qu'on lit déjà. La version d'avant était une
// colonne de navigation — six rubriques, six chargements, une glose de deux lignes
// sous chacune, 504 px de haut pour 340 px de contenu sur la page « Lecture ». On
// n'a plus que DEUX destinations, et le reste est du défilement.
//
// ⛔ Les GLOSES sont retirées avec elle. Elles répétaient mot pour mot le sous-titre
// de la page qu'elles ouvraient, à quatre centimètres de distance ; et une entrée
// qui saute à une ancre de la page courante n'a rien à expliquer, puisque la section
// est sous les yeux.

/** Les pages de l'espace. ⛔ Une page ne s'ajoute ici que si elle porte une NATURE que
 *  les autres n'ont pas : ce qu'on RÈGLE, ce qu'on REGARDE, ce qu'on a ÉCRIT ne se
 *  visitent ni à la même heure ni pour la même raison. Elles étaient deux du 1er au
 *  7 septembre 2026, et la troisième ne découpe pas les deux premières : la chaîne du
 *  lecteur n'est ni un réglage ni une gratification, c'est sa matière à lui. */
export type PageEspace = 'compte' | 'parcours' | 'chaine'

export const PAGES_ESPACE: { cle: PageEspace; href: string; label: string }[] = [
  { cle: 'compte', href: '/compte', label: 'Mon compte' },
  { cle: 'parcours', href: '/compte/parcours', label: 'Mon parcours' },
  { cle: 'chaine', href: '/compte/chaine', label: 'Ma chaîne' },
]

/** Une entrée du sommaire : le titre d'une section, et l'ancre où elle se trouve. */
export type AncreEspace = { id: string; label: string }

/** Un groupe d'ancres, sous sa rubrique. */
export type GroupeAncres = { rubrique: string; ancres: AncreEspace[] }

/** ⛔ Les ancres de « Mon compte » sont FIXES : la page les porte toutes, toujours,
 *  et le sommaire ne peut donc pas mentir. Celles de « Mon parcours » se déduisent
 *  au contraire des séries que la base porte — voir `ancresParcours`. */
export const ANCRES_COMPTE: GroupeAncres[] = [
  {
    rubrique: 'Vous',
    ancres: [
      { id: 'identite', label: 'Identité' },
      { id: 'page-publique', label: 'Page publique' },
    ],
  },
  {
    rubrique: 'Réglages',
    ancres: [
      { id: 'lecture', label: 'Lecture' },
      { id: 'connexion', label: 'Connexion' },
    ],
  },
]

/** Le sommaire de « Mon parcours ». ⚠️ Les séries viennent de la BASE et non d'une
 *  liste écrite ici : elles ont été dix, elles étaient six la veille, et un sommaire
 *  qui nommerait des séries disparues renverrait à des ancres absentes. */
export function ancresParcours(series: { serie: string; nom: string }[]): GroupeAncres[] {
  const groupes: GroupeAncres[] = [{
    rubrique: 'Où j’en suis',
    ancres: [
      { id: 'rang', label: 'Rang' },
      { id: 'premiers-pas', label: 'Premiers pas' },
    ],
  }]
  if (series.length) {
    groupes.push({
      rubrique: 'Hauts faits',
      ancres: series.map(s => ({ id: `serie-${s.serie}`, label: s.nom })),
    })
  }
  return groupes
}

/** Le sommaire de « Ma chaîne » : les livres qu'on a glosés, sous leur rubrique.
 *
 *  ⚠️ Comme celui du parcours, il se déduit de ce que la page PORTE : un lecteur ne
 *  glose pas deux fois le même canon, et un sommaire qui listerait les soixante-treize
 *  livres serait une table de ce qu'il n'a pas écrit.
 *
 *  ⛔ Le paramètre est décrit par sa FORME, non par le type `GroupeChaine` : le module
 *  de la chaîne connaît déjà celui-ci, et s'importer l'un l'autre les nouerait. */
export function ancresChaine(
  groupes: { ancre: string; nom: string; rubrique: string }[],
): GroupeAncres[] {
  const par = new Map<string, AncreEspace[]>()
  for (const g of groupes) {
    const ancres = par.get(g.rubrique)
    if (ancres) ancres.push({ id: g.ancre, label: g.nom })
    else par.set(g.rubrique, [{ id: g.ancre, label: g.nom }])
  }
  return [...par.entries()].map(([rubrique, ancres]) => ({ rubrique, ancres }))
}

/** Quelle page on regarde, d'après le chemin.
 *
 *  ⛔ Ne pas se contenter d'un `startsWith` : « /compte » est le préfixe des deux
 *  autres, et l'onglet resterait allumé sur les trois. */
export function pageCourante(chemin: string): PageEspace {
  if (chemin.startsWith('/compte/parcours')) return 'parcours'
  if (chemin.startsWith('/compte/chaine')) return 'chaine'
  return 'compte'
}
