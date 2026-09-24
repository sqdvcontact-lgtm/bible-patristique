/**
 * La composition de la RANGÉE DE VERSET — une seule écriture, deux emplois.
 *
 * Ces styles vivaient en clair dans le JSX de `TexteBible`. Ils en sont sortis le
 * 2026-08-28 pour la même raison que ceux de la lecture d'une œuvre : la PLANCHE
 * DES STYLES (`/admin/styles`) doit montrer ce que la page FAIT. Un spécimen qui
 * rejoue une composition de mémoire dérive au premier réglage, et fait ensuite
 * autorité contre la page qu'il prétend décrire.
 *
 * ⛔ Toute composition de la rangée de verset s'écrit ICI.
 *
 * ⚠️ La rangée vit dans une GRILLE à deux colonnes — le bloc de texte, puis la
 * gouttière d'actions de 2,375 rem. Le titre du chapitre et les versets se centrent
 * sur le BLOC, gouttière exclue : c'est l'axe unique de la page (charte, page Bible).
 */

import type { CSSProperties } from 'react'
import { SERIF } from './polices'

/**
 * La GOUTTIÈRE D'ACTIONS : la seconde colonne de la grille, où se tiennent les boutons d'un verset.
 *
 * ⛔ ELLE NE S'ÉCRIT QU'ICI. Le titre, les versets et l'appareil se centrent sur la PREMIÈRE
 * colonne, gouttière exclue, et tout ce qui veut tomber sur leur axe doit la retrancher : la
 * marque d'attente la reçoit (`MarqueAttente`, propriété `gouttiere`), sans quoi l'anneau tombait
 * une demi-gouttière à droite du titre du chapitre (relevé de l'auteur, 14 septembre 2026).
 */
export const GOUTTIERE_ACTIONS_VERSET = '2.375rem'

/**
 * L'AXE DE TEXTE — l'enveloppe que prend tout ce qui se centre sur la page Bible.
 *
 * ⛔ La page en portait TROIS avant le 2026-08-28 : le titre du chapitre à 503 px,
 * les versets à 495,5, les blocs éditoriaux à 514,5. Tout passe désormais par cette
 * grille — le bloc de lecture, puis la gouttière d'actions —, et le centrage se fait
 * sur le BLOC, gouttière exclue.
 */
export function styleAxeTexte(): CSSProperties {
  return {
    width: 'min(var(--mesure-ligne), 100%)',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`,
  }
}

/**
 * LE TITRE DU CHAPITRE ET LE MENU DES BIBLES SE TIENNENT (décision de l'auteur,
 * 14 septembre 2026 : « Matthieu❧Chapitre 1 et le menu de sélection de la traduction
 * biblique doivent être plus proches l'un de l'autre ; réduire le blanc qui les sépare »).
 *
 * ⚠️ Le blanc ne tenait pas qu'à la marge : le titre héritait de l'interligne du corps,
 * 1,5, soit cinq pixels de vide sous ses lettres à la racine 16, et la marge en posait huit
 * de plus. L'interligne se resserre à 1,15 et la marge tombe à un huitième de rem : il
 * reste six pixels et demi de boîte à boîte, contre seize.
 * ⛔ Les deux lectures, une colonne et en regard, les emploient : passer de l'une à l'autre
 * ne doit déplacer ni le titre ni le menu.
 */
export const INTERLIGNE_TITRE_CHAPITRE = 1.15
// ⚠️ RECTIFIÉ LE SOIR MÊME (« Matthieu❧Chapitre 1 et le menu de sélection de la traduction
// biblique doivent être très légèrement plus éloignés l'un de l'autre »). L'interligne du titre
// reste serré, et la marge remonte d'un huitième à cinq seizièmes de rem : trois pixels de plus
// à la racine 16, un peu plus de quatre à la racine 22.
export const BLANC_TITRE_MENU = '0.3125rem'

/** La rangée entière : ce qui prend le survol, la sélection et le clic. */
export function styleRangeeVerset({ mobile }: { mobile?: boolean } = {}): CSSProperties {
  return {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    // ⚠️ Le blanc entre versets se paie deux fois : le rembourrage de la rangée le pose
    // en haut ET en bas, la marge s'y ajoute. Ce qui identifie un verset n'est pas ce
    // blanc mais son RETRAIT (décision de l'auteur, 2026-08-29) : on rend au retrait ce
    // qu'on retire au blanc, et la colonne se lit d'un trait au lieu de s'égrener.
    padding: mobile ? '0.03125rem 0.375rem' : '0.125rem 0.375rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: mobile ? '0.05rem' : '0.125rem',
    background: 'transparent',
  }
}

/** La grille de la rangée : le bloc de lecture, puis la gouttière d'actions.
 *  ⛔ Sur mobile la gouttière disparaît — les actions y surgissent au tap. */
export function styleGrilleRangee({ mobile }: { mobile?: boolean } = {}): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`,
    width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)',
    alignItems: 'flex-start',
  }
}

