// Où poser la cellule d'actions (prélever · copier · signaler) d'un verset ou d'un
// segment. Fonction PURE, testée dans celluleActions.test.ts.
//
// ⛔ LA RÈGLE : à DROITE de la ligne ; AU-DESSUS d'elle si la droite est trop étroite ;
// JAMAIS par-dessus. Une cellule d'actions ne peut pas couvrir ce sur quoi elle agit —
// on la fait apparaître en survolant un texte, et elle en effacerait la fin au moment
// même où on le lit.
//
// ⚠️ Le piège est de BRIDER la position au lieu de la déplacer. `Math.min(droite + 6,
// largeurEcran - 132)` a l'air d'une protection ; ce n'en est pas une. Quand la place
// manque, cela ne fait pas de place : cela ramène la cellule sur la fin de la ligne.
// C'était le défaut de la page œuvre, relevé le 2026-08-22 — et celui des traductions
// en regard, qui avaient gardé le calcul bridé jusqu'au 2026-09-07.
//
// ⚠️ L'ESPACE N'EST PAS TOUJOURS LA FENÊTRE. Dans une grille de colonnes — la
// Polyglotte, les traductions en regard —, « à droite de la ligne » tombe sur la
// colonne voisine, c'est-à-dire sur un AUTRE texte. La règle prend donc les bornes de
// l'espace où la cellule a le droit de se poser ; en lecture ordinaire c'est la
// fenêtre, en grille c'est la colonne, et dans une colonne la cellule passe toujours
// au-dessus, ce qui est le bon résultat.

import type { CSSProperties } from 'react'

/** Côté d'un bouton d'action, et gabarit de toutes les icônes du site (11×12).
 *  Une seule valeur pour les quatre surfaces : la Bible, l'œuvre, la Polyglotte et
 *  les péricopes montraient le même drapeau dans des boîtes de 16, 18 et 19 px. */
export const COTE_BOUTON = 18
/** Blanc entre deux boutons de la cellule. */
export const GOUTTIERE_BOUTON = 2
/** Rembourrage horizontal de la cellule, et son filet. */
const REMBOURRAGE_CELLULE = 4
const FILET_CELLULE = 1

/** Largeur d'une cellule de `n` boutons. La cellule se MESURE elle-même avant la
 *  peinture (voir `CelluleActions`) ; ce calcul ne sert qu'à la placer juste du
 *  premier coup, avant qu'elle ait une largeur à donner. */
export function largeurGabarit(nombreDeBoutons: number): number {
  const n = Math.max(1, nombreDeBoutons)
  return n * COTE_BOUTON + (n - 1) * GOUTTIERE_BOUTON
    + 2 * REMBOURRAGE_CELLULE + 2 * FILET_CELLULE
}

/** Gabarit par défaut : quatre boutons (prélever, copier, signaler, et le crayon de
 *  l'administrateur), le cas le plus large de la lecture. */
export const LARGEUR_CELLULE = largeurGabarit(4)
export const HAUTEUR_CELLULE = COTE_BOUTON + 2 * REMBOURRAGE_CELLULE + 2 * FILET_CELLULE
/** Blanc entre la ligne et sa cellule, des deux côtés. */
export const MARGE_CELLULE = 6
/** Bas de la barre de navigation : la cellule ne monte jamais derrière elle.
 *  ⚠️ `HAUTEUR_NAVBAR` est une CHAÎNE CSS (3.5rem) ; ici il faut un nombre, et la
 *  racine est fluide. La valeur par défaut suffit : au pire la cellule monterait de
 *  quelques pixels trop haut sur un très grand écran. */
export const SOMMET_PAR_DEFAUT = 56

export type PositionCellule = { top: number; left: number; cote: 'droite' | 'dessus' | 'dessous' }

