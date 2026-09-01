// LE PARCOURS D'ENTRÉE — dix gestes qui font le tour du site.
//
// Ce n'est pas une liste de tâches, et surtout pas une monnaie : il n'y a aucun point
// à gagner. La liste qu'il remplace annonçait « +2 pts » pour la présentation, « +1 pt »
// pour un passage et « +1 pt » pour un favori, et aucun de ces trois points n'existait
// dans la formule du rang : trois promesses sur cinq étaient fausses.
//
// ⛔ Elles ne reviendront pas sous une autre forme. Deci, Koestner et Ryan (1999)
// mesurent sur 128 expériences que la récompense tangible et attendue MINE la
// motivation qu'elle prétend soutenir. Ce parcours ne paie pas : il ENSEIGNE, et ce
// qu'il enseigne, ce sont les gestes par lesquels un lecteur garde ce qu'il lit.
//
// ⚠️ Tout se DÉDUIT de ce qui est déjà en base. Rien n'est stocké, donc rien ne peut
// se désynchroniser : l'ancienne liste se refermait dans le stockage local, si bien
// qu'elle disparaissait sur un navigateur et reparaissait sur un autre.

/** Ce que le lecteur a marqué de lui-même. Décision de l'auteur du 1er septembre
 *  2026 : on ne trace RIEN. Une ouverture de page ne prouve pas une lecture, un geste
 *  volontaire si. */
export type MarquesLecteur = {
  versets: number
  peres: number
  oeuvres: number
  commentaires: number
  essais: number
}

export type EtatLecteur = {
  marques: MarquesLecteur
  aUnPortrait: boolean
  aUneBio: boolean
}

export type EtapeParcours = {
  cle: string
  fait: boolean
  libelle: string
  /** Ce que le geste sert. Sans elle, une étape est un ordre ; avec elle, une leçon. */
  glose: string
  href: string | null
  /** Les trois pas déjà faits en s'inscrivant. */
  acquise?: boolean
}

/** Les dix étapes, dans l'ordre où on les propose : du plus léger au plus engageant.
 *
 *  ── L'AVANCE DONNÉE ────────────────────────────────────────────────────────
 *  Les trois premières sont acquises d'office. Nunes et Drèze (2006) ont distribué
 *  300 cartes de fidélité : une carte de dix cases dont deux déjà tamponnées obtient
 *  34 % de complétion contre 19 % pour une carte de huit cases vierges, à effort
 *  rigoureusement égal. ⚠️ L'effet DISPARAÎT quand l'avance n'est pas justifiée : le
 *  motif affiché n'est donc pas une politesse, c'est la condition pour qu'elle porte. */
export function etapesParcours({ marques, aUnPortrait, aUneBio }: EtatLecteur): EtapeParcours[] {
  return [
    {
      cle: 'compte', fait: true, acquise: true,
      libelle: 'Ouvrir un compte',
      glose: 'C’est ce qui vous permet de garder ce que vous lisez.',
      href: null,
    },
    {
      cle: 'pseudo', fait: true, acquise: true,
      libelle: 'Choisir un pseudonyme',
      glose: 'Il vous nomme partout sur le site, et vous seul le portez.',
      href: null,
    },
    {
      cle: 'accueil', fait: true, acquise: true,
      libelle: 'Passer par la page d’accueil',
      glose: 'Vous avez vu ce que le corpus propose.',
      href: null,
    },
    {
      cle: 'portrait', fait: aUnPortrait,
      libelle: 'Choisir un visage',
      glose: 'Un Père de l’Église ou un traducteur du corpus vous représentera.',
      href: '/compte/presentation',
    },
    {
      cle: 'verset', fait: marques.versets > 0,
      libelle: 'Retenir un verset',
      glose: 'Un passage vous arrête : gardez-le. Vous le retrouverez dans vos citations.',
      href: '/bible',
    },
    {
      cle: 'pere', fait: marques.peres > 0,
      libelle: 'Retenir le mot d’un Père',
      glose: 'Le même geste, sur un commentaire patristique. C’est ainsi que se bâtit votre glane.',
      href: '/bibliotheque',
    },
    {
      cle: 'oeuvre', fait: marques.oeuvres > 0,
      libelle: 'Mettre une œuvre dans votre bibliothèque',
      glose: 'Pour la rouvrir d’un geste, et suivre ce que vous êtes en train de lire.',
      href: '/bibliotheque',
    },
    {
      cle: 'bio', fait: aUneBio,
      libelle: 'Vous présenter en deux lignes',
      glose: 'C’est ce que les autres lecteurs liront de vous sur votre page.',
      href: '/compte/presentation',
    },
    {
      cle: 'commentaire', fait: marques.commentaires > 0,
      libelle: 'Commenter un passage',
      glose: 'Dire ce qu’un verset vous fait entendre, à côté de ce qu’en ont dit les Pères.',
      href: '/bible',
    },
    {
      cle: 'essai', fait: marques.essais > 0,
      libelle: 'Publier un essai',
      glose: 'Une méditation plus longue, qui prend rang dans la Communauté.',
      href: '/essais/nouveau',
    },
  ]
}

/** Ce qu'on annonce en tête du parcours.
 *
 *  ⚠️ Toujours le PLUS PETIT des deux nombres. Koo et Fishbach : au début d'un
 *  parcours, ce qui est accompli porte davantage que ce qui reste ; près du but,
 *  l'inverse. « Il vous en reste deux » dit quelque chose que « 8 sur 10 » ne dit pas,
 *  et c'est précisément le moment où le lecteur décide d'aller au bout. */
export function libelleAvancement(etapes: EtapeParcours[]): string {
  const total = etapes.length
  const faites = etapes.filter(e => e.fait).length
  const restantes = total - faites
  if (restantes === 0) return 'Vous les avez tous faits.'
  if (restantes < faites) return `Il vous en reste ${restantes === 1 ? 'un' : restantes}.`
  return `${faites} sur ${total}.`
}

/** Le parcours se TERMINE, et ne revient jamais : c'est ce qui le sépare des hauts
 *  faits, qui ne se referment pas. */
export function parcoursAcheve(etapes: EtapeParcours[]): boolean {
  return etapes.every(e => e.fait)
}