/** La colonne du NUMÉRO de verset et la gouttière qui le sépare de son texte, en rem.
 *  ⚠️ Ensemble, elles font ce que le bloc sélectionné déborde du texte À GAUCHE. */
export const NUMERO_VERSET_REM = 1.4375

/**
 * ⛔ LE CORPS DU TEXTE BIBLIQUE EST UNE VARIABLE (décision de l’auteur, 2026-09-21) :
 * trois crans que le lecteur règle dans le volet des livres (app/lib/corpsLecture.ts). Les
 * valeurs vivent dans globals.css, sur :root ; les replis ci-dessous sont celles du cran
 * normal.
 * ⚠️ RESSERRÉ LE 2026-09-23 (demande de l'auteur : « un peu trop corps », « condenser un
 * peu plus ») : 15 px et 1,48 au cran normal, pour 16 et 1,55 ; les deux autres crans
 * suivent d'un rang. Les mots se rapprochent avec lui, voir `ESPACE_MOT_VERSET`.
 */
export const CORPS_LECTURE_BIBLE = 'var(--cs-lecture-corps, 0.9375rem)'
export const INTERLIGNE_LECTURE_BIBLE = 'var(--cs-lecture-interligne, 1.48)'
/**
 * L'espace entre les mots d'un verset (l'espace OPTIMALE), et la césure qui borne ce que
 * la justification lui ajoute (l'espace MAXIMALE). ⚠️ Aucune propriété CSS ne borne
 * l'étirement d'une ligne justifiée : c'est une césure plus serrée (deux lettres de part
 * et d'autre) qui en tient le plafond, en laissant moins de long mot à rejeter.
 * ⛔ La colonne originale en regard (sans) ne descend pas sous −0,03 em : c'est le quart
 * de cadratin, et sous le quart les mots se soudent (charte § 3.11).
 */
export const ESPACE_MOT_VERSET = '-0.035em'
export const ESPACE_MOT_ORIGINAL = '-0.03em'
export const CESURE_VERSET = '5 2 2'
/** Le numéro en gouttière vaut 0,714 du verset : ses 0,625 rem pour les 0,875 d’hier. */
export const RAPPORT_NUMERO_VERSET = 0.714
/** La colonne ORIGINALE de la lecture en regard, un cran sous le verset (15 px pour 16). */
export const RAPPORT_ORIGINAL_EN_REGARD = 0.9375
/** Une glose, un point sous le texte de sa colonne (voir CORPS_GLOSE). ⚠️ 0,9 depuis le
 *  2026-09-23 (0,917 avant) : au cran normal de 15 px, 13,5 est le rang d'un point de moins. */
export const RAPPORT_GLOSE_VERSET = 0.9
export const RAPPORT_GLOSE_ORIGINAL = 0.85
export const GOUTTIERE_NUMERO_VERSET_REM = 0.1875

/** Ce que le bloc sélectionné déborde du texte, à gauche comme à droite : 1,625 rem. */
/** L'air ajouté À GAUCHE du numéro pour que le signet d'un verset enregistré tombe DANS le
 *  cadre de survol et de sélection (décision de l'auteur, 2026-09-23) : il en dépassait.
 *  Rendu à droite aussi, pour que le bloc reste symétrique. Le texte ne bouge pas. */
export const AIR_SIGNET_VERSET_REM = 0.625

export const DEBORD_BLOC_VERSET_REM = NUMERO_VERSET_REM + GOUTTIERE_NUMERO_VERSET_REM + AIR_SIGNET_VERSET_REM

/** Le débord droit d'avant, que garde la lecture au doigt, où rien ne le borde. */
const DEBORD_DROIT_ETROIT_REM = 0.25

/** Ce que le débord droit prend sur la gouttière d'actions, de plus qu'avant : 1,375 rem. */
export const EMPIETEMENT_BLOC_VERSET_REM = DEBORD_BLOC_VERSET_REM - DEBORD_DROIT_ETROIT_REM

/**
 * Le retrait des ACTIONS dans leur gouttière : leur demi-rem d'air d'avant, plus ce que le
 * bloc sélectionné y prend désormais. ⛔ Sans lui, le vert passerait sous le premier bouton.
 */
export const RETRAIT_ACTIONS_VERSET = `${0.5 + EMPIETEMENT_BLOC_VERSET_REM}rem`

/**
 * Le bloc numéro + texte, celui que la sélection teinte d'un seul tenant.
 *
 * ⛔ IL DÉBORDE LE TEXTE AUTANT À DROITE QU'À GAUCHE (décision de l'auteur, 14 septembre
 * 2026 : « le bloc de sélection du verset doit être aussi long à droite qu'à gauche ;
 * actuellement, ça colle trop “Booz” »). À gauche, le vert commence au bord de la colonne
 * du numéro, 1,625 rem avant le texte ; à droite il s'arrêtait à 0,25 rem, et le dernier mot
 * d'une ligne justifiée touchait son bord.
 * ⚠️ LA PISTE DE TEXTE NE BOUGE PAS D'UN PIXEL : le rembourrage droit gagne 1,375 rem et la
 * marge droite en rend autant, en NÉGATIF. Les lignes se coupent donc aux mêmes mots, et le
 * vert s'étend dans la gouttière d'actions, dont les boutons reculent d'autant
 * (`RETRAIT_ACTIONS_VERSET`).
 * ⚠️ AU DOIGT, rien ne change : les actions y sortent de la grille et la rangée occupe
 * toute la largeur, si bien qu'une marge négative déborderait de l'écran.
 */
