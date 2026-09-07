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

export type PositionCellule = { top: number; left: number; cote: 'droite' | 'dessus' }

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
}

/** Position en coordonnées de FENÊTRE (la cellule est `position: fixed`).
 *
 *  @param ligne   rectangle de la ligne survolée (`getBoundingClientRect`)
 *  @param espace  largeur utile de la fenêtre, ou les bornes de l'espace disponible
 *  @param sommet  ligne au-dessus de laquelle on ne monte pas (bas de la navbar)
 */
export function positionCellule(
  ligne: { top: number; right: number },
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
  // Au-dessus, alignée sur la FIN de la ligne : le regard la retrouve là où il était,
  // et elle ne recouvre que le blanc de l'interligne précédent.
  // ⚠️ La borne gauche l'emporte sur l'alignement à droite : dans une colonne étroite,
  // mieux vaut déborder d'un cheveu à droite que d'aller couvrir la colonne d'à côté.
  return {
    top: Math.max(ligne.top - HAUTEUR_CELLULE - MARGE_CELLULE, haut),
    left: Math.max(Math.min(ligne.right, e.droite - MARGE_CELLULE) - largeur, gauche),
    cote: 'dessus',
  }
}

/** Durée d'un appui long, au tactile, avant que la cellule paraisse. Même valeur que
 *  l'appui long déjà en place sur la page Bible : deux surfaces qui demandent le même
 *  geste doivent demander la même patience. */
export const APPUI_LONG_MS = 450

/** Délai de grâce entre la sortie du texte et la disparition de la cellule : le temps
 *  d'aller du dernier mot jusqu'aux boutons sans que tout s'efface en chemin. */
export const GRACE_SURVOL_MS = 200

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