/** L'espace où la cellule a le droit de se poser. */
export type EspaceCellule = {
  /** Bord droit de cet espace (fenêtre, ou colonne de grille). */
  droite: number
  /** Bord gauche du même espace. Défaut : la marge. */
  gauche?: number
  /** Largeur réelle de la cellule, si on la connaît (`largeurGabarit`, ou mesurée). */
  largeur?: number
  /** Ligne au-dessus de laquelle on ne monte pas. */
  sommet?: number
  /** Ligne en dessous de laquelle on ne descend pas (bas de la fenêtre). */
  pied?: number
}

/** Position en coordonnées de FENÊTRE (la cellule est `position: fixed`).
 *
 *  @param ligne   rectangle de la ligne survolée (`getBoundingClientRect`) ; son `bottom`
 *                 n'est lu que pour la poser DESSOUS, quand le dessus est bouché
 *  @param espace  largeur utile de la fenêtre, ou les bornes de l'espace disponible
 *  @param sommet  ligne au-dessus de laquelle on ne monte pas (bas de la navbar)
 */
export function positionCellule(
  ligne: { top: number; right: number; bottom?: number },
  espace: number | EspaceCellule,
  sommet = SOMMET_PAR_DEFAUT,
): PositionCellule {
  const e: EspaceCellule = typeof espace === 'number' ? { droite: espace } : espace
  const largeur = e.largeur ?? LARGEUR_CELLULE
  const gauche = e.gauche ?? MARGE_CELLULE
  const haut = e.sommet ?? sommet

  const tientADroite = ligne.right + MARGE_CELLULE + largeur <= e.droite
  if (tientADroite) {
    return { top: Math.max(ligne.top - 4, haut), left: ligne.right + MARGE_CELLULE, cote: 'droite' }
  }

  // Alignée sur la FIN de la ligne : le regard la retrouve là où il était.
  // ⚠️ La borne gauche l'emporte sur l'alignement à droite : dans une colonne étroite,
  // mieux vaut déborder d'un cheveu à droite que d'aller couvrir la colonne d'à côté.
  const left = Math.max(Math.min(ligne.right, e.droite - MARGE_CELLULE) - largeur, gauche)

  // Au-dessus : elle ne recouvre que le blanc de l'interligne précédent.
  const dessus = ligne.top - HAUTEUR_CELLULE - MARGE_CELLULE
  if (dessus >= haut) return { top: dessus, left, cote: 'dessus' }

  // ⛔ ET SI LE DESSUS EST BOUCHÉ, ON PASSE DESSOUS (2026-09-07). La règle n'avait que
  // deux réponses et bornait la troisième par `Math.max(dessus, sommet)` : une ligne
  // posée juste sous un en-tête collant se voyait donc coiffer sa cellule PAR-DESSUS,
  // c'est-à-dire l'inverse de la règle. Mesuré sur la Polyglotte en ligne, le premier
  // verset visible sous l'en-tête des éditions — un cas ordinaire, non un cas limite :
  // c'est la ligne qu'on survole d'abord en arrivant sur la page.
  // ⚠️ Le blanc de l'interligne SUIVANT vaut celui du précédent : dessous ne coûte pas
  // plus que dessus, il ne se lit simplement pas d'abord.
  // ⛔ ON NE DESCEND PAS SOUS UN BLOC DONT ON IGNORE LE BAS. Un appelant qui ne passe
  // que `{ top, right }` — la forme d'origine — garde donc le bornage au sommet : mieux
  // vaut la règle d'hier qu'une cellule posée au jugé.
  const dessous = ligne.bottom === undefined ? null : ligne.bottom + MARGE_CELLULE
  if (dessous !== null && dessous >= haut && (e.pied === undefined || dessous + HAUTEUR_CELLULE <= e.pied)) {
    return { top: dessous, left, cote: 'dessous' }
  }

  // ⚠️ Dernier recours : un bloc plus haut que la fenêtre n'a ni dessus ni dessous
  // VISIBLES, et une cellule posée hors de l'écran vaut moins qu'une cellule qui mord.
  // On la borne alors au sommet, ce que la règle faisait jusqu'ici en toute circonstance.
  return { top: haut, left, cote: 'dessus' }
}