export function styleBlocVerset({ actif, mobile }: { actif?: boolean; mobile?: boolean } = {}): CSSProperties {
  const symetrique = !mobile
  return {
    display: 'grid',
    // ⚠️ La gouttière du numéro s'élargit de 8 px et la piste de texte se resserre
    // d'autant : le bloc garde EXACTEMENT sa largeur, mais le verset rentre davantage
    // et sa ligne porte moins de mots. C'est le retrait, non le blanc, qui le désigne.
    gridTemplateColumns: 'auto minmax(0, calc(var(--mesure-texte) - 0.5rem))',
    columnGap: `${GOUTTIERE_NUMERO_VERSET_REM}rem`,
    alignItems: 'baseline',
    borderRadius: '4px',
    padding: `0.0625rem ${symetrique ? DEBORD_BLOC_VERSET_REM : DEBORD_DROIT_ETROIT_REM}rem 0.0625rem ${symetrique ? `${AIR_SIGNET_VERSET_REM}rem` : 0}`,
    ...(symetrique ? { marginRight: `-${EMPIETEMENT_BLOC_VERSET_REM}rem`, marginLeft: `-${AIR_SIGNET_VERSET_REM}rem` } : null),
    // ⛔ AU DOIGT, LE BLOC NE DÉPASSE PAS SA MESURE (relevé du 2026-09-21, Dt 33 sur
    // Chrome Android). La piste de texte est bornée à 29,5 rem et la colonne du numéro
    // est en `auto` : sur une rangée pleine largeur de 520 à 900 px, c'est le NUMÉRO qui
    // prenait toute la place restante — 81 px de retrait à 768 px au lieu de 25. Borné
    // à `--mesure-bloc` et centré, le bloc reprend la géométrie du bureau.
    ...(mobile ? { width: '100%', maxWidth: 'var(--mesure-bloc)', justifySelf: 'center' } : null),
    // ⛔ Pas de fond au repos : le survol se pose par la feuille (`.verset-row:hover
    // .verset-bloc`), et un `transparent` en ligne le battrait.
    ...(actif ? { background: 'var(--cs-lecture-retenu)' } : null),
    transition: 'background-color var(--cs-duree-courte) ease',
  }
}

/**
 * Le NUMÉRO, dans sa gouttière.
 *
 * ⛔ Jamais en exposant : posé dans une colonne au fer à droite, il laisse la
 * colonne du texte rigoureusement stable d'un verset à l'autre. C'est cette face —
 * 0,625 rem, graisse 600, teinte faible — que reprend le numéro de verset d'une
 * citation patristique, en exposant faute de gouttière (voir `compositionVersets.ts`).
 */
export const STYLE_NUMERO_VERSET: CSSProperties = {
  minWidth: `${NUMERO_VERSET_REM}rem`,
  textAlign: 'right',
  paddingRight: '0.4375rem',
  // ⛔ EN RAPPORT AU VERSET, non en rem (2026-09-21, plancher des petits corps) : il
  // valait 0,625 rem pour un verset de 0,875, soit 0,714 du verset, et il suit
  // désormais le corps du verset quand le lecteur le règle.
  // ⛔ ET JAMAIS SOUS LE PLANCHER (2026-09-23, audit d'harmonie) : 0,714 d'un verset de
  // 14 px (cran petit) rendait 10 px, et 10,7 px au cran normal. `max()` le tient à
  // 11 px ; au cran grand il reste en rapport (12,1 px).
  fontSize: `max(0.6875rem, calc(${CORPS_LECTURE_BIBLE} * ${RAPPORT_NUMERO_VERSET}))`,
  fontWeight: 600,
  color: 'var(--cs-texte-doux)',
  // ⚠️ L'interligne SUIT celui du verset, pour que le numéro reste posé sur la capitale
  // de la première ligne quel que soit le cran : son milieu doit tomber 0,31 corps de
  // verset au-dessus du milieu de la ligne, soit une boîte de (interligne − 0,42) corps
  // de verset. ⛔ Écrite en LONGUEUR, non en rapport au corps du numéro : le plancher
  // ci-dessus peut hausser ce corps, et la boîte de ligne ne doit pas grandir avec lui.
  lineHeight: `calc(${CORPS_LECTURE_BIBLE} * (${INTERLIGNE_LECTURE_BIBLE} - 0.42))`,
  whiteSpace: 'nowrap',
  // ⛔ Relevé sur la CAPITALE de la première ligne, non posé sur sa ligne de base
  // (décision de l'auteur, 21 septembre 2026 : « réaligner un peu mieux le numéro face
  // à la première ligne »). Un chiffre de 10 px sur la ligne de base d'un texte de 14 px
  // pend sous le milieu des lettres qu'il désigne : son milieu doit tomber sur celui de
  // la capitale. En `em` du numéro, pour suivre la police racine fluide ; c'est la
  // règle de la marque de densité (§ 38.30). Ni la grille ni la ligne ne bougent.
  position: 'relative',
  top: '-0.14em',
}

