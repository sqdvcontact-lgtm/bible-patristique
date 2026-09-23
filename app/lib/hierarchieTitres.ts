/**
 * Hiérarchie des titres — les quatre rangs du site
 *
 * Chaque page composait jusqu'ici son `<h1>` pour elle-même. Il n'en résultait pas
 * une variété voulue mais une absence de rang : le même titre principal allait de
 * 16,8 px en gras (volet de l'Histoire, catalogue des péricopes) à 50 px en maigre
 * (frontispice d'œuvre), en six encres différentes et trois graisses. Sur deux pages,
 * le titre était plus petit que le texte courant de la page voisine, et mis en gras,
 * c'est-à-dire composé comme une étiquette et non comme un titre.
 *
 * Les valeurs ci-dessous ne sont pas inventées : chacune est ANCRÉE sur celle qui
 * dominait déjà son rang, exactement comme les tokens de couleur. Le rang « page »
 * reprend `.cc-titre` du centre de contrôle, le rang « volet » reprend `NavLivres`,
 * le rang « carte » reprend les écrans d'exception centrés.
 *
 * ⚠️ Pas de `clamp(…vw…)` sur ces rangs, et c'est délibéré. La police racine est déjà
 * fluide (`html { font-size: clamp(16px, calc(7px + 0.625vw), 22px) }`), si bien qu'un
 * `rem` grandit tout seul sur un grand écran. Un `clamp` en pixels par-dessus ne
 * faisait que POSER UN PLAFOND à la place : mesuré sur `/contact`, le titre restait
 * à 34 px de 1280 px à 2400 px de large pendant que le corps de texte passait de
 * 13,5 à 18,6 px. Le rapport titre/texte tombait de 2,52 à 1,83 : la hiérarchie
 * s'aplatissait à mesure que l'écran s'agrandissait, sur les plus gros caractères
 * du site. Ne pas réintroduire de borne en px ici.
 *
 * Les FRONTISPICES gardent leur `clamp`, en rem : ce sont des compositions à part
 * (page de titre d'œuvre, ouverture d'un essai, accroche de l'accueil), où la taille
 * fait partie du dessin. Ils ne sont donc pas tokenisés, seulement recensés ici.
 */

import type { CSSProperties } from 'react'
import { SANS, SERIF } from './polices'

/** Titre d'une page de contenu. Ancré sur `.cc-titre` (centre de contrôle). */
export const TITRE_PAGE = '1.75rem'
/** Son interligne, UN seul : il en portait cinq (1,1 à 1,3) et trois interlettrages
 *  (audit d'harmonie, 2026-09-23). 1,15 est le plus répandu ; la chasse reste celle
 *  de la police, que la plupart des titres ne touchaient pas. */
export const INTERLIGNE_TITRE_PAGE = 1.15

/** Titre du volet latéral d'une page à colonnes. Ancré sur l'ancien titre de `NavLivres`.
 *  ⚠️ 18 px, rang de l'échelle : il valait 1,15 rem (18,4 px), hors grille, ce que la garde
 *  ne voyait pas, la taille passant par cette constante (audit d'harmonie, 2026-09-23). */
export const TITRE_VOLET = '1.125rem'

/** Titre d'une carte centrée : écran réservé, « écran large requis », formulaire court. */
export const TITRE_CARTE = '1.375rem'

/** Graisse d'un titre. Le volet seul est demi-gras : il tient dans peu de place. */
export const GRAISSE_TITRE = 'normal'
export const GRAISSE_TITRE_VOLET = 500

/**
 * Encre des titres. Une seule par rang.
 * Page, volet et frontispice prennent l'encre profonde ; la carte prend l'encre
 * ordinaire, plus légère, accordée à un bloc qui n'est pas la page entière.
 */
export const ENCRE_TITRE = 'var(--cs-encre-fonce)'
export const ENCRE_TITRE_CARTE = 'var(--cs-encre)'

/**
 * LA RUBRIQUE — l'étiquette en capitales espacées qui coiffe une section.
 *
 * Le site en composait 138, en dix-sept interlettrages (0,04 à 0,24 em), trois graisses et
 * trois encres : la page d'une péricope en montrait six formes, la lecture d'un essai quatre
 * (audit d'harmonie, 2026-09-23). La forme retenue est la DOMINANTE, mesurée sur les étiquettes
 * à 10 px : sans, graisse 700, chasse 0,08 em, encre `--cs-texte-second` (5,24 sur le papier,
 * le seuil de 4,5 s'appliquant à un texte qui porte seul son information).
 *
 * ⛔ 0,625 rem est le plancher des capitales espacées (garde `echelleTypographique.test.ts`).
 * Un appelant n'y ajoute que sa MISE EN PAGE (marge, alignement) ; il ne redéfinit ni corps,
 * ni graisse, ni chasse, ni encre.
 */
export const STYLE_RUBRIQUE: CSSProperties = {
  fontFamily: SANS,
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--cs-texte-second)',
}

/**
 * « N SUR M » — la position dans une pagination, UNE composition.
 *
 * Elle en avait trois : sérif italique 11 px (bibliothèque), sans romain 11 px (volet des
 * Pères), sérif italique 12 px (lecture d'une œuvre). La plus répandue est celle de l'œuvre,
 * que le bas d'un chapitre de la Bible reprend déjà (`.cs-nav-bas-chapitre-position`) :
 * sérif italique, 0,75 rem, chasse 0,02 em, encre `--cs-texte-doux`. Le rapport se lit,
 * il ne se calcule pas. Un appelant n'y ajoute que sa mise en page (largeur, rembourrage).
 */
export const STYLE_POSITION_PAGE: CSSProperties = {
  fontFamily: SERIF,
  fontStyle: 'italic',
  fontSize: '0.75rem',
  letterSpacing: '0.02em',
  color: 'var(--cs-texte-doux)',
  whiteSpace: 'nowrap',
  userSelect: 'none',
}
