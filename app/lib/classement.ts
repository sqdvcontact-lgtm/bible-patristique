// LE RANG D'UN LECTEUR — il mesure la LECTURE, non la conversation.
//
// ⛔ Il se gagnait en commentant : un point par commentaire, quatre s'il était validé,
// deux par mention reçue, quinze par essai. Sur un site dont l'objet est la lecture des
// Pères, c'était un contresens — le lecteur silencieux qui a parcouru quarante œuvres
// en sait plus que le commentateur prolixe — et c'était du même coup le seul danger
// sérieux du système : dix commentaires creux postés pour faire monter un compteur.
// Décision de l'auteur, 1er septembre 2026.
//
// Il se lit désormais sur une PART : combien d'auteurs le lecteur a marqués, sur
// combien la bibliothèque en donne à lire (vue `lecture_utilisateurs`). Un rapport et
// non un total, donc un rang qui monte avec le corpus et ne vieillit pas — c'est la
// même règle que les derniers degrés des hauts faits.
//
// ⚠️ Les degrés vivent ICI, en dur, et non en base comme les hauts faits. La
// différence est de nature : un haut fait ne paraît que sur sa page, et sa table peut
// se charger ; le rang paraît sous chaque commentaire du site, et doit se calculer
// sans requête. Ce qui s'affiche partout ne peut pas dépendre d'un chargement.

export type Rang = 'Catéchumène' | 'Auditeur' | 'Disciple' | 'Familier' | 'Lettré' | 'Docteur'

/** Les six degrés, du premier au dernier.
 *
 *  ⚠️ SIX et non trois. Les anciens seuils — Disciple à 50 points, Docteur à 300 —
 *  laissaient un désert de 250 points où le gradient de Kivetz ne joue plus : on
 *  n'accélère qu'à l'approche, et un but à deux cent cinquante pas n'est pas une
 *  approche. Rapportés à quinze auteurs, les degrés ci-dessous tombent à 1, 3, 5, 8
 *  et 12 : jamais plus de quatre pas de l'un à l'autre.
 *
 *  ⛔ Aucun n'emprunte aux ordres sacrés : ce sont des états d'étude, non des degrés
 *  de cléricature. « Lecteur » est écarté pour la même raison, et parce que le site
 *  appelle déjà tout le monde ainsi.
 *
 *  `minimum` prime sur `part` : le premier pas se compte en auteurs, non en pourcentage,
 *  sans quoi il faudrait déjà en avoir trois pour quitter le premier degré. */
export const DEGRES: { rang: Rang; part: number; minimum?: number }[] = [
  { rang: 'Catéchumène', part: 0 },
  { rang: 'Auditeur',    part: 0,    minimum: 1 },
  { rang: 'Disciple',    part: 0.15 },
  { rang: 'Familier',    part: 0.30 },
  { rang: 'Lettré',      part: 0.50 },
  { rang: 'Docteur',     part: 0.75 },
]

/** Combien d'auteurs il faut avoir marqués pour tenir un degré, sur le corpus du jour.
 *
 *  Arrondi vers le HAUT, comme les seuils en part des hauts faits : « la moitié de
 *  quinze » fait huit, non sept. */
export function seuilDuDegre(degre: { part: number; minimum?: number }, totalAuteurs: number): number {
  if (degre.minimum != null) return degre.minimum
  if (degre.part <= 0) return 0
  return Math.max(1, Math.ceil(totalAuteurs * degre.part))
}

export type EtatRang = {
  rang: Rang
  rangSuivant: Rang | null
  /** En AUTEURS, non en points : c'est ce qu'il reste à fréquenter. */
  seuilSuivant: number | null
  seuilPrecedent: number
}

/** Le rang d'un lecteur, d'après ce qu'il a retenu.
 *
 *  ⚠️ Un corpus vide ou inconnu rend le premier degré plutôt qu'une division par zéro :
 *  mieux vaut un rang modeste qu'un affichage cassé sous un commentaire. */
export function calculerRang(nbAuteurs: number, totalAuteurs: number): EtatRang {
  if (!Number.isFinite(totalAuteurs) || totalAuteurs <= 0) {
    return { rang: 'Catéchumène', rangSuivant: null, seuilSuivant: null, seuilPrecedent: 0 }
  }
  const seuils = DEGRES.map(d => ({ ...d, seuil: seuilDuDegre(d, totalAuteurs) }))

  let atteint = 0
  for (let i = 0; i < seuils.length; i++) if (nbAuteurs >= seuils[i].seuil) atteint = i

  const suivant = seuils[atteint + 1] ?? null
  return {
    rang: seuils[atteint].rang,
    rangSuivant: suivant?.rang ?? null,
    seuilSuivant: suivant?.seuil ?? null,
    seuilPrecedent: seuils[atteint].seuil,
  }
}

/** Les noms des degrés, dans l'ordre — pour l'échelle dessinée sous la barre. */
export const NOMS_DEGRES: Rang[] = DEGRES.map(d => d.rang)

export function couleurRang(rang: Rang): { fond: string; texte: string } {
  // Trois familles plutôt que six teintes : c'est le NOM qui distingue les degrés,
  // la couleur ne marque que le chemin parcouru. Six nuances de vert ne se
  // distingueraient pas à la taille où la pastille paraît.
  switch (rang) {
    case 'Catéchumène': return { fond: 'var(--cs-fond-doux)', texte: 'var(--cs-texte-gris)' }
    case 'Auditeur':
    case 'Disciple':    return { fond: 'rgba(var(--cs-vert-rgb),0.10)', texte: 'var(--cs-vert)' }
    case 'Familier':    return { fond: 'rgba(var(--cs-vert-rgb),0.18)', texte: 'var(--cs-vert-fonce)' }
    case 'Lettré':      return { fond: 'rgba(var(--cs-or-rgb),0.12)',   texte: 'var(--cs-or)' }
    case 'Docteur':     return { fond: 'rgba(var(--cs-or-rgb),0.20)',   texte: 'var(--cs-attente)' }
  }
}