/**
 * La marque d'un verset ENREGISTRÉ, à gauche de son numéro (décision de l'auteur,
 * 21 septembre 2026). Elle remplace le signet plein qui restait affiché dans la colonne
 * d'actions. ⛔ Elle ne décale ni le numéro ni le texte : une ligne enregistrée garde
 * sa géométrie. Encre discrète, celle
 * de l'appareil. ⚠️ Bureau seulement : au doigt, le pavé d'actions dit l'état.
 */
export const STYLE_SIGNET_VERSET: CSSProperties = {
  // ⛔ ALIGNÉ SUR LES CHIFFRES, non centré sur la boîte de ligne (reprise du 21 septembre
  // 2026 : « aligner parfaitement le signet et le numéro ; les rapprocher »). Le signet
  // est EN LIGNE et se pose sur la ligne de base du numéro ; ses mesures sont en `em` du
  // numéro, calculées sur le tracé (viewBox 12 × 13, dessin de y 1,4 à 11) : le dessin
  // va de la ligne de base à la hauteur des chiffres (0,66 em).
  display: 'inline-block',
  width: '0.825em',
  verticalAlign: '-0.1375em',
  // ⚠️ La marge négative rend exactement sa largeur et sa marge droite : le numéro ne bouge pas, et la
  // colonne ne s'élargit pas. Le blanc qui reste (un quart du tracé, à droite du dessin)
  // et une marge de 0,15 em font l'écart, environ 3,5 px à la racine 16.
  marginLeft: '-0.975em',
  marginRight: '0.15em',
  color: 'var(--cs-texte-doux)',
  lineHeight: 0,
}

/** La numérotation d'une AUTRE édition, entre parenthèses : elle ne pèse pas. */
export const STYLE_NUMERO_ALTERNATIF: CSSProperties = {
  fontWeight: 400,
  fontStyle: 'italic',
  color: 'var(--cs-texte-doux)',
}

/** Le texte du verset. Justifié sur écran large, au fer sur mobile. */
/**
 * Le texte d'un verset de la page Bible.
 *
 * ⚠️ `enVers` compose le verset comme de la POÉSIE : ni justification ni césure — on
 * ne coupe pas un stique —, et une boîte par ligne, portant l'alinéa de
 * `styleLigneDeVers`, celui-là même que composent le corps d'une œuvre, son apparat
 * et l'apparat d'une bible. Un style, quatre surfaces (charte § 7.4).
 *
 * ⛔ **Rien ne l'emploie encore, et ce n'est pas un oubli.** Le Psautier est de la
 * poésie, mais la donnée n'en porte pas la coupe : relevé le 29 août 2026, sur les
 * 2 693 versets du Psautier, AUCUNE des quatre traductions ne contient un seul saut
 * de ligne. Sans stiques, il n'y a rien à composer. Le style est prêt pour le jour où
 * la donnée les portera ; il ne se devine pas d'ici là.
 */
export function styleTexteVerset({ mobile, enVers }: { mobile?: boolean; enVers?: boolean } = {}): CSSProperties {
  if (enVers) {
    return {
      fontFamily: SERIF,
      fontSize: CORPS_LECTURE_BIBLE,
      color: 'var(--cs-texte-fort)',
      margin: 0,
      // ⛔ Ni justification ni césure : c'est ce qui fait un vers, partout.
      textAlign: 'left',
      hyphens: 'none',
      WebkitHyphens: 'none',
      overflowWrap: 'break-word',
    } as CSSProperties
  }
  return {
    fontFamily: SERIF,
    fontSize: CORPS_LECTURE_BIBLE,
    lineHeight: INTERLIGNE_LECTURE_BIBLE,
    color: 'var(--cs-texte-fort)',
    margin: 0,
    textAlign: mobile ? 'left' : 'justify',
    textJustify: 'inter-word',
    // Une espace resserrée referme les blancs que la justification ouvre entre les mots,
    // et la césure serrée borne ceux qu'elle ouvrirait encore. ⚠️ La chasse des lettres
    // revient à zéro : le verset est un texte dense (charte § 3.11), et la légère
    // ouverture que `body` donne à l'interface ne le concerne pas.
    letterSpacing: 0,
    wordSpacing: ESPACE_MOT_VERSET,
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    hyphenateLimitChars: CESURE_VERSET,
    overflowWrap: 'break-word',
  } as CSSProperties
}

/** La traduction ne porte rien pour ce créneau canonique. */
export const STYLE_VERSET_VIDE: CSSProperties = {
  color: 'var(--cs-bord)',
  fontStyle: 'italic',
}

