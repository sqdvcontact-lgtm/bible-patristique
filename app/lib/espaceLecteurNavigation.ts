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

/** Les deux pages de l'espace. ⛔ Deux, et pas une de plus : ce qu'on REGARDE et ce
 *  qu'on RÈGLE ne se visitent ni à la même heure ni pour la même raison. */
export type PageEspace = 'compte' | 'parcours'

export const PAGES_ESPACE: { cle: PageEspace; href: string; label: string }[] = [
  { cle: 'compte', href: '/compte', label: 'Mon compte' },
  { cle: 'parcours', href: '/compte/parcours', label: 'Mon parcours' },
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

/** Quelle page on regarde, d'après le chemin.
 *
 *  ⛔ Ne pas se contenter d'un `startsWith` : « /compte » est le préfixe de
 *  « /compte/parcours », et l'onglet resterait allumé sur les deux. */
export function pageCourante(chemin: string): PageEspace {
  return chemin.startsWith('/compte/parcours') ? 'parcours' : 'compte'
}