/** Durée d'un appui long, au tactile, avant que la cellule paraisse. Même valeur que
 *  l'appui long déjà en place sur la page Bible : deux surfaces qui demandent le même
 *  geste doivent demander la même patience. */
export const APPUI_LONG_MS = 450

/** Délai de grâce entre la sortie du texte et la disparition de la cellule : le temps
 *  d'aller du dernier mot jusqu'aux boutons sans que tout s'efface en chemin.
 *
 *  ⛔ IL VALAIT 200 ms, ET C'ÉTAIT TROP COURT (relevé de l'auteur, 2026-09-07 : « le petit
 *  encart qui s'ouvre au survol est difficile à atteindre avant sa disparition »). Le
 *  trajet n'est pas la marge de six pixels, qui se franchit en un clin d'œil : la cellule
 *  se pose au HAUT du segment survolé, et l'on part souvent de sa dernière ligne. Mesuré
 *  sur la lecture d'une œuvre servie, un segment de cinq lignes met la cellule à quelque
 *  cent soixante pixels en diagonale — de deux à trois cents millisecondes à la vitesse
 *  ordinaire d'une main. Deux cents ne suffisaient donc qu'aux trajets les plus courts. */
export const GRACE_SURVOL_MS = 400

/** Temps de POSE exigé d'une cible AUTRE que celle qui porte déjà la cellule.
 *
 *  ⛔ Sans lui, la cellule S'ENFUIT. Dans une grille — la Polyglotte —, elle se pose
 *  au-dessus de la cellule survolée, c'est-à-dire SUR la ligne d'au-dessus, qui est
 *  elle-même survolable : monter vers les boutons faisait donc entrer le pointeur dans
 *  cette ligne, qui prenait aussitôt l'ancre, et la cellule remontait d'un rang. On la
 *  poursuivait sans jamais l'atteindre.
 *  ⚠️ Il ne retarde RIEN quand rien n'est ouvert : une première cellule paraît à
 *  l'instant. Il ne s'applique qu'au DÉPLACEMENT d'une cellule déjà posée, où il rend en
 *  outre le balayage d'un texte plus calme — la cellule ne clignote plus d'un segment à
 *  l'autre quand le regard ne fait que passer. */
export const DELAI_REANCRAGE_MS = 140

// ── LA FORME DE LA CELLULE ────────────────────────────────────────────────────
// Une seule définition pour les quatre surfaces. Elles montraient le même drapeau
// dans des boîtes de 16, 18 et 19 px, sur des pavés dont l'ombre, le filet et le
// rembourrage différaient : trois systèmes pour un seul geste.

/** Un bouton d'action : prélever, copier, signaler, et le crayon de l'administrateur. */
export const STYLE_BOUTON_ACTION: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '1px 2px',
  borderRadius: '4px', width: `${COTE_BOUTON}px`, height: `${COTE_BOUTON}px`,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '0.84375rem', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s',
}

/** Le pavé qui les porte. Posé sur le texte, il doit être OPAQUE et se détacher :
 *  `--cs-ombre-nette` est faite pour cela (charte, « Élévations » — petit objet qui
 *  flotte : bascule, infobulle, cellule d'actions). */
export const STYLE_CELLULE: CSSProperties = {
  position: 'fixed', zIndex: 1500,
  display: 'flex', alignItems: 'center', gap: `${GOUTTIERE_BOUTON}px`,
  padding: `${REMBOURRAGE_CELLULE}px`,
  background: 'var(--cs-surface)',
  border: `${FILET_CELLULE}px solid var(--cs-bord-clair)`,
  borderRadius: '8px',
  boxShadow: 'var(--cs-ombre-nette)',
}