/** Ce que la marque de densité demande à droite du dernier bouton, en rem. L'ÉCART la
 *  détache de lui ; la LARGEUR porte deux chiffres tabulaires à 0,6875 rem (plancher des
 *  petits corps, 2026-09-21), chasse comprise (17 œuvres au plus dans le corpus, mesuré
 *  le 2026-09-06) ; l'AIR la tient
 *  loin du bord de la zone de lecture, c'est-à-dire du volet de droite. */
export const ECART_MARQUE_DENSITE_REM = 0.25
export const LARGEUR_MARQUE_DENSITE_REM = 0.875
export const AIR_MARQUE_DENSITE_REM = 0.5

/**
 * LA MARQUE DE DENSITÉ : le nombre d'œuvres qui parlent du verset. ⚠️ Elle reste la plus
 * ténue de la page. ⛔ Chiffres tabulaires : deux marques voisines doivent s'aligner.
 *
 * ⛔ ELLE NE PARAÎT QU'AU SURVOL, À DROITE DES ACTIONS, ET SEULEMENT SI ELLE Y TIENT
 * (décision de l'auteur, 2026-09-13). Posée au repos dans la gouttière, elle accompagnait
 * un verset sur trois ; elle vient désormais avec les boutons qu'on vise, et ferme leur
 * rangée. La place se juge par `marqueDensiteTient`, ci-dessous.
 *
 * ⛔ SON OPACITÉ N'EST PAS ICI : la feuille de la page Bible la pose, nulle au repos et
 * pleine au survol de la ligne. Écrite en ligne, elle battrait la règle du survol.
 *
 * ⛔ LE CHIFFRE SE CENTRE SUR LA CAPITALE DE LA PREMIÈRE LIGNE DU VERSET, non sur sa ligne
 * de base (relevé de l'auteur, 2026-09-13 : « il est un peu bas »). Posée sur la ligne de
 * base d'un texte d'un tiers plus grand, une petite marque paraît basse : son milieu tombe
 * sous celui des lettres qu'elle accompagne. La pose sur la ligne de base la mettait à
 * 0,4375 rem sous le haut de la gouttière ; elle monte d'un seizième de rem, à 0,375.
 *
 *   racine 16 : milieu du chiffre sur le milieu de la capitale, au pixel près ;
 *   racine 22 : 0,38 px sous lui, et sur l'axe des icônes voisines à 0,19 px près.
 *
 * ⚠️ Elle vit dans le FLUX de la gouttière, après le dernier bouton, et la gouttière porte
 * déjà 0,28125 rem de rembourrage haut : la marge en retranche d'autant (0,09375).
 * ⛔ Ne pas la reprendre en pixels : rembourrages, corps et rapports de fonte sont tous
 * proportionnels à la racine (§ 38.14). Il ne reste d'écart que l'arrondi des métriques de
 * fonte au pixel entier, d'où les 0,38 px de la racine 22.
 *
 * ⚠️ Elle reçoit les pointeurs, et c'est nouveau : posée en absolu dans la gouttière, elle
 * couvrait les boutons invisibles et devait laisser passer le clic. À droite d'eux, elle ne
 * couvre plus rien, et son infobulle se lit.
 */
export function styleDensiteVerset(): CSSProperties {
  return {
    flexShrink: 0,
    marginTop: '0.09375rem',
    marginLeft: `${ECART_MARQUE_DENSITE_REM}rem`,
    fontSize: '0.6875rem',
    lineHeight: 1.2,
    color: 'var(--cs-texte-gris)',
    fontVariantNumeric: 'tabular-nums',
    // ⚠️ À onze pixels, deux chiffres collés se lisent comme un seul nombre plus grand.
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  }
}

/**
 * La marque de densité TIENT-ELLE à droite des actions ? « Quand la largeur de l'écran
 * le permet » (décision de l'auteur, 2026-09-13).
 *
 * ⛔ LA PLACE SE MESURE SUR LA ZONE DE LECTURE, JAMAIS SUR LA FENÊTRE : les deux volets
 * s'ouvrent, se ferment et se traînent à la poignée sans que la fenêtre bouge.
 *
 * ⛔ UNE MARQUE QUI NE TIENT PAS NE SE REND PAS DU TOUT. Une opacité nulle ne la retirerait
 * pas de la mise en page : elle déborderait du défileur et ouvrirait un défilement
 * horizontal pour un chiffre qu'on ne voit pas.
 *
 * ⛔ LE PRÉDICAT NE DÉPEND PAS DE L'ÉTAT QU'IL COMMANDE : la fin des boutons et le bord de
 * la zone ne bougent pas quand la marque paraît, puisqu'elle vient APRÈS le dernier bouton
 * et déborde de la gouttière sans en changer la largeur. Sans quoi il oscillerait
 * (§ 38.26.1).
 *
 * ⚠️ Une mesure absente ne fait jamais paraître la marque.
 */
export function marqueDensiteTient({ finDesActions, bordDeLaZone, racine }: {
  /** Bord droit du dernier bouton, en pixels d'écran. */
  finDesActions: number
  /** Bord droit de la zone de lecture, en pixels d'écran. */
  bordDeLaZone: number
  /** Taille de la police racine, en pixels. */
  racine: number
}): boolean {
  if (!Number.isFinite(finDesActions) || !Number.isFinite(bordDeLaZone)) return false
  if (!Number.isFinite(racine) || racine <= 0) return false
  const demande = (ECART_MARQUE_DENSITE_REM + LARGEUR_MARQUE_DENSITE_REM + AIR_MARQUE_DENSITE_REM) * racine
  return finDesActions + demande <= bordDeLaZone
}

/* ⛔ La marque de densité ne se pose PAS au doigt (2026-09-20) : elle y prenait une ligne
 * sous chaque verset commenté, et repoussait le suivant. Son style est parti avec elle. */

/* ── Les MENTIONS des grilles de comparaison ───────────────────────────────────────
 * La Polyglotte et la Polyglotte de la page Recherche ne rendent pas que du texte :
 * elles rendent aussi, dans la cellule même, ce qui tient la place du texte absent.
 * Ces mentions vivaient en ligne, chacune pour soi, et le registre avait dérivé —
 * relevé le 2026-08-30 : QUATRE corps pour une seule voix (9,5 · 10,5 · 11,5 · 12,5 px),
 * DEUX polices dans la même colonne (l'invite des notes en sérif, le message de
 * connexion en sans, hérité du `body`), TROIS teintes pour le même fait, et un libellé
 * différent d'une grille à l'autre.
 *
 * ⛔ Elles sont ici, et non en ligne dans les pages, pour la raison que la charte donne
 * déjà : « un spécimen qui rejoue une composition de mémoire dérive au premier réglage,
 * et fait ensuite autorité contre la page qu'il décrit ». La planche des styles publiait
 * `bible/verset vide` — un tiret cadratin — pendant que la Polyglotte rendait une phrase.
 *
 * ⚠️ Ne pas confondre avec STYLE_LACUNE (plus bas) et STYLE_VERSET_VIDE (plus haut) : ceux-là
 * se posent DANS LE FIL d'un texte suivi et héritent du corps du verset. Ceux-ci
 * REMPLISSENT une cellule de tableau et portent donc leur propre corps.
 */

/** Le corps de la mention : un cran fin, deux rangs sous le texte comparé (14 px). */

/**
 * LE CORPS D’UN PARATEXTE — la composition d’un verset de la page Bible, mais
 * un cran en dessous. Une introduction de Fillion se lit AUTOUR du texte biblique,
 * non à sa place : elle se compose donc plus petit, plus serré et d’une encre plus
 * claire. C’est cette différence de composition qui la situe, et non un filet dans
 * la marge. ⛔ Aucun filet à gauche ni sous un bloc.
 *
 * ⛔ Le nombre lui-même vit dans la feuille de styles (--cs-corps-apparat) : le
 * rang de titre T4 s’aligne dessus depuis le 30 août 2026, et deux valeurs
 * recopiées ne restent identiques que par accident.
 *
 * ⚠️ Sorti de BibleEditionParatext le 30 août 2026, pour la raison donnée en tête
 * de ce module : une planche qui rejoue une composition de mémoire dérive au
 * premier réglage. La planche des illustrations s’en sert pour montrer les trois
 * régimes proposés aux gravures de Fillion.
 */
export const STYLE_CORPS: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'var(--cs-corps-apparat)',
  lineHeight: 1.3,
  color: 'var(--cs-texte-second)',
  textAlign: 'justify',
  hyphens: 'auto',
  overflowWrap: 'break-word',
}

export const CORPS_MENTION = '0.6875rem'
/** L'invite propose, elle ne constate pas. ⚠️ Elle valait un rang de moins que la mention
 *  (0,625 rem) ; le plancher des petits corps (11 px) la ramène au rang de la mention, et
 *  c'est l'italique et l'encre qui la distinguent désormais (audit d'harmonie, 2026-09-23). */
export const CORPS_INVITE = '0.6875rem'

/**
 * ⛔ UNE GLOSE DU TÉMOIN SE COMPOSE EN ITALIQUE, UN POINT SOUS LE TEXTE QU'ELLE
 * ACCOMPAGNE (décision de l'auteur, 2026-09-11 : « pour les gloses, en règle générale,
 * il faudra adopter l'ital et réduire de 1 point le corps du texte »).
 *
 * Un point vaut 4/3 de pixel. Le verset se compose à 14 px à la racine 16 : un point de
 * moins donne 12,67 px, et le rang le plus proche de l'échelle est 12,5. La colonne
 * ORIGINALE de la lecture en regard se compose à 13 px : 11,67, et le rang le plus proche
 * est 11,5. ⚠️ Deux corps, parce que la glose suit la colonne où elle tombe : une glose en
 * ancien français se compose comme l'ancien français, un point plus petit.
 *
 * ⛔ La lecture simple pose le premier dans une feuille (`app/glosses899.css`), la lecture
 * en regard les deux en ligne (`BibleBilingue`) : deux écritures d'un même nombre, que
 * `compositionBible.test.ts` confronte.
 */
export const CORPS_GLOSE = {
  /** Sous un verset : la lecture simple, la colonne traduite en regard. */
  sousVerset: `calc(${CORPS_LECTURE_BIBLE} * ${RAPPORT_GLOSE_VERSET})`,
  /** Sous la colonne originale de la lecture en regard. */
  sousOriginal: `calc(${CORPS_LECTURE_BIBLE} * ${RAPPORT_GLOSE_ORIGINAL})`,
} as const

/**
 * Le libellé qui tient la place du numéro de verset d'une glose (charte § 15.4) : dans la
 * gouttière de la lecture en regard, dans la lettrine de la Polyglotte. ⚠️ La lecture simple
 * l'écrit dans le `content` de `app/glosses899.css`, une feuille ne sachant pas importer une
 * constante : `compositionBible.test.ts` confronte les deux écritures.
 */
export const LIBELLE_GLOSE = 'Glose'

/** La voix commune : sérif italique, très légèrement espacée. Une mention n'est jamais
 *  du texte de corpus, et l'italique le dit avant qu'on ait lu. */
const VOIX_MENTION: CSSProperties = {
  fontFamily: SERIF,
  fontStyle: 'italic',
  letterSpacing: '0.02em',
  lineHeight: 1.35,
}

/** Une mention qui TIENT LA PLACE d'un texte : centrée dans sa cellule, en hauteur comme
 *  en largeur. ⚠️ `textAlignLast` est indispensable — la cellule de comparaison est en
 *  `text-align: justify`, et sans lui la dernière ligne d'une mention qui se replie
 *  reste au fer à gauche. */
export const STYLE_MENTION: CSSProperties = {
  ...VOIX_MENTION,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minHeight: '1.6em',
  padding: '3px 6px',
  textAlign: 'center',
  textAlignLast: 'center',
  fontSize: CORPS_MENTION,
  color: 'var(--cs-mention)',
}

/**
 * ⛔ LA LACUNE PREND LA VOIX DE « ABSENT DE CETTE TRADUCTION », ENCRE COMPRISE (décision
 * de l'auteur, 14 septembre 2026 : « [lacune] n'est pas correctement mis en forme ; il faut
 * reprendre le style de “Absent de cette traduction” ; appliquer ça aussi pour la Bible
 * classique »). Elle gardait l'ocre des lacunes quand la mention d'absence prenait le
 * sépia des mentions : deux voix pour un seul geste, l'éditeur qui dit ce que la case ne
 * porte pas. C'est désormais le MOT qui distingue les deux cas, non la teinte.
 * ⚠️ `--cs-lacune` reste le jeton des appels de note : il ne change pas, seule la lacune
 * cesse de l'employer.
 */
export const STYLE_MENTION_LACUNE: CSSProperties = { ...STYLE_MENTION }

/**
 * La même voix quand elle tombe DANS LE FIL d'un texte : une lacune au milieu d'un verset
 * (« [déchirure] »), ou la mention qui tient la place d'un verset sur la page Bible. Ni
 * boîte ni centrage : la voix seule, et le corps d'une mention de case.
 * ⚠️ En `em`, et ce n'est pas une approximation : 0,6875 rem sur les 0,875 rem d'un verset
 * font 0,786 em. La mention suit ainsi le corps du texte où elle tombe, et une glose, plus
 * petite, l'emporte avec elle.
 */
export const STYLE_MENTION_DANS_LE_FIL: CSSProperties = {
  fontFamily: SERIF,
  fontStyle: 'italic',
  letterSpacing: '0.02em',
  fontSize: '0.786em',
  color: 'var(--cs-mention)',
}

/** Un verset absent du témoin, sur la page Bible : la mention, dans le fil.
 *  ⛔ Signalé sans peser, et UNE fois — non autant de fois qu'il manque de versets. */
export const STYLE_LACUNE: CSSProperties = { ...STYLE_MENTION_DANS_LE_FIL }

/** Une INVITE : ce qu'on peut faire ici, non ce qui manque. Typographie seule — la boîte
 *  appartient à l'appelant, qui est tantôt un bouton, tantôt une case de tableau. */
export const STYLE_INVITE: CSSProperties = {
  ...VOIX_MENTION,
  textAlign: 'center',
  fontSize: CORPS_INVITE,
  color: 'var(--cs-mention)',
}

/* Les libellés, pour que le même fait se dise du même mot sur les deux grilles. La
 * Polyglotte disait « Cette traduction ne contient pas ce verset » et la Recherche
 * « Absent dans cette traduction ». La phrase longue tenait sur trois lignes dans une
 * colonne de comparaison ; le sujet, lui, est donné par la grille — la ligne EST un
 * verset, la colonne EST une traduction. La mention brève suffit donc, et la phrase
 * entière passe à l'infobulle, pour qui la cherche. */
export const MENTION_ABSENT = 'Absent de cette traduction'
export const MENTION_ABSENT_TITRE = 'Cette traduction ne porte pas ce verset.'
/**
 * ⛔ UNE CASE OCCUPÉE PAR UN VERSET QU'ON LIT PLUS HAUT N'EST PAS UNE CASE VIDE.
 * Quand une édition réunit en un seul verset ce que le canon compte en plusieurs,
 * `versets_v2.canon_id_fin` le dit, et les créneaux suivants sont COUVERTS : y écrire
 * « Absent de cette traduction » est un mensonge sur l'édition. Relevé le 2026-09-07 :
 * 32 cellules dans ce cas, dont trois dans la colonne de l'AELF, qui est la référence.
 * ⚠️ La mention ne répète pas le texte — un verset ne se lit qu'une fois — elle dit où
 * il se lit, et la référence est celle de l'ÉDITION, jamais le numéro du canon.
 */
export const mentionEmpan = (referenceNative: string) => `Compris dans le verset ${referenceNative}`
export const MENTION_EMPAN_TITRE = 'Cette édition réunit en un seul verset ce que le canon compte en plusieurs\u00A0: le texte se lit au verset indiqué.'
/** Le texte d'une colonne qu'on vient de choisir, et qui arrive. ⛔ Jamais « Absent de
 *  cette traduction » pendant ce temps-là : ce serait un mensonge d'une seconde. */
export const MENTION_ATTENTE = 'Chargement…'
export const MENTION_DEUTERO = 'Absent des Bibles hébraïque et protestante'
export const MENTION_LACUNE = 'Lacune du manuscrit'
export const MENTION_LACUNE_TITRE = 'Lacune matérielle du manuscrit'

/**
 * La composition d'un SOUS-TITRE, selon le rang du titre auquel il appartient.
 *
 * Un sous-titre est le CHAPEAU de son titre, tombé dans un bloc voisin par l'ordre
 * matériel de la page imprimée. Il se compose donc comme lui : centré sous un titre
 * centré, au fer sous un titre au fer, dans son encre et un cran sous son corps.
 *
 * ⛔ **Tout est en style EN LIGNE, et ce n'est pas un choix de confort.** Le paragraphe
 * d'apparat pose déjà son corps et son encre en ligne (`STYLE_CORPS`) : une règle de
 * feuille serait morte, et le sous-titre garderait la composition du texte courant.
 * Essayé le 29 août 2026, et repris aussitôt.
 *
 * ⚠️ **Le rang vient du TITRE, jamais du sous-titre.** Ni son rôle ni son propre rang
 * ne le disent : au 29 août 2026, un `section_subtitle` de rang I3 visait indifféremment
 * un titre T3, T4 ou T5. Et les deux échelles divergent dès le quatrième rang, I4 étant
 * le CHAPITRE quand T4 est la SOUS-SECTION. Voir `rangDesSousTitres`.
 *
 * ⚠️ Sans rang connu, on garde la composition des rangs hauts : c'est celle que les
 * 201 sous-titres du corpus recevaient tous, et l'on ne dégrade pas ce qu'on ne sait pas.
 */
export function compositionSousTitre(rangDuTitre?: string | null): CSSProperties {
  // ⚠️ Ni T5 ni T4 ne sont au fer : le paragraphe et la sous-section de Fillion
  // n'ont pour intitulé qu'une désignation — « § I », « II » —, qui pendait au bord
  // gauche pendant que son objet, seul porteur du sens, se lisait plus bas comme une
  // légende. T5 s'est centré le 29 août 2026, T4 le 30 (voir `.cs-bible-title--t4`
  // et `--t5`), et leurs sous-titres les suivent : c'est toute la règle de cette
  // fonction. ⛔ SEUL T6 reste au fer, comme son titre.
  const auFer = rangDuTitre === 'T6'
  // ⛔ Le corps du sous-titre suit celui de SON CHAPEAU, jamais une valeur à part :
  // les deux formes d'une même paire — l'objet accolé au titre, et l'objet tombé dans
  // le bloc voisin — doivent se ressembler. Les chiffres sont ceux de `globals.css`,
  // `.cs-bible-title--tN > .cs-bible-chapeau`.
  const corps = auFer ? '0.875rem' : rangDuTitre === 'T4' ? '1rem' : '0.9375rem'
  // ⛔ L'encre est celle de SON titre. Une encre plus claire ferait du sous-titre
  // un commentaire du titre, quand il en est la suite. Les rangs de l'apparat —
  // sous-section, paragraphe, péricope — ont quitté le vert des titres le
  // 30 août 2026 pour le gris d'apparat ; T3 et au-dessus le gardent.
  const encre = rangDuTitre === 'T4' || rangDuTitre === 'T5' || rangDuTitre === 'T6'
    ? 'var(--cs-encre-apparat)'
    : rangDuTitre === 'T3'
      ? 'var(--cs-encre)'
      : 'var(--cs-encre-fonce)'
  return {
    fontSize: corps,
    color: encre,
    textAlign: auFer ? 'left' : 'center',
    lineHeight: 1.35,
    fontStyle: 'italic',
    hyphens: 'manual',
    margin: 0,
  }
}
